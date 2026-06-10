const express = require('express');
const { pool } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Get drafts for user in an org
router.get('/org/:orgId', requireAuth, async (req, res) => {
  try {
    const { orgId } = req.params;
    const userId = req.user.id;

    const { rows } = await pool.query(`
      SELECT 
        d.id, d.content, d.channel_id, d.dm_id, d.thread_id, d.updated_at,
        c.name as channel_name, c.is_private as channel_is_private
      FROM drafts d
      LEFT JOIN channels c ON d.channel_id = c.id
      WHERE d.user_id = $1 AND (c.org_id = $2 OR d.channel_id IS NULL)
      ORDER BY d.updated_at DESC
    `, [userId, orgId]);

    res.json(rows);
  } catch (err) {
    console.error('Get drafts error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save or update a draft
router.post('/', requireAuth, async (req, res) => {
  try {
    const { content, channelId, dmId, threadId } = req.body;
    const userId = req.user.id;

    if (!content?.trim()) {
      // If content is empty, delete the draft
      await pool.query(`
        DELETE FROM drafts 
        WHERE user_id = $1 
          AND (channel_id = $2 OR ($2 IS NULL AND channel_id IS NULL))
          AND (dm_id = $3 OR ($3 IS NULL AND dm_id IS NULL))
          AND (thread_id = $4 OR ($4 IS NULL AND thread_id IS NULL))
      `, [userId, channelId || null, dmId || null, threadId || null]);
      return res.json({ success: true, deleted: true });
    }

    const { rows } = await pool.query(`
      INSERT INTO drafts (user_id, channel_id, dm_id, thread_id, content, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (user_id, channel_id, dm_id, thread_id) 
      DO UPDATE SET content = $5, updated_at = NOW()
      RETURNING id
    `, [userId, channelId || null, dmId || null, threadId || null, content.trim()]);

    res.json({ success: true, id: rows[0].id });
  } catch (err) {
    console.error('Save draft error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a specific draft
router.get('/channel/:channelId', requireAuth, async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user.id;

    const { rows } = await pool.query(
      'SELECT content FROM drafts WHERE user_id = $1 AND channel_id = $2 AND thread_id IS NULL',
      [userId, channelId]
    );

    res.json({ content: rows[0]?.content || '' });
  } catch (err) {
    console.error('Get draft error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a draft
router.delete('/:draftId', requireAuth, async (req, res) => {
  try {
    const { draftId } = req.params;
    const userId = req.user.id;

    await pool.query(
      'DELETE FROM drafts WHERE id = $1 AND user_id = $2',
      [draftId, userId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Delete draft error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
