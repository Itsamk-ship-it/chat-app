require('dotenv').config();
const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const cors     = require('cors');

const { pool }   = require('./db/pool');
const { bootstrapDatabase } = require('./db/bootstrap');
const { pub, sub } = require('./redis/client');
const { socketAuth } = require('./middleware/auth');
const authRoutes    = require('./routes/auth');
const channelRoutes = require('./routes/channels');
const orgRoutes     = require('./routes/orgs');
const dmRoutes      = require('./routes/dms');
const starredRoutes = require('./routes/starred');
const draftsRoutes  = require('./routes/drafts');
const threadsRoutes = require('./routes/threads');
const searchRoutes  = require('./routes/search');
const messageRoutes = require('./routes/messages');
const { registerSocketHandlers } = require('./socket/handlers');
const { setIo } = require('./socket/io');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*' },
  path: '/api/socket.io',
});

app.use(cors());
app.use(express.json());

app.use('/api/auth',     authRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/orgs',     orgRoutes);
app.use('/api/dms',      dmRoutes);
app.use('/api/starred',  starredRoutes);
app.use('/api/drafts',   draftsRoutes);
app.use('/api/threads',  threadsRoutes);
app.use('/api/search',   searchRoutes);
app.use('/api/messages', messageRoutes);

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    const redisPing = await pub.ping();
    res.json({ status: 'ok', db: 'connected', redis: redisPing });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

setIo(io);
io.use(socketAuth);
registerSocketHandlers(io, pub, sub);

async function start() {
  await bootstrapDatabase();

  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => {
    console.log(`\n🚀 ChatApp API running → http://localhost:${PORT}`);
    console.log(`🗄️  PostgreSQL  : ${process.env.DATABASE_URL}`);
    console.log(`⚡ Redis       : ${process.env.REDIS_URL}`);
    console.log(`📡 WebSocket   : ready`);
    console.log(`\n📱 Frontend    : http://localhost:3000\n`);
  });
}

start().catch((err) => {
  console.error('Failed to bootstrap database:', err);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  await pool.end();
  pub.disconnect();
  sub.disconnect();
  process.exit(0);
});
