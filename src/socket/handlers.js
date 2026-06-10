const { pool } = require('../db/pool');

const REDIS_CHAN = 'chat:messages';
// Unique ID for this server process – used to skip re-broadcasting our own
// messages when they come back through Redis (prevents duplicates in
// multi-server deployments while still working without Redis).
const SERVER_ID = Math.random().toString(36).slice(2);

async function checkChannelAccess(channelId, userId) {
  const { rows: ch } = await pool.query(
    'SELECT id, org_id, is_private FROM channels WHERE id=$1',
    [channelId]
  );
  if (!ch.length) return { ok: false, reason: 'Channel not found' };

  const { org_id, is_private } = ch[0];

  if (org_id !== null) {
    const { rows: mem } = await pool.query(
      'SELECT 1 FROM org_members WHERE org_id=$1 AND user_id=$2',
      [org_id, userId]
    );
    if (!mem.length) return { ok: false, reason: 'Not a member of this workspace' };
  }

  if (is_private) {
    const { rows: chMem } = await pool.query(
      'SELECT 1 FROM channel_members WHERE channel_id=$1 AND user_id=$2',
      [channelId, userId]
    );
    if (!chMem.length) return { ok: false, reason: 'Not a member of this private channel' };
  }

  return { ok: true };
}

function registerSocketHandlers(io, pub, sub) {
  sub.subscribe(REDIS_CHAN, (err) => {
    if (err) console.error('Redis subscribe error:', err);
    else console.log(`📡 Redis subscribed to ${REDIS_CHAN}`);
  });

  // Only re-broadcast Redis messages that originated from ANOTHER server.
  // Our own messages are already emitted directly below.
  sub.on('message', (_chan, raw) => {
    try {
      const { _sid, ...msg } = JSON.parse(raw);
      if (_sid === SERVER_ID) return; // already emitted locally
      io.to(`room:${msg.channel_id}`).emit('new_message', msg);
    } catch {}
  });

  io.on('connection', async (socket) => {
    const user = socket.user;
    console.log(`👤 ${user.username} connected [${socket.id}]`);
    socket.emit('connected', { user });

    // Join all DM rooms the user participates in
    try {
      const { rows: dmRows } = await pool.query(
        'SELECT dm_id FROM dm_participants WHERE user_id = $1',
        [user.id]
      );
      for (const { dm_id } of dmRows) {
        socket.join(`dm:${dm_id}`);
      }
    } catch (err) {
      console.error('Failed to join DM rooms:', err);
    }

    // ── Join channel ──────────────────────────────────────────────────
    socket.on('join_channel', async ({ channelId }) => {
      const access = await checkChannelAccess(channelId, user.id).catch(() => ({
        ok: false, reason: 'Internal error'
      }));

      if (!access.ok) {
        socket.emit('error', { message: access.reason });
        return;
      }

      for (const room of socket.rooms) {
        if (room !== socket.id && room.startsWith('room:')) socket.leave(room);
      }

      const room = `room:${channelId}`;
      socket.join(room);
      socket.to(room).emit('user_joined', { username: user.username, channelId });

      try {
        const { rows } = await pool.query(
          `SELECT m.id, m.content, m.created_at,
                  u.username, u.display_name, u.id AS user_id, m.channel_id
           FROM messages m
           JOIN users u ON m.user_id = u.id
           WHERE m.channel_id = $1
           ORDER BY m.created_at ASC
           LIMIT 100`,
          [channelId]
        );
        socket.emit('message_history', { channelId, messages: rows });
      } catch (err) {
        console.error('History fetch error:', err);
      }
    });

    // ── Send message ──────────────────────────────────────────────────
    socket.on('send_message', async ({ channelId, content }) => {
      if (!content?.trim() || !channelId) return;

      const access = await checkChannelAccess(channelId, user.id).catch(() => ({
        ok: false, reason: 'Internal error'
      }));

      if (!access.ok) {
        socket.emit('error', { message: access.reason });
        return;
      }

      try {
        const room = `room:${channelId}`;
        if (!socket.rooms.has(room)) {
          // Ensure sender is in the channel room so they receive their own
          // realtime broadcast even if join/send events raced.
          socket.join(room);
        }

        const { rows } = await pool.query(
          `INSERT INTO messages (channel_id, user_id, content)
           VALUES ($1, $2, $3)
           RETURNING id, content, created_at`,
          [channelId, user.id, content.trim()]
        );

        // Get display_name
        const { rows: userData } = await pool.query(
          'SELECT display_name FROM users WHERE id = $1',
          [user.id]
        );

        const msg = {
          id:           rows[0].id,
          content:      rows[0].content,
          created_at:   rows[0].created_at,
          username:     user.username,
          display_name: userData[0]?.display_name || user.username,
          user_id:      user.id,
          channel_id:   channelId,
        };

        // Emit directly to all sockets in the room immediately (works even
        // without Redis).  This is the primary delivery path.
        io.to(room).emit('new_message', msg);

        // Also publish to Redis so other server instances can relay the
        // message to their connected clients.  Tag with our SERVER_ID so
        // the subscriber above can skip it (avoids double-delivery).
        pub.publish(REDIS_CHAN, JSON.stringify({ ...msg, _sid: SERVER_ID }))
          .catch(() => {}); // Redis unavailable – direct emit already done
      } catch (err) {
        console.error('Message save error:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ── Typing indicators ─────────────────────────────────────────────
    socket.on('typing_start', ({ channelId }) => {
      socket.to(`room:${channelId}`).emit('user_typing', { username: user.username, channelId });
    });

    socket.on('typing_stop', ({ channelId }) => {
      socket.to(`room:${channelId}`).emit('user_stop_typing', { username: user.username, channelId });
    });

    socket.on('disconnect', () => {
      console.log(`👤 ${user.username} disconnected`);
    });
  });
}

module.exports = { registerSocketHandlers };
