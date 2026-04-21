require('dotenv').config({ path: '../server/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkColumns() {
  console.log('--- Checking Order Items Structure ---');
  
  // 1. Fetch one order item to see current structure
  const { data: item, error } = await supabase
    .from('order_items')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching order item:', error);
    return;
  }

  console.log('Sample Order Item Keys:', Object.keys(item));
  console.log('Sample Data:', item);
  
  // 2. Fetch full order for admin
  const { data: orders } = await supabase
    .from('orders')
    .select('*, order_items(*, products(*), product_variants(*))')
    .limit(1);
    
  if (orders && orders[0] && orders[0].order_items[0]) {
      console.log('Nested Structure Test (items[0]):', Object.keys(orders[0].order_items[0]));
      console.log('Products key exists:', !!orders[0].order_items[0].products);
  }
}

checkColumns();
