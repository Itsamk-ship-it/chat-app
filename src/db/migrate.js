require('dotenv').config();
const { pool } = require('./pool');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── New tables ────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id         SERIAL PRIMARY KEY,
        name       TEXT NOT NULL,
        slug       TEXT NOT NULL UNIQUE,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS org_members (
        org_id    INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role      TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (org_id, user_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS org_invites (
        id         SERIAL PRIMARY KEY,
        org_id     INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        created_by INTEGER NOT NULL REFERENCES users(id),
        code       TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS channel_members (
        channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        added_by   INTEGER REFERENCES users(id),
        joined_at  TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (channel_id, user_id)
      )
    `);

    // ── Add display_name to users ────────────────────────────────────────
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='users' AND column_name='display_name'
        ) THEN
          ALTER TABLE users ADD COLUMN display_name VARCHAR(100);
        END IF;
      END $$
    `);

    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_name='dm_messages'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='dm_messages' AND column_name='edited_at'
        ) THEN
          ALTER TABLE dm_messages ADD COLUMN edited_at TIMESTAMPTZ;
        END IF;
      END $$
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='messages' AND column_name='edited_at'
        ) THEN
          ALTER TABLE messages ADD COLUMN edited_at TIMESTAMPTZ;
        END IF;
      END $$
    `);

    // Update existing users: set display_name to username if null
    await client.query(`
      UPDATE users SET display_name = username WHERE display_name IS NULL
    `);

    // ── Alter existing channels table ─────────────────────────────────────
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='channels' AND column_name='org_id'
        ) THEN
          ALTER TABLE channels ADD COLUMN org_id INTEGER REFERENCES organizations(id);
        END IF;
      END $$
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='channels' AND column_name='is_private'
        ) THEN
          ALTER TABLE channels ADD COLUMN is_private BOOLEAN NOT NULL DEFAULT FALSE;
        END IF;
      END $$
    `);

    // ── Migrate orphan channels to "Default Workspace" ────────────────────
    const { rows: orphans } = await client.query(
      'SELECT id FROM channels WHERE org_id IS NULL'
    );

    if (orphans.length > 0) {
      const { rows: firstUser } = await client.query(
        'SELECT id FROM users ORDER BY id ASC LIMIT 1'
      );

      if (firstUser.length > 0) {
        const ownerId = firstUser[0].id;
        const { rows: existing } = await client.query(
          "SELECT id FROM organizations WHERE slug = 'default-workspace'"
        );

        let orgId;
        if (existing.length > 0) {
          orgId = existing[0].id;
        } else {
          const { rows: org } = await client.query(
            `INSERT INTO organizations (name, slug, created_by)
             VALUES ('Default Workspace', 'default-workspace', $1) RETURNING id`,
            [ownerId]
          );
          orgId = org[0].id;
          await client.query(
            `INSERT INTO org_members (org_id, user_id, role) VALUES ($1, $2, 'owner') ON CONFLICT DO NOTHING`,
            [orgId, ownerId]
          );
        }

        await client.query('UPDATE channels SET org_id = $1 WHERE org_id IS NULL', [orgId]);
        console.log(`✅ Migrated ${orphans.length} orphan channel(s) → Default Workspace`);
      }
    } else {
      console.log('✅ No orphan channels to migrate');
    }

    // ── Seed channel_members for existing private channels ────────────────
    const { rows: privateChannels } = await client.query(
      `SELECT id, created_by FROM channels WHERE is_private = TRUE AND created_by IS NOT NULL`
    );
    for (const ch of privateChannels) {
      await client.query(
        `INSERT INTO channel_members (channel_id, user_id, added_by)
         VALUES ($1, $2, $2) ON CONFLICT DO NOTHING`,
        [ch.id, ch.created_by]
      );
    }
    if (privateChannels.length > 0) {
      console.log(`✅ Seeded channel_members for ${privateChannels.length} private channel(s)`);
    }

    // ── Direct Messages table ─────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS direct_messages (
        id         SERIAL PRIMARY KEY,
        org_id     INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS dm_participants (
        dm_id    INTEGER NOT NULL REFERENCES direct_messages(id) ON DELETE CASCADE,
        user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (dm_id, user_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS dm_messages (
        id         SERIAL PRIMARY KEY,
        dm_id      INTEGER NOT NULL REFERENCES direct_messages(id) ON DELETE CASCADE,
        user_id    INTEGER NOT NULL REFERENCES users(id),
        content    TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='dm_messages' AND column_name='edited_at'
        ) THEN
          ALTER TABLE dm_messages ADD COLUMN edited_at TIMESTAMPTZ;
        END IF;
      END $$
    `);
    console.log('✅ Direct messages tables created');

    // ── Threads table (replies to messages) ───────────────────────────────
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='messages' AND column_name='thread_id'
        ) THEN
          ALTER TABLE messages ADD COLUMN thread_id INTEGER REFERENCES messages(id);
        END IF;
      END $$
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='messages' AND column_name='reply_count'
        ) THEN
          ALTER TABLE messages ADD COLUMN reply_count INTEGER DEFAULT 0;
        END IF;
      END $$
    `);
    console.log('✅ Thread support added to messages');

    // ── Starred items table ───────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS starred_items (
        id           SERIAL PRIMARY KEY,
        user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        item_type    TEXT NOT NULL CHECK (item_type IN ('channel', 'message', 'dm')),
        item_id      INTEGER NOT NULL,
        org_id       INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        created_at   TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, item_type, item_id)
      )
    `);
    console.log('✅ Starred items table created');

    // ── Drafts table ──────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS drafts (
        id           SERIAL PRIMARY KEY,
        user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        channel_id   INTEGER REFERENCES channels(id) ON DELETE CASCADE,
        dm_id        INTEGER REFERENCES direct_messages(id) ON DELETE CASCADE,
        thread_id    INTEGER REFERENCES messages(id) ON DELETE CASCADE,
        content      TEXT NOT NULL,
        updated_at   TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, channel_id, dm_id, thread_id)
      )
    `);
    console.log('✅ Drafts table created');

    // ── User status table ─────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_status (
        user_id     INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        status      TEXT DEFAULT 'active' CHECK (status IN ('active', 'away', 'dnd', 'offline')),
        status_text TEXT,
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✅ User status table created');

    await client.query('COMMIT');
    console.log('✅ Migration complete');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
