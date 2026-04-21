const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

/**
 * Fetches current system context (batch info, product count, category list)
 * for the Gemini AI bot to use in its system prompt.
 */
async function getSystemContext() {
  try {
    // 1. Fetch Config
    const { data: configRows } = await supabase.from('system_config').select('*');
    const config = {};
    configRows?.forEach(row => {
      config[row.config_key] = row.config_value;
    });

    // 2. Fetch Categories
    const { data: categories } = await supabase.from('categories').select('name');
    const categoryList = categories?.map(c => c.name).join(', ') || 'General';

    // 3. Fetch Featured Products (Limited to 15 for context window)
    const { data: products } = await supabase
      .from('products')
      .select('name, price_php, stock')
      .eq('is_featured', true)
      .gt('stock', 0)
      .limit(15);

    const productList = products?.map(p => `- ${p.name} (₱${p.price_php})`).join('\n') || 'No featured items at the moment.';

    return {
      batchName: config.batch_name || 'Japan Haul',
      cutoffDate: config.cutoff_date || 'TBA',
      etaDelivery: `${config.eta_start || 'TBA'} to ${config.eta_end || 'TBA'}`,
      productCount: products?.length || 0,
      productList,
      categoryList
    };
  } catch (err) {
    console.error('Error getting system context:', err);
    return {
      batchName: 'Japan Haul Pasabuy',
      cutoffDate: 'TBA',
      etaDelivery: 'TBA',
      productCount: 0,
      productList: 'System currently updating...',
      categoryList: 'General'
    };
  }
}

/**
 * Looks up order status by order code.
 */
async function lookupOrder(orderCode) {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('order_code, status, total_amount, created_at, customer_name, delivery_date')
      .eq('order_code', orderCode)
      .single();

    if (error || !order) return null;

    return [{
      code: order.order_code,
      status: order.status,
      total: `₱${order.total_amount.toLocaleString()}`,
      date: new Date(order.created_at).toLocaleDateString(),
      customer: order.customer_name,
      deliveryDate: order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : 'To be determined'
    }];
  } catch (err) {
    console.error('Error looking up order:', err);
    return null;
  }
}

module.exports = {
  getSystemContext,
  lookupOrder,
  systemInstruction: `You are the Japan Haul AI Assistant, a friendly and helpful representative for a "Pasabuy" service.`
};
