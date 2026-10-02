import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

let redisInstance: any;
let redisSubInstance: any;

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

if (process.env.USE_MOCK_REDIS === 'true') {
  console.log('📦 Using in-memory Mock Redis (ioredis-mock)');
  const RedisMock = require('ioredis-mock');
  redisInstance = new RedisMock();
  redisSubInstance = new RedisMock();
} else {
  try {
    const realRedis = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy(times) {
        if (times > 2) {
          return null; // Stop retrying and trigger error
        }
        return Math.min(times * 100, 1000);
      },
    });

    realRedis.on('connect', () => {
      console.log('⚡ Connected to Redis at', redisUrl);
    });

    realRedis.on('error', (err) => {
      console.warn('⚠️  Real Redis unreachable, using in-memory mock fallback for local development:', err.message);
    });

    redisInstance = realRedis;
    redisSubInstance = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    });
  } catch (err: any) {
    console.warn('⚠️  Could not initialize Redis client, falling back to mock:', err.message);
    const RedisMock = require('ioredis-mock');
    redisInstance = new RedisMock();
    redisSubInstance = new RedisMock();
  }
}

export const redis = redisInstance;
export const redisSub = redisSubInstance;
