<?php

declare(strict_types=1);
namespace App\Repositories;
use App\Config\Database;
use PDO;
use PDOStatement;

final class ReportRepository
{
    public function __construct(private readonly Database $database) {}

    public function options(): array
    {
        $pdo=$this->database->connection();
        $queries=[
            'products'=>'SELECT id,name,product_code FROM products ORDER BY name',
            'categories'=>'SELECT id,name FROM categories ORDER BY name',
            'cashiers'=>'SELECT id,name,role FROM access_credentials WHERE is_active=1 ORDER BY id',
            'expense_categories'=>'SELECT id,name FROM expense_categories ORDER BY name',
            'suppliers'=>"SELECT id,name FROM suppliers WHERE status<>'deleted' ORDER BY name",
        ];$result=[];
        foreach($queries as$key=>$sql){$statement=$pdo->prepare($sql);$statement->execute();$result[$key]=$statement->fetchAll();}
        return$result;
    }

    public function financialSummary(array $f): array
    {
        [$where,$params]=$this->saleWhere($f,'s','fs',false);
        $sql="SELECT
            COALESCE(SUM(CASE WHEN s.status='completed' THEN s.subtotal ELSE 0 END),0) gross_sales,
            COALESCE(SUM(CASE WHEN s.status='completed' THEN s.discount_amount ELSE 0 END),0) total_discounts,
            COALESCE(SUM(CASE WHEN s.status='completed' THEN s.subtotal-s.discount_amount ELSE 0 END),0) net_sales,
            COALESCE(SUM(CASE WHEN s.status='completed' THEN s.tax_amount ELSE 0 END),0) tax_amount,
            COALESCE(SUM(CASE WHEN s.status='completed' THEN (SELECT COALESCE(SUM(si.purchase_cost*si.quantity),0) FROM sale_items si WHERE si.sale_id=s.id) ELSE 0 END),0) cost_of_goods,
            COALESCE(SUM(s.status='completed'),0) completed_sales,
            COALESCE(SUM(s.status='cancelled'),0) cancelled_sales,
            COALESCE(SUM(s.status='refunded'),0) refunded_sales,
            COALESCE(AVG(CASE WHEN s.status='completed' THEN s.grand_total END),0) average_sale_value
            FROM sales s".$where;
        $statement=$this->database->connection()->prepare($sql);$statement->execute($params);$summary=$statement->fetch()?:[];
        [$expenseWhere,$expenseParams]=$this->expenseWhere($f,'e','fse',true);
        $expense=$this->scalar('SELECT COALESCE(SUM(e.amount),0) FROM expenses e'.$expenseWhere,$expenseParams);
        [$refundWhere,$refundParams]=$this->dateWhere($f,'r.created_at','fsr');
        $refund=$this->scalar("SELECT COALESCE(SUM(r.refund_amount),0) FROM refunds r WHERE r.status='completed'".($refundWhere===''?'':' AND '.substr($refundWhere,7)),$refundParams);
        $summary['total_expenses']=$expense;$summary['refunded_amount']=$refund;
        $summary['gross_profit']=$this->decimal((float)$summary['net_sales']-(float)$summary['cost_of_goods']);
        $summary['estimated_net_profit']=$this->decimal((float)$summary['net_sales']-(float)$summary['cost_of_goods']-(float)$expense);
        $net=(float)$summary['net_sales'];$summary['gross_margin']=$net>0?$this->decimal(((float)$summary['gross_profit']/$net)*100):'0.00';$summary['net_margin']=$net>0?$this->decimal(((float)$summary['estimated_net_profit']/$net)*100):'0.00';
        return$summary;
    }

