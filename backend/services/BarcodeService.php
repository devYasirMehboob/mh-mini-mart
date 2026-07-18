<?php

declare(strict_types=1);

namespace App\Services;

use App\Http\HttpException;
use Picqer\Barcode\BarcodeGeneratorSVG;
use Picqer\Barcode\BarcodeGeneratorPNG;

final class BarcodeService
{
    /**
     * Generate a unique barcode string.
     */
    public function generateUniqueBarcode(): string
    {
        // 10-digit purely numeric barcode.
        // Pure numeric strings allow Code 128 to use type C (which is 50% narrower).
        return mb_substr((string)time(), 2) . mt_rand(10, 99);
    }

    /**
     * Generate SVG for a given barcode.
     */
    public function generateSvg(string $barcode, string $type = 'C128'): string
    {
        $generator = new BarcodeGeneratorSVG();
        $barcodeType = $this->resolveType($type, $generator);
        
        try {
            // Wider modules and taller bars print more reliably on small thermal labels.
            return $generator->getBarcode($barcode, $barcodeType, 2.0, 70);
        } catch (\Exception $e) {
            throw new HttpException('Unable to generate barcode image: ' . $e->getMessage(), 422);
        }
    }

    /**
     * Generate PNG for a given barcode.
     */
    public function generatePng(string $barcode, string $type = 'C128'): string
    {
        $generator = new BarcodeGeneratorPNG();
        $barcodeType = $this->resolveType($type, $generator);
        
        try {
            return $generator->getBarcode($barcode, $barcodeType, 2.0, 70);
        } catch (\Exception $e) {
            throw new HttpException('Unable to generate barcode image: ' . $e->getMessage(), 422);
        }
    }

    private function resolveType(string $type, $generator): string
    {
        return match (strtoupper($type)) {
            'EAN13' => $generator::TYPE_EAN_13,
            'UPCA' => $generator::TYPE_UPC_A,
            'C39' => $generator::TYPE_CODE_39,
            default => $generator::TYPE_CODE_128,
        };
    }
}


