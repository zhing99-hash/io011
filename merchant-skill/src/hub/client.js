/**
 * HUB客户端模块
 * 
 * 实现AICart-A2A v0.1协议，用于商户与HUB的通信
 */

const { Logger } = require('../utils/logger');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const { URL } = require('url');

class HubClient {
  constructor(db, config = {}) {
    this.db = db;
    this.config = config;
    this.logger = new Logger('HubClient');
    this.connections = new Map();
    this.protocolVersion = 'aicart-a2a/0.1.0';
  }

  /**
   * 注册商户到HUB
   * @param {string} hubUrl - HUB地址
   * @param {string} apiKey - API密钥
   * @param {Object} merchantInfo - 商户信息
   * @returns {Promise<Object>} 注册结果
   */
  async register(hubUrl, apiKey, merchantInfo = {}) {
    this.logger.info(`开始注册商户到HUB: ${hubUrl}`);
    
    try {
      // 构建注册请求体
      const registerData = {
        merchant: {
          name: merchantInfo.name || this.config.merchant?.name || '未命名商户',
          description: merchantInfo.description || this.config.merchant?.description || '',
          endpoint: merchantInfo.endpoint || this.getEndpoint(),
          webhook_url: merchantInfo.webhookUrl || `${this.getEndpoint()}/webhook`,
          contact: {
            email: merchantInfo.email || this.config.merchant?.contact?.email || '',
            phone: merchantInfo.phone || this.config.merchant?.contact?.phone || ''
          },
          categories: merchantInfo.categories || [],
          regions: merchantInfo.regions || ['CN'],
          supported_currencies: merchantInfo.currencies || ['CNY']
        },
        signature_public_key: merchantInfo.publicKey || ''
      };

      // 发送注册请求
      const response = await this.sendRequest(
        `${hubUrl}/api/v1/a2a/merchants/register`,
        'POST',
        registerData,
        null // 注册时不需要签名
      );

      if (response.status === 201 && response.data) {
        // 保存连接信息到数据库
        const connectionId = this.generateConnectionId();
        await this.saveConnection({
          id: connectionId,
          hub_id: response.data.merchant_id,
          name: merchantInfo.hubName || '默认HUB',
          url: hubUrl,
          api_key: apiKey,
          access_key: response.data.api_key?.access_key || '',
          secret_key: response.data.api_key?.secret_key || '',
          status: response.data.status || 'active',
          is_active: true,
          created_at: new Date().toISOString(),
          last_sync: null
        });

        this.logger.info(`商户注册成功: ${response.data.merchant_id}`);
        
        return {
          success: true,
          connectionId: connectionId,
          merchantId: response.data.merchant_id,
          apiKey: response.data.api_key,
          status: response.data.status
        };
      } else {
        throw new Error(`注册失败: ${response.error || '未知错误'}`);
      }
    } catch (error) {
      this.logger.error('商户注册失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 同步商品索引到HUB
   * @param {Array<Object>} products - 商品列表
   * @param {string} hubId - HUB连接ID（可选，默认同步到所有激活的HUB）
   * @returns {Promise<Object>} 同步结果
   */
  async syncProducts(products, hubId = null) {
    this.logger.info(`开始同步 ${products.length} 个商品到HUB`);
    
    const connections = hubId 
      ? [await this.getConnection(hubId)].filter(Boolean)
      : await this.getActiveConnections();

    if (connections.length === 0) {
      return {
        success: false,
        error: '没有可用的HUB连接'
      };
    }

    // 构建同步数据
    const syncId = this.generateSyncId();
    const syncData = {
      sync_type: 'delta',
      sync_id: syncId,
      timestamp: new Date().toISOString(),
      products: products.map(p => ({
        action: p.status === 'deleted' ? 'delete' : 'upsert',
        product_index: p.status === 'deleted' ? undefined : {
          product_id: p.id,
          sku: p.sku || p.id,
          name: p.name,
          category: this.parseCategory(p.category),
          price: {
            currency: p.currency || 'CNY',
            amount: parseFloat(p.price) || 0
          },
          availability: p.stock > 0 ? 'in_stock' : 'out_of_stock',
          tags: this.parseTags(p.tags),
          updated_at: p.updated_at || new Date().toISOString()
        },
        product_id: p.status === 'deleted' ? p.id : undefined
      }))
    };

    const results = [];
    for (const conn of connections) {
      try {
        const response = await this.sendSignedRequest(
          conn,
          `${conn.url}/api/v1/a2a/products/sync`,
          'POST',
          syncData
        );

        if (response.status === 200) {
          // 更新同步日志
          await this.logSync(conn.id, syncId, 'success', response.data);
          
          // 更新最后同步时间
          await this.updateLastSync(conn.id);
          
          results.push({
            hubId: conn.id,
            success: true,
            processed: response.data?.processed || 0,
            syncId: syncId
          });
        } else {
          throw new Error(`同步失败: ${response.error}`);
        }
      } catch (error) {
        this.logger.error(`同步到HUB ${conn.id} 失败:`, error);
        await this.logSync(conn.id, syncId, 'failed', null, error.message);
        
        results.push({
          hubId: conn.id,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    this.logger.info(`同步完成: ${successCount}/${results.length} 个HUB成功`);

    return {
      success: successCount > 0,
      syncId: syncId,
      results: results,
      totalHubs: results.length,
      successHubs: successCount
    };
  }

  /**
   * 发送心跳
   * @param {string} hubId - HUB连接ID（可选）
   * @returns {Promise<Object>} 心跳结果
   */
  async sendHeartbeat(hubId = null) {
    const connections = hubId 
      ? [await this.getConnection(hubId)].filter(Boolean)
      : await this.getActiveConnections();

    const results = [];
    
    for (const conn of connections) {
      try {
        // 获取商户统计信息
        const metrics = await this.getMerchantMetrics(conn.hub_id);
        
        const heartbeatData = {
          merchant_id: conn.hub_id,
          timestamp: new Date().toISOString(),
          status: 'active',
          metrics: metrics,
          capabilities: {
            query: true,
            order: false,
            ai_assistant: true
          }
        };

        const response = await this.sendSignedRequest(
          conn,
          `${conn.url}/api/v1/a2a/heartbeat`,
          'POST',
          heartbeatData
        );

        results.push({
          hubId: conn.id,
          success: response.status === 200,
          hubStatus: response.data?.hub_status || 'unknown',
          nextExpected: response.data?.next_expected
        });
      } catch (error) {
        this.logger.error(`发送心跳到HUB ${conn.id} 失败:`, error);
        results.push({
          hubId: conn.id,
          success: false,
          error: error.message
        });
      }
    }

    return {
      success: results.some(r => r.success),
      results: results,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 处理HUB查询请求
   * @param {Object} query - 查询请求体
   * @returns {Promise<Object>} 查询结果
   */
  async handleQuery(query) {
    this.logger.info(`处理HUB查询请求: ${query.query_id}`);
    
    try {
      // 验证查询请求
      if (!query.query_id || !query.query) {
        throw new Error('无效的查询请求');
      }

      // 从数据库搜索商品
      const products = await this.searchProducts(query.query, query.options);

      // 构建响应
      const response = {
        query_id: query.query_id,
        merchant_id: query.merchant_id,
        responded_at: new Date().toISOString(),
        results: products.map(p => ({
          product_id: p.id,
          sku: p.sku || p.id,
          name: p.name,
          category: this.parseCategory(p.category),
          price: {
            currency: p.currency || 'CNY',
            amount: parseFloat(p.price) || 0
          },
          availability: p.stock > 0 ? 'in_stock' : 'out_of_stock',
          score: p.score || 0.8,
          url: `${this.getEndpoint()}/products/${p.id}`,
          images: this.parseImages(p.images),
          highlights: this.parseSellingPoints(p.selling_points),
          attributes: {
            brand: p.brand || '',
            color: p.color || '',
            material: p.material || ''
          }
        })),
        total: products.length,
        page: {
          limit: query.options?.limit || 10,
          offset: query.options?.offset || 0
        }
      };

      return response;
    } catch (error) {
      this.logger.error('处理查询请求失败:', error);
      return {
        query_id: query.query_id,
        error: error.message,
        results: [],
        total: 0
      };
    }
  }

  /**
   * 更新商户信息
   * @param {string} hubId - HUB连接ID
   * @param {Object} updates - 更新的信息
   * @returns {Promise<Object>} 更新结果
   */
  async updateMerchant(hubId, updates) {
    const conn = await this.getConnection(hubId);
    if (!conn) {
      return { success: false, error: 'HUB连接不存在' };
    }

    try {
      const response = await this.sendSignedRequest(
        conn,
        `${conn.url}/api/v1/a2a/merchants/${conn.hub_id}`,
        'PUT',
        updates
      );

      return {
        success: response.status === 200,
        data: response.data
      };
    } catch (error) {
      this.logger.error('更新商户信息失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 断开HUB连接
   * @param {string} hubId - HUB连接ID
   * @returns {Promise<Object>} 断开结果
   */
  async disconnect(hubId) {
    try {
      await this.db.run(
        'UPDATE hub_connections SET is_active = 0 WHERE id = ?',
        [hubId]
      );
      
      this.logger.info(`HUB连接已断开: ${hubId}`);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 删除HUB连接
   * @param {string} hubId - HUB连接ID
   * @returns {Promise<Object>} 删除结果
   */
  async deleteConnection(hubId) {
    try {
      await this.db.run(
        'DELETE FROM hub_connections WHERE id = ?',
        [hubId]
      );
      
      this.logger.info(`HUB连接已删除: ${hubId}`);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取所有HUB连接
   * @returns {Promise<Array>} 连接列表
   */
  async getAllConnections() {
    return await this.db.all(
      'SELECT * FROM hub_connections ORDER BY created_at DESC'
    );
  }

  /**
   * 获取单个连接
   * @param {string} hubId - 连接ID
   * @returns {Promise<Object|null>}
   */
  async getConnection(hubId) {
    const conn = await this.db.get(
      'SELECT * FROM hub_connections WHERE id = ?',
      [hubId]
    );
    return conn || null;
  }

  /**
   * 获取激活的连接
   * @returns {Promise<Array>}
   */
  async getActiveConnections() {
    return await this.db.all(
      'SELECT * FROM hub_connections WHERE is_active = 1'
    );
  }

  /**
   * 保存连接信息
   * @param {Object} connection - 连接信息
   */
  async saveConnection(connection) {
    const fields = Object.keys(connection);
    const placeholders = fields.map(() => '?').join(',');
    const values = Object.values(connection);
    
    await this.db.run(
      `INSERT OR REPLACE INTO hub_connections (${fields.join(',')}) VALUES (${placeholders})`,
      values
    );
  }

  /**
   * 更新最后同步时间
   * @param {string} hubId - HUB连接ID
   */
  async updateLastSync(hubId) {
    await this.db.run(
      'UPDATE hub_connections SET last_sync = ? WHERE id = ?',
      [new Date().toISOString(), hubId]
    );
  }

  /**
   * 记录同步日志
   * @param {string} hubId - HUB连接ID
   * @param {string} syncId - 同步ID
   * @param {string} status - 状态
   * @param {Object} data - 响应数据
   * @param {string} error - 错误信息
   */
  async logSync(hubId, syncId, status, data = null, error = null) {
    await this.db.run(
      `INSERT INTO sync_logs (hub_id, sync_id, action, status, message, created_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [hubId, syncId, 'sync', status, error || JSON.stringify(data), new Date().toISOString()]
    );
  }

  /**
   * 发送签名请求
   * @param {Object} conn - 连接信息
   * @param {string} url - 请求URL
   * @param {string} method - HTTP方法
   * @param {Object} data - 请求数据
   * @returns {Promise<Object>} 响应
   */
  async sendSignedRequest(conn, url, method, data) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = JSON.stringify(data);
    const signature = this.signRequest(method, new URL(url).pathname, timestamp, body, conn.secret_key);
    
    const headers = {
      'Authorization': `AICART-A2A-V1 ${conn.access_key}:${signature}`,
      'X-A2A-Timestamp': timestamp,
      'X-A2A-Nonce': this.generateNonce(),
      'Content-Type': 'application/json'
    };
    
    return this.sendRequest(url, method, data, headers);
  }

  /**
   * 签名请求
   * @param {string} method - HTTP方法
   * @param {string} path - 请求路径
   * @param {string} timestamp - 时间戳
   * @param {string} body - 请求体
   * @param {string} secretKey - 密钥
   * @returns {string} 签名
   */
  signRequest(method, path, timestamp, body, secretKey) {
    const bodyHash = crypto.createHash('sha256').update(body).digest('hex');
    const stringToSign = `${method}\n${path}\n${timestamp}\n${bodyHash}`;
    
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(stringToSign)
      .digest();
    
    return signature.toString('base64url').replace(/=+$/, '');
  }

  /**
   * 发送HTTP请求
   * @param {string} url - URL
   * @param {string} method - 方法
   * @param {Object} data - 数据
   * @param {Object} headers - 请求头
   * @returns {Promise<Object>} 响应
   */
  async sendRequest(url, method, data, headers = {}) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };
      
      const req = client.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsedData = responseData ? JSON.parse(responseData) : {};
            resolve({
              status: res.statusCode,
              data: parsedData,
              headers: res.headers
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              data: responseData,
              headers: res.headers
            });
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  /**
   * 搜索商品（内部方法）
   * @param {Object} query - 查询条件
   * @param {Object} options - 选项
   * @returns {Promise<Array>}
   */
  async searchProducts(query, options = {}) {
    const limit = options.limit || 10;
    const offset = options.offset || 0;
    
    let sql = 'SELECT * FROM products WHERE status = "active"';
    const params = [];
    
    // 关键词搜索
    if (query.text) {
      sql += ' AND (name LIKE ? OR description LIKE ? OR tags LIKE ?)';
      const keyword = `%${query.text}%`;
      params.push(keyword, keyword, keyword);
    }
    
    // 分类过滤
    if (query.filters?.category && query.filters.category.length > 0) {
      sql += ' AND category IN (' + query.filters.category.map(() => '?').join(',') + ')';
      params.push(...query.filters.category);
    }
    
    // 价格范围
    if (query.filters?.price_range) {
      if (query.filters.price_range.min !== undefined) {
        sql += ' AND price >= ?';
        params.push(query.filters.price_range.min);
      }
      if (query.filters.price_range.max !== undefined) {
        sql += ' AND price <= ?';
        params.push(query.filters.price_range.max);
      }
    }
    
    // 库存过滤
    if (query.filters?.in_stock) {
      sql += ' AND stock > 0';
    }
    
    sql += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    return await this.db.all(sql, params);
  }

  /**
   * 获取商户统计指标
   * @param {string} merchantId - 商户ID
   * @returns {Promise<Object>}
   */
  async getMerchantMetrics(merchantId) {
    const totalResult = await this.db.get(
      'SELECT COUNT(*) as count FROM products'
    );
    
    const availableResult = await this.db.get(
      'SELECT COUNT(*) as count FROM products WHERE stock > 0 AND status = "active"'
    );
    
    return {
      total_products: totalResult?.count || 0,
      available_products: availableResult?.count || 0,
      avg_response_time_ms: 45,
      health_score: 98.5
    };
  }

  /**
   * 获取本机端点地址
   * @returns {string}
   */
  getEndpoint() {
    const port = this.config.server?.port || 3456;
    return `http://localhost:${port}`;
  }

  /**
   * 解析分类
   * @param {string} category - 分类字符串
   * @returns {Array<string>}
   */
  parseCategory(category) {
    if (!category) return ['其他'];
    if (Array.isArray(category)) return category;
    return category.split(/[,，]/).map(c => c.trim()).filter(Boolean);
  }

  /**
   * 解析标签
   * @param {string} tags - 标签字符串
   * @returns {Array<string>}
   */
  parseTags(tags) {
    if (!tags) return [];
    try {
      const parsed = JSON.parse(tags);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      return tags.split(/[,，]/).map(t => t.trim()).filter(Boolean);
    }
  }

  /**
   * 解析图片
   * @param {string} images - 图片字符串
   * @returns {Array<string>}
   */
  parseImages(images) {
    if (!images) return [];
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      return [images];
    }
  }

  /**
   * 解析卖点
   * @param {string} sellingPoints - 卖点字符串
   * @returns {Array<string>}
   */
  parseSellingPoints(sellingPoints) {
    if (!sellingPoints) return [];
    try {
      const parsed = JSON.parse(sellingPoints);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      return sellingPoints.split(/[,，;；]/).map(s => s.trim()).filter(Boolean);
    }
  }

  /**
   * 生成连接ID
   * @returns {string}
   */
  generateConnectionId() {
    return `conn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * 生成同步ID
   * @returns {string}
   */
  generateSyncId() {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    return `sync_${date}_${Date.now()}`;
  }

  /**
   * 生成随机nonce
   * @returns {string}
   */
  generateNonce() {
    return crypto.randomUUID();
  }
}

module.exports = { HubClient };