    public function overviewExtras(array $f): array
    {
        [$where,$params]=$this->saleWhere($f,'s','oe',false);
        $units=$this->scalar("SELECT COALESCE(SUM(si.quantity),0) FROM sale_items si JOIN sales s ON s.id=si.sale_id".$where." AND s.status='completed'",$params);
        $best=$this->first("SELECT si.product_name name,si.product_code code,SUM(si.quantity) quantity_sold FROM sale_items si JOIN sales s ON s.id=si.sale_id".$where." AND s.status='completed' GROUP BY si.product_id,si.product_name,si.product_code ORDER BY quantity_sold DESC LIMIT 1",$params);
        [$categoryWhere,$categoryParams]=$this->saleWhere($f,'s','oec',false);
        $category=$this->first("SELECT c.name,SUM(si.line_total-si.discount_amount) net_sales FROM sale_items si JOIN sales s ON s.id=si.sale_id JOIN products p ON p.id=si.product_id JOIN categories c ON c.id=p.category_id".$categoryWhere." AND s.status='completed' GROUP BY c.id,c.name ORDER BY net_sales DESC LIMIT 1",$categoryParams);
        [$paymentWhere,$paymentParams]=$this->saleWhere($f,'s','oep',false);
        $payment=$this->first("SELECT s.payment_method name,COUNT(*) transaction_count,SUM(s.grand_total) total FROM sales s".$paymentWhere." AND s.status='completed' GROUP BY s.payment_method ORDER BY total DESC LIMIT 1",$paymentParams);
        $stock=$this->first("SELECT COALESCE(SUM(track_stock=1 AND quantity>0 AND quantity<=minimum_stock),0) low_stock_count,COALESCE(SUM(track_stock=1 AND quantity<=0),0) out_of_stock_count FROM products",[]);
        return['total_units_sold'=>$units,'best_selling_product'=>$best,'top_category'=>$category,'top_payment_method'=>$payment,...($stock?:[])];
    }

    public function trend(array $f,string $groupBy): array
    {
        [$saleKey,$saleStart,$saleEnd]=$this->periodExpressions('s.created_at',$groupBy);
        [$where,$params]=$this->saleWhere($f,'s','tr',false);
        $sales=$this->all("SELECT $saleKey period_key,$saleStart period_start,$saleEnd period_end,COUNT(*) completed_sales,SUM(s.subtotal) gross_sales,SUM(s.discount_amount) discounts,SUM(s.subtotal-s.discount_amount) net_sales,SUM((SELECT COALESCE(SUM(si.purchase_cost*si.quantity),0) FROM sale_items si WHERE si.sale_id=s.id)) cost_of_goods,AVG(s.grand_total) average_sale_value FROM sales s".$where." AND s.status='completed' GROUP BY period_key,period_start,period_end ORDER BY period_start",$params);
        [$expenseKey,$expenseStart,$expenseEnd]=$this->periodExpressions('e.expense_date',$groupBy);
        [$ewhere,$eparams]=$this->expenseWhere($f,'e','tre',true);
        $expenses=$this->all("SELECT $expenseKey period_key,$expenseStart period_start,$expenseEnd period_end,SUM(e.amount) expenses FROM expenses e".$ewhere." GROUP BY period_key,period_start,period_end ORDER BY period_start",$eparams);
        return['sales'=>$sales,'expenses'=>$expenses];
    }

    public function sales(array $f): array
    {
        [$where,$params]=$this->saleWhere($f,'s','sl',true);
        $total=(int)$this->scalar('SELECT COUNT(*) FROM sales s'.$where,$params);
        $sort=['date'=>'s.created_at','created_at'=>'s.created_at','invoice_number'=>'s.invoice_number','grand_total'=>'s.grand_total','status'=>'s.status'][$f['sort_by']]??'s.created_at';$direction=$f['sort_direction']==='asc'?'ASC':'DESC';
        $sql='SELECT s.id,s.invoice_number,s.created_at sale_date,a.name cashier_name,a.role cashier_role,s.customer_name,(SELECT COUNT(*) FROM sale_items count_items WHERE count_items.sale_id=s.id) item_count,s.subtotal,s.discount_amount,s.tax_amount,s.grand_total,s.payment_method,s.payment_status,s.status FROM sales s JOIN access_credentials a ON a.id=s.cashier_id'.$where." ORDER BY $sort $direction,s.id $direction LIMIT :limit OFFSET :offset";
        $rows=$this->paged($sql,$params,$f);$summary=$this->salesSummary($f);
        return$this->pageResult($rows,$total,$f,$summary);
    }

    public function salesSummary(array $f): array
    {
        [$where,$params]=$this->saleWhere($f,'s','ss',true);
        return$this->first("SELECT COUNT(*) total_records,COALESCE(SUM(s.status='completed'),0) completed_sales,COALESCE(SUM(s.status='cancelled'),0) cancelled_sales,COALESCE(SUM(s.status='refunded'),0) refunded_sales,COALESCE(SUM(CASE WHEN s.status='completed' THEN s.subtotal ELSE 0 END),0) gross_sales,COALESCE(SUM(CASE WHEN s.status='completed' THEN s.discount_amount ELSE 0 END),0) discounts,COALESCE(SUM(CASE WHEN s.status='completed' THEN s.subtotal-s.discount_amount ELSE 0 END),0) net_sales,COALESCE(AVG(CASE WHEN s.status='completed' THEN s.grand_total END),0) average_sale_value FROM sales s".$where,$params)?:[];
    }

