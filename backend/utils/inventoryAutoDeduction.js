const {const DEFAULT_BOX_PIECES = 1;














































































































































































































































































};  restoreInventoryAutoDeduction,  applyInventoryAutoDeduction,  parseStoredServices,  serializeServices,  normalizeServiceList,module.exports = {}  return { restored: true, count: historyRows.length };  await connection.query('DELETE FROM inventory_reduction_history WHERE treatmentRecordId = ?', [treatmentRecordId]);  }    );      ]        entry.inventoryItemId,        conversionValue > 0 ? breakdown.remaining_pieces : null,        breakdown.quantity,        restoredQuantity,      [      'UPDATE inventory SET base_quantity = ?, quantity = ?, remaining_pieces = ? WHERE id = ?',    await connection.query(      : { quantity: restoredQuantity, remaining_pieces: 0 };      ? deriveQuantitiesFromBase(restoredQuantity, conversionValue)    const breakdown = conversionValue > 0    const restoredQuantity = availablePieces + Math.max(0, toNumber(entry.quantityReduced, 0));    const availablePieces = getBaseQuantity(inventoryItem);    const conversionValue = getConversionValue(inventoryItem);    const inventoryItem = items[0];    if (items.length === 0) continue;    );      [entry.inventoryItemId]       FROM inventory WHERE id = ? FOR UPDATE`,      `SELECT id, quantity, unit_type, pieces_per_box, remaining_pieces, base_quantity, base_unit, main_unit, conversion_value    const [items] = await connection.query(  for (const entry of historyRows) {  }    return { restored: false };  if (!historyRows || historyRows.length === 0) {  );    [treatmentRecordId]    'SELECT id, inventoryItemId, quantityReduced FROM inventory_reduction_history WHERE treatmentRecordId = ?',  const [historyRows] = await connection.query(  if (!treatmentRecordId) return { restored: false };async function restoreInventoryAutoDeduction(connection, treatmentRecordId) {}  };    shortages: shortages.length > 0 ? shortages : undefined,    reductions,    applied: reductions.length > 0,  return {  }    return { applied: false, shortages };  if (shortages.length > 0 && strictMode) {  }    });      quantityAfter: newBaseQuantity,      quantityBefore: availablePieces,      conversionValue,      mainUnit,      baseUnit,      remainingPieces: newBaseQuantity,      unitsDeducted: requirement.totalUnitsRequested,      piecesDeducted: requestedPieces,      unitType: conversionValue > 0 ? 'composite' : 'piece',      itemName: inventoryItem.name || requirement.itemName,      itemId: requirement.itemId,    reductions.push({    ]);      newBaseQuantity,      availablePieces,      requestedPieces,      inventoryItem.name || requirement.itemName,      requirement.itemId,      label,      patientName,      patientId,      treatmentRecordId,      appointmentId,    `, [      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)        (appointmentId, treatmentRecordId, patientId, patientName, appointmentType, inventoryItemId, inventoryItemName, quantityReduced, quantityBefore, quantityAfter)      INSERT INTO inventory_reduction_history    await connection.query(`    );      ]        requirement.itemId,        conversionValue > 0 ? breakdown.remaining_pieces : null,        breakdown.quantity,        newBaseQuantity,      [      'UPDATE inventory SET base_quantity = ?, quantity = ?, remaining_pieces = ? WHERE id = ?',    await connection.query(      : { quantity: newBaseQuantity, remaining_pieces: 0 };      ? deriveQuantitiesFromBase(newBaseQuantity, conversionValue)    const breakdown = conversionValue > 0    const newBaseQuantity = Math.max(0, availablePieces - requestedPieces);    }      continue;      });        mainUnit,        baseUnit,        services: Array.from(requirement.services),        availablePieces,        requestedPieces,        unitType: conversionValue > 0 ? 'composite' : 'piece',        itemName: inventoryItem.name || requirement.itemName,        itemId: requirement.itemId,      shortages.push({    if (availablePieces < requestedPieces) {    const requestedPieces = requirement.totalPiecesRequested;    const availablePieces = getBaseQuantity(inventoryItem);    const conversionValue = getConversionValue(inventoryItem);    const mainUnit = inventoryItem.main_unit || null;    const baseUnit = inventoryItem.base_unit || 'piece';    const inventoryItem = items[0];    }      continue;      });        services: Array.from(requirement.services),        reason: 'MISSING_INVENTORY_ITEM',        itemName: requirement.itemName,        itemId: requirement.itemId,      shortages.push({    if (items.length === 0) {    );      [requirement.itemId]       FROM inventory WHERE id = ? FOR UPDATE`,      `SELECT id, name, quantity, unit_type, pieces_per_box, remaining_pieces, base_quantity, base_unit, main_unit, conversion_value    const [items] = await connection.query(  for (const requirement of aggregated) {  const label = formatServicesLabel(normalizedServices);  const reductions = [];  const shortages = [];  }    return { applied: false, message: 'NO_VALID_RULE_ITEMS' };  if (aggregated.length === 0) {  const aggregated = aggregateRuleItems(rules);  }    return { applied: false, missingRules: normalizedServices };  if (!rules || rules.length === 0) {  `, normalizedServices);    WHERE r.appointmentType IN (${placeholders}) AND r.isActive = TRUE    JOIN inventory i ON i.id = ri.inventoryItemId    JOIN inventory_auto_reduction_rule_items ri ON r.id = ri.ruleId    FROM inventory_auto_reduction_rules_v2 r      i.main_unit      i.base_unit,      i.conversion_value,      i.pieces_per_box,      i.unit_type,      i.name AS inventoryItemName,      ri.quantityToReduce,      ri.inventoryItemId,      r.appointmentType,    SELECT   const [rules] = await connection.query(`  const placeholders = normalizedServices.map(() => '?').join(',');  }    return { applied: false, message: 'NO_SERVICES' };  if (normalizedServices.length === 0) {  const normalizedServices = normalizeServiceList(services);  const strictMode = options.strict !== false;) {  options = {}  } = {},    patientName,    patientId,    treatmentRecordId = null,    appointmentId = null,    services,  {  connection,async function applyInventoryAutoDeduction(const formatServicesLabel = (services) => services.join(', ');};  return Array.from(map.values());  }    map.set(key, entry);    entry.totalPiecesRequested += piecesIncrement;      : quantityToReduce;      ? quantityToReduce * conversionValue    const piecesIncrement = conversionValue > 0    entry.totalUnitsRequested += quantityToReduce;    entry.services.add(row.appointmentType);    };      totalPiecesRequested: 0,      totalUnitsRequested: 0,      services: new Set(),      conversionValue,      itemName: row.inventoryItemName || row.name || 'Unnamed Item',      itemId: row.inventoryItemId,    const entry = map.get(key) || {    if (quantityToReduce === 0) continue;    const quantityToReduce = Math.max(0, toNumber(row.quantityToReduce, 0));    const conversionValue = getConversionValue(row);    const key = String(row.inventoryItemId);    if (!row.inventoryItemId) continue;  for (const row of rows) {  const map = new Map();const aggregateRuleItems = (rows) => {};  return normalizeServiceList(value.split(','));  }    // value might be a comma-separated list  } catch (err) {    }      return normalizeServiceList(parsed);    if (Array.isArray(parsed)) {    const parsed = JSON.parse(value);  try {  if (typeof value !== 'string') return [];  if (Array.isArray(value)) return normalizeServiceList(value);  if (!value) return [];const parseStoredServices = (value) => {};  }    return null;    console.warn('Failed to serialize services list:', err);  } catch (err) {    return JSON.stringify(services);  try {  if (!services || services.length === 0) return null;const serializeServices = (services) => {};  return normalized;  }    normalized.push(trimmed);    seen.add(key);    if (seen.has(key)) continue;    const key = trimmed.toLowerCase();    if (!trimmed) continue;    const trimmed = typeof entry === 'string' ? entry.trim() : '';  for (const entry of arr) {  const normalized = [];  const seen = new Set();      : [];      ? raw.split(',')    : typeof raw === 'string'    ? raw  const arr = Array.isArray(raw)  if (!raw) return [];const normalizeServiceList = (raw) => {} = require('./inventoryUnits');  deriveQuantitiesFromBase,  getConversionValue,  getBaseQuantity,  toNumber,
const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const computeBoxAvailablePieces = (item) => {
  const perBox = Math.max(DEFAULT_BOX_PIECES, toNumber(item.pieces_per_box, 0));
  const boxes = Math.max(0, toNumber(item.quantity, 0));
  if (boxes === 0) return 0;
  const remaining = item.remaining_pieces == null
    ? perBox
    : Math.min(Math.max(0, toNumber(item.remaining_pieces, perBox)), perBox);
  return Math.max(0, (boxes - 1) * perBox + remaining);
};

const boxStateFromPieces = (totalPieces, perBox) => {
  const safePerBox = Math.max(DEFAULT_BOX_PIECES, perBox);
  if (totalPieces <= 0) {
    return { quantity: 0, remaining_pieces: 0 };
  }
  const fullBoxes = Math.floor(totalPieces / safePerBox);
  const remainder = totalPieces % safePerBox;
  if (remainder === 0) {
    return { quantity: Math.max(fullBoxes, 1), remaining_pieces: safePerBox };
  }
  return { quantity: fullBoxes + 1, remaining_pieces: remainder };
};

const normalizeServiceList = (raw) => {
  if (!raw) return [];
  const arr = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw.split(',')
      : [];
  const seen = new Set();
  const normalized = [];
  for (const entry of arr) {
    const trimmed = typeof entry === 'string' ? entry.trim() : '';
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(trimmed);
  }
  return normalized;
};

const serializeServices = (services) => {
  if (!services || services.length === 0) return null;
  try {
    return JSON.stringify(services);
  } catch (err) {
    console.warn('Failed to serialize services list:', err);
    return null;
  }
};

const parseStoredServices = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return normalizeServiceList(value);
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return normalizeServiceList(parsed);
    }
  } catch (err) {
    // value might be a comma-separated list
  }
  return normalizeServiceList(value.split(','));
};

