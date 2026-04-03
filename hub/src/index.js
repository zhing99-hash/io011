/**
 * AICart Hub - Pure Navigation Layer
 * Entry point
 */

require('dotenv').config();

const fastify = require('fastify')({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'pretty'
  },
  serializerOpts: {
    encoding: 'utf8'
  }
});

// Register plugins
fastify.register(require('@fastify/cors'), {
  origin: process.env.CORS_ORIGIN || '*'
});

fastify.register(require('@fastify/websocket'));

// Serve static files (frontend UI)
fastify.register(require('@fastify/static'), {
  root: require('path').join(__dirname, '../public'),
  prefix: '/',
});

// Root route - serve index.html
fastify.get('/', async (request, reply) => {
  return reply.sendFile('index.html');
});

// Database and cache
const db = require('./database/postgres');
const cache = require('./cache/redis');

// Routes
fastify.register(require('./routes/merchants'), { prefix: '/api/v1/merchants' });
fastify.register(require('./routes/search'), { prefix: '/api/v1/search' });
fastify.register(require('./routes/categories'), { prefix: '/api/v1/categories' });

// WebSocket handler for merchant connections
fastify.register(async function (fastify) {
  fastify.get('/ws/merchants/:id', { websocket: true }, (connection, req) => {
    const merchantId = req.params.id;
    require('./websocket/merchant-handler')(connection, merchantId);
  });
});

// Health check
fastify.get('/health', async () => {
  return { 
    status: 'ok', 
    version: '2.3.2',
    timestamp: new Date().toISOString()
  };
});

// Error handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  reply.status(500).send({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
const start = async () => {
  try {
    // Initialize database
    await db.connect();
    fastify.log.info('Database connected');
    
    // Initialize cache
    await cache.connect();
    fastify.log.info('Cache connected');
    
    // Start server
    const port = process.env.PORT || 8080;
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    fastify.log.info(`AICart Hub v2.2.1 listening on ${host}:${port}`);
    
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
