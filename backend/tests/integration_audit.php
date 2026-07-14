<?php

declare(strict_types=1);

use App\Config\Database;
use App\Http\HttpException;
use App\Repositories\ActivityLogRepository;
use App\Repositories\PermissionRepository;
use App\Repositories\UserRepository;
use App\Repositories\DashboardRepository;
use App\Repositories\ExpenseCategoryRepository;
use App\Repositories\ExpenseRepository;
use App\Repositories\HeldSaleRepository;
use App\Repositories\PaymentRepository;
use App\Repositories\ProductRepository;
use App\Repositories\PurchaseItemRepository;
use App\Repositories\PurchasePaymentRepository;
use App\Repositories\PurchaseRepository;
use App\Repositories\PurchaseReturnRepository;
use App\Repositories\RefundRepository;
use App\Repositories\ReportRepository;
use App\Repositories\PurchaseReportRepository;
use App\Repositories\SaleItemRepository;
use App\Repositories\SaleRepository;
use App\Repositories\SettingsRepository;
use App\Repositories\StockTransactionRepository;
use App\Repositories\SupplierRepository;
use App\Security\SessionManager;
use App\Services\AuthService;
use App\Services\DashboardService;
use App\Services\DatabaseBackupService;
use App\Services\ExpenseReceiptService;
use App\Services\ExpenseService;
use App\Services\ProductImageService;
use App\Services\ProductService;
use App\Services\PurchaseReturnService;
use App\Services\PurchaseService;
use App\Services\ReportService;
use App\Services\SaleService;
use App\Services\SystemConfigurationService;
use App\Validators\ExpenseValidator;
use App\Validators\ProductValidator;
use App\Validators\PurchaseReturnValidator;
use App\Validators\PurchaseValidator;
use App\Validators\ReportValidator;
use App\Validators\SaleValidator;
use App\Validators\SettingsValidator;

require_once __DIR__ . '/../autoload.php';

const TEST_DATABASE = 'mh_mini_mart_audit_test';

$assertions = 0;
$backupRoot = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'mh-mini-mart-audit-test';

function expect(bool $condition, string $message): void
{
    global $assertions;
    $assertions++;
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

function expectMoney(string|float|int $actual, string $expected, string $message): void
{
    expect(number_format((float) $actual, 2, '.', '') === $expected, $message . ' (received ' . $actual . ')');
}

function removeTree(string $directory): void
{
    if (!is_dir($directory)) {
        return;
    }
    foreach (new DirectoryIterator($directory) as $entry) {
        if ($entry->isDot()) {
            continue;
        }
        $entry->isDir() ? removeTree($entry->getPathname()) : unlink($entry->getPathname());
    }
    rmdir($directory);
}

$root = new PDO('mysql:host=127.0.0.1;port=3306;charset=utf8mb4', 'root', '', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::MYSQL_ATTR_MULTI_STATEMENTS => true,
]);

