const express   = require('express');
const crypto    = require('crypto');
const { pool }  = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ── Helpers ────────────────────────────────────────────────────────────────
function slugify(name) {
  return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

async function isMember(orgId, userId) {
  const { rows } = await pool.query(
    'SELECT role FROM org_members WHERE org_id=$1 AND user_id=$2',
    [orgId, userId]
  );
  return rows.length > 0 ? rows[0].role : null;
}

async function isChannelMember(channelId, userId) {
  const { rows } = await pool.query(
    'SELECT 1 FROM channel_members WHERE channel_id=$1 AND user_id=$2',
    [channelId, userId]
  );
  return rows.length > 0;
}

async function canManageChannel(orgId, channelId, userId) {
  const role = await isMember(orgId, userId);
  if (!role) return { ok: false, error: 'Not a member' };

  const { rows } = await pool.query(
    'SELECT id, created_by FROM channels WHERE id=$1 AND org_id=$2',
    [channelId, orgId]
  );
  if (!rows.length) return { ok: false, error: 'Channel not found', notFound: true };

  if (role !== 'owner' && rows[0].created_by !== userId) {
    return { ok: false, error: 'Only org owners or channel creator can manage channel' };
  }

  return { ok: true, role, channel: rows[0] };
}

// ── POST /api/orgs — create org ────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Org name required' });

  const slug = slugify(name);
  if (!slug) return res.status(400).json({ error: 'Invalid org name' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: org } = await client.query(
      `INSERT INTO organizations (name, slug, created_by) VALUES ($1, $2, $3) RETURNING *`,
      [name.trim(), slug, req.user.id]
    );
    const orgId = org[0].id;

    await client.query(
      `INSERT INTO org_members (org_id, user_id, role) VALUES ($1, $2, 'owner')`,
      [orgId, req.user.id]
    );

    // Seed public channels
    for (const ch of ['general', 'random']) {
      await client.query(
        `INSERT INTO channels (name, org_id, created_by, is_private)
         VALUES ($1, $2, $3, FALSE) ON CONFLICT DO NOTHING`,
        [ch, orgId, req.user.id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(org[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'Org name already taken' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// ── GET /api/orgs ──────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT o.id, o.name, o.slug, o.created_by, o.created_at, m.role
       FROM organizations o
       JOIN org_members m ON m.org_id = o.id AND m.user_id = $1
       ORDER BY o.created_at ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/orgs/:id/members ──────────────────────────────────────────────
router.get('/:id/members', requireAuth, async (req, res) => {
  const orgId = +req.params.id;
  if (!(await isMember(orgId, req.user.id)))
    return res.status(403).json({ error: 'Not a member' });

  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.display_name, m.role, m.joined_at
       FROM org_members m
       JOIN users u ON u.id = m.user_id
       WHERE m.org_id = $1
       ORDER BY m.role = 'owner' DESC, m.joined_at ASC`,
      [orgId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/orgs/:id/invite/username ────────────────────────────────────
router.post('/:id/invite/username', requireAuth, async (req, res) => {
  const orgId = +req.params.id;
  const { username } = req.body;
  if (!username?.trim()) return res.status(400).json({ error: 'Username required' });

  if (!(await isMember(orgId, req.user.id)))
    return res.status(403).json({ error: 'Not a member' });

  try {
    const { rows: target } = await pool.query(
      'SELECT id, username FROM users WHERE username=$1',
      [username.trim().toLowerCase()]
    );
    if (!target.length) return res.status(404).json({ error: 'User not found' });

    await pool.query(
      `INSERT INTO org_members (org_id, user_id, role) VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING`,
      [orgId, target[0].id]
    );
    res.json({ message: `${target[0].username} added to org` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/orgs/:id/invite/link ────────────────────────────────────────
router.post('/:id/invite/link', requireAuth, async (req, res) => {
  const orgId = +req.params.id;
  if (!(await isMember(orgId, req.user.id)))
    return res.status(403).json({ error: 'Not a member' });

  try {
    const code = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(
      `INSERT INTO org_invites (org_id, created_by, code, expires_at) VALUES ($1, $2, $3, $4)`,
      [orgId, req.user.id, code, expiresAt]
    );
    res.json({ code, expires_at: expiresAt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/orgs/join/:code ──────────────────────────────────────────────
router.post('/join/:code', requireAuth, async (req, res) => {
  const { code } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT i.*, o.name AS org_name FROM org_invites i
       JOIN organizations o ON o.id = i.org_id
       WHERE i.code = $1 AND (i.expires_at IS NULL OR i.expires_at > NOW())`,
      [code]
    );
    if (!rows.length) return res.status(404).json({ error: 'Invalid or expired invite link' });

    const invite = rows[0];
    await pool.query(
      `INSERT INTO org_members (org_id, user_id, role) VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING`,
      [invite.org_id, req.user.id]
    );
    res.json({ org_id: invite.org_id, org_name: invite.org_name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/orgs/:id/channels ────────────────────────────────────────────
// Returns public channels + private channels the user is a member of
router.get('/:id/channels', requireAuth, async (req, res) => {
  const orgId = +req.params.id;
  if (!(await isMember(orgId, req.user.id)))
    return res.status(403).json({ error: 'Not a member' });

  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.name, c.description, c.is_private, c.created_at, c.created_by
       FROM channels c
       WHERE c.org_id = $1
       AND (
         c.is_private = FALSE
         OR EXISTS (
           SELECT 1 FROM channel_members cm
           WHERE cm.channel_id = c.id AND cm.user_id = $2
         )
       )
       ORDER BY c.is_private ASC, c.created_at ASC`,
      [orgId, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/orgs/:id/channels ────────────────────────────────────────────
router.post('/:id/channels', requireAuth, async (req, res) => {
  const orgId = +req.params.id;
  const { name, description = '', is_private = false } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Channel name required' });

  if (!(await isMember(orgId, req.user.id)))
    return res.status(403).json({ error: 'Not a member' });

  const slug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO channels (name, description, org_id, is_private, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, description, is_private, created_at, created_by`,
      [slug, description, orgId, is_private, req.user.id]
    );

    // Auto-add creator to channel_members for private channels
    if (is_private) {
      await client.query(
        `INSERT INTO channel_members (channel_id, user_id, added_by) VALUES ($1, $2, $2)`,
        [rows[0].id, req.user.id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'Channel already exists in this org' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// ── PATCH /api/orgs/:id/channels/:channelId ────────────────────────────────
router.patch('/:id/channels/:channelId', requireAuth, async (req, res) => {
  const orgId = +req.params.id;
  const channelId = +req.params.channelId;
  const { name, description = '', is_private } = req.body;

  if (!name?.trim()) return res.status(400).json({ error: 'Channel name required' });

  const allowed = await canManageChannel(orgId, channelId, req.user.id);
  if (!allowed.ok) {
    return res.status(allowed.notFound ? 404 : 403).json({ error: allowed.error });
  }

  const slug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const nextPrivate = typeof is_private === 'boolean' ? is_private : undefined;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: currentRows } = await client.query(
      'SELECT is_private FROM channels WHERE id=$1 AND org_id=$2',
      [channelId, orgId]
    );
    const current = currentRows[0];
    const targetPrivate = nextPrivate ?? current.is_private;

    const { rows } = await client.query(
      `UPDATE channels
       SET name = $1, description = $2, is_private = $3
       WHERE id = $4 AND org_id = $5
       RETURNING id, name, description, is_private, created_at, created_by, org_id`,
      [slug, description, targetPrivate, channelId, orgId]
    );

    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Channel not found' });
    }

    if (current.is_private === false && targetPrivate === true) {
      await client.query(
        `INSERT INTO channel_members (channel_id, user_id, added_by)
         VALUES ($1, $2, $2) ON CONFLICT DO NOTHING`,
        [channelId, req.user.id]
      );
    }

    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'Channel already exists in this org' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// ── DELETE /api/orgs/:id/channels/:channelId ───────────────────────────────
router.delete('/:id/channels/:channelId', requireAuth, async (req, res) => {
  const orgId = +req.params.id;
  const channelId = +req.params.channelId;

  const allowed = await canManageChannel(orgId, channelId, req.user.id);
  if (!allowed.ok) {
    return res.status(allowed.notFound ? 404 : 403).json({ error: allowed.error });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `DELETE FROM starred_items
       WHERE (item_type = 'channel' AND item_id = $1)
          OR (item_type = 'message' AND item_id IN (SELECT id FROM messages WHERE channel_id = $1))`,
      [channelId]
    );

    const { rowCount } = await client.query(
      'DELETE FROM channels WHERE id=$1 AND org_id=$2',
      [channelId, orgId]
    );

    if (!rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Channel not found' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Channel deleted' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// ── GET /api/orgs/:id/channels/:channelId/members ─────────────────────────
router.get('/:id/channels/:channelId/members', requireAuth, async (req, res) => {
  const orgId = +req.params.id;
  const channelId = +req.params.channelId;

  if (!(await isMember(orgId, req.user.id)))
    return res.status(403).json({ error: 'Not a member' });

  try {
    const { rows: ch } = await pool.query(
      'SELECT id, is_private FROM channels WHERE id=$1 AND org_id=$2',
      [channelId, orgId]
    );
    if (!ch.length) return res.status(404).json({ error: 'Channel not found' });

    if (ch[0].is_private) {
      const { rows } = await pool.query(
        `SELECT u.id, u.username, u.display_name, cm.joined_at
         FROM channel_members cm
         JOIN users u ON u.id = cm.user_id
         WHERE cm.channel_id = $1
         ORDER BY cm.joined_at ASC`,
        [channelId]
      );
      return res.json({ is_private: true, members: rows });
    } else {
      // Public channel — show all org members
      const { rows } = await pool.query(
        `SELECT u.id, u.username, u.display_name, m.joined_at
         FROM org_members m
         JOIN users u ON u.id = m.user_id
         WHERE m.org_id = $1
         ORDER BY m.joined_at ASC`,
        [orgId]
      );
      return res.json({ is_private: false, members: rows });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/orgs/:id/channels/:channelId/members — add member ────────────
router.post('/:id/channels/:channelId/members', requireAuth, async (req, res) => {
  const orgId = +req.params.id;
  const channelId = +req.params.channelId;
  const { username } = req.body;
  if (!username?.trim()) return res.status(400).json({ error: 'Username required' });

  // Requester must be org owner OR channel creator
  const role = await isMember(orgId, req.user.id);
  if (!role) return res.status(403).json({ error: 'Not a member' });

  try {
    const { rows: ch } = await pool.query(
      'SELECT id, is_private, created_by FROM channels WHERE id=$1 AND org_id=$2',
      [channelId, orgId]
    );
    if (!ch.length) return res.status(404).json({ error: 'Channel not found' });
    if (!ch[0].is_private) return res.status(400).json({ error: 'Only private channels have explicit members' });

    if (role !== 'owner' && ch[0].created_by !== req.user.id)
      return res.status(403).json({ error: 'Only org owners or the channel creator can add members' });

    // Target user must be an org member
    const { rows: target } = await pool.query(
      `SELECT u.id, u.username FROM users u
       JOIN org_members m ON m.user_id = u.id AND m.org_id = $1
       WHERE u.username = $2`,
      [orgId, username.trim().toLowerCase()]
    );
    if (!target.length) return res.status(404).json({ error: 'User not found in this org' });

    await pool.query(
      `INSERT INTO channel_members (channel_id, user_id, added_by)
       VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [channelId, target[0].id, req.user.id]
    );
    res.json({ message: `${target[0].username} added to channel` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── DELETE /api/orgs/:id/channels/:channelId/members/:userId ──────────────
router.delete('/:id/channels/:channelId/members/:userId', requireAuth, async (req, res) => {
  const orgId = +req.params.id;
  const channelId = +req.params.channelId;
  const targetUserId = +req.params.userId;

  const role = await isMember(orgId, req.user.id);
  if (!role) return res.status(403).json({ error: 'Not a member' });

  try {
    const { rows: ch } = await pool.query(
      'SELECT id, created_by FROM channels WHERE id=$1 AND org_id=$2',
      [channelId, orgId]
    );
    if (!ch.length) return res.status(404).json({ error: 'Channel not found' });

    if (role !== 'owner' && ch[0].created_by !== req.user.id && targetUserId !== req.user.id)
      return res.status(403).json({ error: 'Not authorized' });

    await pool.query(
      'DELETE FROM channel_members WHERE channel_id=$1 AND user_id=$2',
      [channelId, targetUserId]
    );
    res.json({ message: 'Member removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
