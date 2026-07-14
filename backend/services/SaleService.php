<?php

declare(strict_types=1);
namespace App\Services;

use App\Config\Database;
use App\Http\HttpException;
use App\Repositories\ActivityLogRepository;
use App\Repositories\HeldSaleRepository;
use App\Repositories\PaymentRepository;
use App\Repositories\ProductRepository;
use App\Repositories\RefundRepository;
use App\Repositories\SaleItemRepository;
use App\Repositories\SaleRepository;
use App\Repositories\StockTransactionRepository;
use App\Validators\SaleValidator;
use PDOException;
use Throwable;

final class SaleService
{
    public function __construct(private readonly Database $database,private readonly SaleRepository $sales,private readonly SaleItemRepository $items,private readonly PaymentRepository $payments,private readonly RefundRepository $refunds,private readonly HeldSaleRepository $held,private readonly ProductRepository $products,private readonly StockTransactionRepository $stockTransactions,private readonly SaleValidator $validator,private readonly SystemConfigurationService $configuration,private readonly ActivityLogRepository $activity) {}

    public function complete(int $cashierId,array $input,bool $isAdmin=false): array
    {
        $data=$this->validator->validate($input);$stockEnabled=(bool)$this->configuration->get('inventory','global_tracking_enabled',true);$allowNegative=(bool)$this->configuration->get('inventory','allow_negative_stock',false);$existing=$this->sales->findByToken($data['request_token']);if($existing!==null)return['sale'=>$existing,'already_completed'=>true];$pdo=$this->database->connection();$pdo->beginTransaction();
        try{if($data['held_sale_id']!==null){$heldSale=$this->held->findForUpdate($data['held_sale_id']);if($heldSale===null||$heldSale['status']!=='active')throw new HttpException('Held sale is no longer available.',409);if((int)$heldSale['held_by']!==$cashierId&&!$isAdmin)throw new HttpException('You do not have permission to complete this held sale.',403);}$locked=$this->products->findManyForUpdate(array_keys($data['items']));if(count($locked)!==count($data['items']))throw new HttpException('One or more products are no longer available.',409);$lines=[];$subtotal=0;
            foreach($data['items']as$productId=>$quantityMilli){$product=$locked[$productId];if($product['status']!=='active')throw new HttpException($product['name'].' is no longer available.',409);if(in_array($product['unit_type'],['piece','pack','dozen','box','bottle'],true)&&$quantityMilli%1000!==0)throw new HttpException($product['name'].' must use a whole-number quantity.',422);$stockMilli=$this->toScaled((string)$product['quantity'],3);if($stockEnabled&&!$allowNegative&&(int)$product['track_stock']===1&&$quantityMilli>$stockMilli)throw new HttpException('Only '.$this->quantity($stockMilli).' '.$product['unit_type'].' of '.$product['name'].' are available.',409,['items'=>['Insufficient stock for '.$product['name'].'.']]);$unitCents=$this->toScaled((string)$product['selling_price'],2);$costCents=$this->toScaled((string)$product['purchase_cost'],2);$lineCents=intdiv($unitCents*$quantityMilli+500,1000);$subtotal+=$lineCents;$lines[]=['product'=>$product,'quantity_milli'=>$quantityMilli,'unit_cents'=>$unitCents,'cost_cents'=>$costCents,'line_cents'=>$lineCents,'stock_milli'=>$stockMilli];}
            $discount=$this->discount($data['discount_type'],$data['discount_value_cents'],$subtotal);
            if (!(bool)$this->configuration->get('discounts','enabled',true) && $discount > 0) throw new HttpException('Discounts are currently disabled.',422,['discount_value'=>['Remove the sale discount.']]);
            if (!$isAdmin && $discount > 0) {
                if (!(bool)$this->configuration->get('discounts','allow_cashier_discounts',true)) throw new HttpException('Cashier discounts are currently disabled.',403);
                $maximum=(float)$this->configuration->get('discounts','maximum_cashier_discount',10);
                if ($subtotal > 0 && ($discount * 100 / $subtotal) > $maximum) throw new HttpException('This discount requires admin permission.',403,['discount_value'=>['The cashier discount limit is '.$maximum.'%.']]);
            }
            $tax=0;
            if ((bool)$this->configuration->get('tax','enabled',false)) {
                $taxRate=(float)$this->configuration->get('tax','percentage',0);
                $taxBase=$this->configuration->get('tax','calculation_mode','after_discount')==='before_discount'?$subtotal:max(0,$subtotal-$discount);
                $tax=(int)round($taxBase*$taxRate/100);
            }
            $grand=$subtotal-$discount+$tax;if($data['payment_method']==='cash'&&$data['amount_received_cents']<$grand)throw new HttpException('The received amount is less than the payable total.',422,['amount_received'=>['Enter at least '.$this->money($grand).'.']]);$received=$data['payment_method']==='cash'?$data['amount_received_cents']:$grand;$change=$data['payment_method']==='cash'?$received-$grand:0;$invoice=$this->sales->nextInvoiceNumber();
            $saleId=$this->sales->create(['invoice_number'=>$invoice,'request_token'=>$data['request_token'],'cashier_id'=>$cashierId,'customer_name'=>$data['customer_name'],'customer_phone'=>$data['customer_phone'],'subtotal'=>$this->money($subtotal),'discount_type'=>$data['discount_type'],'discount_value'=>$this->money($data['discount_value_cents']),'discount_amount'=>$this->money($discount),'tax_amount'=>$this->money($tax),'grand_total'=>$this->money($grand),'amount_received'=>$this->money($received),'change_returned'=>$this->money($change),'payment_method'=>$data['payment_method'],'payment_status'=>'paid','status'=>'completed','notes'=>$data['notes']]);
            $allocated=0;$lastIndex=count($lines)-1;foreach($lines as$index=>$line){$lineDiscount=$index===$lastIndex?$discount-$allocated:($subtotal>0?intdiv($discount*$line['line_cents'],$subtotal):0);$allocated+=$lineDiscount;$product=$line['product'];$this->items->create(['sale_id'=>$saleId,'product_id'=>$product['id'],'product_name'=>$product['name'],'product_code'=>$product['product_code'],'quantity'=>$this->quantity($line['quantity_milli']),'unit_price'=>$this->money($line['unit_cents']),'purchase_cost'=>$this->money($line['cost_cents']),'discount_amount'=>$this->money($lineDiscount),'line_total'=>$this->money($line['line_cents'])]);if($stockEnabled&&(int)$product['track_stock']===1){$newStock=$line['stock_milli']-$line['quantity_milli'];$this->products->updateQuantity((int)$product['id'],$this->quantity($newStock));$this->stockTransactions->create(['product_id'=>$product['id'],'user_id'=>$cashierId,'transaction_type'=>'sale','quantity'=>$this->quantity($line['quantity_milli']),'previous_stock'=>$this->quantity($line['stock_milli']),'new_stock'=>$this->quantity($newStock),'reason'=>'Sale '.$invoice,'reference_type'=>'sale','reference_id'=>$saleId]);}}
            $this->payments->create(['sale_id'=>$saleId,'payment_method'=>$data['payment_method'],'amount'=>$this->money($grand),'status'=>'paid','reference'=>$data['payment_reference']]);if($data['held_sale_id']!==null)$this->held->complete($data['held_sale_id'],$saleId);$this->activity->log($cashierId,'sale.completed','Sale '.$invoice.' completed.');$pdo->commit();return['sale'=>$this->sales->findReceipt($saleId),'already_completed'=>false];
        }catch(Throwable$exception){if($pdo->inTransaction())$pdo->rollBack();if($exception instanceof PDOException&&$exception->getCode()==='23000'){$existing=$this->sales->findByToken($data['request_token']);if($existing!==null)return['sale'=>$existing,'already_completed'=>true];}throw$exception;}
    }