const aggregateRuleItems = (rows) => {
  const map = new Map();
  for (const row of rows) {
    if (!row.inventoryItemId) continue;
    const key = String(row.inventoryItemId);
    const unitType = row.unit_type || row.unitType || 'piece';
    const piecesPerBox = Math.max(DEFAULT_BOX_PIECES, toNumber(row.pieces_per_box, row.piecesPerBox));
    const quantityToReduce = Math.max(0, toNumber(row.quantityToReduce, 0));
    if (quantityToReduce === 0) continue;
    const entry = map.get(key) || {
      itemId: row.inventoryItemId,
      itemName: row.inventoryItemName || row.name || 'Unnamed Item',
      unitType,
      piecesPerBox,
      services: new Set(),
      totalUnitsRequested: 0,
      totalPiecesRequested: 0,
    };
    entry.services.add(row.appointmentType);
    entry.totalUnitsRequested += quantityToReduce;
    const piecesIncrement = unitType === 'box'
      ? quantityToReduce * piecesPerBox
      : quantityToReduce;
    entry.totalPiecesRequested += piecesIncrement;
    map.set(key, entry);
  }
  return Array.from(map.values());
};

const formatServicesLabel = (services) => services.join(', ');

async function applyInventoryAutoDeduction(connection, {
  services,
  appointmentId = null,
  treatmentRecordId = null,
  patientId,
  patientName,
} = {}) {
  const normalizedServices = normalizeServiceList(services);
  if (normalizedServices.length === 0) {
    return { applied: false, message: 'NO_SERVICES' };
  }

  const placeholders = normalizedServices.map(() => '?').join(',');
  const [rules] = await connection.query(`
    SELECT 
      r.appointmentType,
      ri.inventoryItemId,
      ri.quantityToReduce,
      i.name AS inventoryItemName,
      i.unit_type,
      i.pieces_per_box
    FROM inventory_auto_reduction_rules_v2 r
    JOIN inventory_auto_reduction_rule_items ri ON r.id = ri.ruleId
    JOIN inventory i ON i.id = ri.inventoryItemId
    WHERE r.appointmentType IN (${placeholders}) AND r.isActive = TRUE
  `, normalizedServices);

  if (!rules || rules.length === 0) {
    return { applied: false, missingRules: normalizedServices };
  }

  const aggregated = aggregateRuleItems(rules);
  if (aggregated.length === 0) {
    return { applied: false, message: 'NO_VALID_RULE_ITEMS' };
  }

  const shortages = [];
  const reductions = [];
  const label = formatServicesLabel(normalizedServices);

  for (const requirement of aggregated) {
    const [items] = await connection.query(
      'SELECT id, name, quantity, unit_type, pieces_per_box, remaining_pieces FROM inventory WHERE id = ? FOR UPDATE',
      [requirement.itemId]
    );

    if (items.length === 0) {
      shortages.push({
        itemId: requirement.itemId,
        itemName: requirement.itemName,
        reason: 'MISSING_INVENTORY_ITEM',
        services: Array.from(requirement.services),
      });
      continue;
    }

    const inventoryItem = items[0];
    const unitType = inventoryItem.unit_type || 'piece';
    const perBox = Math.max(DEFAULT_BOX_PIECES, toNumber(inventoryItem.pieces_per_box, requirement.piecesPerBox));
    const availablePieces = unitType === 'box'
      ? computeBoxAvailablePieces(inventoryItem)
      : Math.max(0, toNumber(inventoryItem.quantity, 0));

    const requestedPieces = requirement.totalPiecesRequested;
  const {
    toNumber,
    getBaseQuantity,
    getConversionValue,
    deriveQuantitiesFromBase,
  } = require('./inventoryUnits');

    if (availablePieces < requestedPieces) {
      shortages.push({
        itemId: requirement.itemId,
        itemName: inventoryItem.name || requirement.itemName,
        unitType,
      const unitType = row.unit_type || row.unitType || 'piece';
      const conversionValue = getConversionValue(row);
        services: Array.from(requirement.services),
      });
      continue;
    }

    if (unitType === 'box') {
        conversionValue,
      const { quantity, remaining_pieces } = boxStateFromPieces(newTotalPieces, perBox);
      await connection.query(
        'UPDATE inventory SET quantity = ?, remaining_pieces = ? WHERE id = ?',
        [quantity, remaining_pieces, requirement.itemId]
      );
      await connection.query(`
      const piecesIncrement = conversionValue > 0
        ? quantityToReduce * conversionValue
        : quantityToReduce;
      `, [
        appointmentId,
        treatmentRecordId,
        patientId,
        patientName,
        label,
        requirement.itemId,
        inventoryItem.name || requirement.itemName,
        requestedPieces,
        toNumber(inventoryItem.quantity, 0),
        quantity,
      ]);
      reductions.push({
    const strictMode = options.strict !== false;
        itemId: requirement.itemId,
        itemName: inventoryItem.name || requirement.itemName,
        unitType,
        piecesDeducted: requestedPieces,
        unitsDeducted: requirement.totalUnitsRequested,
        remainingPieces: newTotalPieces,
      });
    } else {
      const currentQty = Math.max(0, toNumber(inventoryItem.quantity, 0));
      const newQty = Math.max(0, currentQty - requestedPieces);
      await connection.query('UPDATE inventory SET quantity = ? WHERE id = ?', [newQty, requirement.itemId]);
      await connection.query(`
        INSERT INTO inventory_reduction_history
          (appointmentId, treatmentRecordId, patientId, patientName, appointmentType, inventoryItemId, inventoryItemName, quantityReduced, quantityBefore, quantityAfter)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        appointmentId,
        treatmentRecordId,
        patientId,
        patientName,
        label,
        requirement.itemId,
        inventoryItem.name || requirement.itemName,
        requestedPieces,
        currentQty,
        newQty,
      ]);
      reductions.push({
        itemId: requirement.itemId,
        itemName: inventoryItem.name || requirement.itemName,
        unitType,
        piecesDeducted: requestedPieces,
        unitsDeducted: requirement.totalUnitsRequested,
        remainingPieces: newQty,
      });
    }
  }

  if (shortages.length > 0) {
    return { applied: false, shortages };
  }

  return { applied: reductions.length > 0, reductions };
}

async function restoreInventoryAutoDeduction(connection, treatmentRecordId) {
  if (!treatmentRecordId) return { restored: false };
  const [historyRows] = await connection.query(
    'SELECT id, inventoryItemId, quantityReduced FROM inventory_reduction_history WHERE treatmentRecordId = ?',
    [treatmentRecordId]
  );
  if (!historyRows || historyRows.length === 0) {
    return { restored: false };
  }
  for (const entry of historyRows) {
    const [items] = await connection.query(
      'SELECT id, quantity, unit_type, pieces_per_box, remaining_pieces FROM inventory WHERE id = ? FOR UPDATE',
      [entry.inventoryItemId]
    );
    if (items.length === 0) continue;
    const inventoryItem = items[0];
    const unitType = inventoryItem.unit_type || 'piece';
    if (unitType === 'box') {
      const perBox = Math.max(DEFAULT_BOX_PIECES, toNumber(inventoryItem.pieces_per_box, 0));
      const currentPieces = computeBoxAvailablePieces(inventoryItem);
      const newTotalPieces = currentPieces + Math.max(0, toNumber(entry.quantityReduced, 0));
      const { quantity, remaining_pieces } = boxStateFromPieces(newTotalPieces, perBox);
      await connection.query(
        'UPDATE inventory SET quantity = ?, remaining_pieces = ? WHERE id = ?',
        [quantity, remaining_pieces, entry.inventoryItemId]
      );
    } else {
      const currentQty = Math.max(0, toNumber(inventoryItem.quantity, 0));
      await connection.query(
        'UPDATE inventory SET quantity = ? WHERE id = ?',
        [currentQty + Math.max(0, toNumber(entry.quantityReduced, 0)), entry.inventoryItemId]
      );
    }
  }
  await connection.query('DELETE FROM inventory_reduction_history WHERE treatmentRecordId = ?', [treatmentRecordId]);
  return { restored: true, count: historyRows.length };
}

module.exports = {
  normalizeServiceList,
  serializeServices,
  parseStoredServices,
  applyInventoryAutoDeduction,
  restoreInventoryAutoDeduction,
};