    public function groupedSales(array $f,string $group): array
    {
        $trend=$this->trend($f,$group);$rows=$this->mergePeriods($trend['sales'],$trend['expenses']);
        foreach($rows as&$row){$row['gross_profit']=$this->decimal((float)$row['net_sales']-(float)$row['cost_of_goods']);$row['estimated_net_profit']=$this->decimal((float)$row['net_sales']-(float)$row['cost_of_goods']-(float)$row['expenses']);}unset($row);
        if($f['sort_direction']==='desc')$rows=array_reverse($rows);
        $total=count($rows);$offset=($f['page']-1)*$f['limit'];return$this->pageResult(array_slice($rows,$offset,$f['limit']),$total,$f,$this->financialSummary($f),$rows);
    }

    public function products(array $f,bool $bestOnly=false): array
    {
        [$where,$params]=$this->itemWhere($f,'ps');
        $base=" FROM sale_items si JOIN sales s ON s.id=si.sale_id JOIN products p ON p.id=si.product_id JOIN categories c ON c.id=p.category_id".$where;
        $group=' GROUP BY si.product_id,si.product_name,si.product_code,c.name,p.unit_type,p.quantity';
        $total=(int)$this->scalar('SELECT COUNT(*) FROM (SELECT si.product_id'.$base.$group.') report_products',$params);
        $sort=['quantity'=>'quantity_sold','quantity_sold'=>'quantity_sold','net_sales'=>'net_sales','gross_sales'=>'gross_sales','gross_profit'=>'gross_profit','name'=>'product_name'][$f['sort_by']]??($bestOnly?'quantity_sold':'net_sales');$direction=$f['sort_direction']==='asc'?'ASC':'DESC';
        $select="SELECT si.product_id,si.product_name,si.product_code,c.name category_name,p.unit_type,SUM(si.quantity) quantity_sold,COUNT(*) sale_lines,SUM(si.line_total) gross_sales,SUM(si.discount_amount) discounts,SUM(si.line_total-si.discount_amount) net_sales,SUM(si.purchase_cost*si.quantity) cost_of_goods,SUM(si.line_total-si.discount_amount-si.purchase_cost*si.quantity) gross_profit,AVG(si.unit_price) average_selling_price,p.quantity current_stock".$base.$group;
        $rows=$this->paged($select." ORDER BY $sort $direction,si.product_name ASC LIMIT :limit OFFSET :offset",$params,$f);
        $sum=$this->first("SELECT COALESCE(SUM(si.quantity),0) quantity_sold,COALESCE(SUM(si.line_total),0) gross_sales,COALESCE(SUM(si.line_total-si.discount_amount),0) net_sales,COALESCE(SUM(si.purchase_cost*si.quantity),0) cost_of_goods".$base,$params)?:[];$sum['gross_profit']=$this->decimal((float)($sum['net_sales']??0)-(float)($sum['cost_of_goods']??0));
        foreach($rows as$i=>&$row){$row['rank']=($f['page']-1)*$f['limit']+$i+1;$row['contribution_percentage']=(float)($sum['net_sales']??0)>0?$this->decimal((float)$row['net_sales']/(float)$sum['net_sales']*100):'0.00';}unset($row);
        return$this->pageResult($rows,$total,$f,$sum,$rows);
    }