    public function listing(array $user,array $input): array
    {
        $filters=$this->scopedFilters($user,$this->validator->filters($input));$result=$this->sales->paginate($filters);$result['filters']=$filters;$result['cashiers']=$this->can($user,'sales.view_all')?$this->sales->cashiers():[];$result['permissions']=$this->permissions($user);return$result;
    }

    public function summary(array $user,array $input): array
    {
        return$this->sales->summary($this->scopedFilters($user,$this->validator->filters($input)));
    }

    public function detail(array $user,int $saleId): array
    {
        $sale=$this->requiredAccessibleSale($user,$saleId);$sale['items']=$this->items->findBySale($saleId,$this->can($user,'products.costs.view'));$sale['payments']=$this->payments->findBySale($saleId);$sale['refunds']=$this->refunds->findBySale($saleId);$sale['permissions']=$this->salePermissions($user,$sale);return$sale;
    }

    public function receipt(array $user,int $saleId): array
    {
        $sale=$this->requiredAccessibleSale($user,$saleId);$all=$this->configuration->all();$shop=$all['shop'];$receipt=$all['receipt'];$tax=$all['tax'];
        return['shop'=>['name'=>$shop['shop_name'],'logo'=>$shop['logo'],'address'=>$shop['address'],'phone'=>$shop['phone'],'email'=>$shop['email'],'registration_number'=>$shop['registration_number'],'footer'=>$shop['receipt_footer'],'return_policy'=>$shop['return_policy']],'options'=>$receipt+['tax_name'=>$tax['name'],'tax_enabled'=>$tax['enabled'],'tax_show_on_receipt'=>$tax['show_on_receipt']],'sale'=>['id'=>$sale['id'],'invoice_number'=>$sale['invoice_number'],'created_at'=>$sale['created_at'],'cashier_name'=>$sale['cashier_name'],'cashier_role'=>$sale['cashier_role'],'customer_name'=>$sale['customer_name'],'customer_phone'=>$sale['customer_phone'],'subtotal'=>$sale['subtotal'],'discount_amount'=>$sale['discount_amount'],'tax_amount'=>$sale['tax_amount'],'grand_total'=>$sale['grand_total'],'amount_received'=>$sale['amount_received'],'change_returned'=>$sale['change_returned'],'payment_method'=>$sale['payment_method'],'payment_status'=>$sale['payment_status'],'status'=>$sale['status'],'cancellation_reason'=>$sale['cancellation_reason'],'items'=>$this->items->findBySale($saleId,false)]];
    }

