const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase URL or Key in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyTables() {
  console.log('--- Checking Supabase Tables ---');
  
  const tables = ['users', 'products', 'orders', 'categories', 'order_items', 'system_config'];
  let allGood = true;

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('count').limit(1);
    if (error) {
      console.error(`❌ Table "${table}" error:`, error.message);
      allGood = false;
    } else {
      console.log(`✅ Table "${table}" exists.`);
    }
  }

  if (allGood) {
    // Check for admin
    const { data: admin } = await supabase.from('users').select('id').eq('role', 'admin').limit(1);
    if (admin && admin.length > 0) {
      console.log('✅ Admin user found.');
    } else {
      console.warn('⚠️ No admin user found in "users" table.');
    }

    // Check for config
    const { data: config } = await supabase.from('system_config').select('config_value').eq('config_key', 'jpy_to_php_rate').single();
    if (config) {
      console.log('✅ System configuration (jpy_to_php_rate) found:', config.config_value);
    } else {
      console.warn('⚠️ System configuration missing.');
    }
  }

  console.log('--------------------------------');
}

verifyTables();
