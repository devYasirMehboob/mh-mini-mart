<?php

declare(strict_types=1);

use App\Config\Database;
use App\Controllers\AuthController;
use App\Controllers\CategoryController;
use App\Controllers\DashboardController;
use App\Controllers\ProductController;
use App\Controllers\InventoryController;
use App\Controllers\PosController;
use App\Controllers\HeldSaleController;
use App\Controllers\ExpenseController;
use App\Controllers\ExpenseCategoryController;
use App\Controllers\ReportController;
use App\Controllers\SaleController;
use App\Controllers\UserController;
use App\Controllers\RoleController;
use App\Controllers\SettingsController;
use App\Controllers\SupplierController;
use App\Controllers\PurchaseController;
use App\Controllers\PurchaseReturnController;
use App\Http\HttpException;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Middleware\AuthMiddleware;
use App\Repositories\AccessCredentialRepository;
use App\Repositories\CategoryRepository;
use App\Repositories\DashboardRepository;
use App\Repositories\ProductRepository;
use App\Repositories\InventoryRepository;
use App\Repositories\StockTransactionRepository;
use App\Repositories\SaleRepository;
use App\Repositories\SaleItemRepository;
use App\Repositories\PaymentRepository;
use App\Repositories\RefundRepository;
use App\Repositories\PosProductRepository;
use App\Repositories\HeldSaleRepository;
use App\Repositories\ExpenseRepository;
use App\Repositories\ExpenseCategoryRepository;
use App\Repositories\ReportRepository;
use App\Repositories\PurchaseReportRepository;
use App\Repositories\UserRepository;
use App\Repositories\RoleRepository;
use App\Repositories\PermissionRepository;
use App\Repositories\ActivityLogRepository;
use App\Repositories\SettingsRepository;
use App\Repositories\SupplierRepository;
use App\Repositories\PurchaseRepository;
use App\Repositories\PurchaseItemRepository;
use App\Repositories\PurchasePaymentRepository;
use App\Repositories\PurchaseReturnRepository;
use App\Security\SessionManager;
use App\Services\AuthService;
use App\Services\CategoryService;
use App\Services\DashboardService;
use App\Services\ProductImageService;
use App\Services\ProductService;
use App\Services\InventoryService;
use App\Services\SaleService;
use App\Services\SalesExportService;
use App\Services\PosService;
use App\Services\HeldSaleService;
use App\Services\ExpenseService;
use App\Services\ExpenseCategoryService;
use App\Services\ExpenseReceiptService;
use App\Services\ExpenseExportService;
use App\Services\ReportService;
use App\Services\ReportExportService;
use App\Services\AuthorizationService;
use App\Services\PasswordService;
use App\Services\UserService;
use App\Services\RoleService;
use App\Services\SettingsService;
use App\Services\SystemConfigurationService;
use App\Services\LogoUploadService;
use App\Services\SupplierService;
use App\Services\PurchaseService;
use App\Services\PurchaseReturnService;
use App\Services\PurchaseExportService;
use App\Validators\CategoryValidator;
use App\Validators\ProductValidator;
use App\Validators\InventoryValidator;
use App\Validators\SaleValidator;
use App\Validators\HeldSaleValidator;
use App\Validators\ExpenseValidator;
use App\Validators\ExpenseCategoryValidator;
use App\Validators\ReportValidator;
use App\Validators\UserValidator;
use App\Validators\SettingsValidator;
use App\Validators\SupplierValidator;
use App\Validators\PurchaseValidator;
use App\Validators\PurchaseReturnValidator;

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

$allowedOrigin = 'http://localhost:5173';
$requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';

if ($requestOrigin === $allowedOrigin) {
    header('Access-Control-Allow-Origin: ' . $allowedOrigin);
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
}

header('Access-Control-Allow-Headers: Content-Type, Accept, X-CSRF-Token, X-HTTP-Method-Override');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$composerAutoload = __DIR__ . '/../../vendor/autoload.php';
if (is_file($composerAutoload)) {
    require_once $composerAutoload;
}
require_once __DIR__ . '/../autoload.php';

$localConfig = __DIR__ . '/../config/database.local.php';
$configFile = is_file($localConfig)
    ? $localConfig
    : __DIR__ . '/../config/database.example.php';

