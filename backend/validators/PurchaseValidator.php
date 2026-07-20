<?php
declare(strict_types=1);
namespace App\Validators;
use App\Http\HttpException;
final class PurchaseValidator{
 public function filters(array$q):array{$status=(string)($q['purchase_status']??'');$payment=(string)($q['payment_status']??'');$sort=(string)($q['sort_by']??'purchase_date');$direction=strtolower((string)($q['sort_direction']??'desc'));$e=[];if($status!==''&&!in_array($status,['draft','completed','cancelled','partially_returned','returned'],true))$e['purchase_status']=['Invalid purchase status.'];if($payment!==''&&!in_array($payment,['unpaid','partially_paid','paid'],true))$e['payment_status']=['Invalid payment status.'];if(!in_array($sort,['purchase_date','purchase_number','grand_total','balance_due','created_at'],true))$e['sort_by']=['Invalid sort field.'];if(!in_array($direction,['asc','desc'],true))$e['sort_direction']=['Invalid sort direction.'];$this->fail($e);return['search'=>mb_substr(trim((string)($q['search']??'')),0,100),'supplier_id'=>(int)($q['supplier_id']??0)?:null,'date_from'=>$this->dateOrNull($q['date_from']??null),'date_to'=>$this->dateOrNull($q['date_to']??null),'payment_status'=>$payment,'purchase_status'=>$status,'min_total'=>$this->optionalMoney($q['min_total']??null),'max_total'=>$this->optionalMoney($q['max_total']??null),'page'=>max(1,(int)($q['page']??1)),'limit'=>min(100,max(10,(int)($q['limit']??20))),'sort_by'=>$sort,'sort_direction'=>$direction];}
 public function purchase(array $i): array {
    $e = [];
    $supplier = (int) ($i['supplier_id'] ?? 0);
    if ($supplier < 1) $e['supplier_id'] = ['Select a supplier.'];
    $date = (string) ($i['purchase_date'] ?? '');
    if (!$this->validDate($date)) $e['purchase_date'] = ['Enter a valid purchase date.'];
    elseif ($date > date('Y-m-d')) $e['purchase_date'] = ['Purchase date cannot be in the future.'];
    $invoice = trim((string) ($i['supplier_invoice_number'] ?? ''));
    if (mb_strlen($invoice) > 100) $e['supplier_invoice_number'] = ['Invoice number must not exceed 100 characters.'];
    $token = (string) ($i['request_token'] ?? '');
    if (!preg_match('/^[a-f0-9-]{36}$/i', $token)) $e['request_token'] = ['A valid request token is required.'];
    $raw = $i['items'] ?? null;
    if (!is_array($raw) || count($raw) < 1 || count($raw) > 100) $e['items'] = ['Add between 1 and 100 purchase items.'];
    $items = [];
    $seen = [];
    if (is_array($raw)) {
        foreach ($raw as $index => $row) {
            if (!is_array($row)) {
                $e["items.$index"] = ['Invalid item.'];
                continue;
            }
            $pid = (int) ($row['product_id'] ?? 0);
            if ($pid < 1 || isset($seen[$pid])) {
                $e["items.$index.product_id"] = [$pid < 1 ? 'Select a product.' : 'Each product may appear only once.'];
                continue;
            }
            $seen[$pid] = true;
            try {
                $qty = $this->quantity((string) ($row['quantity'] ?? ''));
            } catch (\InvalidArgumentException $ex) {
                $e["items.$index.quantity"] = [$ex->getMessage()];
                continue;
            }
            try {
                $cost = $this->money((string) ($row['unit_cost'] ?? ''), false);
                $discount = $this->money((string) ($row['line_discount'] ?? '0'));
            } catch (\InvalidArgumentException $ex) {
                $e["items.$index.unit_cost"] = [$ex->getMessage()];
                continue;
            }
            if ($discount > $this->lineTotal($qty, $cost)) {
                $e["items.$index.line_discount"] = ['Line discount cannot exceed the line value.'];
            }
            
            $batchNumber = trim((string)($row['batch_number'] ?? ''));
            $mfgDate = trim((string)($row['manufacturing_date'] ?? ''));
            $expDate = trim((string)($row['expiry_date'] ?? ''));

            if ($mfgDate !== '' && !$this->validDate($mfgDate)) {
                $e["items.$index.manufacturing_date"] = ['Invalid date.'];
            }
            if ($expDate !== '' && !$this->validDate($expDate)) {
                $e["items.$index.expiry_date"] = ['Invalid date.'];
            }

            $items[$pid] = [
                'product_id' => $pid,
                'quantity_milli' => $qty,
                'unit_cost_cents' => $cost,
                'line_discount_cents' => $discount,
                'batch_number' => $batchNumber === '' ? null : $batchNumber,
                'manufacturing_date' => $mfgDate === '' ? null : $mfgDate,
                'expiry_date' => $expDate === '' ? null : $expDate,
            ];
        }
    }
 $money=[];foreach(['overall_discount','tax','shipping_amount','other_charges','amount_paid']as$k)try{$money[$k.'_cents']=$this->money((string)($i[$k]??'0'));}catch(\InvalidArgumentException$ex){$e[$k]=[$ex->getMessage()];}$method=(string)($i['payment_method']??'cash');if(!in_array($method,['cash','card','bank_transfer','mobile_wallet','other'],true))$e['payment_method']=['Select a valid payment method.'];$reference=trim((string)($i['payment_reference']??''));$notes=trim((string)($i['notes']??''));if(mb_strlen($reference)>150)$e['payment_reference']=['Reference must not exceed 150 characters.'];if(mb_strlen($notes)>1000)$e['notes']=['Notes must not exceed 1000 characters.'];$this->fail($e);return['supplier_id'=>$supplier,'supplier_invoice_number'=>$invoice===''?null:$invoice,'purchase_date'=>$date,'request_token'=>$token,'items'=>$items,'payment_method'=>$method,'payment_reference'=>$reference===''?null:$reference,'notes'=>$notes===''?null:$notes]+$money;}
 public function payment(array$i):array{$e=[];try{$amount=$this->money((string)($i['amount']??''),false);}catch(\InvalidArgumentException$ex){$amount=0;$e['amount']=[$ex->getMessage()];}$method=(string)($i['payment_method']??'cash');if(!in_array($method,['cash','card','bank_transfer','mobile_wallet','other'],true))$e['payment_method']=['Select a valid payment method.'];$date=(string)($i['payment_date']??date('Y-m-d'));if(!$this->validDate($date)||$date>date('Y-m-d'))$e['payment_date']=['Enter a valid payment date.'];$reference=trim((string)($i['reference_number']??''));$notes=trim((string)($i['notes']??''));if(mb_strlen($reference)>150)$e['reference_number']=['Reference must not exceed 150 characters.'];if(mb_strlen($notes)>500)$e['notes']=['Notes must not exceed 500 characters.'];$this->fail($e);return['amount_cents'=>$amount,'payment_method'=>$method,'payment_date'=>$date,'reference_number'=>$reference===''?null:$reference,'notes'=>$notes===''?null:$notes];}
 public function cancellation(array$i):string{$r=trim((string)($i['reason']??''));if($r===''||mb_strlen($r)>500)$this->fail(['reason'=>['A cancellation reason of up to 500 characters is required.']]);return$r;}
 private function quantity(string$v):int{if(!preg_match('/^\d{1,9}(?:\.\d{1,3})?$/',$v)||(float)$v<=0)throw new \InvalidArgumentException('Quantity must be greater than zero with up to 3 decimals.');[$w,$f]=array_pad(explode('.',$v,2),2,'');return(int)$w*1000+(int)str_pad($f,3,'0');}
 private function money(string$v,bool$zero=true):int{if(!preg_match('/^\d{1,10}(?:\.\d{1,2})?$/',$v)||(!$zero&&(float)$v<=0))throw new \InvalidArgumentException($zero?'Enter a non-negative amount.':'Amount must be greater than zero.');[$w,$f]=array_pad(explode('.',$v,2),2,'');return(int)$w*100+(int)str_pad($f,2,'0');}
 private function lineTotal(int$q,int$c):int{return intdiv($q*$c+500,1000);}private function validDate(string$v):bool{$d=\DateTime::createFromFormat('Y-m-d',$v);return$d&&$d->format('Y-m-d')===$v;}private function dateOrNull(mixed$v):?string{$s=trim((string)$v);return$this->validDate($s)?$s:null;}private function optionalMoney(mixed$v):?string{$s=trim((string)$v);return$s!==''&&is_numeric($s)&&$s>=0?number_format((float)$s,2,'.',''):null;}private function fail(array$e):void{if($e)throw new HttpException('Some purchase details are invalid.',422,$e);}
}
