require('dotenv').config({ path: '../server/.env' });
const { createClient } = require('@supabase/supabase-client');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function cleanup() {
  console.log('--- Starting Database Cleanup ---');
  
  // 1. Fetch all products marked as inactive
  const { data: inactiveProducts, error: fetchError } = await supabase
    .from('products')
    .select('id, name')
    .eq('is_active', false);

  if (fetchError) {
    console.error('Error fetching inactive products:', fetchError);
    return;
  }

  console.log(`Found ${inactiveProducts.length} inactive products.`);

  for (const product of inactiveProducts) {
    console.log(`Attempting to hard delete: ${product.name} (ID: ${product.id})`);
    
    // First delete variants
    await supabase.from('product_variants').delete().eq('product_id', product.id);
    
    // Then delete product
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', product.id);

    if (deleteError) {
      if (deleteError.code === '23503') {
        console.log(`   [SKIP] Product "${product.name}" has existing order records. Keeping as hidden.`);
      } else {
        console.error(`   [ERROR] Failed to delete "${product.name}":`, deleteError.message);
      }
    } else {
      console.log(`   [SUCCESS] Permanently removed "${product.name}" from Supabase.`);
    }
  }

  console.log('--- Cleanup Finished ---');
}

cleanup();
