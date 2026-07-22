<?php
$product = [
    'name' => '1Kg Kachi Baspati',
    'stock_mode' => 'shared',
    'stock_source_id' => 2,
    'consumption_quantity_base' => '1.000000'
];
$stockHolder = [
    'name' => 'Kachi Baspati Bori',
    'quantity' => '50.000',
    'track_stock' => 1
];

$quantityEntered = 3.0; // Assume the frontend sends 3
$conversionFactor = 1.0;

$quantityMilli = (int)round($quantityEntered * $conversionFactor * 1000);
$deductionMilli = $quantityMilli;

if ($product['stock_mode'] === 'shared' && $product['stock_source_id']) {
    $consumptionBaseMilli = (int)round((float)$product['consumption_quantity_base'] * 1000);
    $deductionMilli = (int)round($quantityEntered * $consumptionBaseMilli);
}

function toScaled(string $value, int $decimals): int {
    return (int)round((float)$value * (10 ** $decimals));
}

$stockMilli = toScaled((string)$stockHolder['quantity'], 3);

echo "quantityEntered: $quantityEntered\n";
echo "consumptionBaseMilli: $consumptionBaseMilli\n";
echo "deductionMilli: $deductionMilli\n";
echo "stockMilli: $stockMilli\n";
echo "Throws Error? " . ($deductionMilli > $stockMilli ? 'YES' : 'NO') . "\n";