try {
    if (!is_dir($backupRoot) && !mkdir($backupRoot, 0770, true) && !is_dir($backupRoot)) {
        throw new RuntimeException('Unable to create isolated test storage.');
    }
    ini_set('session.save_path', $backupRoot);
    $root->exec('DROP DATABASE IF EXISTS ' . TEST_DATABASE);
    $schema = file_get_contents(__DIR__ . '/../../database/schema.sql');
    if ($schema === false) {
        throw new RuntimeException('Unable to read database schema.');
    }
    $root->exec(str_replace('mh_mini_mart', TEST_DATABASE, $schema));

    $database = new Database([
        'host' => '127.0.0.1',
        'port' => 3306,
        'database' => TEST_DATABASE,
        'username' => 'root',
        'password' => '',
    ]);
    $pdo = $database->connection();
    $adminPassword = bin2hex(random_bytes(12));
    $cashierPassword = bin2hex(random_bytes(12));
    $credentialInsert = $pdo->prepare(
        'INSERT INTO access_credentials (id,password_hash,name,role,is_active,session_version)
         VALUES (:id,:hash,:name,:role,1,1)'
    );
    $credentialInsert->execute([
        'id' => 1,
        'hash' => password_hash($adminPassword, PASSWORD_DEFAULT),
        'name' => 'Audit Admin',
        'role' => 'admin',
    ]);
    $credentialInsert->execute([
        'id' => 2,
        'hash' => password_hash($cashierPassword, PASSWORD_DEFAULT),
        'name' => 'Audit Cashier',
        'role' => 'cashier',
    ]);
    $pdo->prepare("INSERT INTO categories(name,description,status) VALUES(:name,NULL,'active')")
        ->execute(['name' => 'Audit Category']);
    $categoryId = (int) $pdo->lastInsertId();

    $activity = new ActivityLogRepository($database);
    $session = new SessionManager();
    $session->start();
    $login = (new AuthService(
        new UserRepository($database),
        new PermissionRepository($database),
        $activity,
        $session
    ))->login($cashierPassword);
    expect($login['user']['role'] === 'cashier', 'Password-only login must resolve the matching cashier.');
    expect(in_array('pos.access', $login['user']['permissions'], true), 'Cashier must receive POS access.');
    expect(!in_array('reports.profit', $login['user']['permissions'], true), 'Cashier must not receive profit access.');
    expect(!in_array('users.manage', $login['user']['permissions'], true), 'Cashier must not receive user management access.');
    expect(!in_array('backups.restore', $login['user']['permissions'], true), 'Cashier must not receive backup restore access.');
    $session->destroy();

    $permissions = new PermissionRepository($database);
    $permissions->replaceOverrides(2, ['reports.view' => 'allow', 'sales.complete' => 'deny']);
    $cashierPermissions = $permissions->effectiveKeys(2, 'cashier');
    expect(in_array('reports.view', $cashierPermissions, true), 'A valid allow override must grant the selected permission.');
    expect(!in_array('sales.complete', $cashierPermissions, true), 'A valid deny override must remove an inherited permission.');
    $permissions->replaceOverrides(2, []);

    $settingsValidator = new SettingsValidator();
    $settingsRepository = new SettingsRepository($database);
    $configuration = new SystemConfigurationService($settingsRepository, $settingsValidator);
    $settingsRepository->save($settingsValidator->validate([
        'shop' => ['shop_name' => 'Audit Shop'],
        'inventory' => ['global_tracking_enabled' => false],
    ]), 1, $settingsValidator->definitions());
    $configuration->refresh();
    expect($configuration->get('shop', 'shop_name') === 'Audit Shop', 'Saved settings must be available after configuration refresh.');
    expect($configuration->get('inventory', 'global_tracking_enabled') === false, 'Boolean settings must retain their type after persistence.');
    $products = new ProductRepository($database);
    $stock = new StockTransactionRepository($database);
    $productService = new ProductService(
        $database,
        $products,
        $stock,
        $activity,
        new ProductValidator(),
        new ProductImageService($backupRoot . DIRECTORY_SEPARATOR . 'products')
    );

    $product = $productService->create([
        'category_id' => $categoryId,
        'name' => 'Audit Loaf',
        'product_code' => 'AUDIT-LOAF',
        'barcode' => '990000000001',
        'purchase_cost' => '1.00',
        'selling_price' => '5.00',
        'quantity' => '10',
        'minimum_stock' => '2',
        'unit_type' => 'piece',
        'track_stock' => true,
        'status' => 'active',
    ], 1, true);
    $productId = (int) $product['id'];
    $opening = $pdo->query("SELECT * FROM stock_transactions WHERE product_id={$productId} ORDER BY id DESC LIMIT 1")->fetch();
    expect($opening['transaction_type'] === 'opening' && $opening['new_stock'] === '10.000', 'Product creation must record opening stock.');

    try {
        $productService->update($productId, [
            'category_id' => $categoryId,
            'name' => 'Audit Loaf',
            'product_code' => 'AUDIT-LOAF',
            'barcode' => '990000000001',
            'purchase_cost' => '1.00',
            'selling_price' => '5.00',
            'quantity' => '9',
            'minimum_stock' => '2',
            'unit_type' => 'piece',
            'track_stock' => true,
            'status' => 'active',
        ], 1, true);
        expect(false, 'Product editing must not bypass stock history.');
    } catch (HttpException $exception) {
        expect($exception->status() === 422, 'Direct product quantity edits must return 422.');
    }

    $sales = new SaleService(
        $database,
        new SaleRepository($database),
        new SaleItemRepository($database),
        new PaymentRepository($database),
        new RefundRepository($database),
        new HeldSaleRepository($database),
        $products,
        $stock,
        new SaleValidator(),
        $configuration,
        $activity
    );
    $admin = [
        'id' => 1,
        'permissions' => ['sales.view_all', 'sales.refund', 'sales.cancel', 'sales.reprint', 'products.costs.view'],
    ];


    $untrackedSale = $sales->complete(1, [
        'request_token' => 'audit-sale-untracked-0001',
        'items' => [['product_id' => $productId, 'quantity' => '1']],
        'discount_type' => 'none',
        'discount_value' => '0',
        'payment_method' => 'cash',
        'amount_received' => '5.00',
    ], true);
    expectMoney($products->find($productId)['quantity'], '10.00', 'A sale must not change stock while global tracking is disabled.');
    $settingsRepository->save(['inventory' => ['global_tracking_enabled' => true]], 1, $settingsValidator->definitions());
    $configuration->refresh();
    expect($configuration->get('inventory', 'global_tracking_enabled') === true, 'Updated inventory settings must take effect after refresh.');
    $sales->refund($admin, (int) $untrackedSale['sale']['id'], ['refund_method' => 'cash', 'reason' => 'Audit untracked refund']);
    expectMoney($products->find($productId)['quantity'], '10.00', 'Refund must not create stock when the original sale posted no stock transaction.');

    $sale = $sales->complete(1, [
        'request_token' => 'audit-sale-token-0001',
        'items' => [['product_id' => $productId, 'quantity' => '2']],
        'discount_type' => 'none',
        'discount_value' => '0',
        'payment_method' => 'cash',
        'amount_received' => '20.00',
    ], true);
    expectMoney($sale['sale']['grand_total'], '10.00', 'Sale total must be backend-calculated.');
    expectMoney($sale['sale']['change_returned'], '10.00', 'Cash change must be correct.');
    expectMoney($products->find($productId)['quantity'], '8.00', 'Sale must reduce stock.');

    $sales->refund($admin, (int) $sale['sale']['id'], ['refund_method' => 'cash', 'reason' => 'Audit refund']);
    expectMoney($products->find($productId)['quantity'], '10.00', 'Refund must restore only stock posted by the sale.');

    $sales->complete(1, [
        'request_token' => 'audit-sale-token-0002',
        'items' => [['product_id' => $productId, 'quantity' => '1']],
        'discount_type' => 'none',
        'discount_value' => '0',
        'payment_method' => 'cash',
        'amount_received' => '5.00',
    ], true);
    expectMoney($products->find($productId)['quantity'], '9.00', 'Second sale must leave expected stock.');

    $expenseCategoryId = (int) $pdo->query("SELECT id FROM expense_categories WHERE status='active' ORDER BY id LIMIT 1")->fetchColumn();
    $expenseService = new ExpenseService(
        new ExpenseRepository($database),
        new ExpenseCategoryRepository($database),
        new ExpenseValidator(),
        new ExpenseReceiptService($backupRoot . DIRECTORY_SEPARATOR . 'receipts'),
        $activity
    );
    $expenseService->create([
        'expense_category_id' => $expenseCategoryId,
        'title' => 'Audit expense',
        'amount' => '3.00',
        'expense_date' => date('Y-m-d'),
        'payment_method' => 'cash',
    ], null, 1);

    $dashboard = (new DashboardService(new DashboardRepository($database)))->overview([
        'id' => 1,
        'permissions' => ['reports.profit', 'sales.view_all'],
    ]);
    expectMoney($dashboard['summary']['today_sales'], '5.00', 'Dashboard net sales must exclude tax and refunded sales.');
    expectMoney($dashboard['summary']['today_expenses'], '3.00', 'Dashboard expenses must match active expenses.');
    expectMoney($dashboard['summary']['estimated_profit'], '1.00', 'Dashboard profit must use net sales minus historical cost and expenses.');

    $report = (new ReportService(
        new ReportRepository($database),
        new PurchaseReportRepository($database),
        new ReportValidator()
    ))->report('profit', ['date_from' => date('Y-m-d'), 'date_to' => date('Y-m-d')], [
        'id' => 1,
        'permissions' => ['reports.view', 'reports.profit', 'sales.view_all'],
    ]);
    expectMoney($report['summary']['net_sales'], '5.00', 'Reports and dashboard net sales must match.');
    expectMoney($report['summary']['estimated_net_profit'], '1.00', 'Reports and dashboard profit must match.');

    $suppliers = new SupplierRepository($database);
    $supplier = $suppliers->create([
        'name' => 'Audit Supplier',
        'contact_person' => null,
        'phone' => null,
        'alternate_phone' => null,
        'email' => null,
        'address' => null,
        'opening_balance' => '0.00',
        'notes' => null,
        'status' => 'active',
    ]);
    $purchaseRepository = new PurchaseRepository($database);
    $purchaseItems = new PurchaseItemRepository($database);
    $purchaseReturns = new PurchaseReturnRepository($database);
    $purchaseService = new PurchaseService(
        $database,
        $purchaseRepository,
        $purchaseItems,
        new PurchasePaymentRepository($database),
        $purchaseReturns,
        $suppliers,
        $products,
        $stock,
        new PurchaseValidator(),
        $activity,
        $configuration
    );
    $purchase = $purchaseService->create([
        'supplier_id' => $supplier['id'],
        'purchase_date' => date('Y-m-d'),
        'request_token' => '00000000-0000-4000-8000-000000000001',
        'items' => [[
            'product_id' => $productId,
            'quantity' => '5',
            'unit_cost' => '2.00',
            'line_discount' => '0',
        ]],
        'amount_paid' => '0',
        'payment_method' => 'cash',
    ], 1);
    expectMoney($products->find($productId)['quantity'], '14.00', 'Purchase must increase tracked stock.');
    expectMoney($suppliers->find((int) $supplier['id'])['current_balance'], '10.00', 'Purchase must increase supplier balance.');

    $purchase = $purchaseService->addPayment((int) $purchase['id'], [
        'amount' => '4.00',
        'payment_method' => 'cash',
        'payment_date' => date('Y-m-d'),
    ], 1);
    expectMoney($purchase['balance_due'], '6.00', 'Purchase payment must reduce the due amount.');
    expectMoney($suppliers->find((int) $supplier['id'])['current_balance'], '6.00', 'Purchase payment must reduce supplier balance.');

    try {
        $purchaseService->cancel((int) $purchase['id'], ['reason' => 'Audit cancellation'], 1);
        expect(false, 'Paid purchases must not be cancellable.');
    } catch (HttpException $exception) {
        expect($exception->status() === 409, 'Paid purchase cancellation must return 409.');
    }

    $returnService = new PurchaseReturnService(
        $database,
        $purchaseRepository,
        $purchaseItems,
        $purchaseReturns,
        $suppliers,
        $products,
        $stock,
        new PurchaseReturnValidator(),
        $activity
    );
    $returnService->create([
        'purchase_id' => $purchase['id'],
        'return_date' => date('Y-m-d'),
        'reason' => 'Audit damaged delivery',
        'refund_amount' => '0',
        'items' => [[
            'purchase_item_id' => $purchase['items'][0]['id'],
            'quantity' => '2',
        ]],
    ], 1);
    expectMoney($products->find($productId)['quantity'], '12.00', 'Purchase return must reduce stock.');
    expectMoney($purchaseRepository->find((int) $purchase['id'])['balance_due'], '2.00', 'Purchase return must reduce the outstanding due.');
    expectMoney($suppliers->find((int) $supplier['id'])['current_balance'], '2.00', 'Purchase return must reduce supplier balance.');

    $backupService = new DatabaseBackupService($database, $activity, $configuration, $backupRoot);
    $backup = $backupService->create(1);
    try {
        $backupService->restore($backup['filename'], 'wrong', 1);
        expect(false, 'Restore must require explicit confirmation.');
    } catch (HttpException $exception) {
        expect($exception->status() === 422, 'Restore confirmation failure must return 422.');
    }

    $pdo->prepare('UPDATE categories SET name=:name WHERE id=:id')->execute(['name' => 'Changed during audit', 'id' => $categoryId]);
    $backupService->restore($backup['filename'], 'RESTORE', 1);
    $restoredName = $pdo->query("SELECT name FROM categories WHERE id={$categoryId}")->fetchColumn();
    expect($restoredName === 'Audit Category', 'Verified backup restore must replace modified data.');

    echo "Integration audit passed: {$assertions} assertions.\n";
} finally {
    $root->exec('DROP DATABASE IF EXISTS ' . TEST_DATABASE);
    removeTree($backupRoot);
}