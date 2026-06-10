const express = require('express');
const { pool } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Search messages in an org
router.get('/', requireAuth, async (req, res) => {
  try {
    const { q, orgId, channelId, from, limit = 20 } = req.query;
    const userId = req.user.id;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Query too short' });
    }

    const searchTerm = `%${q.trim().toLowerCase()}%`;
    const params = [searchTerm, orgId, userId];
    let paramIndex = 4;

    let query = `
      SELECT 
        m.id, m.content, m.created_at, m.channel_id, m.thread_id, m.reply_count,
        u.username, u.display_name,
        c.name as channel_name, c.is_private
      FROM messages m
      JOIN users u ON m.user_id = u.id
      JOIN channels c ON m.channel_id = c.id
      LEFT JOIN channel_members cm ON c.id = cm.channel_id AND cm.user_id = $3
      WHERE LOWER(m.content) LIKE $1
        AND c.org_id = $2
        AND (c.is_private = FALSE OR cm.user_id IS NOT NULL)
    `;

    if (channelId) {
      query += ` AND m.channel_id = $${paramIndex}`;
      params.push(channelId);
      paramIndex++;
    }

    if (from) {
      query += ` AND u.id = $${paramIndex}`;
      params.push(from);
      paramIndex++;
    }

    query += ` ORDER BY m.created_at DESC LIMIT $${paramIndex}`;
    params.push(parseInt(limit));

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Search channels
router.get('/channels', requireAuth, async (req, res) => {
  try {
    const { q, orgId } = req.query;
    const userId = req.user.id;

    const searchTerm = `%${q?.trim().toLowerCase() || ''}%`;

    const { rows } = await pool.query(`
      SELECT 
        c.id, c.name, c.description, c.is_private,
        (SELECT COUNT(*) FROM channel_members WHERE channel_id = c.id) as member_count
      FROM channels c
      LEFT JOIN channel_members cm ON c.id = cm.channel_id AND cm.user_id = $3
      WHERE c.org_id = $2
        AND LOWER(c.name) LIKE $1
        AND (c.is_private = FALSE OR cm.user_id IS NOT NULL)
      ORDER BY c.name ASC
      LIMIT 20
    `, [searchTerm, orgId, userId]);

    res.json(rows);
  } catch (err) {
    console.error('Search channels error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Search users in org
router.get('/users', requireAuth, async (req, res) => {
  try {
    const { q, orgId } = req.query;

    const searchTerm = `%${q?.trim().toLowerCase() || ''}%`;

    const { rows } = await pool.query(`
      SELECT u.id, u.username, u.display_name
      FROM users u
      JOIN org_members om ON u.id = om.user_id
      WHERE om.org_id = $2
        AND (LOWER(u.username) LIKE $1 OR LOWER(u.display_name) LIKE $1)
      ORDER BY u.display_name ASC
      LIMIT 20
    `, [searchTerm, orgId]);

    res.json(rows);
  } catch (err) {
    console.error('Search users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
