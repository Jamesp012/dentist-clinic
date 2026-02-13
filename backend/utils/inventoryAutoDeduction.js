const {
  toNumber,
  getBaseQuantity,
  getConversionValue,
  deriveQuantitiesFromBase,
} = require('./inventoryUnits');

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
    const conversionValue = getConversionValue(row);
    const quantityToReduce = Math.max(0, toNumber(row.quantityToReduce, 0));
    if (quantityToReduce === 0) continue;
    
    const entry = map.get(key) || {
      itemId: row.inventoryItemId,
      itemName: row.inventoryItemName || row.name || 'Unnamed Item',
      unitType,
      conversionValue,
      services: new Set(),
      totalUnitsRequested: 0,
      totalPiecesRequested: 0,
    };
    
    entry.services.add(row.appointmentType);
    entry.totalUnitsRequested += quantityToReduce;
    
    const piecesIncrement = conversionValue > 0
      ? quantityToReduce * conversionValue
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
  strict = true
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
      i.pieces_per_unit,
      i.pieces_per_box,
      i.conversion_value
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
    const [rows] = await connection.query(
      `SELECT 
        id, 
        name, 
        unit, 
        main_unit, 
        base_unit, 
        unit_type, 
        quantity, 
        main_quantity, 
        remaining_pieces, 
        pieces_per_unit, 
        pieces_per_box, 
        conversion_value,
        base_quantity,
        total_pieces
      FROM inventory 
      WHERE id = ? 
      FOR UPDATE`,
      [requirement.itemId]
    );

    if (rows.length === 0) {
      shortages.push({
        itemId: requirement.itemId,
        itemName: requirement.itemName,
        reason: 'MISSING_INVENTORY_ITEM',
        services: Array.from(requirement.services),
      });
      continue;
    }

    const inventoryItem = rows[0];
    const availablePieces = getBaseQuantity(inventoryItem);
    
    if (availablePieces < requirement.totalPiecesRequested) {
      shortages.push({
        itemId: requirement.itemId,
        itemName: inventoryItem.name || requirement.itemName,
        availablePieces,
        requestedPieces: requirement.totalPiecesRequested,
        unitType: inventoryItem.unit_type || requirement.unitType,
        services: Array.from(requirement.services),
      });
      continue;
    }
  }

  if (shortages.length > 0 && strict) {
    return { applied: false, shortages };
  }

  // Actually apply reductions
  for (const requirement of aggregated) {
    const [rows] = await connection.query(
      `SELECT * FROM inventory WHERE id = ? FOR UPDATE`,
      [requirement.itemId]
    );
    
    if (rows.length === 0) continue;
    
    const inventoryItem = rows[0];
    const availablePieces = getBaseQuantity(inventoryItem);
    const conversionValue = getConversionValue(inventoryItem);
    
    const newTotalPieces = availablePieces - requirement.totalPiecesRequested;
    const breakdown = conversionValue > 0
      ? deriveQuantitiesFromBase(newTotalPieces, conversionValue)
      : { quantity: newTotalPieces, remaining_pieces: 0 };
    
    await connection.query(
      'UPDATE inventory SET base_quantity = ?, quantity = ?, remaining_pieces = ?, total_pieces = ?, main_quantity = ? WHERE id = ?',
      [
        newTotalPieces, 
        breakdown.quantity, 
        conversionValue > 0 ? breakdown.remaining_pieces : null,
        newTotalPieces,
        breakdown.quantity,
        requirement.itemId
      ]
    );

    await connection.query(`
      INSERT INTO inventory_reduction_history
        (appointmentId, treatmentRecordId, patientId, patientName, appointmentType, inventoryItemId, inventoryItemName, quantityReduced, quantityBefore, quantityAfter, reducedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      appointmentId,
      treatmentRecordId,
      patientId,
      patientName,
      label,
      requirement.itemId,
      inventoryItem.name || requirement.itemName,
      requirement.totalPiecesRequested,
      availablePieces,
      newTotalPieces,
    ]);

    reductions.push({
      itemId: requirement.itemId,
      itemName: inventoryItem.name || requirement.itemName,
      piecesDeducted: requirement.totalPiecesRequested,
      remainingPieces: newTotalPieces,
    });
  }

  return {
    applied: reductions.length > 0,
    reductions,
    shortages: shortages.length > 0 ? shortages : undefined,
  };
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
      'SELECT * FROM inventory WHERE id = ? FOR UPDATE',
      [entry.inventoryItemId]
    );
    
    if (items.length === 0) continue;
    
    const inventoryItem = items[0];
    const conversionValue = getConversionValue(inventoryItem);
    const availablePieces = getBaseQuantity(inventoryItem);
    const restoredQuantity = availablePieces + Math.max(0, toNumber(entry.quantityReduced, 0));
    
    const breakdown = conversionValue > 0
      ? deriveQuantitiesFromBase(restoredQuantity, conversionValue)
      : { quantity: restoredQuantity, remaining_pieces: 0 };
      
    await connection.query(
      'UPDATE inventory SET base_quantity = ?, quantity = ?, remaining_pieces = ?, total_pieces = ?, main_quantity = ? WHERE id = ?',
      [
        restoredQuantity, 
        breakdown.quantity, 
        conversionValue > 0 ? breakdown.remaining_pieces : null,
        restoredQuantity,
        breakdown.quantity,
        entry.inventoryItemId
      ]
    );
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