    public function cancel(array $user,int $saleId,array $input): array
    {
        $this->requirePermission($user,'sales.cancel');$data=$this->validator->cancellation($input);$pdo=$this->database->connection();$pdo->beginTransaction();
        try{$sale=$this->sales->findForUpdate($saleId);$this->assertEligible($sale,'cancel');$items=$this->items->findBySale($saleId,false);$this->restoreStock($items,(int)$user['id'],'cancel',$saleId,$sale['invoice_number'],$data['reason']);$this->sales->cancel($saleId,(int)$user['id'],$data['reason']);$this->activity->log((int)$user['id'],'sale.cancelled','Sale '.$sale['invoice_number'].' cancelled.');$pdo->commit();return$this->detail($user,$saleId);}catch(Throwable$exception){if($pdo->inTransaction())$pdo->rollBack();throw$exception;}
    }

    public function refund(array $user,int $saleId,array $input): array
    {
        $this->requirePermission($user,'sales.refund');$data=$this->validator->refund($input);$pdo=$this->database->connection();$pdo->beginTransaction();
        try{$sale=$this->sales->findForUpdate($saleId);$this->assertEligible($sale,'refund');$items=$this->items->findBySale($saleId,false);$refundId=$this->refunds->create(['sale_id'=>$saleId,'processed_by'=>(int)$user['id'],'refund_amount'=>$sale['grand_total'],'refund_method'=>$data['refund_method'],'reason'=>$data['reason']]);$this->restoreStock($items,(int)$user['id'],'refund',$refundId,$sale['invoice_number'],$data['reason']);$this->payments->markRefunded($saleId);$this->sales->refund($saleId);$this->activity->log((int)$user['id'],'sale.refunded','Sale '.$sale['invoice_number'].' refunded.');$pdo->commit();return$this->detail($user,$saleId);}catch(Throwable$exception){if($pdo->inTransaction())$pdo->rollBack();throw$exception;}
    }

