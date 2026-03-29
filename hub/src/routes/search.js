/**
 * Search Routes
 * Handles tag-based merchant search
 */

const db = require('../database/postgres');
const cache = require('../cache/redis');
const tagIndexer = require('../services/tag-indexer');

module.exports = async function (fastify, opts) {
  
  // Search merchants by tags
  fastify.get('/', async (request, reply) => {
    try {
      const { 
        tags,           // Comma-separated tags: "茶具,手工"
        category,       // Single category
        min_price,      // Min price
        max_price,      // Max price
        limit = 10,     // Max results
        sort = 'relevance' // Sort by: relevance, rating, transactions
      } = request.query;
      
      // Parse tags
      const tagList = tags ? tags.split(',').map(t => t.trim()) : [];
      if (category) tagList.push(category);
      
      if (tagList.length === 0) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'At least one tag or category is required'
        });
      }
      
      // Search by tags (try Redis first, fallback to PostgreSQL)
let merchantIds = await tagIndexer.searchByTags(tagList, parseInt(limit) * 2);

// Fallback: if Redis returns empty, query PostgreSQL directly
if (merchantIds.length === 0) {
 const tagConditions = tagList.map((tag, i) => 
    `(tags->'categories' ? $${i + 1} OR tags->'capabilities' ? $${i + 1})`
  ).join(' OR ');
  
  const fallbackResult = await db.query(`
    SELECT id FROM merchants 
    WHERE (${tagConditions})
    AND status = 'active'
    LIMIT $${tagList.length + 1}
  `, [...tagList, parseInt(limit) * 2]);
  
  merchantIds = fallbackResult.rows.map(r => r.id);
}
      
      if (merchantIds.length === 0) {
        return {
          merchants: [],
          total: 0,
          query: { tags: tagList }
        };
      }
      
      // Get merchant details
      const placeholders = merchantIds.map((_, i) => `$${i + 1}`).join(',');
      let query = `
        SELECT 
          id, name, logo_url, endpoint, tags, status,
          reputation->>'score' as reputation_score,
          reputation->>'total_transactions' as total_transactions
        FROM merchants 
        WHERE id IN (${placeholders})
        AND status = 'active'
      `;
      
      const values = [...merchantIds];
      
      // Add price filter
      if (min_price || max_price) {
        if (min_price) {
          query += ` AND (tags->>'price_range')::jsonb->>'min' >= $${values.length + 1}`;
          values.push(parseInt(min_price));
        }
        if (max_price) {
          query += ` AND (tags->>'price_range')::jsonb->>'max' <= $${values.length + 1}`;
          values.push(parseInt(max_price));
        }
      }
      
      // Add sorting
      switch (sort) {
        case 'rating':
          query += ' ORDER BY reputation_score DESC';
          break;
        case 'transactions':
          query += ' ORDER BY total_transactions DESC';
          break;
        default:
          // Keep original order for relevance
          query += ` ORDER BY ARRAY_POSITION(ARRAY[${placeholders}], id)`;
      }
      
      query += ` LIMIT $${values.length + 1}`;
      values.push(parseInt(limit));
      
      const result = await db.query(query, values);
      
      // Format response
      const merchants = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        logo_url: row.logo_url,
        endpoint: row.endpoint,
        reputation: {
          score: parseFloat(row.reputation_score) || 0,
          transactions: parseInt(row.total_transactions) || 0
        },
        match_tags: tagList.filter(tag => 
          row.tags.categories?.includes(tag) || 
          row.tags.capabilities?.includes(tag)
        )
      }));
      
      return {
        merchants,
        total: merchants.length,
        query: { 
          tags: tagList,
          min_price,
          max_price
        }
      };
      
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Search failed'
      });
    }
  });
  
  // Get popular/recommended merchants
  fastify.get('/recommended', async (request, reply) => {
    try {
      const { limit = 5 } = request.query;
      
      const result = await db.query(`
        SELECT 
          id, name, logo_url, endpoint, tags,
          reputation->>'score' as reputation_score
        FROM merchants 
        WHERE status = 'active'
        ORDER BY (reputation->>'score')::float DESC, 
                 (reputation->>'total_transactions')::int DESC
        LIMIT $1
      `, [parseInt(limit)]);
      
      return {
        merchants: result.rows,
        total: result.rows.length
      };
      
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get recommendations'
      });
    }
  });
};