try {
    $database = new Database(require $configFile);
    $request = new Request();
    $session = new SessionManager();
    $session->start();

    $userRepository = new UserRepository($database);
    $roleRepository = new RoleRepository($database);
    $permissionRepository = new PermissionRepository($database);
    $activityRepository = new ActivityLogRepository($database);
    $settingsRepository = new SettingsRepository($database);
    $settingsValidator = new SettingsValidator();
    $configuration = new SystemConfigurationService($settingsRepository, $settingsValidator);
    $configuration->applyTimezone();
    $settingsService = new SettingsService(
        $settingsRepository,
        $settingsValidator,
        $configuration,
        new LogoUploadService(__DIR__ . '/../uploads/settings'),
        $activityRepository
    );
    $settingsController = new SettingsController($request, $settingsService, $session);
    $authorizationService = new AuthorizationService($userRepository, $permissionRepository, $session, $configuration);
    $authMiddleware = new AuthMiddleware($session, $authorizationService);
    $authService = new AuthService($userRepository, $permissionRepository, $activityRepository, $session);
    $authController = new AuthController($request, $authService, $authMiddleware, $session);
    $userController = new UserController(
        $request,
        new UserService($userRepository, $roleRepository, $permissionRepository, $activityRepository, new UserValidator(), new PasswordService($userRepository)),
        $session
    );
    $roleController = new RoleController(
        $request,
        new RoleService($roleRepository, $permissionRepository, $activityRepository),
        $session
    );
    $supplierRepository = new SupplierRepository($database);
    $purchaseRepository = new PurchaseRepository($database);
    $purchaseItemRepository = new PurchaseItemRepository($database);
    $purchasePaymentRepository = new PurchasePaymentRepository($database);
    $purchaseReturnRepository = new PurchaseReturnRepository($database);
    $supplierController = new SupplierController(
        $request,
        new SupplierService($supplierRepository, new SupplierValidator(), $activityRepository),
        $session
    );
    $purchaseService = new PurchaseService(
        $database,
        $purchaseRepository,
        $purchaseItemRepository,
        $purchasePaymentRepository,
        $purchaseReturnRepository,
        $supplierRepository,
        new ProductRepository($database),
        new StockTransactionRepository($database),
        new PurchaseValidator(),
        $activityRepository,
        $configuration
    );
    $purchaseController = new PurchaseController($request, $purchaseService, new PurchaseExportService(), $session);
    $purchaseReturnController = new PurchaseReturnController(
        $request,
        new PurchaseReturnService(
            $database,
            $purchaseRepository,
            $purchaseItemRepository,
            $purchaseReturnRepository,
            $supplierRepository,
            new ProductRepository($database),
            new StockTransactionRepository($database),
            new PurchaseReturnValidator(),
            $activityRepository
        ),
        $session
    );

    $categoryController = new CategoryController(
        $request,
        new CategoryService(
            new CategoryRepository($database),
            new CategoryValidator()
        ),
        $session
    );

    $productController = new ProductController(
        $request,
        new ProductService(
            new ProductRepository($database),
            new ProductValidator(),
            new ProductImageService(__DIR__ . '/../uploads/products')
        ),
        $session
    );

$inventoryController = new InventoryController(
        $request,
        new InventoryService(
            $database,
            new InventoryRepository($database),
            new StockTransactionRepository($database),
            new InventoryValidator()
        ),
        $authMiddleware,
        $session
    );

    $posProductRepository = new PosProductRepository($database);
    $heldSaleRepository = new HeldSaleRepository($database);
    $posController = new PosController($request, new PosService($posProductRepository));
    $heldSaleController = new HeldSaleController($request, new HeldSaleService($database, $heldSaleRepository, $posProductRepository, new HeldSaleValidator()), $session);

    $saleRepository = new SaleRepository($database);
    $salesExportService = new SalesExportService($saleRepository);
    $saleController = new SaleController(
        $request,
        new SaleService(
            $database,
            $saleRepository,
            new SaleItemRepository($database),
            new PaymentRepository($database),
            new RefundRepository($database),
            $heldSaleRepository,
            new ProductRepository($database),
            new StockTransactionRepository($database),
            new SaleValidator(),
            $configuration
        ),
        $salesExportService,
        $session
    );

    $expenseRepository = new ExpenseRepository($database);
    $expenseCategoryRepository = new ExpenseCategoryRepository($database);
    $expenseController = new ExpenseController(
        $request,
        new ExpenseService($expenseRepository, $expenseCategoryRepository, new ExpenseValidator(), new ExpenseReceiptService(__DIR__ . '/../uploads/expenses')),
        new ExpenseExportService($expenseRepository),
        $session
    );
    $expenseCategoryController = new ExpenseCategoryController(
        $request,
        new ExpenseCategoryService($expenseCategoryRepository, new ExpenseCategoryValidator()),
        $session
    );
    $reportRepository = new ReportRepository($database);
    $reportService = new ReportService($reportRepository, new PurchaseReportRepository($database), new ReportValidator());
    $reportController = new ReportController(
        $request,
        $reportService,
        new ReportExportService($reportService)
    );
    $dashboardController = new DashboardController(
        new DashboardService(new DashboardRepository($database))
    );

    $method = $request->method();
    $path = $request->path();

    if ($method === 'GET' && $path === '/csrf-token') {
        JsonResponse::success(
            'CSRF token created.',
            ['csrfToken' => $session->csrfToken()]
        );
    }

    if ($method === 'POST' && $path === '/auth/login') {
        $authController->login();
    }

    if ($method === 'GET' && $path === '/settings/public') {
        $settingsController->public();
    }

    $authenticatedUser = $authMiddleware->requireUser();

    if (str_starts_with($path, '/settings')) {
        $authorizationService->requirePermission($authenticatedUser, 'settings.manage');
        if ($method === 'GET' && $path === '/settings') $settingsController->index();
        if ($method === 'PUT' && $path === '/settings') $settingsController->update($authenticatedUser);
        if ($method === 'POST' && $path === '/settings/logo') $settingsController->uploadLogo($authenticatedUser);
        if ($method === 'DELETE' && $path === '/settings/logo') $settingsController->removeLogo($authenticatedUser);
    }

    if ($method === 'GET' && $path === '/health') {
        $database->ping();
        JsonResponse::success(
            'MH Mini Mart API is available.',
            ['database' => 'connected']
        );
    }

    if ($method === 'GET' && $path === '/auth/me') {
        $authController->currentUser();
    }

    if ($method === 'POST' && $path === '/auth/logout') {
        $authController->logout();
    }

    if (str_starts_with($path, '/users')) {
        $authorizationService->requirePermission($authenticatedUser, 'users.manage');
        if ($method === 'GET' && $path === '/users') $userController->index();
        if ($method === 'POST' && $path === '/users') $userController->store($authenticatedUser);
        if ($method === 'GET' && preg_match('#^/users/([1-9][0-9]*)$#', $path, $matches) === 1) $userController->show((int) $matches[1]);
        if ($method === 'PUT' && preg_match('#^/users/([1-9][0-9]*)$#', $path, $matches) === 1) $userController->update((int) $matches[1], $authenticatedUser);
        if ($method === 'DELETE' && preg_match('#^/users/([1-9][0-9]*)$#', $path, $matches) === 1) $userController->destroy((int) $matches[1], $authenticatedUser);
        if ($method === 'PATCH' && preg_match('#^/users/([1-9][0-9]*)/status$#', $path, $matches) === 1) $userController->status((int) $matches[1], $authenticatedUser);
        if ($method === 'POST' && preg_match('#^/users/([1-9][0-9]*)/reset-password$#', $path, $matches) === 1) $userController->resetPassword((int) $matches[1], $authenticatedUser);
        if ($method === 'GET' && preg_match('#^/users/([1-9][0-9]*)/permissions$#', $path, $matches) === 1) $userController->permissions((int) $matches[1]);
        if ($method === 'PUT' && preg_match('#^/users/([1-9][0-9]*)/permissions$#', $path, $matches) === 1) $userController->updatePermissions((int) $matches[1], $authenticatedUser);
    }
    if ($method === 'GET' && $path === '/roles') {
        $authorizationService->requirePermission($authenticatedUser, 'users.manage');
        $roleController->index();
    }
    if ($method === 'GET' && $path === '/permissions') {
        $authorizationService->requirePermission($authenticatedUser, 'users.manage');
        $roleController->permissions();
    }
    if (preg_match('#^/roles/([1-9][0-9]*)/permissions$#', $path, $matches) === 1) {
        $authorizationService->requirePermission($authenticatedUser, 'users.manage');
        if ($method === 'GET') $roleController->showPermissions((int) $matches[1]);
        if ($method === 'PUT') $roleController->updatePermissions((int) $matches[1], $authenticatedUser);
    }
    if (str_starts_with($path, '/suppliers')) {
        if ($method === 'GET') $authorizationService->requirePermission($authenticatedUser, 'suppliers.view');
        else $authorizationService->requirePermission($authenticatedUser, 'suppliers.manage');
        if ($method === 'GET' && $path === '/suppliers') $supplierController->index();
        if ($method === 'GET' && $path === '/suppliers/options') $supplierController->options();
        if ($method === 'POST' && $path === '/suppliers') $supplierController->store($authenticatedUser);
        if ($method === 'GET' && preg_match('#^/suppliers/([1-9][0-9]*)$#', $path, $matches) === 1) $supplierController->show((int)$matches[1]);
        if ($method === 'PUT' && preg_match('#^/suppliers/([1-9][0-9]*)$#', $path, $matches) === 1) $supplierController->update((int)$matches[1], $authenticatedUser);
        if ($method === 'DELETE' && preg_match('#^/suppliers/([1-9][0-9]*)$#', $path, $matches) === 1) $supplierController->destroy((int)$matches[1], $authenticatedUser);
        if ($method === 'PATCH' && preg_match('#^/suppliers/([1-9][0-9]*)/status$#', $path, $matches) === 1) $supplierController->status((int)$matches[1], $authenticatedUser);
        if ($method === 'GET' && preg_match('#^/suppliers/([1-9][0-9]*)/purchases$#', $path, $matches) === 1) $supplierController->purchases((int)$matches[1]);
        if ($method === 'GET' && preg_match('#^/suppliers/([1-9][0-9]*)/payments$#', $path, $matches) === 1) $supplierController->payments((int)$matches[1]);
        if ($method === 'GET' && preg_match('#^/suppliers/([1-9][0-9]*)/statement$#', $path, $matches) === 1) $supplierController->statement((int)$matches[1]);
    }

    if (str_starts_with($path, '/purchases')) {
        if ($method === 'GET') $authorizationService->requirePermission($authenticatedUser, 'purchases.view');
        if ($method === 'POST' && in_array($path, ['/purchases','/purchases/drafts'], true)) $authorizationService->requirePermission($authenticatedUser, 'purchases.create');
        if ($method === 'PUT' || str_ends_with($path, '/complete')) $authorizationService->requirePermission($authenticatedUser, 'purchases.update');
        if (str_ends_with($path, '/payments') && $method === 'POST') $authorizationService->requirePermission($authenticatedUser, 'purchases.pay');
        if (str_ends_with($path, '/cancel')) $authorizationService->requirePermission($authenticatedUser, 'purchases.cancel');
        if (str_ends_with($path, '/returnable-items')) $authorizationService->requirePermission($authenticatedUser, 'purchases.return');
        if ($path === '/purchases/export') $authorizationService->requirePermission($authenticatedUser, 'purchases.export');
        if ($method === 'GET' && $path === '/purchases') $purchaseController->index();
        if ($method === 'GET' && $path === '/purchases/export') $purchaseController->export();
        if ($method === 'POST' && $path === '/purchases') $purchaseController->store($authenticatedUser, false);
        if ($method === 'POST' && $path === '/purchases/drafts') $purchaseController->store($authenticatedUser, true);
        if ($method === 'GET' && preg_match('#^/purchases/([1-9][0-9]*)$#', $path, $matches) === 1) $purchaseController->show((int)$matches[1]);
        if ($method === 'PUT' && preg_match('#^/purchases/([1-9][0-9]*)$#', $path, $matches) === 1) $purchaseController->update((int)$matches[1], $authenticatedUser);
        if ($method === 'POST' && preg_match('#^/purchases/([1-9][0-9]*)/complete$#', $path, $matches) === 1) $purchaseController->complete((int)$matches[1], $authenticatedUser);
        if ($method === 'GET' && preg_match('#^/purchases/([1-9][0-9]*)/payments$#', $path, $matches) === 1) $purchaseController->payments((int)$matches[1]);
        if ($method === 'POST' && preg_match('#^/purchases/([1-9][0-9]*)/payments$#', $path, $matches) === 1) $purchaseController->payment((int)$matches[1], $authenticatedUser);
        if ($method === 'POST' && preg_match('#^/purchases/([1-9][0-9]*)/cancel$#', $path, $matches) === 1) $purchaseController->cancel((int)$matches[1], $authenticatedUser);
        if ($method === 'GET' && preg_match('#^/purchases/([1-9][0-9]*)/returnable-items$#', $path, $matches) === 1) $purchaseController->returnable((int)$matches[1]);
    }

    if (str_starts_with($path, '/purchase-returns')) {
        if ($method === 'GET') $authorizationService->requirePermission($authenticatedUser, 'purchases.view');
        else $authorizationService->requirePermission($authenticatedUser, 'purchases.return');
        if ($method === 'GET' && $path === '/purchase-returns') $purchaseReturnController->index();
        if ($method === 'POST' && $path === '/purchase-returns') $purchaseReturnController->store($authenticatedUser);
        if ($method === 'GET' && preg_match('#^/purchase-returns/([1-9][0-9]*)$#', $path, $matches) === 1) $purchaseReturnController->show((int)$matches[1]);
    }

    if ($method === 'GET' && $path === '/dashboard') {
        $authorizationService->requirePermission($authenticatedUser, 'dashboard.view');
        $dashboardController->index($authenticatedUser);
    }

    if (str_starts_with($path, '/categories')) {
        $authorizationService->requirePermission($authenticatedUser, 'categories.manage');

        if ($method === 'GET' && $path === '/categories') {
            $categoryController->index();
        }

        if ($method === 'POST' && $path === '/categories') {
            $categoryController->store();
        }

        if (preg_match('#^/categories/([1-9][0-9]*)$#', $path, $matches) === 1) {
            $categoryId = (int) $matches[1];

            if ($method === 'GET') {
                $categoryController->show($categoryId);
            }

            if ($method === 'PUT') {
                $categoryController->update($categoryId);
            }

            if ($method === 'DELETE') {
                $categoryController->destroy($categoryId);
            }
        }

        if ($method === 'PATCH'
            && preg_match('#^/categories/([1-9][0-9]*)/status$#', $path, $matches) === 1
        ) {
            $categoryController->updateStatus((int) $matches[1]);
        }
    }

if (str_starts_with($path, '/products')) {
        if ($method === 'GET') $authorizationService->requirePermission($authenticatedUser, 'products.view');
        if ($method === 'POST') $authorizationService->requirePermission($authenticatedUser, 'products.create');
        if (in_array($method, ['PUT','PATCH'], true)) $authorizationService->requirePermission($authenticatedUser, 'products.update');
        if ($method === 'DELETE') $authorizationService->requirePermission($authenticatedUser, 'products.delete');
        if ($method === 'GET' && $path === '/products') {
            $productController->index();
        }


        if ($method === 'POST' && $path === '/products') {
            $productController->store();
        }

        if (preg_match('#^/products/([1-9][0-9]*)$#', $path, $matches) === 1) {
            $productId = (int) $matches[1];

            if ($method === 'GET') {
                $productController->show($productId);
            }

            if ($method === 'PUT') {
                $productController->update($productId);
            }

            if ($method === 'DELETE') {
                $productController->destroy($productId);
            }
        }

        if ($method === 'PATCH'
            && preg_match('#^/products/([1-9][0-9]*)/status$#', $path, $matches) === 1
        ) {
            $productController->updateStatus((int) $matches[1]);
        }
    }

if (str_starts_with($path, '/inventory')) {
        $authorizationService->requirePermission($authenticatedUser, 'inventory.view');

        if ($method === 'GET' && $path === '/inventory') {
            $inventoryController->index();
        }

        if ($method === 'GET' && $path === '/inventory/summary') {
            $inventoryController->summary();
        }

        if ($method === 'GET' && $path === '/inventory/transactions') {
            $inventoryController->transactions();
        }

        if ($method === 'GET'
            && preg_match('#^/inventory/products/([1-9][0-9]*)/transactions$#', $path, $matches) === 1
        ) {
            $inventoryController->productTransactions((int) $matches[1]);
        }

        $stockRoutes = [
            '/inventory/add' => ['addition', 'Stock added successfully.'],
            '/inventory/reduce' => ['reduction', 'Stock reduced successfully.'],
            '/inventory/adjust' => ['adjustment', 'Stock adjusted successfully.'],
            '/inventory/opening-stock' => ['opening', 'Opening stock saved successfully.'],
            '/inventory/damaged' => ['damaged', 'Damaged stock recorded successfully.'],
            '/inventory/expired' => ['expired', 'Expired stock recorded successfully.'],
            '/inventory/wastage' => ['wastage', 'Wastage recorded successfully.'],
        ];

        if ($method === 'POST' && isset($stockRoutes[$path])) {
            [$transactionType, $message] = $stockRoutes[$path];
            $inventoryController->changeStock($transactionType, $message);
        }
    }

    if ($method === 'GET' && $path === '/pos/products') { $authorizationService->requirePermission($authenticatedUser, 'pos.access'); $posController->products(); }
    if ($method === 'GET' && $path === '/pos/categories') { $authorizationService->requirePermission($authenticatedUser, 'pos.access'); $posController->categories(); }

    if (str_starts_with($path, '/held-sales')) {
        $authorizationService->requirePermission($authenticatedUser, 'sales.hold');
        if ($method === 'GET' && $path === '/held-sales') $heldSaleController->index($authenticatedUser);
        if ($method === 'POST' && $path === '/held-sales') $heldSaleController->store($authenticatedUser);
        if (preg_match('#^/held-sales/([1-9][0-9]*)$#', $path, $matches) === 1) {
            if ($method === 'GET') $heldSaleController->show($authenticatedUser, (int) $matches[1]);
            if ($method === 'PUT') $heldSaleController->update($authenticatedUser, (int) $matches[1]);
            if ($method === 'DELETE') $heldSaleController->destroy($authenticatedUser, (int) $matches[1]);
        }
    }
    if (str_starts_with($path, '/sales')) {
        if ($method === 'GET') $authorizationService->requirePermission($authenticatedUser, 'sales.view');
        if ($method === 'GET' && str_ends_with($path, '/receipt')) $authorizationService->requirePermission($authenticatedUser, 'sales.reprint');
        if ($method === 'POST' && $path === '/sales') $authorizationService->requirePermission($authenticatedUser, 'sales.complete');
        if (str_ends_with($path, '/cancel')) $authorizationService->requirePermission($authenticatedUser, 'sales.cancel');
        if (str_ends_with($path, '/refund')) $authorizationService->requirePermission($authenticatedUser, 'sales.refund');
        if ($method === 'GET' && $path === '/sales') $saleController->index($authenticatedUser);
        if ($method === 'GET' && $path === '/sales/summary') $saleController->summary($authenticatedUser);
        if ($method === 'GET' && $path === '/sales/export') $saleController->export($authenticatedUser);
        if ($method === 'POST' && $path === '/sales') $saleController->store($authenticatedUser);
        if ($method === 'GET' && preg_match('#^/sales/([1-9][0-9]*)$#', $path, $matches) === 1) $saleController->show($authenticatedUser, (int) $matches[1]);
        if ($method === 'GET' && preg_match('#^/sales/([1-9][0-9]*)/receipt$#', $path, $matches) === 1) $saleController->receipt($authenticatedUser, (int) $matches[1]);
        if ($method === 'POST' && preg_match('#^/sales/([1-9][0-9]*)/cancel$#', $path, $matches) === 1) $saleController->cancel($authenticatedUser, (int) $matches[1]);
        if ($method === 'POST' && preg_match('#^/sales/([1-9][0-9]*)/refund$#', $path, $matches) === 1) $saleController->refund($authenticatedUser, (int) $matches[1]);
    }

    if (str_starts_with($path, '/expenses')) {
        if ($method === 'GET') $authorizationService->requirePermission($authenticatedUser, 'expenses.view');
        else $authorizationService->requirePermission($authenticatedUser, 'expenses.manage');
        if ($method === 'GET' && $path === '/expenses') $expenseController->index();
        if ($method === 'GET' && $path === '/expenses/summary') $expenseController->summary();
        if ($method === 'GET' && $path === '/expenses/export') $expenseController->export();
        if ($method === 'POST' && $path === '/expenses') $expenseController->store($authenticatedUser);
        if (preg_match('#^/expenses/([1-9][0-9]*)$#', $path, $matches) === 1) {
            if ($method === 'GET') $expenseController->show((int) $matches[1]);
            if ($method === 'PUT') $expenseController->update((int) $matches[1]);
            if ($method === 'DELETE') $expenseController->void((int) $matches[1], $authenticatedUser);
        }
    }
    if (str_starts_with($path, '/expense-categories')) {
        $authorizationService->requirePermission($authenticatedUser, 'expenses.manage');
        if ($method === 'GET' && $path === '/expense-categories') $expenseCategoryController->index();
        if ($method === 'POST' && $path === '/expense-categories') $expenseCategoryController->store();
        if (preg_match('#^/expense-categories/([1-9][0-9]*)$#', $path, $matches) === 1) {
            if ($method === 'GET') $expenseCategoryController->show((int) $matches[1]);
            if ($method === 'PUT') $expenseCategoryController->update((int) $matches[1]);
            if ($method === 'DELETE') $expenseCategoryController->destroy((int) $matches[1]);
        }
        if ($method === 'PATCH' && preg_match('#^/expense-categories/([1-9][0-9]*)/status$#', $path, $matches) === 1) $expenseCategoryController->status((int) $matches[1]);
    }
    if (str_starts_with($path, '/reports')) {
        $authorizationService->requirePermission($authenticatedUser, 'reports.view');
        if ($path === '/reports/export') $authorizationService->requirePermission($authenticatedUser, 'reports.export');
        if ($path === '/reports/profit') $authorizationService->requirePermission($authenticatedUser, 'reports.profit');
        if ($method === 'GET' && $path === '/reports/options') $reportController->options($authenticatedUser);
        if ($method === 'GET' && $path === '/reports/export') $reportController->export($authenticatedUser);
        $reportRoutes = [
            '/reports/overview' => 'overview',
            '/reports/sales' => 'sales',
            '/reports/sales/daily' => 'daily_sales',
            '/reports/sales/weekly' => 'weekly_sales',
            '/reports/sales/monthly' => 'monthly_sales',
            '/reports/products' => 'products',
            '/reports/categories' => 'categories',
            '/reports/cashiers' => 'cashiers',
            '/reports/payment-methods' => 'payment_methods',
            '/reports/expenses' => 'expenses',
            '/reports/profit' => 'profit',
            '/reports/stock' => 'stock',
            '/reports/stock/low' => 'low_stock',
            '/reports/stock/out' => 'out_of_stock',
            '/reports/wastage' => 'wastage',
            '/reports/best-selling-products' => 'best_selling_products',
            '/reports/purchases' => 'purchase_summary',
            '/reports/purchases/suppliers' => 'supplier_purchases',
            '/reports/purchases/products' => 'product_purchases',
            '/reports/purchases/monthly' => 'monthly_purchases',
            '/reports/purchases/outstanding' => 'supplier_balances',
            '/reports/purchases/payments' => 'purchase_payments',
            '/reports/purchases/returns' => 'purchase_returns',
        ];
        if ($method === 'GET' && isset($reportRoutes[$path])) $reportController->show($reportRoutes[$path], $authenticatedUser);
    }
    JsonResponse::error('The requested API endpoint was not found.', 404);
} catch (HttpException $exception) {
    JsonResponse::error(
        $exception->getMessage(),
        $exception->status(),
        $exception->errors()
    );
} catch (PDOException $exception) {
    error_log('Database error: ' . $exception->getMessage());
    JsonResponse::error(
        'The database is currently unavailable. Please check the local server and try again.',
        503
    );
} catch (Throwable $exception) {
    error_log('Unexpected API error: ' . $exception->getMessage());
    JsonResponse::error('The request could not be completed.', 500);
}





