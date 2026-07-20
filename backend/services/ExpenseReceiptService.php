<?php

declare(strict_types=1);
namespace App\Services;
use App\Http\HttpException;
final class ExpenseReceiptService
{
 private const MAX=2097152; private const TYPES=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'];
 public function __construct(private readonly string $directory, private readonly string $relative = 'uploads'){}
 public function store(?array $file): ?string{if(!$file||($file['error']??UPLOAD_ERR_NO_FILE)===UPLOAD_ERR_NO_FILE)return null;if(($file['error']??UPLOAD_ERR_OK)!==UPLOAD_ERR_OK)throw new HttpException('The receipt image could not be uploaded.',422,['receipt'=>['Choose a valid receipt image.']]);$tmp=(string)($file['tmp_name']??'');if((int)($file['size']??0)>self::MAX)throw new HttpException('Receipt image must not exceed 2 MB.',422,['receipt'=>['Maximum file size is 2 MB.']]);$mime=(new \finfo(FILEINFO_MIME_TYPE))->file($tmp);if(!isset(self::TYPES[$mime]))throw new HttpException('Receipt must be a JPEG, PNG, or WebP image.',422,['receipt'=>['Unsupported image type.']]);if(!is_dir($this->directory)&&!mkdir($this->directory,0755,true)&&!is_dir($this->directory))throw new \RuntimeException('Unable to prepare receipt storage.');$name=bin2hex(random_bytes(16)).'.'.self::TYPES[$mime];$target=$this->directory.DIRECTORY_SEPARATOR.$name;$moved=is_uploaded_file($tmp)?move_uploaded_file($tmp,$target):(PHP_SAPI==='cli'&&copy($tmp,$target));if(!$moved)throw new HttpException('The receipt image could not be saved.',422);return $this->relative.'/'.$name;}
 public function delete(?string $path): void{if(!$path)return;$file=$this->directory.DIRECTORY_SEPARATOR.basename($path);if(is_file($file)&&!unlink($file))error_log('Unable to remove expense receipt: '.basename($path));}
}
