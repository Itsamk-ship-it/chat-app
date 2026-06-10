const express = require('express');
const { pool } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Get starred items for user in an org
router.get('/org/:orgId', requireAuth, async (req, res) => {
  try {
    const { orgId } = req.params;
    const userId = req.user.id;

    const { rows } = await pool.query(`
      SELECT 
        s.id, s.item_type, s.item_id, s.created_at,
        CASE 
          WHEN s.item_type = 'channel' THEN (
            SELECT json_build_object('name', c.name, 'is_private', c.is_private)
            FROM channels c WHERE c.id = s.item_id
          )
          WHEN s.item_type = 'message' THEN (
            SELECT json_build_object(
              'content', m.content, 
              'channel_id', m.channel_id,
              'channel_name', ch.name,
              'username', u.username,
              'user_display_name', u.display_name
            )
            FROM messages m 
            JOIN channels ch ON m.channel_id = ch.id
            JOIN users u ON m.user_id = u.id
            WHERE m.id = s.item_id
          )
          WHEN s.item_type = 'dm' THEN (
            SELECT json_build_object(
              'content', dm.content,
              'dm_id', dm.dm_id,
              'username', u.username,
              'user_display_name', u.display_name
            )
            FROM dm_messages dm
            JOIN users u ON dm.user_id = u.id
            WHERE dm.id = s.item_id
          )
          ELSE NULL
        END as item_data
      FROM starred_items s
      WHERE s.user_id = $1 AND s.org_id = $2
      ORDER BY s.created_at DESC
    `, [userId, orgId]);

    const normalized = rows.map((item) => {
      const data = item.item_data || {};
      return {
        id: item.id,
        item_type: item.item_type,
        item_id: item.item_id,
        created_at: item.created_at,
        name: data.name,
        is_private: data.is_private,
        content: data.content,
        channel_id: data.channel_id,
        channel_name: data.channel_name,
        dm_id: data.dm_id,
        username: data.username,
        display_name: data.user_display_name,
      };
    });

    res.json(normalized);
  } catch (err) {
    console.error('Get starred error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Star an item
router.post('/', requireAuth, async (req, res) => {
  try {
    const { itemType, itemId, orgId } = req.body;
    const userId = req.user.id;

    if (!['channel', 'message', 'dm'].includes(itemType)) {
      return res.status(400).json({ error: 'Invalid item type' });
    }

    const { rows } = await pool.query(`
      INSERT INTO starred_items (user_id, item_type, item_id, org_id)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, item_type, item_id) DO NOTHING
      RETURNING id
    `, [userId, itemType, itemId, orgId]);

    res.json({ success: true, id: rows[0]?.id });
  } catch (err) {
    console.error('Star item error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Unstar an item
router.delete('/:itemType/:itemId', requireAuth, async (req, res) => {
  try {
    const { itemType, itemId } = req.params;
    const userId = req.user.id;

    await pool.query(
      'DELETE FROM starred_items WHERE user_id = $1 AND item_type = $2 AND item_id = $3',
      [userId, itemType, itemId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Unstar error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Check if item is starred
router.get('/check/:itemType/:itemId', requireAuth, async (req, res) => {
  try {
    const { itemType, itemId } = req.params;
    const userId = req.user.id;

    const { rows } = await pool.query(
      'SELECT 1 FROM starred_items WHERE user_id = $1 AND item_type = $2 AND item_id = $3',
      [userId, itemType, itemId]
    );

    res.json({ starred: rows.length > 0 });
  } catch (err) {
    console.error('Check starred error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
