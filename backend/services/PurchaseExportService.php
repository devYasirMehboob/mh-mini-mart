<?php
declare(strict_types=1);
namespace App\Services;
final class PurchaseExportService{
 public function create(array$rows):array{$stream=fopen('php://temp','r+');fputcsv($stream,['Purchase','Supplier','Supplier invoice','Date','Items','Total','Paid','Balance','Payment status','Purchase status','Created by']);foreach($rows as$r)fputcsv($stream,[$r['purchase_number'],$r['supplier_name'],$r['supplier_invoice_number'],$r['purchase_date'],$r['item_count'],$r['grand_total'],$r['amount_paid'],$r['balance_due'],$r['payment_status'],$r['purchase_status'],$r['created_by_name']]);rewind($stream);$content=(string)stream_get_contents($stream);fclose($stream);return['filename'=>'mh-mini-mart-purchases-'.date('Y-m-d').'.csv','content'=>$content];}
}
