<?php
// backend/php/utils/inventory_units.php

function toNumber($val, $default = 0) {
    if ($val === null || $val === '') return $default;
    return is_numeric($val) ? (float)$val : $default;
}

function normalizeInventoryPayload($body) {
    $unitType = $body->unit_type ?? $body->unitType ?? 'piece';
    $mainUnit = $body->main_unit ?? $body->mainUnit ?? null;
    $baseUnit = $body->base_unit ?? $body->baseUnit ?? $body->unit ?? 'pcs';
    $conversionValue = (int)($body->conversion_value ?? $body->pieces_per_unit ?? $body->pieces_per_box ?? 1);
    
    $quantity = toNumber($body->quantity ?? 0);
    $remainingPieces = (int)($body->remaining_pieces ?? $body->remainingPieces ?? 0);
    
    $hasConversion = ($unitType === 'box' || $unitType === 'pack') && $conversionValue > 1;
    
    if ($hasConversion) {
        $totalPieces = ($quantity * $conversionValue) + $remainingPieces;
        return [
            "unitType" => $unitType,
            "mainUnit" => $mainUnit ?: $unitType,
            "baseUnit" => $baseUnit,
            "conversionValue" => $conversionValue,
            "quantity" => $quantity,
            "mainQuantity" => $quantity,
            "remainingPieces" => $remainingPieces,
            "totalPieces" => $totalPieces,
            "baseQuantity" => $totalPieces,
            "hasConversion" => true
        ];
    } else {
        $q = (int)$quantity;
        return [
            "unitType" => 'piece',
            "mainUnit" => $baseUnit,
            "baseUnit" => $baseUnit,
            "conversionValue" => 1,
            "quantity" => $q,
            "mainQuantity" => $q,
            "remainingPieces" => 0,
            "totalPieces" => $q,
            "baseQuantity" => $q,
            "hasConversion" => false
        ];
    }
}

function deriveQuantitiesFromBase($totalPieces, $conversionValue) {
    if ($conversionValue <= 1) {
        return [
            "quantity" => $totalPieces,
            "remaining_pieces" => 0
        ];
    }
    
    return [
        "quantity" => floor($totalPieces / $conversionValue),
        "remaining_pieces" => $totalPieces % $conversionValue
    ];
}
?>
