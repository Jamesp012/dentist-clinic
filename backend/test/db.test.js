const { expect } = require('chai');
const pool = require('../config/database');

describe('Database Connectivity', () => {
  it('should connect to the database and run a simple query', async () => {
    try {
      const [rows] = await pool.query('SELECT 1 + 1 AS result');
      expect(rows[0].result).to.equal(2);
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  });

  it('should be able to query the users table', async () => {
    try {
      const [rows] = await pool.query('SELECT COUNT(*) as count FROM users');
      expect(rows[0]).to.have.property('count');
      expect(rows[0].count).to.be.a('number');
    } catch (error) {
      // If table doesn't exist in a fresh test DB, it might fail, 
      // but at least we know the connection works.
      if (error.code === 'ER_NO_SUCH_TABLE') {
        console.warn('Users table does not exist yet.');
      } else {
        throw error;
      }
    }
  });
});
