const express = require('express');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const { authenticate, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// GET /api/config - Get all config keys
router.get('/', async (req, res) => {
  try {
    const { data: configRows, error } = await supabase
      .from('system_config')
      .select('*');

    if (error) throw error;

    // Convert array to key-value object
    const config = {};
    configRows.forEach(row => {
      config[row.config_key] = row.config_value;
    });

    res.json({ config });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// POST /api/config - Update config keys (admin)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const updates = req.body; // { key: value, ... }
    const entries = Object.entries(updates).map(([key, value]) => ({
      config_key: key,
      config_value: value.toString()
    }));

    for (const entry of entries) {
      const { error } = await supabase
        .from('system_config')
        .upsert(entry, { onConflict: 'config_key' });
      if (error) throw error;
    }

    res.json({ message: 'Settings updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

module.exports = router;