    public function categories(array $f): array
    {
        [$where,$params]=$this->itemWhere($f,'ct');$base=' FROM sale_items si JOIN sales s ON s.id=si.sale_id JOIN products p ON p.id=si.product_id JOIN categories c ON c.id=p.category_id'.$where;$group=' GROUP BY c.id,c.name';$total=(int)$this->scalar('SELECT COUNT(*) FROM (SELECT c.id'.$base.$group.') report_categories',$params);
        $summary=$this->first("SELECT COALESCE(SUM(si.line_total-si.discount_amount),0) net_sales".$base,$params)?:[];$sort=['quantity'=>'quantity_sold','net_sales'=>'net_sales','gross_sales'=>'gross_sales','gross_profit'=>'gross_profit','name'=>'category_name'][$f['sort_by']]??'net_sales';$direction=$f['sort_direction']==='asc'?'ASC':'DESC';
        $select="SELECT c.id category_id,c.name category_name,SUM(si.quantity) quantity_sold,COUNT(DISTINCT si.product_id) products_sold,COUNT(DISTINCT s.id) sales_count,SUM(si.line_total) gross_sales,SUM(si.discount_amount) discounts,SUM(si.line_total-si.discount_amount) net_sales,SUM(si.purchase_cost*si.quantity) cost_of_goods,SUM(si.line_total-si.discount_amount-si.purchase_cost*si.quantity) gross_profit".$base.$group;
        $rows=$this->paged($select." ORDER BY $sort $direction,c.name LIMIT :limit OFFSET :offset",$params,$f);foreach($rows as&$row)$row['contribution_percentage']=(float)($summary['net_sales']??0)>0?$this->decimal((float)$row['net_sales']/(float)$summary['net_sales']*100):'0.00';unset($row);$summary['category_count']=$total;
        return$this->pageResult($rows,$total,$f,$summary,$rows);
    }

    public function cashiers(array $f): array
    {
        [$where,$params]=$this->saleWhere($f,'s','ca',false);$base=' FROM sales s JOIN access_credentials a ON a.id=s.cashier_id'.$where;$group=' GROUP BY s.cashier_id,a.role';$total=(int)$this->scalar('SELECT COUNT(*) FROM (SELECT s.cashier_id'.$base.$group.') report_cashiers',$params);$sort=['net_sales'=>'net_sales','gross_sales'=>'gross_sales','name'=>'cashier_role','transaction_count'=>'completed_sales'][$f['sort_by']]??'net_sales';$direction=$f['sort_direction']==='asc'?'ASC':'DESC';
        $select="SELECT s.cashier_id user_id,a.name cashier_name,a.role cashier_role,SUM(s.status='completed') completed_sales,SUM(s.status='cancelled') cancelled_sales,SUM(s.status='refunded') refunded_sales,SUM(CASE WHEN s.status='completed' THEN s.subtotal ELSE 0 END) gross_sales,SUM(CASE WHEN s.status='completed' THEN s.discount_amount ELSE 0 END) discounts,SUM(CASE WHEN s.status='completed' THEN s.subtotal-s.discount_amount ELSE 0 END) net_sales,AVG(CASE WHEN s.status='completed' THEN s.grand_total END) average_sale_value,SUM(CASE WHEN s.status='completed' AND s.payment_method='cash' THEN s.grand_total ELSE 0 END) cash_payments,SUM(CASE WHEN s.status='completed' AND s.payment_method<>'cash' THEN s.grand_total ELSE 0 END) non_cash_payments".$base.$group;
        $rows=$this->paged($select." ORDER BY $sort $direction LIMIT :limit OFFSET :offset",$params,$f);return$this->pageResult($rows,$total,$f,$this->salesSummary($f),$rows);
    }

    public function paymentMethods(array $f): array
    {
        [$where,$params]=$this->saleWhere($f,'s','pm',false);$rows=$this->all("SELECT p.payment_method,COUNT(*) transaction_count,SUM(p.amount) gross_amount FROM payments p JOIN sales s ON s.id=p.sale_id".$where." AND s.status='completed' AND p.status='paid' GROUP BY p.payment_method ORDER BY gross_amount DESC",$params);
        [$rwhere,$rparams]=$this->dateWhere($f,'r.created_at','pmr');$refunds=$this->all("SELECT r.refund_method payment_method,SUM(r.refund_amount) refunded_amount FROM refunds r WHERE r.status='completed'".($rwhere===''?'':' AND '.substr($rwhere,7)).' GROUP BY r.refund_method',$rparams);$map=[];foreach($refunds as$row)$map[$row['payment_method']]=$row['refunded_amount'];$total=0;foreach($rows as&$row){$row['refunded_amount']=$map[$row['payment_method']]??'0.00';$row['net_collected']=$this->decimal((float)$row['gross_amount']-(float)$row['refunded_amount']);$total+=(float)$row['net_collected'];}unset($row);foreach($rows as&$row)$row['percentage']=$total>0?$this->decimal((float)$row['net_collected']/$total*100):'0.00';unset($row);return$this->pageResult($rows,count($rows),$f,['gross_amount'=>$this->decimal(array_sum(array_map(fn($r)=>(float)$r['gross_amount'],$rows))),'refunded_amount'=>$this->decimal(array_sum(array_map(fn($r)=>(float)$r['refunded_amount'],$rows))),'net_collected'=>$this->decimal($total)],$rows);
    }

