<?php
declare(strict_types=1);
namespace App\Controllers;
use App\Http\JsonResponse;use App\Http\Request;use App\Security\SessionManager;use App\Services\SettingsService;
final class SettingsController{
 public function __construct(private readonly Request$request,private readonly SettingsService$service,private readonly SessionManager$session){}
 public function index():never{JsonResponse::success('Settings retrieved successfully.',$this->service->withPublicUrls($this->service->all()));}
 public function public():never{JsonResponse::success('Public settings retrieved successfully.',$this->service->withPublicUrls($this->service->public()));}
 public function update(array$user):never{$this->session->verifyCsrfToken();JsonResponse::success('Settings saved successfully.',$this->service->withPublicUrls($this->service->update($this->request->json(),(int)$user['id'])));}
 public function uploadLogo(array$user):never{$this->session->verifyCsrfToken();JsonResponse::success('Shop logo updated successfully.',$this->service->uploadLogo($this->request->file('logo'),(int)$user['id']));}
 public function removeLogo(array$user):never{$this->session->verifyCsrfToken();$this->service->removeLogo((int)$user['id']);JsonResponse::success('Shop logo removed successfully.',['logo'=>'','logo_url'=>'']);}
}