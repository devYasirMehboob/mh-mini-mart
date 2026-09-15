<?php

declare(strict_types=1);

namespace App\Services;

use App\Http\HttpException;
use App\Repositories\ActivityLogRepository;
use App\Repositories\CustomerRepository;
use App\Validators\CustomerValidator;

final class CustomerService
{
    public function __construct(
        private readonly CustomerRepository    $customers,
        private readonly CustomerValidator     $validator,
        private readonly ActivityLogRepository $activity
    ) {}

    // -------------------------------------------------------------------------
    // Global metrics
    // -------------------------------------------------------------------------
    public function getGlobalMetrics(): array
    {
        return $this->customers->getGlobalMetrics();
    }

    // -------------------------------------------------------------------------
    // Create a full customer profile
    // -------------------------------------------------------------------------
    public function create(int $actorId, array $input): array
    {
        $data = $this->validator->create($input);

        // Duplicate phone check
        if ($data['phone'] !== null) {
            $existing = $this->customers->findByPhone($data['phone']);
            if ($existing !== null) {
                throw new HttpException(
                    'A customer with this phone number already exists.',
                    409,
                    ['phone' => ['Phone number already belongs to: ' . $existing['name'] . ' (' . $existing['customer_code'] . ')']]
                );
            }
        }

        $data['customer_code'] = $this->customers->generateCustomerCode();
        $data['created_by']    = $actorId;

        $id       = $this->customers->create($data);
        $customer = $this->customers->findById($id);

        $this->activity->log(
            $actorId,
            'customer_created',
            'Customer created: ' . $customer['name'] . ' (' . $customer['customer_code'] . ')'
        );

        return $customer;
    }

    // -------------------------------------------------------------------------
    // Quick-add from POS (walk-in khata or regular)
    // -------------------------------------------------------------------------
    public function quickAdd(int $actorId, array $input): array
    {
        $data = $this->validator->quickAdd($input);

        if ($data['phone'] !== null) {
            $existing = $this->customers->findByPhone($data['phone']);
            if ($existing !== null) {
                throw new HttpException(
                    'A customer with this phone already exists.',
                    409,
                    ['phone' => ['Phone belongs to: ' . $existing['name'] . ' (' . $existing['customer_code'] . ')'],
                     'existing_customer' => $existing]
                );
            }
        }

        $data['customer_code'] = $this->customers->generateCustomerCode();
        $data['created_by']    = $actorId;
        $data['status']        = 'active';

        $id       = $this->customers->create($data);
        $customer = $this->customers->findById($id);

        $this->activity->log(
            $actorId,
            'customer_created',
            'Walk-in khata customer created: ' . $customer['name'] . ' (' . $customer['customer_code'] . ')'
        );

        return $customer;
    }

    // -------------------------------------------------------------------------
    // Update customer profile
    // -------------------------------------------------------------------------
    public function update(int $actorId, int $id, array $input): array
    {
        $customer = $this->customers->findById($id);
        if ($customer === null) {
            throw new HttpException('Customer not found.', 404);
        }
        if ((int) $customer['is_system_walk_in'] === 1) {
            throw new HttpException('The system Walk-in Customer cannot be edited.', 403);
        }

        $data = $this->validator->update($input);

        // Duplicate phone check (exclude self)
        if ($data['phone'] !== null) {
            $existing = $this->customers->findByPhone($data['phone']);
            if ($existing !== null && (int) $existing['id'] !== $id) {
                throw new HttpException(
                    'This phone number belongs to another customer.',
                    409,
                    ['phone' => ['Phone belongs to: ' . $existing['name'] . ' (' . $existing['customer_code'] . ')']]
                );
            }
        }

        $this->customers->update($id, $data);
        $updated = $this->customers->findById($id);

        $this->activity->log(
            $actorId,
            'customer_updated',
            'Customer updated: ' . $updated['name'] . ' (' . $updated['customer_code'] . ')'
        );

        return $updated;
    }

    // -------------------------------------------------------------------------
    // Status change
    // -------------------------------------------------------------------------
    public function setStatus(int $actorId, int $id, string $status): array
    {
        $customer = $this->customers->findById($id);
        if ($customer === null) throw new HttpException('Customer not found.', 404);
        if ((int) $customer['is_system_walk_in'] === 1) throw new HttpException('Cannot change system Walk-in Customer status.', 403);
        if (!in_array($status, ['active', 'inactive'], true)) throw new HttpException('Invalid status.', 422);

        $this->customers->updateStatus($id, $status);
        $updated = $this->customers->findById($id);

        $this->activity->log(
            $actorId,
            'customer_status_changed',
            'Customer ' . $status . ': ' . $updated['name'] . ' (' . $updated['customer_code'] . ')'
        );

        return $updated;
    }

    // -------------------------------------------------------------------------
    // Search (for POS selector)
    // -------------------------------------------------------------------------
    public function search(string $query, int $limit = 10): array
    {
        return $this->customers->search($query, $limit);
    }

    // -------------------------------------------------------------------------
    // List with filters
    // -------------------------------------------------------------------------
    public function list(array $filters): array
    {
        $validated = $this->validator->filters($filters);
        return $this->customers->paginate($validated);
    }

    // -------------------------------------------------------------------------
    // Single customer
    // -------------------------------------------------------------------------
    public function getById(int $id): array
    {
        $customer = $this->customers->findById($id);
        if ($customer === null) throw new HttpException('Customer not found.', 404);
        return $customer;
    }

    public function getSummary(int $id): array
    {
        $customer = $this->customers->getSummary($id);
        if (empty($customer)) throw new HttpException('Customer not found.', 404);
        return $customer;
    }

    // -------------------------------------------------------------------------
    // Get balance for POS credit summary
    // -------------------------------------------------------------------------
    public function getCreditSummary(int $id): array
    {
        $customer = $this->customers->findById($id);
        if ($customer === null) throw new HttpException('Customer not found.', 404);

        return [
            'id'              => $customer['id'],
            'customer_code'   => $customer['customer_code'],
            'name'            => $customer['name'],
            'phone'           => $customer['phone'],
            'customer_type'   => $customer['customer_type'],
            'khata_enabled'   => (bool) $customer['khata_enabled'],
            'credit_limit'    => $customer['credit_limit'],
            'current_balance' => $customer['current_balance'],
            'advance_balance' => $customer['advance_balance'],
            'status'          => $customer['status'],
            'is_system_walk_in' => (bool) $customer['is_system_walk_in'],
        ];
    }
}