    public function expenses(array $f): array
    {
        [$where,$params]=$this->expenseWhere($f,'e','ex',false);$total=(int)$this->scalar('SELECT COUNT(*) FROM expenses e'.$where,$params);$sort=['date'=>'e.expense_date','amount'=>'e.amount','title'=>'e.title','status'=>'e.status','created_at'=>'e.created_at'][$f['sort_by']]??'e.expense_date';$direction=$f['sort_direction']==='asc'?'ASC':'DESC';
        $rows=$this->paged('SELECT e.id,e.expense_date,e.title,ec.name category_name,e.amount,e.payment_method,e.reference_number,e.status,a.role added_by_role,e.receipt_image FROM expenses e JOIN expense_categories ec ON ec.id=e.expense_category_id JOIN access_credentials a ON a.id=e.added_by'.$where." ORDER BY $sort $direction,e.id $direction LIMIT :limit OFFSET :offset",$params,$f);
        $summary=$this->first('SELECT COUNT(*) expense_count,COALESCE(SUM(e.amount),0) total_expenses,COALESCE(AVG(e.amount),0) average_expense,COALESCE(MAX(e.amount),0) highest_expense FROM expenses e'.$where,$params)?:[];
        $categories=$this->all('SELECT ec.name label,SUM(e.amount) total FROM expenses e JOIN expense_categories ec ON ec.id=e.expense_category_id'.$where.' GROUP BY ec.id,ec.name ORDER BY total DESC',$params);[$key]=$this->periodExpressions('e.expense_date','day');$trend=$this->all("SELECT $key label,SUM(e.amount) total FROM expenses e".$where.' GROUP BY label ORDER BY label',$params);
        return$this->pageResult($rows,$total,$f,$summary,$trend,['categories'=>$categories]);
    }

    public function stock(array $f,string $mode='all'): array
    {
        [$where,$params]=$this->stockWhere($f,'st',$mode);$total=(int)$this->scalar('SELECT COUNT(*) FROM products p JOIN categories c ON c.id=p.category_id'.$where,$params);$sort=['name'=>'p.name','stock'=>'p.quantity','quantity'=>'p.quantity','shortage'=>'shortage','category'=>'c.name','status'=>'stock_status'][$f['sort_by']]??'p.name';$direction=$f['sort_direction']==='asc'?'ASC':'DESC';
        $select="SELECT p.id product_id,p.name product_name,p.product_code,c.name category_name,p.quantity current_quantity,p.minimum_stock,p.unit_type,p.track_stock,p.status product_status,p.purchase_cost,p.quantity*p.purchase_cost estimated_stock_value,CASE WHEN p.track_stock=0 THEN 'not_tracked' WHEN p.quantity<=0 THEN 'out_of_stock' WHEN p.quantity<=p.minimum_stock THEN 'low_stock' ELSE 'in_stock' END stock_status,GREATEST(p.minimum_stock-p.quantity,0) shortage,(SELECT MAX(st.created_at) FROM stock_transactions st WHERE st.product_id=p.id) last_movement";
        $rows=$this->paged($select.' FROM products p JOIN categories c ON c.id=p.category_id'.$where." ORDER BY $sort $direction,p.id LIMIT :limit OFFSET :offset",$params,$f);$summary=$this->first("SELECT COUNT(*) product_count,COALESCE(SUM(p.track_stock=1 AND p.quantity>0 AND p.quantity<=p.minimum_stock),0) low_stock_count,COALESCE(SUM(p.track_stock=1 AND p.quantity<=0),0) out_of_stock_count,COALESCE(SUM(CASE WHEN p.track_stock=1 THEN p.quantity*p.purchase_cost ELSE 0 END),0) stock_value FROM products p JOIN categories c ON c.id=p.category_id".$where,$params)?:[];
        $chart=$this->all("SELECT CASE WHEN p.track_stock=0 THEN 'not_tracked' WHEN p.quantity<=0 THEN 'out_of_stock' WHEN p.quantity<=p.minimum_stock THEN 'low_stock' ELSE 'in_stock' END label,COUNT(*) total FROM products p JOIN categories c ON c.id=p.category_id".$where.' GROUP BY label ORDER BY total DESC',$params);return$this->pageResult($rows,$total,$f,$summary,$chart);
    }

