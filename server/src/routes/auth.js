const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const router = express.Router();

/**
 * POST /api/auth/google
 * Handles account creation or profile synchronization after Google Auth
 */
router.post('/google', async (req, res) => {
  try {
    const { google_id, email, full_name, avatar_url, phone, address, lat, lng } = req.body;

    if (!email) return res.status(400).json({ error: 'Email is required' });

    // Supabase Upsert - Use Service Role power if needed, but here we use Anon
    const { data: user, error } = await supabase
      .from('users')
      .upsert({
        google_id,
        email,
        full_name,
        avatar_url,
        phone,
        address,
        lat,
        lng
      }, { onConflict: 'email' })
      .select()
      .single();

    if (error) throw error;

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user });
  } catch (err) {
    console.error('Google signup/update error:', err);
    res.status(500).json({ error: 'Failed to sync account.' });
  }
});

/**
 * POST /api/auth/facebook
 * Handles account creation or profile synchronization after Facebook Auth
 */
router.post('/facebook', async (req, res) => {
  try {
    const { facebook_id, email, full_name, avatar_url, phone, address, lat, lng } = req.body;

    if (!email) return res.status(400).json({ error: 'Email is required' });

    const { data: user, error } = await supabase
      .from('users')
      .upsert({
        facebook_id,
        email,
        full_name,
        avatar_url,
        phone,
        address,
        lat,
        lng
      }, { onConflict: 'email' })
      .select()
      .single();

    if (error) throw error;

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user });
  } catch (err) {
    console.error('Facebook signup/update error:', err);
    res.status(500).json({ error: 'Failed to sync account.' });
  }
});

/**
 * POST /api/auth/login
 * Simple check-and-login for existing users (usually via email)
 */
router.post('/login', async (req, res) => {
  try {
    const { email } = req.body;
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'Account not found. Please sign up.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

/**
 * GET /api/auth/me
 * Verifies the token and returns the current user profile
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token.' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.id)
      .single();

    if (error || !user) return res.status(401).json({ error: 'User not found.' });

    res.json({ user });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token.' });
  }
});

module.exports = router;

