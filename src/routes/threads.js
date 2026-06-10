const express = require('express');
const { pool } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Get thread replies for a message
router.get('/:messageId', requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;

    const { rows } = await pool.query(`
      SELECT 
        m.id, m.content, m.created_at, m.user_id,
        u.username, u.display_name
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.thread_id = $1
      ORDER BY m.created_at ASC
    `, [messageId]);

    res.json(rows);
  } catch (err) {
    console.error('Get thread error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all threads user has participated in
router.get('/user/all', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { orgId } = req.query;

    const { rows } = await pool.query(`
      SELECT DISTINCT ON (parent.id)
        parent.id,
        parent.content as parent_content,
        parent.created_at as parent_created_at,
        parent.reply_count,
        parent.channel_id,
        ch.name as channel_name,
        pu.display_name as parent_author,
        (
          SELECT json_build_object(
            'content', m.content,
            'created_at', m.created_at,
            'display_name', u.display_name
          )
          FROM messages m
          JOIN users u ON m.user_id = u.id
          WHERE m.thread_id = parent.id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) as last_reply
      FROM messages parent
      JOIN channels ch ON parent.channel_id = ch.id
      JOIN users pu ON parent.user_id = pu.id
      WHERE parent.reply_count > 0
        AND ch.org_id = $2
        AND (
          parent.user_id = $1 
          OR EXISTS (SELECT 1 FROM messages m WHERE m.thread_id = parent.id AND m.user_id = $1)
        )
      ORDER BY parent.id, 
        (SELECT MAX(created_at) FROM messages WHERE thread_id = parent.id) DESC
      LIMIT 50
    `, [userId, orgId]);

    res.json(rows);
  } catch (err) {
    console.error('Get user threads error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reply to a thread (handled via socket, but API fallback)
router.post('/:messageId/reply', requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content?.trim()) {
      return res.status(400).json({ error: 'Content required' });
    }

    // Get the parent message's channel
    const { rows: parent } = await pool.query(
      'SELECT channel_id FROM messages WHERE id = $1',
      [messageId]
    );

    if (parent.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert the reply
      const { rows } = await client.query(`
        INSERT INTO messages (channel_id, user_id, content, thread_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id, content, created_at, user_id
      `, [parent[0].channel_id, userId, content.trim(), messageId]);

      // Update reply count on parent
      await client.query(
        'UPDATE messages SET reply_count = reply_count + 1 WHERE id = $1',
        [messageId]
      );

      await client.query('COMMIT');

      // Get user info
      const { rows: user } = await pool.query(
        'SELECT username, display_name FROM users WHERE id = $1',
        [userId]
      );

      res.json({
        ...rows[0],
        username: user[0].username,
        display_name: user[0].display_name
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Reply to thread error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
