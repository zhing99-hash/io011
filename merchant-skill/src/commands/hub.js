/**
 * HUB连接管理命令模块
 *
 * 管理商户与HUB的连接、同步和通信
 */

const { EventEmitter } = require('events');
const { Logger } = require('../utils/logger');
const { HubClient } = require('../hub/client');

class HubManager extends EventEmitter {
  constructor(db, config = {}) {
    super();
    this.db = db;
    this.config = config;
    this.logger = new Logger('HubManager');
    this.client = new HubClient(db, config);
    this.syncQueue = [];
    this.isSyncing = false;
  }

  /**
   * 连接到HUB
   * @param {Object} data - 连接信息
   * @returns {Promise<Object>}
   */
  async connect(data) {
    this.logger.info(`连接到HUB: ${data.url}`);

    try {
      // 验证必要参数
      if (!data.url || !data.apiKey) {
        return {
          success: false,
          error: '缺少必要参数: url 和 apiKey'
        };
      }

      // 获取商户信息
      const merchant = await this.db.get('SELECT * FROM merchants LIMIT 1');

      const merchantInfo = {
        name: data.merchantName || merchant?.name || this.config.merchant?.name || '未命名商户',
        description: data.description || merchant?.description || this.config.merchant?.description || '',
        email: data.email || merchant?.email || this.config.merchant?.contact?.email || '',
        phone: data.phone || merchant?.phone || this.config.merchant?.contact?.phone || '',
        categories: data.categories || [],
        hubName: data.name || '未命名HUB'
      };

      // 调用客户端注册
      const result = await this.client.register(data.url, data.apiKey, merchantInfo);

      if (result.success) {
        this.emit('hubConnected', {
          connectionId: result.connectionId,
          hubUrl: data.url
        });

        // 如果设置了自动同步，立即执行一次全量同步
        if (data.autoSync !== false) {
          setTimeout(() => {
            this.syncAll(result.connectionId);
          }, 1000);
        }
      }

      return result;

    } catch (error) {
      this.logger.error('连接HUB失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 断开HUB连接
   * @param {string} hubId - HUB连接ID
   * @returns {Promise<Object>}
   */
  async disconnect(hubId) {
    this.logger.info(`断开HUB连接: ${hubId}`);

    const result = await this.client.disconnect(hubId);

    if (result.success) {
      this.emit('hubDisconnected', { hubId });
    }

    return result;
  }

  /**
   * 删除HUB连接
   * @param {string} hubId - HUB连接ID
   * @returns {Promise<Object>}
   */
  async delete(hubId) {
    this.logger.info(`删除HUB连接: ${hubId}`);

    const result = await this.client.deleteConnection(hubId);

    if (result.success) {
      this.emit('hubDeleted', { hubId });
    }

    return result;
  }

  /**
   * 列出所有HUB连接
   * @returns {Promise<Object>}
   */
  async list() {
    try {
      const connections = await this.client.getAllConnections();

      // 获取每个连接的最新同步日志
      const connectionsWithStats = await Promise.all(
        connections.map(async (conn) => {
          const lastSync = await this.db.get(
            `SELECT * FROM sync_logs WHERE hub_id = ? ORDER BY created_at DESC LIMIT 1`,
            [conn.id]
          );

          const syncCount = await this.db.get(
            `SELECT COUNT(*) as count FROM sync_logs WHERE hub_id = ? AND status = 'success'`,
            [conn.id]
          );

          return {
            ...conn,
            lastSyncStatus: lastSync?.status || 'unknown',
            lastSyncTime: lastSync?.created_at || null,
            totalSyncs: syncCount?.count || 0
          };
        })
      );

      return {
        success: true,
        connections: connectionsWithStats,
        count: connections.length
      };

    } catch (error) {
      this.logger.error('列出HUB连接失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取单个HUB连接详情
   * @param {string} hubId - HUB连接ID
   * @returns {Promise<Object>}
   */
  async get(hubId) {
    try {
      const connection = await this.client.getConnection(hubId);

      if (!connection) {
        return {
          success: false,
          error: 'HUB连接不存在'
        };
      }

      // 获取同步历史
      const syncHistory = await this.db.all(
        `SELECT * FROM sync_logs WHERE hub_id = ? ORDER BY created_at DESC LIMIT 20`,
        [hubId]
      );

      return {
        success: true,
        connection: connection,
        syncHistory: syncHistory
      };

    } catch (error) {
      this.logger.error('获取HUB连接失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 同步所有商品到指定HUB或所有HUB
   * @param {string} hubId - HUB连接ID（可选，默认所有）
   * @returns {Promise<Object>}
   */
  async syncAll(hubId = null) {
    this.logger.info(`开始同步商品到HUB: ${hubId || '所有HUB'}`);

    try {
      // 获取所有需要同步的商品
      const products = await this.db.all(
        'SELECT * FROM products WHERE status = "active"'
      );

      if (products.length === 0) {
        return {
          success: true,
          message: '没有需要同步的商品',
          synced: 0
        };
      }

      // 调用客户端同步
      const result = await this.client.syncProducts(products, hubId);

      if (result.success) {
        this.emit('productsSynced', {
          hubId: hubId,
          productCount: products.length,
          syncId: result.syncId
        });
      }

      return {
        success: result.success,
        syncId: result.syncId,
        results: result.results,
        summary: {
          totalProducts: products.length,
          totalHubs: result.totalHubs,
          successHubs: result.successHubs
        }
      };

    } catch (error) {
      this.logger.error('同步商品失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 同步单个商品到HUB
   * @param {Object} product - 商品数据
   * @returns {Promise<Object>}
   */
  async syncProduct(product) {
    return this.syncAll(null);
  }

  /**
   * 发送心跳到HUB
   * @param {string} hubId - HUB连接ID（可选）
   * @returns {Promise<Object>}
   */
  async sendHeartbeat(hubId = null) {
    this.logger.debug('发送心跳...');

    const result = await this.client.sendHeartbeat(hubId);

    if (result.success) {
      this.emit('heartbeatSent', {
        timestamp: result.timestamp,
        results: result.results
      });
    }

    return result;
  }

  /**
   * 批量发送心跳（定时任务调用）
   * @returns {Promise<Object>}
   */
  async sendHeartbeats() {
    return this.sendHeartbeat(null);
  }

  /**
   * 检查同步状态
   * @returns {Promise<Object>}
   */
  async checkSyncStatus() {
    try {
      const connections = await this.client.getActiveConnections();
      const results = [];

      for (const conn of connections) {
        // 检查最后同步时间
        const lastSync = await this.db.get(
          `SELECT * FROM sync_logs
           WHERE hub_id = ? AND status = 'success'
           ORDER BY created_at DESC LIMIT 1`,
          [conn.id]
        );

        const needsSync = !lastSync ||
          (new Date() - new Date(lastSync.created_at)) > 3600000; // 1小时

        results.push({
          hubId: conn.id,
          hubName: conn.name,
          lastSyncAt: lastSync?.created_at || null,
          needsSync: needsSync,
          status: needsSync ? '需要同步' : '已同步'
        });
      }

      return {
        success: true,
        connections: results
      };

    } catch (error) {
      this.logger.error('检查同步状态失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 更新HUB连接设置
   * @param {string} hubId - HUB连接ID
   * @param {Object} settings - 设置项
   * @returns {Promise<Object>}
   */
  async updateSettings(hubId, settings) {
    try {
      const updates = [];
      const values = [];

      if (settings.name !== undefined) {
        updates.push('name = ?');
        values.push(settings.name);
      }

      if (settings.autoSync !== undefined) {
        updates.push('auto_sync = ?');
        values.push(settings.autoSync ? 1 : 0);
      }

      if (updates.length === 0) {
        return {
          success: false,
          error: '没有要更新的设置'
        };
      }

      values.push(hubId);

      await this.db.run(
        `UPDATE hub_connections SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      return {
        success: true,
        message: '设置已更新'
      };

    } catch (error) {
      this.logger.error('更新HUB设置失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取同步日志
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>}
   */
  async getSyncLogs(options = {}) {
    try {
      const { hubId = null, limit = 50, offset = 0 } = options;

      let sql = 'SELECT * FROM sync_logs WHERE 1=1';
      const params = [];

      if (hubId) {
        sql += ' AND hub_id = ?';
        params.push(hubId);
      }

      sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const logs = await this.db.all(sql, params);

      // 获取总数
      let countSql = 'SELECT COUNT(*) as total FROM sync_logs WHERE 1=1';
      const countParams = [];

      if (hubId) {
        countSql += ' AND hub_id = ?';
        countParams.push(hubId);
      }

      const countResult = await this.db.get(countSql, countParams);

      return {
        success: true,
        logs: logs,
        pagination: {
          limit,
          offset,
          total: countResult?.total || 0
        }
      };

    } catch (error) {
      this.logger.error('获取同步日志失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 测试HUB连接
   * @param {string} hubId - HUB连接ID
   * @returns {Promise<Object>}
   */
  async testConnection(hubId) {
    try {
      const conn = await this.client.getConnection(hubId);

      if (!conn) {
        return {
          success: false,
          error: 'HUB连接不存在'
        };
      }

      // 发送心跳测试连接
      const heartbeatResult = await this.client.sendHeartbeat(hubId);

      return {
        success: heartbeatResult.success,
        hubUrl: conn.url,
        testResult: heartbeatResult
      };

    } catch (error) {
      this.logger.error('测试HUB连接失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 同步到指定HUB（兼容旧接口）
   * @param {string} hubId - HUB连接ID
   * @returns {Promise<Object>}
   */
  async syncToHub(hubId = null) {
    return this.syncAll(hubId);
  }
}

module.exports = { HubManager };
