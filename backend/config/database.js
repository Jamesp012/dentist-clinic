const mysql = require('mysql2/promise');
const path = require('path');
const env = (process.env.NODE_ENV || 'development').trim();
const envFile = env === 'test' ? '.env.test' : (env === 'production' ? '.env.production' : '.env');
require('dotenv').config({ path: path.join(__dirname, '..', envFile) });

console.log(`Database Config: Connecting to ${process.env.DB_HOST} with database ${process.env.DB_NAME} (Env: ${env})`);

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'u940592735_drjoseph',
  password: process.env.DB_PASSWORD || 'Dent4lcl!n!c',
  database: process.env.DB_NAME || 'u940592735_dental_clinic',
  port: Number(process.env.DB_PORT) || 3306,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  timezone: '+00:00'  // Use UTC to keep dates consistent
});

module.exports = pool;
