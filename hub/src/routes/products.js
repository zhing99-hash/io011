/**
 * Product Routes
 * Handles product CRUD for merchants
 */

const db = require('../database/postgres');
const cache = require('../cache/redis');

module.exports = async function (fastify, opts) {
  
  // Get products (for a merchant or all)
  fastify.get('/', async (request, reply) => {
    try {
      const { merchant_id, category, status, search, limit = 50, offset = 0 } = request.query;
      
      let query = 'SELECT * FROM products WHERE 1=1';
      const values = [];
      let paramIndex = 1;
      
      if (merchant_id) {
        query += ` AND merchant_id = $${paramIndex}`;
        values.push(merchant_id);
        paramIndex++;
      }
      
      if (category) {
        query += ` AND category = $${paramIndex}`;
        values.push(category);
        paramIndex++;
      }
      
      if (status) {
        query += ` AND status = $${paramIndex}`;
        values.push(status);
        paramIndex++;
      }
      
      if (search) {
        query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
        values.push(`%${search}%`);
        paramIndex++;
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      values.push(parseInt(limit), parseInt(offset));
      
      const result = await db.query(query, values);
      
      return {
        success: true,
        data: {
          products: result.rows,
          total: result.rows.length,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      };
      
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        message: '服务器错误'
      });
    }
  });
  
  // Get product by ID
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      
      const result = await db.query(
        'SELECT * FROM products WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: '商品不存在'
        });
      }
      
      return {
        success: true,
        data: result.rows[0]
      };
      
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        message: '服务器错误'
      });
    }
  });
  
  // Create product
  fastify.post('/', async (request, reply) => {
    try {
      const { merchant_id, name, description, price, original_price, category, images, stock, status } = request.body;
      
      if (!merchant_id || !name || !price) {
        return reply.code(400).send({
          success: false,
          message: '缺少必要参数'
        });
      }
      
      const { v4: uuidv4 } = require('uuid');
      const productId = uuidv4();
      
      const result = await db.query(
        `INSERT INTO products (id, merchant_id, name, description, price, original_price, category, images, stock, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
         RETURNING *`,
        [productId, merchant_id, name, description, price, original_price, category, JSON.stringify(images || []), stock || 0, status || 'active']
      );
      
      // 清除缓存
      await cache.del(`merchant_products:${merchant_id}`);
      
      return {
        success: true,
        data: result.rows[0]
      };
      
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        message: '服务器错误'
      });
    }
  });
  
  // Update product
  fastify.put('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const { name, description, price, original_price, category, images, stock, status } = request.body;
      
      const updates = [];
      const values = [];
      let paramIndex = 1;
      
      const fields = { name, description, price, original_price, category, images, stock, status };
      
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) {
          updates.push(`${key} = $${paramIndex}`);
          values.push(key === 'images' ? JSON.stringify(value) : value);
          paramIndex++;
        }
      }
      
      if (updates.length === 0) {
        return reply.code(400).send({
          success: false,
          message: '没有要更新的字段'
        });
      }
      
      updates.push(`updated_at = NOW()`);
      values.push(id);
      
      const query = `UPDATE products SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
      
      const result = await db.query(query, values);
      
      if (result.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: '商品不存在'
        });
      }
      
      // 清除缓存
      await cache.del(`product:${id}`);
      
      return {
        success: true,
        data: result.rows[0]
      };
      
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        message: '服务器错误'
      });
    }
  });
  
  // Delete product
  fastify.delete('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      
      // 先获取 merchant_id 用于清除缓存
      const product = await db.query('SELECT merchant_id FROM products WHERE id = $1', [id]);
      
      const result = await db.query(
        'DELETE FROM products WHERE id = $1 RETURNING id',
        [id]
      );
      
      if (result.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: '商品不存在'
        });
      }
      
      // 清除缓存
      if (product.rows.length > 0) {
        await cache.del(`merchant_products:${product.rows[0].merchant_id}`);
      }
      await cache.del(`product:${id}`);
      
      return {
        success: true,
        message: '商品已删除'
      };
      
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        message: '服务器错误'
      });
    }
  });
  
};