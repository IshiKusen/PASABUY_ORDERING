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

    // 1. Delete all orders belonging to this user first (cleanup)
    await supabase.from('orders').delete().eq('user_id', id);

    // 2. Now delete the user
    const { error } = await supabase.from('users').delete().eq('id', id);
    
    if (error) throw error;
    res.json({ message: 'User and their order history deleted successfully.' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user. They might have active records.' });
  }
});

module.exports = router;
