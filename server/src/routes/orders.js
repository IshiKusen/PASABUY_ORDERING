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
            
            // Flatten image_path and names into the item for frontend convenience
            order.items = (items || []).map(item => ({
                ...item,
                product_name: item.products?.name || 'Unknown Product',
                variant_name: item.product_variants?.variant_name,
                image_path: item.product_variants?.image_path || item.products?.image_path
            }));
            
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
            let price = 0;
            if (item.variant_id) {
                const { data: variant } = await supabase
                    .from('product_variants')
                    .select('price_php')
                    .eq('id', item.variant_id)
                    .single();
                price = Number(variant?.price_php || 0);
            } else {
                const { data: product } = await supabase
                    .from('products')
                    .select('price_php')
                    .eq('id', item.product_id)
                    .single();
                price = Number(product?.price_php || 0);
            }
            
            item.price = price;
            total += price * item.quantity;
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
        const { data: orders } = await supabase.from('orders').select('total, status');
        const { count: total_customers } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'customer');
        
        // Calculate total revenue from non-cancelled/non-pending orders (or all confirmed)
        const total_revenue = (orders || []).reduce((sum, o) => {
            if (o.status !== 'Cancelled' && o.status !== 'Pending') {
                return sum + (Number(o.total) || 0);
            }
            return sum;
        }, 0);

        // Status breakdown for dashboard charts/stats
        const statusMap = {};
        (orders || []).forEach(o => {
            statusMap[o.status] = (statusMap[o.status] || 0) + 1;
        });

        const status_breakdown = Object.keys(statusMap).map(status => ({
            status,
            count: statusMap[status]
        }));

        res.json({ total_orders, total_revenue, total_customers, status_breakdown });
    } catch (err) {
        console.error('Stats error:', err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});


// Bulk Status Update (Admin)
router.put('/bulk-status', authenticate, requireAdmin, async (req, res) => {
    try {
        const { order_ids, status } = req.body;
        const { error } = await supabase
            .from('orders')
            .update({ status })
            .in('id', order_ids);

        if (error) throw error;
        res.json({ message: 'Bulk update successful' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Cancel Order (User/Admin)
router.put('/:id/cancel', authenticate, async (req, res) => {
    try {
        const { reason } = req.body;
        const orderId = req.params.id;

        // Check if order belongs to user or is admin
        const { data: order, error: fetchErr } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();

        if (fetchErr || !order) throw new Error('Order not found');

        if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (order.status === 'Cancelled' || order.status === 'Delivered') {
            return res.status(400).json({ error: 'Order cannot be cancelled at this stage' });
        }

        const { error: updateErr } = await supabase
            .from('orders')
            .update({ status: 'Cancelled', cancellation_reason: reason })
            .eq('id', orderId);

        if (updateErr) throw updateErr;

        // Replenish Stock
        const { data: items } = await supabase.from('order_items').select('*').eq('order_id', orderId);
        for (const item of items) {
            if (item.variant_id) {
                // We'll need an addition rpc or just use negative qty in deduct?
                // For safety, let's call a different rpc or direct update
                await supabase.rpc('add_variant_stock', { v_id: item.variant_id, qty: item.quantity });
            } else {
                await supabase.rpc('add_product_stock', { p_id: item.product_id, qty: item.quantity });
            }
        }

        res.json({ message: 'Order cancelled and stock replenished' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Status
router.put('/:id/status', authenticate, requireAdmin, async (req, res) => {
    try {
        const { status, delivery_date } = req.body;
        await supabase.from('orders').update({ status, delivery_date }).eq('id', req.params.id);
        res.json({ message: 'Updated' });
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

module.exports = router;

