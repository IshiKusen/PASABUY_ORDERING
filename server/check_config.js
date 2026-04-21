const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function checkConfig() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pasabuy_db',
  });

  try {
    const [rows] = await pool.query('SELECT * FROM system_config');
    console.log('Config:', JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkConfig();
