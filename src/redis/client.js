require('dotenv').config();
const Redis = require('ioredis');

const pub = new Redis(process.env.REDIS_URL);
const sub = new Redis(process.env.REDIS_URL);

pub.on('error', (err) => console.error('Redis pub error:', err.message));
sub.on('error', (err) => console.error('Redis sub error:', err.message));

module.exports = { pub, sub };
