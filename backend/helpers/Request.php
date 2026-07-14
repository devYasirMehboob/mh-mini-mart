<?php

declare(strict_types=1);
namespace App\Http;
use JsonException;
final class Request
{
 public function method(): string{$method=strtoupper($_SERVER['REQUEST_METHOD']??'GET');$override=strtoupper(trim((string)($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE']??'')));return$method==='POST'&&$override==='PUT'?'PUT':$method;}
 public function path(): string{$uri=parse_url($_SERVER['REQUEST_URI']??'/',PHP_URL_PATH)?:'/';$scriptName=str_replace('\\','/',$_SERVER['SCRIPT_NAME']??'');$directory=dirname($scriptName);if(basename($scriptName)==='index.php'&&$directory!=='/'&&str_starts_with($uri,$directory))$uri=substr($uri,strlen($directory));$path='/'.trim($uri,'/');if($path==='/api')return'/';if(str_starts_with($path,'/api/'))return substr($path,4);return$path;}
 public function query(): array{return is_array($_GET)?$_GET:[];}
 public function json(): array{$contentType=strtolower($_SERVER['CONTENT_TYPE']??'');if(!str_contains($contentType,'application/json'))throw new HttpException('The request body must use application/json.',400);$raw=file_get_contents('php://input');if($raw===false||trim($raw)==='')return[];try{$data=json_decode($raw,true,512,JSON_THROW_ON_ERROR);}catch(JsonException){throw new HttpException('The request contains invalid JSON.',400);}if(!is_array($data))throw new HttpException('The JSON request body must be an object.',400);return$data;}
 public function data(): array{$type=strtolower($_SERVER['CONTENT_TYPE']??'');return str_contains($type,'multipart/form-data')?(is_array($_POST)?$_POST:[]):$this->json();}
 public function file(string $name): ?array{$file=$_FILES[$name]??null;return is_array($file)?$file:null;}
}
