<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\UnitRepository;
use Exception;

class UnitService
{
    private UnitRepository $unitRepository;

    public function __construct(UnitRepository $unitRepository)
    {
        $this->unitRepository = $unitRepository;
    }

    public function getAllUnits(): array
    {
        return $this->unitRepository->getAllUnits();
    }

    public function getActiveUnits(): array
    {
        return $this->unitRepository->getActiveUnits();
    }

    public function createUnit(array $data): array
    {
        $this->validateData($data);
        $id = $this->unitRepository->createUnit($data);
        return $this->unitRepository->getUnitById($id);
    }

    public function updateUnit(int $id, array $data): array
    {
        $unit = $this->unitRepository->getUnitById($id);
        if (!$unit) {
            throw new Exception("Unit not found.", 404);
        }
        $this->validateData($data);
        $this->unitRepository->updateUnit($id, $data);
        return $this->unitRepository->getUnitById($id);
    }

    private function validateData(array $data): void
    {
        if (empty($data['name'])) {
            throw new Exception("Unit name is required.");
        }
        if (empty($data['symbol'])) {
            throw new Exception("Unit symbol is required.");
        }
        if (empty($data['unit_type'])) {
            throw new Exception("Unit type is required.");
        }
    }
}
