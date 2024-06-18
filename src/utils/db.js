const mysql = require('mysql2/promise');
const config = require('../config').db;

const pool = mysql.createPool(config);

module.exports = {
  pool,
  connect: async () => {
    try {
      const connection = await pool.getConnection();
      console.log('Connected to the database');
      connection.release();
    } catch (err) {
      throw new Error('Failed to connect to the database');
    }
  }
};
