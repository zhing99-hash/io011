/**
 * PostgreSQL Database Connection
 */

const { Pool } = require('pg');

let pool = null;

module.exports = {
  connect: async () => {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'aicart_hub',
      user: process.env.DB_USER || 'aicart',
      password: process.env.DB_PASSWORD,
      client_encoding: 'UTF8',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    
    // Test connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    
    console.log('PostgreSQL connected');
  },
  
  query: async (text, params) => {
    if (!pool) throw new Error('Database not connected');
    return pool.query(text, params);
  },
  
  getClient: async () => {
    if (!pool) throw new Error('Database not connected');
    return pool.connect();
  },
  
  close: async () => {
    if (pool) {
      await pool.end();
      console.log('PostgreSQL disconnected');
    }
  }
};
