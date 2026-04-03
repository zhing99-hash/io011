/**
 * Redis Cache Connection
 */

const Redis = require('ioredis');

let redis = null;

module.exports = {
  connect: async () => {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    redis.on('connect', () => {
      console.log('Redis connected');
    });
    
    redis.on('error', (err) => {
      console.error('Redis error:', err);
    });
  },
  
  get: async (key) => {
    if (!redis) return null;
    return redis.get(key);
  },
  
  set: async (key, value, ...args) => {
    if (!redis) return null;
    return redis.set(key, value, ...args);
  },
  
  del: async (key) => {
    if (!redis) return null;
    return redis.del(key);
  },
  
  sadd: async (key, ...members) => {
    if (!redis) return null;
    return redis.sadd(key, ...members);
  },
  
  srem: async (key, ...members) => {
    if (!redis) return null;
    return redis.srem(key, ...members);
  },
  
  smembers: async (key) => {
    if (!redis) return [];
    return redis.smembers(key);
  },
  
  sinter: async (...keys) => {
    if (!redis) return [];
    return redis.sinter(...keys);
  },
  
  keys: async (pattern) => {
    if (!redis) return [];
    return redis.keys(pattern);
  },
  
  close: async () => {
    if (redis) {
      await redis.quit();
      console.log('Redis disconnected');
    }
  }
};
