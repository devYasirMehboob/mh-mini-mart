<?php
declare(strict_types=1);
namespace App\Services;
use App\Http\HttpException;use finfo;
final class LogoUploadService{
 private const MAX_BYTES=2097152;private const TYPES=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'];
 public function __construct(private readonly string$directory,private readonly string$relative='uploads/settings'){}
 public function store(?array$file):string{if($file===null||($file['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK)throw new HttpException('Select a logo to upload.',422,['logo'=>['A JPG, PNG, or WebP logo is required.']]);$size=(int)($file['size']??0);if($size<1||$size>self::MAX_BYTES)throw new HttpException('The shop logo could not be uploaded.',422,['logo'=>['The logo must not exceed 2 MB.']]);$temporary=(string)($file['tmp_name']??'');$extension=self::TYPES[(new finfo(FILEINFO_MIME_TYPE))->file($temporary)]??null;if($extension===null)throw new HttpException('The shop logo could not be uploaded.',422,['logo'=>['Only JPG, PNG, and WebP images are allowed.']]);if(!is_dir($this->directory)&&!mkdir($this->directory,0755,true)&&!is_dir($this->directory))throw new HttpException('The shop logo could not be saved.',500);$filename=bin2hex(random_bytes(20)).'.'.$extension;$target=$this->directory.DIRECTORY_SEPARATOR.$filename;if(!move_uploaded_file($temporary,$target))throw new HttpException('The shop logo could not be saved.',500);return$this->relative.'/'.$filename;}
 public function delete(?string$path):void{if(!$path)return;$target=$this->directory.DIRECTORY_SEPARATOR.basename(str_replace('\\','/',$path));if(is_file($target)&&!unlink($target))error_log('Unable to remove an old shop logo.');}
}