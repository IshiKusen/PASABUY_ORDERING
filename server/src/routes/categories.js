const express = require('express');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const { authenticate, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// GET /api/categories - List all categories
router.get('/', async (req, res) => {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) throw error;
    res.json({ categories });
  } catch (err) {
    console.error('Get categories error:', err);
    res.status(500).json({ error: 'Failed to fetch categories.' });
  }
});

// POST /api/categories - Create category (admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    
    // Use upsert to handle cases where category already exists
    // We match by 'name' and return the record
    const { data: category, error } = await supabase
      .from('categories')
      .upsert({ name }, { onConflict: 'name' })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ category });
  } catch (err) {
    console.error('Category creation error:', err);
    res.status(500).json({ error: 'Failed to create or sync category.' });
  }
});


// DELETE /api/categories/:id - Delete category (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Category deleted successfully.' });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ error: 'Failed to delete category.' });
  }
});

// UPDATE /api/categories/:id - Update category name (admin only)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const { data: category, error } = await supabase
      .from('categories')
      .update({ name })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ category, message: 'Category updated successfully.' });
  } catch (err) {
    console.error('Update category error:', err);
    res.status(500).json({ error: 'Failed to update category.' });
  }
});

module.exports = router;
