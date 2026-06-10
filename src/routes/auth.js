const express = require('express');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const { pool } = require('../db/pool');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, password, displayName } = req.body;
  if (!username?.trim() || !password)
    return res.status(400).json({ error: 'Username and password required' });
  if (username.length < 3 || username.length > 50)
    return res.status(400).json({ error: 'Username must be 3–50 characters' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const rawName = displayName?.trim();
  const trimmedUser = username.trim();
  // If no display name given and username is an email, use the local part as display name
  const name = rawName || (trimmedUser.includes('@') ? trimmedUser.split('@')[0] : trimmedUser);

  try {
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      'INSERT INTO users (username, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id, username, display_name',
      [username.trim().toLowerCase(), hash, name]
    );
    const token = jwt.sign(
      { id: rows[0].id, username: rows[0].username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.status(201).json({
      token,
      user: { id: rows[0].id, username: rows[0].username, display_name: rows[0].display_name }
    });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username already taken' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });

  try {
    const { rows } = await pool.query(
      'SELECT id, username, password_hash, display_name FROM users WHERE username=$1',
      [username.trim().toLowerCase()]
    );
    if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash)))
      return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: rows[0].id, username: rows[0].username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      token,
      user: { id: rows[0].id, username: rows[0].username, display_name: rows[0].display_name }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
