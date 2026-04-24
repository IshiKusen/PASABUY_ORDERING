const express = require('express');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const { authenticate, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// All routes require admin
router.use(authenticate, requireAdmin);

// GET /api/users - List all users
router.get('/', async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Update role
router.put('/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (String(req.user.id) === String(id)) {
      return res.status(400).json({ error: 'Cannot change self.' });
    }

    const { error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (String(req.user.id) === String(id)) {
      return res.status(400).json({ error: 'Cannot delete self.' });
    }

    // 1. Get all order IDs for this user
    const { data: orders } = await supabase
      .from('orders')
      .select('id')
      .eq('user_id', id);
    
    const orderIds = orders?.map(o => o.id) || [];

    if (orderIds.length > 0) {
      // 2. Delete all items from those orders first
      await supabase.from('order_items').delete().in('order_id', orderIds);
      
      // 3. Delete the orders themselves
      await supabase.from('orders').delete().in('id', orderIds);
    }

    // 4. Finally, delete the user
    const { error } = await supabase.from('users').delete().eq('id', id);
    
    if (error) throw error;
    res.json({ message: 'User and all related records deleted successfully.' });
  } catch (err) {
    console.error('Deep delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user. Please try again or contact support.' });
  }
});

module.exports = router;
