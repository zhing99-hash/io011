/**
 * User Auth Routes
 * Handles user login and verification
 */

const db = require('../database/postgres');
const cache = require('../cache/redis');

module.exports = async function (fastify, opts) {
  
  // Helper: Safe cache get
  const safeCacheGet = async (key) => {
    try {
      return await cache.get(key);
    } catch (err) {
      fastify.log.warn('Cache get failed:', err.message);
      return null;
    }
  };
  
  // Helper: Safe cache set
  const safeCacheSet = async (key, value, ttl) => {
    try {
      return await cache.set(key, value, ttl);
    } catch (err) {
      fastify.log.warn('Cache set failed:', err.message);
      return null;
    }
  };
  
  // Send verification code
  fastify.post('/user/send-code', async (request, reply) => {
    try {
      const { phone } = request.body;
      
      if (!phone || phone.length !== 11) {
        return reply.code(400).send({
          success: false,
          message: '请输入正确的手机号'
        });
      }
      
      // 生成6位验证码
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // 存储验证码 (有效期5分钟) - 忽略缓存错误
      safeCacheSet(`verify_code:${phone}`, code, 300);
      
      // 存储到数据库
      await db.query(
        `INSERT INTO verification_codes (phone, code, purpose, expires_at)
         VALUES ($1, $2, 'login', NOW() + INTERVAL '5 minutes', NOW())`,
        [phone, code]
      );
      
      // 开发环境返回验证码
      console.log(`验证码 ${phone}: ${code}`);
      
      return {
        success: true,
        message: '验证码已发送',
        dev_code: code // 开发环境返回
      };
      
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        message: '服务器错误'
      });
    }
  });
  
  // User login / Verify code
  fastify.post('/user/login', async (request, reply) => {
    try {
      const { phone, code } = request.body;
      
      if (!phone || !code) {
        return reply.code(400).send({
          success: false,
          message: '手机号和验证码不能为空'
        });
      }
      
      // 验证验证码 - 优先从缓存，失败则只查数据库
      let validCode = false;
      
      // 尝试从缓存验证
      const cachedCode = await safeCacheGet(`verify_code:${phone}`);
      if (cachedCode === code) {
        validCode = true;
      }
      
      // 备用: 数据库验证
      if (!validCode) {
        const result = await db.query(
          `SELECT id FROM verification_codes 
           WHERE phone = $1 AND code = $2 AND expires_at > NOW() AND used_at IS NULL
           ORDER BY created_at DESC LIMIT 1`,
          [phone, code]
        );
        if (result.rows.length > 0) {
          validCode = true;
          // 标记已使用
          await db.query(
            'UPDATE verification_codes SET used_at = NOW() WHERE phone = $1 AND code = $2',
            [phone, code]
          );
        }
      }
      
      // 演示用户硬编码验证 (无需数据库)
      if (phone === '18600186000' && code === '1234') {
        validCode = true;
      }
      
      if (!validCode) {
        return reply.code(401).send({
          success: false,
          message: '验证码错误或已过期'
        });
      }
      
      // 查询或创建用户
      let user = await db.query('SELECT * FROM users WHERE phone = $1', [phone]);
      
      if (user.rows.length === 0) {
        // 自动注册用户
        const newUser = await db.query(
          `INSERT INTO users (id, phone, nickname) 
           VALUES ($1, $2, $3) RETURNING *`,
          [`user-${Date.now()}`, phone, `用户${phone.slice(-4)}`]
        );
        user = newUser;
      }
      
      const userData = user.rows[0];
      
      // 生成 token
      const token = Buffer.from(`${userData.id}:${Date.now()}`).toString('base64');
      
      // 存储到缓存 - 忽略错误
      safeCacheSet(`user_token:${token}`, JSON.stringify(userData), 3600 * 24 * 7); // 7天
      
      return {
        success: true,
        data: {
          token,
          user: {
            id: userData.id,
            phone: userData.phone,
            nickname: userData.nickname,
            avatar: userData.avatar
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
  
  // Get user profile
  fastify.get('/user/profile', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.code(401).send({ success: false, message: '未登录' });
      }
      
      const token = authHeader.replace('Bearer ', '');
      
      // 尝试从缓存获取
      let userData = await safeCacheGet(`user_token:${token}`);
      
      if (userData) {
        return {
          success: true,
          data: { user: JSON.parse(userData) }
        };
      }
      
      // 缓存没有，从数据库解析 token
      try {
        const decoded = Buffer.from(token, 'base64').toString();
        const userId = decoded.split(':')[0];
        
        const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) {
          return reply.code(401).send({ success: false, message: '用户不存在' });
        }
        
        return {
          success: true,
          data: { user: result.rows[0] }
        };
      } catch (err) {
        return reply.code(401).send({ success: false, message: '登录已过期' });
      }
      
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: '服务器错误' });
    }
  });
  
};