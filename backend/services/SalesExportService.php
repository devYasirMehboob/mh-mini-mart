<?php

declare(strict_types=1);
namespace App\Services;
use App\Repositories\SaleRepository;
final class SalesExportService
{
    public function __construct(private readonly SaleRepository $sales) {}
    public function create(array $filters): array
    {
        $stream=fopen('php://temp','w+');if($stream===false)throw new \RuntimeException('Unable to prepare sales export.');
        fputcsv($stream,['Invoice number','Sale date','Sale time','Cashier','Customer','Customer phone','Subtotal','Discount','Tax','Grand total','Payment method','Payment status','Sale status']);
        foreach($this->sales->exportRows($filters) as$row){fputcsv($stream,array_map([$this,'safeCell'],[$row['invoice_number'],$row['sale_date'],$row['sale_time'],$row['cashier_name'].' ('.$row['cashier_role'].')',$row['customer_name']??'Walk-in customer',$row['customer_phone']??'',$row['subtotal'],$row['discount_amount'],$row['tax_amount'],$row['grand_total'],$row['payment_method'],$row['payment_status'],$row['status']]));}
        rewind($stream);$content=stream_get_contents($stream);fclose($stream);if($content===false)throw new \RuntimeException('Unable to prepare sales export.');
        return ['filename'=>'mh-mini-mart-sales-'.date('Y-m-d-His').'.csv','content'=>$content];
    }
    private function safeCell(mixed $value): string {$cell=(string)$value;return preg_match('/^[=+\-@]/',$cell)===1?"'".$cell:$cell;}
}
