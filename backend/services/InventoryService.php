<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\Database;
use App\Http\HttpException;
use App\Repositories\InventoryRepository;
use App\Repositories\StockTransactionRepository;
use App\Validators\InventoryValidator;
use Throwable;

final class InventoryService
{
    private const TRANSACTION_TYPES = [
        'opening', 'addition', 'reduction', 'adjustment',
        'damaged', 'expired', 'wastage', 'sale', 'refund',
    ];

    public function __construct(
        private readonly Database $database,
        private readonly InventoryRepository $inventory,
        private readonly StockTransactionRepository $transactions,
        private readonly InventoryValidator $validator
    ) {
    }

    public function summary(): array
    {
        return array_merge(
            $this->inventory->summary(),
            ['movements_today' => $this->transactions->countToday()]
        );
    }

    public function list(array $query): array
    {
        $categoryId = ($query['category_id'] ?? '') === ''
            ? null
            : filter_var($query['category_id'], FILTER_VALIDATE_INT);
        $stockStatus = trim((string) ($query['stock_status'] ?? ''));
        $validStatuses = ['', 'in_stock', 'low_stock', 'out_of_stock', 'tracking_disabled'];

        if ($categoryId === false || ($categoryId !== null && $categoryId < 1)) {
            throw new HttpException('Select a valid category filter.', 422);
        }

        if (!in_array($stockStatus, $validStatuses, true)) {
            throw new HttpException('Select a valid stock status filter.', 422);
        }

        return $this->inventory->paginate([
            'search' => trim((string) ($query['search'] ?? '')),
            'category_id' => $categoryId === null ? null : (int) $categoryId,
            'stock_status' => $stockStatus,
            'page' => max(1, (int) ($query['page'] ?? 1)),
            'limit' => min(100, max(1, (int) ($query['limit'] ?? 20))),
        ]);
    }

    public function history(array $query, ?int $productId = null): array
    {
        $transactionType = trim((string) ($query['transaction_type'] ?? ''));
        $userId = ($query['user_id'] ?? '') === ''
            ? null
            : filter_var($query['user_id'], FILTER_VALIDATE_INT);
        $queryProductId = $productId ?? (($query['product_id'] ?? '') === ''
            ? null
            : filter_var($query['product_id'], FILTER_VALIDATE_INT));
        $dateFrom = trim((string) ($query['date_from'] ?? ''));
        $dateTo = trim((string) ($query['date_to'] ?? ''));

        if ($transactionType !== '' && !in_array($transactionType, self::TRANSACTION_TYPES, true)) {
            throw new HttpException('Select a valid transaction type.', 422);
        }

        if ($userId === false || ($userId !== null && $userId < 1)) {
            throw new HttpException('Select a valid user.', 422);
        }

        if ($queryProductId === false || ($queryProductId !== null && $queryProductId < 1)) {
            throw new HttpException('Select a valid product.', 422);
        }

        foreach (['date_from' => $dateFrom, 'date_to' => $dateTo] as $field => $date) {
            if ($date !== '' && !$this->validDate($date)) {
                throw new HttpException(
                    'Select a valid date range.',
                    422,
                    [$field => ['Use a valid date.']]
                );
            }
        }

        if ($dateFrom !== '' && $dateTo !== '' && $dateFrom > $dateTo) {
            throw new HttpException('The start date must be before the end date.', 422);
        }

        return $this->transactions->paginate([
            'transaction_type' => $transactionType,
            'product_id' => $queryProductId === null ? null : (int) $queryProductId,
            'user_id' => $userId === null ? null : (int) $userId,
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
            'page' => max(1, (int) ($query['page'] ?? 1)),
            'limit' => min(100, max(1, (int) ($query['limit'] ?? 20))),
        ]);
    }

    public function changeStock(int $userId, string $transactionType, array $input): array
    {
        $data = $this->validator->validate($input, $transactionType);
        $connection = $this->database->connection();
        $connection->beginTransaction();

        try {
            $product = $this->inventory->findForUpdate($data['product_id']);

            if ($product === null) {
                throw new HttpException('Product not found.', 404);
            }

            if ((int) $product['track_stock'] !== 1) {
                throw new HttpException(
                    $product['name'] . ' has stock tracking disabled.',
                    409,
                    ['product_id' => ['Stock tracking is disabled for this product.']]
                );
            }

            if ($product['status'] !== 'active') {
                throw new HttpException('Only active products can receive manual stock changes.', 409);
            }

            $previous = (float) $product['quantity'];
            $quantity = (float) $data['quantity'];

            if ($transactionType === 'adjustment') {
                $newStock = $quantity;
                $movement = abs($newStock - $previous);

                if ($movement < 0.0005) {
                    throw new HttpException('The adjusted quantity is already the current stock.', 422);
                }
            } elseif (in_array($transactionType, ['addition', 'opening'], true)) {
                $newStock = $previous + $quantity;
                $movement = $quantity;
            } else {
                $newStock = $previous - $quantity;
                $movement = $quantity;
            }

            if ($newStock < 0) {
                throw new HttpException(
                    'Only ' . rtrim(rtrim(number_format($previous, 3, '.', ''), '0'), '.')
                    . ' ' . $product['unit_type'] . ' of ' . $product['name'] . ' are available.',
                    409,
                    ['quantity' => ['Stock cannot become negative.']]
                );
            }

            $newStockFormatted = number_format($newStock, 3, '.', '');
            $this->inventory->updateQuantity($data['product_id'], $newStockFormatted);
            $transaction = $this->transactions->create([
                'product_id' => $data['product_id'],
                'user_id' => $userId,
                'transaction_type' => $transactionType,
                'quantity' => number_format($movement, 3, '.', ''),
                'previous_stock' => number_format($previous, 3, '.', ''),
                'new_stock' => $newStockFormatted,
                'reason' => $data['reason'],
                'reference_type' => null,
                'reference_id' => null,
            ]);

            $connection->commit();

            return [
                'transaction' => $transaction,
                'product' => [
                    'id' => (int) $product['id'],
                    'name' => $product['name'],
                    'quantity' => $newStockFormatted,
                ],
            ];
        } catch (Throwable $exception) {
            if ($connection->inTransaction()) {
                $connection->rollBack();
            }

            throw $exception;
        }
    }

    private function validDate(string $date): bool
    {
        $parsed = \DateTimeImmutable::createFromFormat('Y-m-d', $date);

        return $parsed !== false && $parsed->format('Y-m-d') === $date;
    }
}
