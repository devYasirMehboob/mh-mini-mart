<?php

declare(strict_types=1);
namespace App\Services;
use App\Http\HttpException;
final class ReportExportService
{
    private const TYPES=['sales','daily_sales','weekly_sales','monthly_sales','products','categories','cashiers','payment_methods','expenses','profit','stock','low_stock','out_of_stock','wastage','best_selling_products','purchase_summary','supplier_purchases','product_purchases','monthly_purchases','supplier_balances','purchase_payments','purchase_returns'];
    private const PURCHASE_TYPES=['purchase_summary','supplier_purchases','product_purchases','monthly_purchases','supplier_balances','purchase_payments','purchase_returns'];
    public function __construct(private readonly ReportService $reports){}
    public function create(string $type,array $query,array $user): array
    {
        if(!in_array($type,self::TYPES,true))throw new HttpException('This report cannot be exported.',422,['report_type'=>['Select a supported export type.']]);
        if(in_array($type,self::PURCHASE_TYPES,true)&&!in_array('purchases.export',$user['permissions']??[],true))throw new HttpException('You do not have permission to export purchase reports.',403);
        $query['page']=1;$query['limit']=100;$first=$this->reports->report($type,$query,$user);$rows=$first['rows']??[];$pages=min(50,(int)($first['pagination']['total_pages']??1));
        for($page=2;$page<=$pages;$page++){$query['page']=$page;$next=$this->reports->report($type,$query,$user);array_push($rows,...($next['rows']??[]));}
        $stream=fopen('php://temp','w+');if($stream===false)throw new \RuntimeException('Unable to prepare report export.');fwrite($stream,"\xEF\xBB\xBF");
        $keys=$this->keys($type,$rows);
        if($keys!==[])fputcsv($stream,array_map(fn($key)=>ucwords(str_replace('_',' ',$key)),$keys));
        foreach($rows as$row)fputcsv($stream,array_map(fn($key)=>$this->cell($row[$key]??''),$keys));
        rewind($stream);$content=stream_get_contents($stream);fclose($stream);if($content===false)throw new \RuntimeException('Unable to prepare report export.');
        return['filename'=>'mh-mini-mart-'.str_replace('_','-',$type).'-'.date('Y-m-d-His').'.csv','content'=>$content];
    }
    private function keys(string $type,array $rows): array
    {
        $columns=[
            'sales'=>['invoice_number','sale_date','cashier_role','customer_name','item_count','subtotal','discount_amount','tax_amount','grand_total','payment_method','payment_status','status'],
            'daily_sales'=>['period_start','period_end','completed_sales','gross_sales','discounts','net_sales','cost_of_goods','expenses','estimated_net_profit'],
            'weekly_sales'=>['period_start','period_end','completed_sales','gross_sales','discounts','net_sales','cost_of_goods','expenses','estimated_net_profit'],
            'monthly_sales'=>['period_start','period_end','completed_sales','gross_sales','discounts','net_sales','cost_of_goods','expenses','estimated_net_profit'],
            'products'=>['product_name','product_code','category_name','unit_type','quantity_sold','sale_lines','gross_sales','discounts','net_sales','cost_of_goods','gross_profit','average_selling_price','current_stock'],
            'best_selling_products'=>['rank','product_name','product_code','category_name','quantity_sold','net_sales','gross_profit','contribution_percentage'],
            'categories'=>['category_name','quantity_sold','products_sold','sales_count','gross_sales','discounts','net_sales','cost_of_goods','gross_profit','contribution_percentage'],
            'cashiers'=>['cashier_name','cashier_role','completed_sales','cancelled_sales','refunded_sales','gross_sales','discounts','net_sales','average_sale_value','cash_payments','non_cash_payments'],
            'payment_methods'=>['payment_method','transaction_count','gross_amount','refunded_amount','net_collected','percentage'],
            'expenses'=>['expense_date','title','category_name','amount','payment_method','reference_number','status','added_by_role'],
            'profit'=>['period_start','period_end','completed_sales','gross_sales','discounts','net_sales','cost_of_goods','expenses','gross_profit','estimated_net_profit'],
            'stock'=>['product_name','product_code','category_name','current_quantity','minimum_stock','unit_type','track_stock','product_status','stock_status','purchase_cost','estimated_stock_value','last_movement'],
            'low_stock'=>['product_name','product_code','category_name','current_quantity','minimum_stock','shortage','unit_type','last_movement'],
            'out_of_stock'=>['product_name','product_code','category_name','minimum_stock','unit_type','product_status','last_movement'],
            'wastage'=>['transaction_date','product_name','product_code','category_name','transaction_type','quantity','unit_type','reason','user_role','purchase_cost','cost_impact'],
            'purchase_summary'=>['purchase_number','purchase_date','supplier_name','supplier_invoice_number','grand_total','amount_paid','balance_due','payment_status','purchase_status'],
            'supplier_purchases'=>['supplier_name','phone','purchase_count','total_purchases','amount_paid','balance_due','current_balance'],
            'product_purchases'=>['product_name','product_code','unit_type','purchased_quantity','returned_quantity','net_quantity','total_purchase_value','net_purchase_value','average_unit_cost'],
            'monthly_purchases'=>['period','purchase_count','total_purchases','amount_paid','balance_due'],
            'supplier_balances'=>['supplier_name','phone','email','status','opening_balance','current_balance','purchase_count'],
            'purchase_payments'=>['payment_date','purchase_number','supplier_name','amount','payment_method','reference_number','notes'],
            'purchase_returns'=>['return_number','return_date','purchase_number','supplier_name','return_value','refund_amount','reason'],
        ];
        $allowed=$columns[$type]??[];if($rows===[])return$allowed;return array_values(array_filter($allowed,fn($key)=>array_key_exists($key,$rows[0])));
    }
    private function cell(mixed $value): string{$cell=is_array($value)?json_encode($value,JSON_UNESCAPED_UNICODE):(string)$value;return preg_match('/^[=+\-@]/',$cell)===1?"'".$cell:$cell;}
}


