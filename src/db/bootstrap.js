const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const bcrypt = require('bcrypt');
const { pool } = require('./pool');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForDatabase(maxAttempts = 60, intervalMs = 2000) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await delay(intervalMs);
      }
    }
  }

  throw lastError;
}

function runMigrationScript() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, 'migrate.js')], {
      stdio: 'inherit',
      env: process.env,
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`migrate.js exited with code ${code}`));
    });
  });
}

async function upsertSeedUser() {
  const seedUsername = process.env.SEED_USER_EMAIL?.trim().toLowerCase();
  const seedPassword = process.env.SEED_USER_PASSWORD;
  const seedDisplayName = process.env.SEED_USER_DISPLAY_NAME?.trim();

  if (!seedUsername || !seedPassword) return;

  const passwordHash = await bcrypt.hash(seedPassword, 12);
  const displayName = seedDisplayName || seedUsername.split('@')[0] || seedUsername;

  await pool.query(
    `
      INSERT INTO users (username, password_hash, display_name)
      VALUES ($1, $2, $3)
      ON CONFLICT (username)
      DO UPDATE SET password_hash = EXCLUDED.password_hash, display_name = EXCLUDED.display_name
    `,
    [seedUsername, passwordHash, displayName]
  );
}

async function bootstrapDatabase() {
  await waitForDatabase();

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);

  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(100)');
  await pool.query('UPDATE users SET display_name = username WHERE display_name IS NULL');

  await upsertSeedUser();

  await pool.query(`
    INSERT INTO channels (name, description) VALUES
      ('general', 'General discussion for everyone'),
      ('random', 'Random stuff, memes, off-topic'),
      ('dev', 'Technical discussions and code')
    ON CONFLICT (name) DO NOTHING
  `);

  await runMigrationScript();
}

module.exports = { bootstrapDatabase };
