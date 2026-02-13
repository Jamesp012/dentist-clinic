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

const computeLegacyTotalPieces = (row) => {
  const stored = row.total_pieces ?? row.base_quantity;
  if (stored != null) {
    return Math.max(0, Math.floor(toNumber(stored, 0)));
  }

  const unitType = row.unit_type || 'piece';
  if (unitType !== 'box') {
    return Math.max(0, Math.floor(toNumber(row.quantity, 0)));
  }

  const perUnit = Math.max(1, Math.floor(toNumber(row.pieces_per_box ?? row.conversion_value, 0)) || 1);
  const boxes = Math.max(0, Math.floor(toNumber(row.quantity, 0)));
  if (boxes === 0) {
    return 0;
  }

  let remaining = row.remaining_pieces == null
    ? perUnit
    : clamp(Math.floor(toNumber(row.remaining_pieces, perUnit)), 0, perUnit);

  return Math.max(0, (boxes - 1) * perUnit + remaining);
};

const deriveBreakdown = (totalPieces, piecesPerUnit) => {
  const safeTotal = Math.max(0, Math.floor(toNumber(totalPieces, 0)));
  const safePerUnit = Math.max(1, Math.floor(toNumber(piecesPerUnit, 0)));

  if (!safePerUnit || safePerUnit <= 1) {
    return {
      mainQuantity: safeTotal,
      remainderPieces: 0,
    };
  }

  return {
    mainQuantity: Math.floor(safeTotal / safePerUnit),
    remainderPieces: safeTotal % safePerUnit,
  };
};

async function ensureColumn(connection, column, definition) {
  const exists = await columnExists(connection, 'inventory', column);
  if (exists) {
    return false;
  }
  await connection.query(`ALTER TABLE inventory ADD COLUMN ${definition}`);
  return true;
}

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dental_clinic',
    port: Number(process.env.DB_PORT) || 3306,
    charset: 'utf8mb4',
  });

  try {
    console.log('🔧 Adding total pieces tracking columns...');

    const addedMainQty = await ensureColumn(connection, 'main_quantity', 'main_quantity INT NOT NULL DEFAULT 0 AFTER quantity');
    if (addedMainQty) {
      console.log('• Added inventory.main_quantity');
    }

    const addedPiecesPerUnit = await ensureColumn(connection, 'pieces_per_unit', 'pieces_per_unit INT NULL AFTER conversion_value');
    if (addedPiecesPerUnit) {
      console.log('• Added inventory.pieces_per_unit');
    }

    const addedTotalPieces = await ensureColumn(connection, 'total_pieces', 'total_pieces INT NOT NULL DEFAULT 0 AFTER base_quantity');
    if (addedTotalPieces) {
      console.log('• Added inventory.total_pieces');
    }

    console.log('• Normalizing existing inventory rows');
    const [rows] = await connection.query(`
      SELECT 
        id,
        quantity,
        main_quantity,
        unit_type,
        pieces_per_box,
        conversion_value,
        pieces_per_unit,
        remaining_pieces,
        base_quantity,
        total_pieces
      FROM inventory
    `);

    for (const row of rows) {
      const piecesPerUnit = row.pieces_per_unit ?? row.conversion_value ?? row.pieces_per_box ?? null;
      const totalPieces = computeLegacyTotalPieces(row);
      const { mainQuantity, remainderPieces } = deriveBreakdown(totalPieces, piecesPerUnit);

      await connection.query(
        `UPDATE inventory SET 
          main_quantity = ?,
          pieces_per_unit = ?,
          total_pieces = ?,
          quantity = ?,
          base_quantity = ?,
          conversion_value = ?,
          pieces_per_box = ?,
          remaining_pieces = ?
        WHERE id = ?`,
        [
          mainQuantity,
          piecesPerUnit,
          totalPieces,
          mainQuantity,
          totalPieces,
          piecesPerUnit,
          piecesPerUnit,
          piecesPerUnit ? remainderPieces : null,
          row.id,
        ]
      );
    }

    console.log(`✅ Total pieces columns ready for ${rows.length} items`);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

run();
