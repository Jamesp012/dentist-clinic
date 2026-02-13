const mysql = require('mysql2/promise');
require('dotenv').config();

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

async function columnExists(connection, table, column) {
  const [rows] = await connection.query('SHOW COLUMNS FROM ?? LIKE ?', [table, column]);
  return rows.length > 0;
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const computeLegacyBaseQuantity = (row) => {
  const unitType = row.unit_type || 'piece';
  if (unitType !== 'box') {
    return Math.max(0, Math.floor(toNumber(row.quantity, 0)));
  }

  const perBox = Math.max(1, Math.floor(toNumber(row.pieces_per_box, 0)) || 1);
  const boxes = Math.max(0, Math.floor(toNumber(row.quantity, 0)));
  if (boxes === 0) {
    return 0;
  }

  let remaining = row.remaining_pieces == null
    ? perBox
    : clamp(Math.floor(toNumber(row.remaining_pieces, perBox)), 0, perBox);

  return Math.max(0, (boxes - 1) * perBox + remaining);
};

const deriveBreakdown = (baseQuantity, conversionValue) => {
  const safeBase = Math.max(0, Math.floor(baseQuantity));
  if (!conversionValue || conversionValue <= 1) {
    return { fullUnits: safeBase, remainder: 0 };
  }
  return {
    fullUnits: Math.floor(safeBase / conversionValue),
    remainder: safeBase % conversionValue,
  };
};

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dental_clinic',
    port: Number(process.env.DB_PORT) || 3306,
  });

  try {
    console.log('🔧 Applying inventory unit conversion migration...');

    if (!(await columnExists(connection, 'inventory', 'base_quantity'))) {
      console.log('• Adding inventory.base_quantity');
      await connection.query('ALTER TABLE inventory ADD COLUMN base_quantity INT NOT NULL DEFAULT 0 AFTER quantity');
    }

    if (!(await columnExists(connection, 'inventory', 'base_unit'))) {
      console.log('• Adding inventory.base_unit');
      await connection.query("ALTER TABLE inventory ADD COLUMN base_unit VARCHAR(50) NOT NULL DEFAULT 'piece' AFTER unit");
    }

    if (!(await columnExists(connection, 'inventory', 'main_unit'))) {
      console.log('• Adding inventory.main_unit');
      await connection.query('ALTER TABLE inventory ADD COLUMN main_unit VARCHAR(50) NULL AFTER base_unit');
    }

    if (!(await columnExists(connection, 'inventory', 'conversion_value'))) {
      console.log('• Adding inventory.conversion_value');
      await connection.query('ALTER TABLE inventory ADD COLUMN conversion_value INT NULL AFTER main_unit');
    }

    console.log('• Normalizing existing inventory rows');
    const [rows] = await connection.query('SELECT * FROM inventory');

    for (const row of rows) {
      const unitType = row.unit_type || 'piece';
      const hasConversion = unitType === 'box' && toNumber(row.pieces_per_box, 0) > 1;
      const conversionValue = hasConversion ? Math.max(2, Math.floor(toNumber(row.pieces_per_box, 0))) : null;
      const baseQuantity = hasConversion ? computeLegacyBaseQuantity(row) : Math.max(0, Math.floor(toNumber(row.quantity, 0)));
      const baseUnit = unitType === 'box'
        ? 'piece'
        : (row.base_unit || row.unit || 'piece');
      const mainUnit = hasConversion ? (row.unit || 'box') : null;
      const { fullUnits, remainder } = deriveBreakdown(baseQuantity, conversionValue);
      const minQuantityBase = hasConversion
        ? Math.max(0, Math.floor(toNumber(row.minQuantity, 0)) * (conversionValue || 1))
        : Math.max(0, Math.floor(toNumber(row.minQuantity, 0)));

      await connection.query(
        `UPDATE inventory SET 
          base_unit = ?,
          main_unit = ?,
          conversion_value = ?,
          base_quantity = ?,
          quantity = ?,
          remaining_pieces = ?,
          minQuantity = ?,
          pieces_per_box = ?
        WHERE id = ?`,
        [
          baseUnit,
          mainUnit,
          conversionValue,
          baseQuantity,
          fullUnits,
          hasConversion ? remainder : null,
          minQuantityBase,
          conversionValue,
          row.id,
        ]
      );
    }

    console.log(`✅ Inventory unit conversion complete for ${rows.length} items`);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

run();
