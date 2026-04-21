const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const router = express.Router();

// POST /api/auth/google - Login/Register with Google
router.post('/google', async (req, res) => {
  try {
    const { google_id, full_name, email, avatar_url, phone, address, lat, lng } = req.body;

    if (!email || !full_name) {
      return res.status(400).json({ error: 'Email and full name are required.' });
    }

    // Check if user exists
    const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

    let user;
    if (existing.length > 0) {
      user = existing[0];
      // Update profile info if provided
      await db.query(
        'UPDATE users SET google_id = COALESCE(?, google_id), full_name = ?, avatar_url = COALESCE(?, avatar_url), phone = COALESCE(?, phone), address = COALESCE(?, address), lat = COALESCE(?, lat), lng = COALESCE(?, lng) WHERE id = ?',
        [google_id, full_name, avatar_url, phone, address, lat, lng, user.id]
      );
      // Re-fetch updated user
      const [updated] = await db.query('SELECT * FROM users WHERE id = ?', [user.id]);
      user = updated[0];
    } else {
      // Create new user
      const [result] = await db.query(
        'INSERT INTO users (google_id, full_name, email, avatar_url, phone, address, lat, lng, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [google_id, full_name, email, avatar_url, phone, address, lat, lng, 'customer']
      );
      const [newUser] = await db.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
      user = newUser[0];
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        lat: user.lat,
    const { credential } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: google_id, email, name: full_name, picture: avatar_url } = payload;

    // Supabase Upsert
    const { data: user, error } = await supabase
      .from('users')
      .upsert({
        google_id,
        email,
        full_name,
        avatar_url,
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
    console.error('Google auth error:', err);
    res.status(500).json({ error: 'Authentication failed.' });
  }
});

// GET /api/auth/me - Verify current token
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