    public function wastage(array $f): array
    {
        [$where,$params]=$this->wastageWhere($f,'wa');$total=(int)$this->scalar('SELECT COUNT(*) FROM stock_transactions st JOIN products p ON p.id=st.product_id JOIN categories c ON c.id=p.category_id'.$where,$params);$sort=['date'=>'st.created_at','quantity'=>'st.quantity','cost_impact'=>'cost_impact','name'=>'p.name'][$f['sort_by']]??'st.created_at';$direction=$f['sort_direction']==='asc'?'ASC':'DESC';
        $select="SELECT st.id,st.created_at transaction_date,p.id product_id,p.name product_name,p.product_code,c.name category_name,st.transaction_type,ABS(st.quantity) quantity,p.unit_type,st.reason,a.role user_role,p.purchase_cost,ABS(st.quantity)*p.purchase_cost cost_impact";
        $rows=$this->paged($select.' FROM stock_transactions st JOIN products p ON p.id=st.product_id JOIN categories c ON c.id=p.category_id JOIN access_credentials a ON a.id=st.user_id'.$where." ORDER BY $sort $direction,st.id $direction LIMIT :limit OFFSET :offset",$params,$f);$summary=$this->first('SELECT COUNT(*) transaction_count,COALESCE(SUM(ABS(st.quantity)),0) total_quantity,COALESCE(SUM(ABS(st.quantity)*p.purchase_cost),0) estimated_cost_impact FROM stock_transactions st JOIN products p ON p.id=st.product_id JOIN categories c ON c.id=p.category_id'.$where,$params)?:[];$chart=$this->all('SELECT st.transaction_type label,COUNT(*) transaction_count,SUM(ABS(st.quantity)) quantity,SUM(ABS(st.quantity)*p.purchase_cost) total FROM stock_transactions st JOIN products p ON p.id=st.product_id JOIN categories c ON c.id=p.category_id'.$where.' GROUP BY st.transaction_type ORDER BY total DESC',$params);return$this->pageResult($rows,$total,$f,$summary,$chart);
    }

    private function saleWhere(array $f,string $alias,string $prefix,bool $details): array
    {
        [$where,$params]=$this->dateWhere($f,$alias.'.created_at',$prefix);$parts=$where===''?[]:[substr($where,7)];
        if($f['cashier_id']!==null){$parts[]="$alias.cashier_id=:{$prefix}_cashier";$params[$prefix.'_cashier']=$f['cashier_id'];}
        if($f['payment_method']!==''){$parts[]="$alias.payment_method=:{$prefix}_payment";$params[$prefix.'_payment']=$f['payment_method'];}
        if($f['sale_status']!==''){$parts[]="$alias.status=:{$prefix}_status";$params[$prefix.'_status']=$f['sale_status'];}
        if($details&&$f['search']!==''){$parts[]="($alias.invoice_number LIKE :{$prefix}_search OR $alias.customer_name LIKE :{$prefix}_customer OR EXISTS(SELECT 1 FROM sale_items sx WHERE sx.sale_id=$alias.id AND (sx.product_name LIKE :{$prefix}_product OR sx.product_code LIKE :{$prefix}_code)))";$pattern='%'.$f['search'].'%';foreach(['search','customer','product','code']as$key)$params[$prefix.'_'.$key]=$pattern;}
        if($details&&$f['min_total']!==null){$parts[]="$alias.grand_total>=:{$prefix}_min";$params[$prefix.'_min']=$f['min_total'];}if($details&&$f['max_total']!==null){$parts[]="$alias.grand_total<=:{$prefix}_max";$params[$prefix.'_max']=$f['max_total'];}
        return[$parts?' WHERE '.implode(' AND ',$parts):'',$params];
    }

