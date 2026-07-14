<?php

declare(strict_types=1);

namespace App\Services;

use App\Http\HttpException;
use App\Repositories\ActivityLogRepository;
use App\Repositories\ExpenseCategoryRepository;
use App\Repositories\ExpenseRepository;
use App\Validators\ExpenseValidator;
use Throwable;

final class ExpenseService
{
    public function __construct(
        private readonly ExpenseRepository $repo,
        private readonly ExpenseCategoryRepository $categories,
        private readonly ExpenseValidator $validator,
        private readonly ExpenseReceiptService $receipts,
        private readonly ActivityLogRepository $activity
    ) {
    }

    public function list(array $query): array
    {
        $filters = $this->validator->filters($query);

        return $this->repo->paginate($filters) + [
            'filters' => $filters,
            'categories' => $this->categories->all('', false),
            'users' => $this->repo->users(),
        ];
    }

    public function get(int $id): array
    {
        return $this->required($id);
    }

    public function create(array $input, ?array $file, int $userId): array
    {
        $data = $this->validator->details($input);
        $this->validCategory($data['expense_category_id']);
        $receipt = $this->receipts->store($file);

        try {
            $expense = $this->repo->create($data, $userId, $receipt);
            $this->activity->log($userId, 'expense.created', 'Expense ' . $expense['title'] . ' created.');

            return $expense;
        } catch (Throwable $exception) {
            $this->receipts->delete($receipt);
            throw $exception;
        }
    }

    public function update(int $id, array $input, ?array $file, int $userId): array
    {
        $old = $this->required($id);
        if ($old['status'] !== 'active') {
            throw new HttpException('Voided expenses cannot be edited.', 409);
        }

        $data = $this->validator->details($input);
        $this->validCategory($data['expense_category_id']);
        $newReceipt = $this->receipts->store($file);
        $receipt = $newReceipt ?? ($data['remove_receipt'] ? null : $old['receipt_image']);

        try {
            $expense = $this->repo->update($id, $data, $receipt);
            $this->activity->log($userId, 'expense.updated', 'Expense ' . $expense['title'] . ' updated.');
        } catch (Throwable $exception) {
            $this->receipts->delete($newReceipt);
            throw $exception;
        }

        if ($newReceipt !== null || $data['remove_receipt']) {
            $this->receipts->delete($old['receipt_image']);
        }

        return $expense;
    }

    public function void(int $id, int $userId): array
    {
        $expense = $this->required($id);
        if ($expense['status'] === 'voided') {
            throw new HttpException('This expense has already been voided.', 409);
        }

        $voided = $this->repo->void($id, $userId);
        $this->activity->log($userId, 'expense.voided', 'Expense ' . $expense['title'] . ' voided.');

        return $voided;
    }

    public function summary(array $query): array
    {
        return $this->repo->summary($this->validator->filters($query));
    }

    public function exportFilters(array $query): array
    {
        return $this->validator->filters($query);
    }

    private function required(int $id): array
    {
        $row = $this->repo->find($id);
        if ($row === null) {
            throw new HttpException('Expense not found.', 404);
        }

        return $row;
    }

    private function validCategory(int $id): void
    {
        $category = $this->categories->find($id);
        if ($category === null) {
            throw new HttpException('Expense category not found.', 422, ['expense_category_id' => ['Select a valid category.']]);
        }
        if ($category['status'] !== 'active') {
            throw new HttpException('Inactive categories cannot be used for new expenses.', 422, ['expense_category_id' => ['Select an active category.']]);
        }
    }
}