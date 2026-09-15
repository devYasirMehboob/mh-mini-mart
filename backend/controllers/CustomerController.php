<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http\JsonResponse;
use App\Http\Request;
use App\Services\AuthorizationService;
use App\Services\CustomerLedgerService;
use App\Services\CustomerPaymentService;
use App\Services\CustomerService;
use App\Security\SessionManager;
use App\Repositories\SaleRepository;

final class CustomerController
{
    public function __construct(
        private readonly Request               $request,
        private readonly CustomerService       $customers,
        private readonly CustomerLedgerService $ledger,
        private readonly CustomerPaymentService $payments,
        private readonly AuthorizationService  $auth,
        private readonly SessionManager        $session,
        private readonly SaleRepository        $sales
    ) {}

    // GET /customers
    public function index(): void
    {
        $user = $this->auth->resolve($this->session->user());
        $this->auth->requirePermission($user, 'customers.view');
        $result = $this->customers->list($this->request->query());
        JsonResponse::success('Customers retrieved.', $result);
    }

    // GET /customers/metrics
    public function metrics(): void
    {
        $user = $this->auth->resolve($this->session->user());
        $this->auth->requirePermission($user, 'customers.view');
        $metrics = $this->customers->getGlobalMetrics();
        JsonResponse::success('Customer metrics retrieved.', ['metrics' => $metrics]);
    }

    // GET /customers/search
    public function search(): void
    {
        $user = $this->auth->resolve($this->session->user());
        $this->auth->requirePermission($user, 'customers.view');
        $query   = trim((string) ($this->request->query()['q'] ?? ''));
        $limit   = min(max(1, (int) ($this->request->query()['limit'] ?? 10)), 30);
        $results = $this->customers->search($query, $limit);
        JsonResponse::success('Customers found.', ['customers' => $results]);
    }

    // POST /customers
    public function store(): void
    {
        $user = $this->auth->resolve($this->session->user());
        $this->auth->requirePermission($user, 'customers.create');
        $customer = $this->customers->create((int) $user['id'], $this->request->json());
        JsonResponse::success('Customer created successfully.', ['customer' => $customer], 201);
    }

    // POST /customers/quick-add
    public function quickAdd(): void
    {
        $user = $this->auth->resolve($this->session->user());
        $this->auth->requirePermission($user, 'customers.create');
        $customer = $this->customers->quickAdd((int) $user['id'], $this->request->json());
        JsonResponse::success('Customer created and selected.', ['customer' => $customer], 201);
    }

    // GET /customers/{id}
    public function show(int $id): void
    {
        $user = $this->auth->resolve($this->session->user());
        $this->auth->requirePermission($user, 'customers.view');
        $customer = $this->customers->getById($id);
        JsonResponse::success('Customer retrieved.', ['customer' => $customer]);
    }

    // GET /customers/{id}/summary
    public function summary(int $id): void
    {
        $user = $this->auth->resolve($this->session->user());
        $this->auth->requirePermission($user, 'customers.view');
        $summary = $this->customers->getSummary($id);
        JsonResponse::success('Customer summary retrieved.', ['customer' => $summary]);
    }

    // GET /customers/{id}/credit-summary
    public function creditSummary(int $id): void
    {
        $user = $this->auth->resolve($this->session->user());
        $this->auth->requirePermission($user, 'customers.view');
        $summary = $this->customers->getCreditSummary($id);
        JsonResponse::success('Customer credit summary retrieved.', ['customer' => $summary]);
    }

    // PUT /customers/{id}
    public function update(int $id): void
    {
        $user = $this->auth->resolve($this->session->user());
        $this->auth->requirePermission($user, 'customers.update');
        $customer = $this->customers->update((int) $user['id'], $id, $this->request->json());
        JsonResponse::success('Customer updated successfully.', ['customer' => $customer]);
    }

    // PATCH /customers/{id}/status
    public function status(int $id): void
    {
        $user = $this->auth->resolve($this->session->user());
        $this->auth->requirePermission($user, 'customers.deactivate');
        $body   = $this->request->json();
        $status = trim((string) ($body['status'] ?? ''));
        $customer = $this->customers->setStatus((int) $user['id'], $id, $status);
        JsonResponse::success('Customer status updated.', ['customer' => $customer]);
    }

    // GET /customers/{id}/ledger
    public function ledger(int $id): void
    {
        $user = $this->auth->resolve($this->session->user());
        $this->auth->requirePermission($user, 'customers.view_ledger');
        $query  = $this->request->query();
        $page   = max(1, (int) ($query['page'] ?? 1));
        $limit  = min(max(1, (int) ($query['limit'] ?? 20)), 100);
        $result = $this->ledger->getLedger($id, $page, $limit);
        JsonResponse::success('Ledger retrieved.', $result);
    }

    // GET /customers/{id}/statement
    public function statement(int $id): void
    {
        $user = $this->auth->resolve($this->session->user());
        $this->auth->requirePermission($user, 'customers.view_ledger');
        $query   = $this->request->query();
        $filters = [
            'date_from' => trim((string) ($query['date_from'] ?? '')),
            'date_to'   => trim((string) ($query['date_to'] ?? '')),
        ];
        $result = $this->ledger->getStatement($id, $filters);
        JsonResponse::success('Statement retrieved.', $result);
    }

    // GET /customers/{id}/balance
    public function balance(int $id): void
    {
        $user = $this->auth->resolve($this->session->user());
        $this->auth->requirePermission($user, 'customers.view');
        $summary = $this->customers->getCreditSummary($id);
        JsonResponse::success('Customer balance retrieved.', ['balance' => $summary]);
    }

    // GET /customers/{id}/purchases
    public function purchases(int $id): void
    {
        $user = $this->auth->resolve($this->session->user());
        $this->auth->requirePermission($user, 'customers.view');
        $query   = $this->request->query();
        $page    = max(1, (int) ($query['page'] ?? 1));
        $limit   = min(max(1, (int) ($query['limit'] ?? 20)), 100);
        $offset  = ($page - 1) * $limit;

        $result = $this->sales->paginateByCustomer($id, $page, $limit);
        JsonResponse::success('Purchases retrieved.', $result);
    }

    // POST /customers/{id}/payments
    public function receivePayment(int $id): void
    {
        $user = $this->auth->resolve($this->session->user());
        $this->auth->requirePermission($user, 'customers.receive_payment');
        $result = $this->payments->receive((int) $user['id'], $id, $this->request->json());
        $message = $result['already_recorded'] ? 'Payment was already recorded.' : 'Payment received successfully.';
        JsonResponse::success($message, ['payment' => $result['payment']]);
    }

    // GET /customers/{id}/payments
    public function listPayments(int $id): void
    {
        $user = $this->auth->resolve($this->session->user());
        $this->auth->requirePermission($user, 'customers.view_ledger');
        $query   = $this->request->query();
        $page    = max(1, (int) ($query['page'] ?? 1));
        $limit   = min(max(1, (int) ($query['limit'] ?? 20)), 100);
        $result  = $this->payments->getPayments($id, $page, $limit);
        JsonResponse::success('Payments retrieved.', $result);
    }

    // GET /customers/{id}/reconcile
    public function reconcile(int $id): void
    {
        $user = $this->auth->resolve($this->session->user());
        $this->auth->requirePermission($user, 'customers.adjust_balance');
        $result = $this->ledger->reconcile($id);
        JsonResponse::success('Reconciliation complete.', ['reconciliation' => $result]);
    }
}
