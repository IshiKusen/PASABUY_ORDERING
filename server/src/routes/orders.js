const express = require('express');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const { authenticate, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Generate unique order code: PB-2026-XXX
const generateOrderCode = async () => {
    const year = new Date().getFullYear();
    const { data: latestOrder } = await supabase
        .from('orders')
        .select('order_code')
        .like('order_code', `PB-${year}-%`)
        .order('id', { ascending: false })
        .limit(1)
        .single();

    let nextNum = 1;
    if (latestOrder) {
        const parts = latestOrder.order_code.split('-');
        nextNum = parseInt(parts[2], 10) + 1;
    }
    return `PB-${year}-${String(nextNum).padStart(3, '0')}`;
};

// GET /api/orders
router.get('/', authenticate, async (req, res) => {
    try {
        const { status, search, personal } = req.query;
        let query = supabase.from('orders').select('*, users(*)');

        if (req.user.role !== 'admin' || personal === 'true') {
            query = query.eq('user_id', req.user.id);
        }
        if (status && status !== 'All') {
            query = query.eq('status', status);
        }
        
        const { data: orders, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;

        // Fetch items separately for each order (Supabase doesn't support easy nested filters on many-to-many here easily)
        for (const order of orders) {
            const { data: items } = await supabase
                .from('order_items')
                .select('*, products(*), product_variants(*)')
                .eq('order_id', order.id);
            order.items = items;
            order.customer_name = order.users?.full_name;
        }

        res.json({ orders });
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

// POST /api/orders - Create Order
router.post('/', authenticate, async (req, res) => {
    try {
        const { items, customer_details } = req.body;
        const order_code = await generateOrderCode();
        let total = 0;

        // Calc total & validate
        for (const item of items) {
           const { data: product } = await supabase.from('products').select('*').eq('id', item.product_id).single();
           item.price = product.price_php;
           total += item.price * item.quantity;
        }

        let orderUserId = req.user.id;
        if (req.user.role === 'admin' && customer_details) {
            const { data: guest } = await supabase.from('users').insert({
                full_name: customer_details.fullName || 'Walk-in',
                email: `guest_${Date.now()}@pasabuy.local`,
                role: 'customer'
            }).select().single();
            orderUserId = guest.id;
        }

        const { data: order, error: orderErr } = await supabase.from('orders').insert({
            order_code,
            user_id: orderUserId,
            total,
            status: 'Pending'
        }).select().single();

        if (orderErr) throw orderErr;

        // Insert items
        for (const item of items) {
            await supabase.from('order_items').insert({
                order_id: order.id,
                product_id: item.product_id,
                variant_id: item.variant_id || null,
                quantity: item.quantity,
                price_at_purchase: item.price
            });
            // Stock deduction
            if (item.variant_id) {
               await supabase.rpc('deduct_variant_stock', { v_id: item.variant_id, qty: item.quantity });
            } else {
               await supabase.rpc('deduct_product_stock', { p_id: item.product_id, qty: item.quantity });
            }
        }

        res.status(201).json({ message: 'Success', order_code, order_id: order.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin Stats
router.get('/stats', authenticate, requireAdmin, async (req, res) => {
    try {
        const { count: total_orders } = await supabase.from('orders').select('*', { count: 'exact', head: true });
        const { data: sales } = await supabase.from('orders').select('total').neq('status', 'Pending');
        const { count: total_customers } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'customer');
        
        const total_revenue = sales.reduce((sum, o) => sum + o.total, 0);

        res.json({ total_orders, total_revenue, total_customers });
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

// Update Status
router.put('/:id/status', authenticate, requireAdmin, async (req, res) => {
    const { status, delivery_date } = req.body;
    await supabase.from('orders').update({ status, delivery_date }).eq('id', req.params.id);
    res.json({ message: 'Updated' });
});

module.exports = router;
