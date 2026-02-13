const DEFAULT_BASE_UNIT = 'piece';
const MIN_CONVERSION_VALUE = 1;

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getConversionValue = (row = {}) => {
  const raw =
    row.pieces_per_unit ??
    row.piecesPerUnit ??
    row.conversion_value ??
    row.conversionValue ??
    row.pieces_per_box ??
    row.piecesPerBox;
  const parsed = Math.floor(toNumber(raw, 0));
  return parsed > MIN_CONVERSION_VALUE ? parsed : 0;
};

const hasStructuredConversion = (row = {}) => {
  return Boolean((row.main_unit ?? row.mainUnit) && getConversionValue(row) > 0);
};

const getBaseQuantity = (row = {}) => {
  const stored =
    row.total_pieces ??
    row.totalPieces ??
    row.base_quantity ??
    row.baseQuantity;
  const parsedStored = Math.floor(toNumber(stored, NaN));
  if (Number.isFinite(parsedStored)) {
    return Math.max(0, parsedStored);
  }

  const conversionValue = getConversionValue(row);
  const hasConversion = conversionValue > 0 && ((row.unit_type ?? row.unitType) === 'box' || row.main_unit || row.mainUnit);
  const quantity = Math.max(0, Math.floor(toNumber(row.main_quantity ?? row.mainQuantity ?? row.quantity, 0)));

  if (!hasConversion || conversionValue <= 1) {
    return quantity;
  }

  const rawRemaining = row.remaining_pieces ?? row.remainingPieces;
  const remaining = Math.min(Math.max(0, Math.floor(toNumber(rawRemaining, conversionValue - 1))), conversionValue - 1);
  return quantity * conversionValue + remaining;
};

const deriveQuantitiesFromBase = (baseQuantity, conversionValue) => {
  const safeBase = Math.max(0, Math.floor(toNumber(baseQuantity, 0)));
  const safeConversion = Math.max(MIN_CONVERSION_VALUE, Math.floor(toNumber(conversionValue, 0)));

  if (!conversionValue || safeConversion <= MIN_CONVERSION_VALUE) {
    return {
      quantity: safeBase,
      remaining_pieces: 0,
      fullUnits: safeBase,
      remainder: 0,
    };
  }

  const fullUnits = Math.floor(safeBase / safeConversion);
  const remainder = safeBase % safeConversion;
  return {
    quantity: fullUnits,
    remaining_pieces: remainder,
    fullUnits,
    remainder,
  };
};

const normalizeInventoryPayload = (payload = {}) => {
  const baseUnitRaw = payload.base_unit ?? payload.baseUnit ?? payload.unit ?? DEFAULT_BASE_UNIT;
  const baseUnit = typeof baseUnitRaw === 'string' && baseUnitRaw.trim().length > 0
    ? baseUnitRaw.trim()
    : DEFAULT_BASE_UNIT;

  const mainUnitRaw = payload.main_unit ?? payload.mainUnit ?? payload.unit;
  const mainUnit = typeof mainUnitRaw === 'string' && mainUnitRaw.trim().length > 0
    ? mainUnitRaw.trim()
    : null;

  const conversionRaw =
    payload.pieces_per_unit ??
    payload.piecesPerUnit ??
    payload.conversion_value ??
    payload.conversionValue ??
    payload.pieces_per_box ??
    payload.piecesPerBox;
  let conversionValue = Math.floor(toNumber(conversionRaw, 0));
  const hasConversion = Boolean(mainUnit) && conversionValue > MIN_CONVERSION_VALUE;
  if (hasConversion) {
    conversionValue = Math.max(MIN_CONVERSION_VALUE + 1, conversionValue);
  } else {
    conversionValue = null;
  }

  let totalPiecesInput =
    payload.total_pieces ??
    payload.totalPieces ??
    payload.base_quantity ??
    payload.baseQuantity ??
    null;

  if (totalPiecesInput == null || totalPiecesInput === '') {
    if (hasConversion) {
      const fullUnitsInput = payload.main_quantity ?? payload.mainQuantity ?? payload.quantity;
      const extraPiecesInput = payload.extraPieces ?? payload.loosePieces ?? payload.remaining_pieces ?? payload.remainingPieces ?? 0;
      const fullUnits = Math.max(0, Math.floor(toNumber(fullUnitsInput, 0)));
      const extraPieces = Math.max(0, Math.floor(toNumber(extraPiecesInput, 0)));
      totalPiecesInput = fullUnits * conversionValue + Math.min(extraPieces, conversionValue - 1);
    } else {
      totalPiecesInput = payload.quantity ?? payload.main_quantity ?? payload.mainQuantity ?? 0;
    }
  }

  const totalPieces = Math.max(0, Math.floor(toNumber(totalPiecesInput, 0)));
  const breakdown = hasConversion && conversionValue
    ? deriveQuantitiesFromBase(totalPieces, conversionValue)
    : { quantity: totalPieces, remaining_pieces: 0 };

  return {
    baseUnit,
    mainUnit: hasConversion ? mainUnit : null,
    conversionValue: hasConversion ? conversionValue : null,
    piecesPerUnit: hasConversion ? conversionValue : null,
    baseQuantity: totalPieces,
    totalPieces,
    quantity: breakdown.quantity,
    mainQuantity: breakdown.quantity,
    remainingPieces: hasConversion ? breakdown.remaining_pieces : 0,
    unitType: hasConversion ? 'box' : 'piece',
    hasConversion,
  };
};

module.exports = {
  DEFAULT_BASE_UNIT,
  toNumber,
  getConversionValue,
  hasStructuredConversion,
  getBaseQuantity,
  deriveQuantitiesFromBase,
  normalizeInventoryPayload,
};
