<?php

declare(strict_types=1);
namespace App\Services;
use App\Http\HttpException;use App\Repositories\PosProductRepository;
final class PosService
{
    public function __construct(private readonly PosProductRepository$products){}
    public function products(array$query):array
    {
        $page=max(1,(int)($query['page']??1));$limit=min(100,max(1,(int)($query['limit']??60)));$category=($query['category_id']??'')===''?null:filter_var($query['category_id'],FILTER_VALIDATE_INT);if($category===false||($category!==null&&$category<1))throw new HttpException('Select a valid category.',422);$ids=[];$rawIds=trim((string)($query['ids']??''));if($rawIds!==''){foreach(explode(',',$rawIds)as$value){$id=filter_var(trim($value),FILTER_VALIDATE_INT);if($id===false||$id<1)throw new HttpException('Select valid products.',422);$ids[]=(int)$id;}$ids=array_values(array_unique(array_slice($ids,0,100)));}
        $barcode=trim((string)($query['barcode']??''));if($barcode!==''){if(mb_strlen($barcode)>100)throw new HttpException('Barcode is too long.',422);$product=$this->products->findByBarcode($barcode);if($product===null)throw new HttpException('No product was found for this barcode.',404);if($product['status']!=='active')throw new HttpException($product['name'].' is inactive and cannot be sold.',409);return['products'=>[$product],'pagination'=>['page'=>1,'limit'=>1,'total'=>1,'total_pages'=>1]];}
        return$this->products->paginate(['search'=>mb_substr(trim((string)($query['search']??'')),0,150),'category_id'=>$category===null?null:(int)$category,'ids'=>$ids,'page'=>$page,'limit'=>$limit]);
    }
    public function categories():array{return$this->products->activeCategories();}
}
