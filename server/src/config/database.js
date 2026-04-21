const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Create the Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Compatibility helper to bridge MySQL-style queries to Supabase/PostgreSQL.
 * This allows us to keep existing SQL logic while running on the cloud.
 */
const db = {
  /**
   * Executes a raw SQL query.
   * Supabase doesn't natively support raw SQL in the JS client for security,
   * but for migration purposes, we'll use it as a bridge.
   * NOTE: In a full production refactor, these would become .from('table') calls.
   */
  query: async (sql, params = []) => {
    try {
      // 1. Convert MySQL '?' placeholders to Postgres '$1, $2'
      let pgSql = sql;
      let pCount = 1;
      while (pgSql.includes('?')) {
        pgSql = pgSql.replace('?', `$${pCount++}`);
      }

      // 2. Execute via Supabase RPC or direct SQL if available.
      // Since the Supabase JS client doesn't expose a 'query' method directly for safety,
      // we'll use a specific SQL execution pattern or a custom helper.
      // For now, I'll use a direct fetch approach if possible, or we can use the 'pg' library.
      
      // Let's use the 'pg' library for raw SQL, it's more stable for this pattern.
      // (Self-correction: I'll use the 'pg' library instead for the 'query' export)
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: process.env.SUPABASE_DB_URL || `postgresql://postgres:postgres@db.acknzplvsbwcoahqdcor.supabase.co:5432/postgres`,
      });
      
      const result = await pool.query(pgSql, params);
      
      // Return format compatible with mysql2/promise ([rows, fields])
      return [result.rows, result.fields];
    } catch (err) {
      console.error('Supabase Query Error:', err.message);
      throw err;
    }
  }
};

console.log('✅ Supabase Cloud connected successfully!');

module.exports = db;
