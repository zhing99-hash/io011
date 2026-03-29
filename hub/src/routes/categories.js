/**
 * Categories Routes
 * Handles category browsing and listing
 */

const db = require('../database/postgres');
const cache = require('../cache/redis');

module.exports = async function (fastify, opts) {
  
  // List all categories
  fastify.get('/', async (request, reply) => {
    try {
      // Get distinct categories from all merchants
      const result = await db.query(`
        SELECT DISTINCT jsonb_array_elements_text(tags->'categories') as category
        FROM merchants
        WHERE status = 'active'
        ORDER BY category
      `);
      
      const categories = result.rows.map(row => row.category);
      
      return {
        categories,
        total: categories.length
      };
      
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get categories'
      });
    }
  });
  
  // Get merchants by category
  fastify.get('/:category/merchants', async (request, reply) => {
    try {
      const { category } = request.params;
      const { limit = 10, offset = 0 } = request.query;
      
      const result = await db.query(`
        SELECT 
          id, name, logo_url, endpoint, tags, status,
          reputation->>'score' as reputation_score,
          reputation->>'total_transactions' as total_transactions
        FROM merchants 
        WHERE tags->'categories' ? $1
        AND status = 'active'
        ORDER BY (reputation->>'score')::float DESC
        LIMIT $2 OFFSET $3
      `, [category, parseInt(limit), parseInt(offset)]);
      
      const merchants = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        logo_url: row.logo_url,
        endpoint: row.endpoint,
        reputation: {
          score: parseFloat(row.reputation_score) || 0,
          transactions: parseInt(row.total_transactions) || 0
        },
        tags: row.tags
      }));
      
      return {
        merchants,
        category,
        total: merchants.length
      };
      
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get merchants by category'
      });
    }
  });
  
  // Get category statistics
  fastify.get('/:category/stats', async (request, reply) => {
    try {
      const { category } = request.params;
      
      const result = await db.query(`
        SELECT 
          COUNT(*) as merchant_count,
          AVG((reputation->>'score')::float) as avg_reputation,
          SUM((reputation->>'total_transactions')::int) as total_transactions
        FROM merchants 
        WHERE tags->'categories' @> to_jsonb($1::text)
        AND status = 'active'
      `, [category]);
      
      return {
        category,
        stats: {
          merchant_count: parseInt(result.rows[0].merchant_count),
          avg_reputation: parseFloat(result.rows[0].avg_reputation) || 0,
          total_transactions: parseInt(result.rows[0].total_transactions) || 0
        }
      };
      
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get category stats'
      });
    }
  });
};