const express = require('express');
const { pool } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, description, created_at FROM channels ORDER BY created_at ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { name, description = '' } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Channel name required' });

  const slug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  try {
    const { rows } = await pool.query(
      'INSERT INTO channels (name, description, created_by) VALUES ($1, $2, $3) RETURNING id, name, description, created_at',
      [slug, description, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Channel already exists' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
