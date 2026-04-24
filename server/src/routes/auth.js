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

    let user;
    
    // 1. Try to find user by google_id
    const { data: byGoogleId } = await supabase
      .from('users')
      .select('*')
      .eq('google_id', google_id)
      .single();

    if (byGoogleId) {
      // Update existing user
      const { data: updated } = await supabase
        .from('users')
        .update({ 
          email: email || byGoogleId.email,
          full_name: full_name || byGoogleId.full_name,
          avatar_url: avatar_url || byGoogleId.avatar_url,
          phone: phone || byGoogleId.phone,
          address: address || byGoogleId.address,
          lat: lat || byGoogleId.lat,
          lng: lng || byGoogleId.lng
        })
        .eq('id', byGoogleId.id)
        .select()
        .single();
      user = updated;
    } else if (email) {
      // 2. Try to find user by email
      const { data: byEmail } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (byEmail) {
        // Link google_id to existing email account
        const { data: updated } = await supabase
          .from('users')
          .update({ google_id, avatar_url: avatar_url || byEmail.avatar_url })
          .eq('id', byEmail.id)
          .select()
          .single();
        user = updated;
      }
    }

    if (!user) {
      // 3. Create new user
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          google_id,
          email: email || `${google_id}@google.social`,
          full_name,
          avatar_url,
          phone,
          address,
          lat,
          lng
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      user = newUser;
    }

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

    let user;

    // 1. Try to find user by facebook_id
    const { data: byFbId } = await supabase
      .from('users')
      .select('*')
      .eq('facebook_id', facebook_id)
      .single();

    if (byFbId) {
      // Update existing user
      const { data: updated } = await supabase
        .from('users')
        .update({ 
          email: email || byFbId.email,
          full_name: full_name || byFbId.full_name,
          avatar_url: avatar_url || byFbId.avatar_url,
          phone: phone || byFbId.phone,
          address: address || byFbId.address,
          lat: lat || byFbId.lat,
          lng: lng || byFbId.lng
        })
        .eq('id', byFbId.id)
        .select()
        .single();
      user = updated;
    } else if (email) {
      // 2. Try to find user by email
      const { data: byEmail } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (byEmail) {
        // Link facebook_id to existing email account
        const { data: updated } = await supabase
          .from('users')
          .update({ facebook_id, avatar_url: avatar_url || byEmail.avatar_url })
          .eq('id', byEmail.id)
          .select()
          .single();
        user = updated;
      }
    }

    if (!user) {
      // 3. Create new user
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          facebook_id,
          email: email || `${facebook_id}@facebook.social`,
          full_name,
          avatar_url,
          phone,
          address,
          lat,
          lng
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      user = newUser;
    }

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