    private function itemWhere(array $f,string $prefix): array
    {
        [$where,$params]=$this->dateWhere($f,'s.created_at',$prefix);$parts=$where===''?[]:[substr($where,7)];$parts[]="s.status='completed'";
        if($f['product_id']!==null){$parts[]="si.product_id=:{$prefix}_product";$params[$prefix.'_product']=$f['product_id'];}if($f['category_id']!==null){$parts[]="p.category_id=:{$prefix}_category";$params[$prefix.'_category']=$f['category_id'];}if($f['cashier_id']!==null){$parts[]="s.cashier_id=:{$prefix}_cashier";$params[$prefix.'_cashier']=$f['cashier_id'];}if($f['search']!==''){$parts[]="(si.product_name LIKE :{$prefix}_name OR si.product_code LIKE :{$prefix}_code OR c.name LIKE :{$prefix}_category_name)";$pattern='%'.$f['search'].'%';foreach(['name','code','category_name']as$key)$params[$prefix.'_'.$key]=$pattern;}return[' WHERE '.implode(' AND ',$parts),$params];
    }

    private function expenseWhere(array $f,string $alias,string $prefix,bool $forceActive): array
    {
        $parts=["$alias.expense_date>=:{$prefix}_from","$alias.expense_date<=:{$prefix}_to"];$params[$prefix.'_from']=$f['date_from'];$params[$prefix.'_to']=$f['date_to'];$status=$forceActive?'active':$f['expense_status'];if($status!==''){$parts[]="$alias.status=:{$prefix}_status";$params[$prefix.'_status']=$status;}if($f['expense_category_id']!==null){$parts[]="$alias.expense_category_id=:{$prefix}_category";$params[$prefix.'_category']=$f['expense_category_id'];}if($f['user_id']!==null){$parts[]="$alias.added_by=:{$prefix}_user";$params[$prefix.'_user']=$f['user_id'];}if($f['payment_method']!==''){$parts[]="$alias.payment_method=:{$prefix}_payment";$params[$prefix.'_payment']=$f['payment_method'];}if($f['min_amount']!==null){$parts[]="$alias.amount>=:{$prefix}_min";$params[$prefix.'_min']=$f['min_amount'];}if($f['max_amount']!==null){$parts[]="$alias.amount<=:{$prefix}_max";$params[$prefix.'_max']=$f['max_amount'];}if($f['search']!==''){$parts[]="($alias.title LIKE :{$prefix}_title OR $alias.description LIKE :{$prefix}_description OR $alias.reference_number LIKE :{$prefix}_reference OR EXISTS(SELECT 1 FROM expense_categories ecx WHERE ecx.id=$alias.expense_category_id AND ecx.name LIKE :{$prefix}_category_name))";$pattern='%'.$f['search'].'%';foreach(['title','description','reference','category_name']as$key)$params[$prefix.'_'.$key]=$pattern;}return[' WHERE '.implode(' AND ',$parts),$params];
    }

    private function stockWhere(array $f,string $prefix,string $mode): array
    {
        $parts=[];$params=[];if($f['search']!==''){$parts[]="(p.name LIKE :{$prefix}_name OR p.product_code LIKE :{$prefix}_code OR p.barcode LIKE :{$prefix}_barcode OR c.name LIKE :{$prefix}_category_name)";$pattern='%'.$f['search'].'%';foreach(['name','code','barcode','category_name']as$key)$params[$prefix.'_'.$key]=$pattern;}if($f['category_id']!==null){$parts[]="p.category_id=:{$prefix}_category";$params[$prefix.'_category']=$f['category_id'];}if($f['tracking']==='tracked')$parts[]='p.track_stock=1';elseif($f['tracking']==='untracked')$parts[]='p.track_stock=0';if($mode==='low')$parts[]='p.track_stock=1 AND p.quantity>0 AND p.quantity<=p.minimum_stock';elseif($mode==='out')$parts[]='p.track_stock=1 AND p.quantity<=0';elseif($f['stock_status']==='low_stock')$parts[]='p.track_stock=1 AND p.quantity>0 AND p.quantity<=p.minimum_stock';elseif($f['stock_status']==='out_of_stock')$parts[]='p.track_stock=1 AND p.quantity<=0';elseif($f['stock_status']==='in_stock')$parts[]='p.quantity>p.minimum_stock';return[$parts?' WHERE '.implode(' AND ',$parts):'',$params];
    }

