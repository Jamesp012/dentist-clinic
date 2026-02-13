import { InventoryItem } from '../App';

export const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const getBaseUnitLabel = (item: Partial<InventoryItem>) =>
  (item.base_unit as string) || (item as any).baseUnit || item.unit || 'pc';

export const getMainUnitLabel = (item: Partial<InventoryItem>) =>
  (item.main_unit as string) || (item as any).mainUnit || null;

export const getConversionValue = (item: Partial<InventoryItem>): number => {
  const raw =
    (item.conversion_value as number) ??
    (item as any).conversionValue ??
    (item.pieces_per_box as number) ??
    (item as any).piecesPerBox;
  const parsed = Math.floor(toNumber(raw, 0));
  return parsed > 1 ? parsed : 0;
};

export const hasConversion = (item: Partial<InventoryItem>) =>
  Boolean(getMainUnitLabel(item) && getConversionValue(item));

export const getBaseQuantity = (item: Partial<InventoryItem>): number => {
  const stored =
    (item.base_quantity as number) ??
    (item as any).baseQuantity ??
    null;
  if (stored !== null && stored !== undefined) {
    return Math.max(0, Math.floor(toNumber(stored, 0)));
  }

  const conversionValue = getConversionValue(item);
  const unitType = (item.unit_type as string) || (item as any).unitType;
  const quantity = Math.max(0, Math.floor(toNumber(item.quantity, 0)));

  if (!conversionValue || unitType !== 'box') {
    return quantity;
  }

  const remainingRaw =
    (item.remaining_pieces as number) ??
    (item as any).remainingPieces ??
    conversionValue - 1;
  const remaining = Math.min(
    Math.max(0, Math.floor(toNumber(remainingRaw, conversionValue - 1))),
    conversionValue - 1
  );

  return quantity * conversionValue + remaining;
};

export const getQuantityBreakdown = (item: Partial<InventoryItem>) => {
  const baseQuantity = getBaseQuantity(item);
  const conversionValue = getConversionValue(item);

  if (!conversionValue) {
    return {
      baseQuantity,
      fullUnits: baseQuantity,
      remainder: 0,
    };
  }

  const fullUnits = Math.floor(baseQuantity / conversionValue);
  const remainder = baseQuantity % conversionValue;
  return { baseQuantity, fullUnits, remainder, conversionValue };
};

export const formatQuantityDisplay = (item: Partial<InventoryItem>) => {
  const { baseQuantity, fullUnits, remainder, conversionValue } = getQuantityBreakdown(item);
  const baseLabel = getBaseUnitLabel(item);
  const mainLabel = getMainUnitLabel(item);

  if (!conversionValue || !mainLabel) {
    return `${baseQuantity.toLocaleString()} ${baseLabel}`;
  }

  return `${baseQuantity.toLocaleString()} ${baseLabel} (${fullUnits.toLocaleString()} ${mainLabel}${
    fullUnits === 1 ? '' : 's'
  } + ${remainder} ${baseLabel})`;
};
