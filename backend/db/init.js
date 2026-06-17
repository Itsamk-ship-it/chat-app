require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function init() {
  const dbUrl = process.env.DATABASE_URL;
  const lastSlash = dbUrl.lastIndexOf('/');
  const dbName = dbUrl.substring(lastSlash + 1).split('?')[0];
  const adminUrl = dbUrl.substring(0, lastSlash) + '/postgres';

  // Create database if it doesn't exist
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  const { rows } = await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [dbName]);
  if (!rows.length) {
    await admin.query(`CREATE DATABASE "${dbName}"`);
    console.log(`✅ Database "${dbName}" created`);
  } else {
    console.log(`ℹ️  Database "${dbName}" already exists`);
  }
  await admin.end();

  // Apply schema
  const db = new Client({ connectionString: dbUrl });
  await db.connect();
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await db.query(schema);
  console.log('✅ Schema applied');

  // Seed default channels
  await db.query(`
    INSERT INTO channels (name, description) VALUES
      ('general',  'General discussion for everyone'),
      ('random',   'Random stuff, memes, off-topic'),
      ('dev',      'Technical discussions and code')
    ON CONFLICT (name) DO NOTHING
  `);
  console.log('✅ Default channels ready');

  await db.end();
  console.log('🎉 Database initialised — run: node src/index.js');
}

init().catch(err => {
  console.error('❌ Init failed:', err.message);
  process.exit(1);
});
