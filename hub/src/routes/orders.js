/**
 * Order Routes
 * Handles order CRUD operations
 */

const db = require('../database/postgres');
const cache = require('../cache/redis');

module.exports = async function (fastify, opts) {
  
  // Get all orders (with filters)
  fastify.get('/', async (request, reply) => {
    try {
      const { merchant_id, user_id, status, limit = 50, offset = 0 } = request.query;
      
      let query = 'SELECT * FROM orders WHERE 1=1';
      const values = [];
      let paramIndex = 1;
      
      if (merchant_id) {
        query += ` AND merchant_id = $${paramIndex}`;
        values.push(merchant_id);
        paramIndex++;
      }
      
      if (user_id) {
        query += ` AND user_id = $${paramIndex}`;
        values.push(user_id);
        paramIndex++;
      }
      
      if (status) {
        query += ` AND status = $${paramIndex}`;
        values.push(status);
        paramIndex++;
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      values.push(parseInt(limit), parseInt(offset));
      
      const result = await db.query(query, values);
      
      return {
        success: true,
        data: {
          orders: result.rows,
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
  
  // Get order by ID
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      
      const result = await db.query(
        'SELECT * FROM orders WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: '订单不存在'
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
  
  // Create order
  fastify.post('/', async (request, reply) => {
    try {
      const { merchant_id, user_id, items, total_amount, contact, address } = request.body;
      
      if (!merchant_id || !user_id || !items || !total_amount) {
        return reply.code(400).send({
          success: false,
          message: '缺少必要参数'
        });
      }
      
      const { v4: uuidv4 } = require('uuid');
      const orderId = uuidv4();
      const orderNumber = `ORD${Date.now()}`;
      
      const result = await db.query(
        `INSERT INTO orders (id, order_number, merchant_id, user_id, items, total_amount, status, contact, address, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
         RETURNING *`,
        [orderId, orderNumber, merchant_id, user_id, JSON.stringify(items), total_amount, 'pending', contact, address]
      );
      
      // 清除缓存
      await cache.del(`merchant_orders:${merchant_id}`);
      await cache.del(`user_orders:${user_id}`);
      
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
  
  // Update order status
  fastify.put('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const { status, tracking_number } = request.body;
      
      const updates = [];
      const values = [];
      let paramIndex = 1;
      
      if (status) {
        updates.push(`status = $${paramIndex}`);
        values.push(status);
        paramIndex++;
      }
      
      if (tracking_number) {
        updates.push(`tracking_number = $${paramIndex}`);
        values.push(tracking_number);
        paramIndex++;
      }
      
      updates.push(`updated_at = NOW()`);
      values.push(id);
      
      const query = `UPDATE orders SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
      
      const result = await db.query(query, values);
      
      if (result.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: '订单不存在'
        });
      }
      
      // 清除缓存
      await cache.del(`order:${id}`);
      
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
  
  // Delete order
  fastify.delete('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      
      const result = await db.query(
        'DELETE FROM orders WHERE id = $1 RETURNING id',
        [id]
      );
      
      if (result.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          message: '订单不存在'
        });
      }
      
      return {
        success: true,
        message: '订单已删除'
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