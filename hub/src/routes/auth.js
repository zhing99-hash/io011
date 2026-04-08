/**
 * Admin Auth Routes
 * Handles admin and merchant authentication
 */

const db = require('../database/postgres');
const cache = require('../cache/redis');

module.exports = async function (fastify, opts) {
  
  // Admin login
  fastify.post('/admin/login', async (request, reply) => {
    try {
      const { username, password } = request.body;
      
      if (!username || !password) {
        return reply.code(400).send({
          success: false,
          message: '用户名和密码不能为空'
        });
      }
      
      // 查询管理员 (实际应该加密存储密码)
      // 这里使用简单逻辑，开发环境用
      const adminUsers = {
        'admin': { id: 'admin-001', username: 'admin', role: 'super_admin', name: '超级管理员' },
        ' operator': { id: 'admin-002', username: 'operator', role: 'operator', name: '运营人员' }
      };
      
      const admin = adminUsers[username];
      if (!admin || password !== 'admin123') {
        return reply.code(401).send({
          success: false,
          message: '用户名或密码错误'
        });
      }
      
      // 生成 token
      const token = Buffer.from(`${admin.id}:${Date.now()}`).toString('base64');
      
      // 存储到缓存
      await cache.set(`admin_token:${token}`, JSON.stringify(admin), 'EX', 86400); // 24小时
      
      return {
        success: true,
        data: {
          token,
          user: {
            id: admin.id,
            username: admin.username,
            role: admin.role,
            name: admin.name
          }
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
  
  // Merchant login
  fastify.post('/merchant/login', async (request, reply) => {
    try {
      const { merchant_id, password } = request.body;
      
      if (!merchant_id || !password) {
        return reply.code(400).send({
          success: false,
          message: '商户ID和密码不能为空'
        });
      }
      
      // 从数据库查询商户
      const result = await db.query(
        'SELECT id, name, password_hash, status FROM merchants WHERE id = $1',
        [merchant_id]
      );
      
      if (result.rows.length === 0) {
        return reply.code(401).send({
          success: false,
          message: '商户不存在'
        });
      }
      
      const merchant = result.rows[0];
      
      // 验证密码 (实际应该用 bcrypt)
      if (password !== 'merchant123') {
        return reply.code(401).send({
          success: false,
          message: '密码错误'
        });
      }
      
      if (merchant.status !== 'active') {
        return reply.code(403).send({
          success: false,
          message: '商户状态异常'
        });
      }
      
      // 生成 token
      const token = Buffer.from(`${merchant.id}:${Date.now()}`).toString('base64');
      
      // 存储到缓存
      await cache.set(`merchant_token:${token}`, JSON.stringify({
        id: merchant.id,
        name: merchant.name
      }), 'EX', 2592000); // 30天
      
      return {
        success: true,
        data: {
          token,
          merchant: {
            id: merchant.id,
            name: merchant.name
          }
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
  
  // Verify token
  fastify.get('/verify', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({
          success: false,
          message: '未授权'
        });
      }
      
      const token = authHeader.substring(7);
      const adminData = await cache.get(`admin_token:${token}`);
      const merchantData = await cache.get(`merchant_token:${token}`);
      
      if (adminData) {
        return {
          success: true,
          data: { type: 'admin', ...JSON.parse(adminData) }
        };
      }
      
      if (merchantData) {
        return {
          success: true,
          data: { type: 'merchant', ...JSON.parse(merchantData) }
        };
      }
      
      return reply.code(401).send({
        success: false,
        message: 'Token 已过期'
      });
      
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        message: '服务器错误'
      });
    }
  });
  
  // Logout
  fastify.post('/logout', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        await cache.del(`admin_token:${token}`);
        await cache.del(`merchant_token:${token}`);
      }
      
      return { success: true };
      
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        message: '服务器错误'
      });
    }
  });
  
};