    private function wastageWhere(array $f,string $prefix): array
    {
        [$where,$params]=$this->dateWhere($f,'st.created_at',$prefix);$parts=$where===''?[]:[substr($where,7)];if($f['transaction_type']!==''){$parts[]="st.transaction_type=:{$prefix}_type";$params[$prefix.'_type']=$f['transaction_type'];}else$parts[]="st.transaction_type IN ('wastage','damaged','expired')";if($f['product_id']!==null){$parts[]="st.product_id=:{$prefix}_product";$params[$prefix.'_product']=$f['product_id'];}if($f['category_id']!==null){$parts[]="p.category_id=:{$prefix}_category";$params[$prefix.'_category']=$f['category_id'];}if($f['user_id']!==null){$parts[]="st.user_id=:{$prefix}_user";$params[$prefix.'_user']=$f['user_id'];}if($f['search']!==''){$parts[]="(p.name LIKE :{$prefix}_name OR p.product_code LIKE :{$prefix}_code OR st.reason LIKE :{$prefix}_reason)";$pattern='%'.$f['search'].'%';foreach(['name','code','reason']as$key)$params[$prefix.'_'.$key]=$pattern;}return[' WHERE '.implode(' AND ',$parts),$params];
    }

    private function dateWhere(array $f,string $column,string $prefix): array{return[" WHERE $column>=:{$prefix}_from AND $column<DATE_ADD(:{$prefix}_to,INTERVAL 1 DAY)",[$prefix.'_from'=>$f['date_from'].' 00:00:00',$prefix.'_to'=>$f['date_to']]];}
    private function periodExpressions(string $column,string $group): array{return match($group){'week'=>["DATE_FORMAT(DATE_SUB(DATE($column),INTERVAL WEEKDAY($column) DAY),'%Y-%m-%d')","DATE_SUB(DATE($column),INTERVAL WEEKDAY($column) DAY)","DATE_ADD(DATE_SUB(DATE($column),INTERVAL WEEKDAY($column) DAY),INTERVAL 6 DAY)"],'month'=>["DATE_FORMAT($column,'%Y-%m')","DATE_FORMAT($column,'%Y-%m-01')","LAST_DAY($column)"],default=>["DATE_FORMAT($column,'%Y-%m-%d')","DATE($column)","DATE($column)"]};}
    private function mergePeriods(array $sales,array $expenses): array{$map=[];foreach($sales as$row){$row['expenses']='0.00';$map[$row['period_key']]=$row;}foreach($expenses as$row){if(!isset($map[$row['period_key']]))$map[$row['period_key']]=['period_key'=>$row['period_key'],'period_start'=>$row['period_start'],'period_end'=>$row['period_end'],'completed_sales'=>0,'gross_sales'=>'0.00','discounts'=>'0.00','net_sales'=>'0.00','cost_of_goods'=>'0.00','average_sale_value'=>'0.00'];$map[$row['period_key']]['expenses']=$row['expenses'];}ksort($map);return array_values($map);}
    private function pageResult(array $rows,int $total,array $f,array $summary=[],array $chart=[],array $extra=[]): array{return['summary'=>$summary,'rows'=>$rows,'chart'=>$chart,'pagination'=>['page'=>$f['page'],'limit'=>$f['limit'],'total'=>$total,'total_pages'=>$total===0?0:(int)ceil($total/$f['limit'])],'filters'=>$f,...$extra];}
    private function paged(string $sql,array $params,array $f): array{$statement=$this->database->connection()->prepare($sql);$this->bind($statement,$params);$statement->bindValue(':limit',$f['limit'],PDO::PARAM_INT);$statement->bindValue(':offset',($f['page']-1)*$f['limit'],PDO::PARAM_INT);$statement->execute();return$statement->fetchAll();}
    private function all(string $sql,array $params): array{$statement=$this->database->connection()->prepare($sql);$statement->execute($params);return$statement->fetchAll();}
    private function first(string $sql,array $params): ?array{$statement=$this->database->connection()->prepare($sql);$statement->execute($params);$row=$statement->fetch();return$row?:null;}
    private function scalar(string $sql,array $params): string{$statement=$this->database->connection()->prepare($sql);$statement->execute($params);return(string)$statement->fetchColumn();}
    private function bind(PDOStatement $statement,array $params): void{foreach($params as$key=>$value)$statement->bindValue(':'.$key,$value,is_int($value)?PDO::PARAM_INT:PDO::PARAM_STR);}
    private function decimal(float $value): string{return number_format($value,2,'.','');}
}