    public function export(array $user,array $input,SalesExportService $exporter): array
    {
        $filters=$this->scopedFilters($user,$this->validator->filters($input));return$exporter->create($filters);
    }

    private function restoreStock(array $items,int $userId,string $action,int $referenceId,string $invoice,string $reason): void
    {
        $ids=array_values(array_unique(array_map(static fn(array $item): int => (int) $item['product_id'], $items)));$products=$this->products->findManyForUpdate($ids);if(count($products)!==count($ids))throw new HttpException('Stock could not be restored because a linked product is unavailable.',409);
        foreach($items as$item){$product=$products[(int)$item['product_id']];if((int)($item['stock_was_posted']??0)!==1)continue;$previous=$this->toScaled((string)$product['quantity'],3);$quantity=$this->toScaled((string)$item['quantity'],3);$new=$previous+$quantity;$this->products->updateQuantity((int)$product['id'],$this->quantity($new));$this->stockTransactions->create(['product_id'=>$product['id'],'user_id'=>$userId,'transaction_type'=>'refund','quantity'=>$this->quantity($quantity),'previous_stock'=>$this->quantity($previous),'new_stock'=>$this->quantity($new),'reason'=>ucfirst($action).' '.$invoice.': '.$reason,'reference_type'=>$action,'reference_id'=>$referenceId]);}
    }

    private function requiredAccessibleSale(array $user,int $saleId): array
    {
        $sale=$this->sales->findDetail($saleId);if($sale===null)throw new HttpException('Sale not found.',404);if(!$this->can($user,'sales.view_all')&&(int)$sale['cashier_id']!==(int)$user['id'])throw new HttpException('You do not have permission to view this sale.',403);return$sale;
    }
    private function scopedFilters(array $user,array $filters): array {if(!$this->can($user,'sales.view_all'))$filters['cashier_id']=(int)$user['id'];return$filters;}
    private function requirePermission(array $user,string $permission): void {if(!$this->can($user,$permission))throw new HttpException('You do not have permission to perform this action.',403);}
    private function assertEligible(?array $sale,string $action): void {if($sale===null)throw new HttpException('Sale not found.',404);if($sale['status']==='cancelled')throw new HttpException('This sale has already been cancelled.',409);if($sale['status']==='refunded')throw new HttpException('This sale has already been refunded.',409);if($sale['status']!=='completed')throw new HttpException('This sale is not eligible for this action.',409);}
    private function permissions(array $user): array {return['can_cancel'=>$this->can($user,'sales.cancel'),'can_refund'=>$this->can($user,'sales.refund'),'can_export'=>$this->can($user,'sales.view_all'),'can_view_costs'=>$this->can($user,'products.costs.view')];}
    private function salePermissions(array $user,array $sale): array {$completed=$sale['status']==='completed';return['can_cancel'=>$this->can($user,'sales.cancel')&&$completed,'can_refund'=>$this->can($user,'sales.refund')&&$completed,'can_view_costs'=>$this->can($user,'products.costs.view'),'can_print'=>$this->can($user,'sales.reprint')];}
    private function can(array $user,string $permission): bool {return in_array($permission,$user['permissions']??[],true);}
    private function discount(string$type,int$value,int$subtotal): int {if($type==='none')return 0;if($type==='percentage')return intdiv($subtotal*$value+5000,10000);if($value>$subtotal)throw new HttpException('The discount cannot exceed the subtotal.',422,['discount_value'=>['Discount is too large.']]);return$value;}
    private function toScaled(string$value,int$scale): int {[$whole,$fraction]=array_pad(explode('.',$value,2),2,'');return(int)$whole*(10**$scale)+(int)str_pad(substr($fraction,0,$scale),$scale,'0');}
    private function money(int$cents): string {return intdiv($cents,100).'.'.str_pad((string)($cents%100),2,'0',STR_PAD_LEFT);}
    private function quantity(int$milli): string {return intdiv($milli,1000).'.'.str_pad((string)($milli%1000),3,'0',STR_PAD_LEFT);}
}
