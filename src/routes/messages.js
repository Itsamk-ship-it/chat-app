const express = require('express');
const { pool } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { getIo } = require('../socket/io');

const router = express.Router();

router.patch('/:messageId', requireAuth, async (req, res) => {
  try {
    const messageId = Number(req.params.messageId);
    const { content } = req.body;
    const userId = req.user.id;

    if (!Number.isFinite(messageId)) return res.status(400).json({ error: 'Invalid message id' });
    if (!content?.trim()) return res.status(400).json({ error: 'Content required' });

    const { rows: existing } = await pool.query(
      'SELECT id, user_id, channel_id FROM messages WHERE id = $1',
      [messageId]
    );
    if (!existing.length) return res.status(404).json({ error: 'Message not found' });
    if (existing[0].user_id !== userId) return res.status(403).json({ error: 'Not allowed' });

    const { rows } = await pool.query(
      `UPDATE messages
       SET content = $1, edited_at = NOW()
       WHERE id = $2
       RETURNING id, channel_id, content, created_at, edited_at, user_id`,
      [content.trim(), messageId]
    );

    const { rows: userRows } = await pool.query(
      'SELECT username, display_name FROM users WHERE id = $1',
      [userId]
    );

    const updated = {
      ...rows[0],
      username: userRows[0]?.username,
      display_name: userRows[0]?.display_name,
    };

    const io = getIo();
    if (io) io.to(`room:${updated.channel_id}`).emit('message_updated', updated);

    res.json(updated);
  } catch (err) {
    console.error('Edit message error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:messageId', requireAuth, async (req, res) => {
  try {
    const messageId = Number(req.params.messageId);
    const userId = req.user.id;
    if (!Number.isFinite(messageId)) return res.status(400).json({ error: 'Invalid message id' });

    const { rows: existing } = await pool.query(
      'SELECT id, user_id, channel_id FROM messages WHERE id = $1',
      [messageId]
    );
    if (!existing.length) return res.status(404).json({ error: 'Message not found' });
    if (existing[0].user_id !== userId) return res.status(403).json({ error: 'Not allowed' });

    const { rows: replies } = await pool.query(
      'SELECT 1 FROM messages WHERE thread_id = $1 LIMIT 1',
      [messageId]
    );
    if (replies.length) {
      return res.status(400).json({ error: 'Cannot delete a message with thread replies' });
    }

    await pool.query('DELETE FROM starred_items WHERE item_type = $1 AND item_id = $2', ['message', messageId]);
    await pool.query('DELETE FROM messages WHERE id = $1', [messageId]);

    const payload = { id: messageId, channel_id: existing[0].channel_id };
    const io = getIo();
    if (io) io.to(`room:${payload.channel_id}`).emit('message_deleted', payload);

    res.json({ success: true, ...payload });
  } catch (err) {
    console.error('Delete message error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

