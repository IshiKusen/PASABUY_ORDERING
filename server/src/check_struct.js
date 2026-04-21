require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function check() {
  console.log('--- Order Structure Check ---');
  const { data: orders } = await supabase
    .from('orders')
    .select('*, order_items(*, products(*), product_variants(*))')
    .limit(1);

  if (orders && orders[0]) {
    console.log('Order Items Sample:', orders[0].order_items[0]);
  } else {
    console.log('No orders found to inspect');
  }
}
check();
