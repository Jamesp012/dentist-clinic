const mysql = require('mysql2/promise');
const path = require('path');
const env = (process.env.NODE_ENV || 'development').trim();
const envFile = env === 'test' ? '.env.test' : (env === 'production' ? '.env.production' : '.env');
require('dotenv').config({ path: path.join(__dirname, '..', envFile) });

console.log(`Database Config: Connecting to ${process.env.DB_HOST} with database ${process.env.DB_NAME} (Env: ${env})`);

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'dental_clinic',
  port: Number(process.env.DB_PORT) || 3306,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  timezone: '+00:00'  // Use UTC to keep dates consistent
});

module.exports = pool;
