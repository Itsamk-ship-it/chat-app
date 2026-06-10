const express = require('express');
const { pool } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { getIo } = require('../socket/io');

const router = express.Router();

// Get all DM conversations for user in an org
router.get('/org/:orgId', requireAuth, async (req, res) => {
  try {
    const { orgId } = req.params;
    const userId = req.user.id;

    const { rows } = await pool.query(`
      SELECT 
        dm.id,
        dm.org_id,
        dm.created_at,
        (
          SELECT json_agg(json_build_object(
            'id', u.id,
            'username', u.username,
            'display_name', u.display_name
          ))
          FROM dm_participants dp
          JOIN users u ON dp.user_id = u.id
          WHERE dp.dm_id = dm.id AND dp.user_id != $1
        ) as other_participants,
        (
          SELECT content FROM dm_messages 
          WHERE dm_id = dm.id 
          ORDER BY created_at DESC LIMIT 1
        ) as last_message,
        (
          SELECT created_at FROM dm_messages 
          WHERE dm_id = dm.id 
          ORDER BY created_at DESC LIMIT 1
        ) as last_message_at
      FROM direct_messages dm
      JOIN dm_participants dp ON dm.id = dp.dm_id
      WHERE dp.user_id = $1 AND dm.org_id = $2
      ORDER BY last_message_at DESC NULLS LAST
    `, [userId, orgId]);

    const normalized = rows.map((dm) => {
      const others = Array.isArray(dm.other_participants) ? dm.other_participants : [];
      const participant_names = others
        .map((u) => u.display_name || u.username)
        .filter(Boolean)
        .join(', ');

      return {
        ...dm,
        other_participants: others,
        participant_names: participant_names || 'Direct message',
      };
    });

    res.json(normalized);
  } catch (err) {
    console.error('Get DMs error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start or get existing DM with a user
router.post('/start', requireAuth, async (req, res) => {
  try {
    const { orgId, targetUserId } = req.body;
    const userId = req.user.id;

    if (userId === targetUserId) {
      return res.status(400).json({ error: 'Cannot DM yourself' });
    }

    // Check if DM already exists between these users in this org
    const { rows: existing } = await pool.query(`
      SELECT dm.id FROM direct_messages dm
      JOIN dm_participants dp1 ON dm.id = dp1.dm_id AND dp1.user_id = $1
      JOIN dm_participants dp2 ON dm.id = dp2.dm_id AND dp2.user_id = $2
      WHERE dm.org_id = $3
    `, [userId, targetUserId, orgId]);

    if (existing.length > 0) {
      return res.json({ id: existing[0].id, existing: true });
    }

    // Create new DM
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: dm } = await client.query(
        'INSERT INTO direct_messages (org_id) VALUES ($1) RETURNING id',
        [orgId]
      );

      await client.query(
        'INSERT INTO dm_participants (dm_id, user_id) VALUES ($1, $2), ($1, $3)',
        [dm[0].id, userId, targetUserId]
      );

      await client.query('COMMIT');

      // Add both participants to the DM socket room if they're connected
      const io = getIo();
      if (io) {
        const sockets = await io.fetchSockets();
        for (const s of sockets) {
          if (s.user && (s.user.id === userId || s.user.id === targetUserId)) {
            s.join(`dm:${dm[0].id}`);
          }
        }
      }

      res.json({ id: dm[0].id, existing: false });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Start DM error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get messages in a DM
router.get('/:dmId/messages', requireAuth, async (req, res) => {
  try {
    const { dmId } = req.params;
    const userId = req.user.id;

    // Verify user is participant
    const { rows: participant } = await pool.query(
      'SELECT 1 FROM dm_participants WHERE dm_id = $1 AND user_id = $2',
      [dmId, userId]
    );

    if (participant.length === 0) {
      return res.status(403).json({ error: 'Not a participant' });
    }

    const { rows } = await pool.query(`
      SELECT 
        m.id, m.content, m.created_at, m.edited_at, m.user_id,
        u.username, u.display_name
      FROM dm_messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.dm_id = $1
      ORDER BY m.created_at ASC
    `, [dmId]);

    res.json(rows);
  } catch (err) {
    console.error('Get DM messages error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Send a DM message
router.post('/:dmId/messages', requireAuth, async (req, res) => {
  try {
    const { dmId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content?.trim()) {
      return res.status(400).json({ error: 'Content required' });
    }

    // Verify user is participant
    const { rows: participant } = await pool.query(
      'SELECT 1 FROM dm_participants WHERE dm_id = $1 AND user_id = $2',
      [dmId, userId]
    );

    if (participant.length === 0) {
      return res.status(403).json({ error: 'Not a participant' });
    }

    const { rows } = await pool.query(`
      INSERT INTO dm_messages (dm_id, user_id, content)
      VALUES ($1, $2, $3)
      RETURNING id, content, created_at, user_id
    `, [dmId, userId, content.trim()]);

    // Get user info
    const { rows: user } = await pool.query(
      'SELECT username, display_name FROM users WHERE id = $1',
      [userId]
    );

    const message = {
      ...rows[0],
      username: user[0].username,
      display_name: user[0].display_name,
      dm_id: Number(dmId),
    };

    // Broadcast to all participants in real-time
    const io = getIo();
    if (io) io.to(`dm:${dmId}`).emit('new_dm_message', message);

    res.json(message);
  } catch (err) {
    console.error('Send DM error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Edit DM message
router.patch('/messages/:messageId', requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content?.trim()) {
      return res.status(400).json({ error: 'Content required' });
    }

    const { rows: existing } = await pool.query(
      'SELECT id, dm_id, user_id FROM dm_messages WHERE id = $1',
      [messageId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }
    if (existing[0].user_id !== userId) {
      return res.status(403).json({ error: 'You can only edit your own messages' });
    }

    const { rows } = await pool.query(`
      UPDATE dm_messages
      SET content = $1, edited_at = NOW()
      WHERE id = $2
      RETURNING id, dm_id, content, created_at, edited_at, user_id
    `, [content.trim(), messageId]);

    const { rows: user } = await pool.query(
      'SELECT username, display_name FROM users WHERE id = $1',
      [userId]
    );

    const message = {
      ...rows[0],
      username: user[0].username,
      display_name: user[0].display_name,
      dm_id: Number(rows[0].dm_id),
    };

    const io = getIo();
    if (io) io.to(`dm:${rows[0].dm_id}`).emit('dm_message_updated', message);

    res.json(message);
  } catch (err) {
    console.error('Edit DM message error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete DM message
router.delete('/messages/:messageId', requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const { rows: existing } = await pool.query(
      'SELECT id, dm_id, user_id FROM dm_messages WHERE id = $1',
      [messageId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }
    if (existing[0].user_id !== userId) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    await pool.query('DELETE FROM dm_messages WHERE id = $1', [messageId]);

    const io = getIo();
    if (io) io.to(`dm:${existing[0].dm_id}`).emit('dm_message_deleted', {
      id: Number(messageId),
      dm_id: Number(existing[0].dm_id),
    });

    res.json({ id: Number(messageId), dm_id: Number(existing[0].dm_id) });
  } catch (err) {
    console.error('Delete DM message error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
