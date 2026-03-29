/**
 * Merchant Routes
 * Handles merchant registration, updates, and heartbeat
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../database/postgres');
const cache = require('../cache/redis');
const tagIndexer = require('../services/tag-indexer');

module.exports = async function (fastify, opts) {
  
  // Register new merchant
  fastify.post('/register', async (request, reply) => {
    try {
      const { name, logo_url, endpoint, public_key, tags } = request.body;
      
      // Validate required fields
      if (!name || !endpoint || !tags || !tags.categories) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Missing required fields: name, endpoint, tags.categories'
        });
      }
      
      // Generate merchant ID
      const merchantId = `mer_${uuidv4().replace(/-/g, '').substring(0, 12)}`;
      
      // Generate API key
      const apiKey = `sk_live_${uuidv4().replace(/-/g, '')}`;
      
      // Insert into database
      const query = `
        INSERT INTO merchants (
          id, name, logo_url, endpoint, public_key, 
          tags, api_key, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING id, name, api_key, status
      `;
      
      const values = [
        merchantId,
        name,
        logo_url || null,
        endpoint,
        public_key || null,
        JSON.stringify(tags),
        apiKey,
        'active'
      ];
      
      const result = await db.query(query, values);
      
      // Index tags
      await tagIndexer.addMerchant(merchantId, tags);
      
      // Cache merchant info
      await cache.set(`merchant:${merchantId}`, JSON.stringify({
        id: merchantId,
        name,
        endpoint,
        tags,
        status: 'active'
      }));
      
      fastify.log.info(`Merchant registered: ${merchantId}`);
      
      return {
        merchant_id: merchantId,
        api_key: apiKey,
        status: 'active',
        message: 'Merchant registered successfully'
      };
      
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to register merchant'
      });
    }
  });
  
  // Get merchant info
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      
      // Try cache first
      const cached = await cache.get(`merchant:${id}`);
      if (cached) {
        return JSON.parse(cached);
      }
      
      // Query database
      const result = await db.query(
        'SELECT id, name, logo_url, tags, status, reputation FROM merchants WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Merchant not found'
        });
      }
      
      const merchant = result.rows[0];
      
      // Cache for future requests
      await cache.set(`merchant:${id}`, JSON.stringify(merchant), 'EX', 300);
      
      return merchant;
      
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get merchant'
      });
    }
  });
  
  // Update merchant
  fastify.put('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const updates = request.body;
      
      // Build update query dynamically
      const allowedFields = ['name', 'logo_url', 'endpoint', 'public_key', 'tags'];
      const setClauses = [];
      const values = [];
      let paramIndex = 1;
      
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          setClauses.push(`${field} = $${paramIndex}`);
          values.push(field === 'tags' ? JSON.stringify(updates[field]) : updates[field]);
          paramIndex++;
        }
      }
      
      if (setClauses.length === 0) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'No valid fields to update'
        });
      }
      
      values.push(id);
      const query = `
        UPDATE merchants 
        SET ${setClauses.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex}
        RETURNING id, name, tags
      `;
      
      const result = await db.query(query, values);
      
      if (result.rows.length === 0) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Merchant not found'
        });
      }
      
      // Update tag index if tags changed
      if (updates.tags) {
        await tagIndexer.updateMerchant(id, updates.tags);
      }
      
      // Invalidate cache
      await cache.del(`merchant:${id}`);
      
      return {
        merchant_id: id,
        ...result.rows[0],
        message: 'Merchant updated successfully'
      };
      
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update merchant'
      });
    }
  });
  
  // Merchant heartbeat
  fastify.post('/:id/heartbeat', async (request, reply) => {
    try {
      const { id } = request.params;
      
      // Update last seen
      await db.query(
        'UPDATE merchants SET last_seen = NOW(), status = $1 WHERE id = $2',
        ['active', id]
      );
      
      // Update cache
      await cache.set(`merchant:${id}:online`, '1', 'EX', 120);
      
      return { status: 'ok', timestamp: new Date().toISOString() };
      
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update heartbeat'
      });
    }
  });
  
  // Delete merchant
  fastify.delete('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      
      // Soft delete
      await db.query(
        'UPDATE merchants SET status = $1, deleted_at = NOW() WHERE id = $2',
        ['deleted', id]
      );
      
      // Remove from tag index
      await tagIndexer.removeMerchant(id);
      
      // Invalidate cache
      await cache.del(`merchant:${id}`);
      
      return { message: 'Merchant deleted successfully' };
      
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete merchant'
      });
    }
  });
};
