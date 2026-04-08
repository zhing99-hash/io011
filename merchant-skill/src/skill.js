/**
 * AICart Merchant Skill - 核心类
 * 
 * 商户端AI助手主控制器
 */

const { EventEmitter } = require('events');
const { ProductManager } = require('./commands/product');
const { HubManager } = require('./commands/hub');
const { SiteManager } = require('./commands/site');
const { AnalyticsManager } = require('./commands/analytics');
const { DatabaseManager } = require('./utils/database');
const { Logger } = require('./utils/logger');

class MerchantSkill extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.logger = new Logger('Skill');
    this.db = null;
    this.managers = {};
    this.isRunning = false;
  }

  /**
   * 启动Skill
   */
  async start() {
    if (this.isRunning) {
      this.logger.warn('Skill已经在运行中');
      return;
    }

    try {
      // 初始化数据库
      await this.initDatabase();
      
      // 初始化管理器
      await this.initManagers();
      
      // 启动定时任务
      this.startScheduledTasks();
      
      // 启动HTTP服务（用于HUB回调）
      await this.startHttpServer();
      
      this.isRunning = true;
      this.emit('started');
      
      this.logger.info('✅ Skill启动完成');
      
    } catch (error) {
      this.logger.error('Skill启动失败:', error);
      throw error;
    }
  }

  /**
   * 停止Skill
   */
  async stop() {
    if (!this.isRunning) return;
    
    this.logger.info('正在停止Skill...');
    
    // 关闭HTTP服务器
    if (this.httpServer) {
      this.httpServer.close();
    }
    
    // 关闭数据库
    if (this.db) {
      this.db.close();
    }
    
    this.isRunning = false;
    this.emit('stopped');
    
    this.logger.info('Skill已停止');
  }

  /**
   * 初始化数据库
   */
  async initDatabase() {
    this.logger.info('📦 初始化数据库...');
    
    this.db = new DatabaseManager();
    await this.db.connect();
    
    // 创建表结构
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS merchants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        email TEXT,
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        merchant_id TEXT,
        sku TEXT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL,
        stock INTEGER DEFAULT 0,
        images TEXT,
        category TEXT,
        tags TEXT,
        status TEXT DEFAULT 'active',
        ai_metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS hub_connections (
        id TEXT PRIMARY KEY,
        merchant_id TEXT,
        name TEXT,
        url TEXT,
        api_key TEXT,
        is_active BOOLEAN DEFAULT 1,
        last_sync DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS sync_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hub_id TEXT,
        product_id TEXT,
        action TEXT,
        status TEXT,
        message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    this.logger.info('✅ 数据库初始化完成');
  }

  /**
   * 初始化管理器
   */
  async initManagers() {
    this.logger.info('🔧 初始化管理器...');
    
    this.managers.product = new ProductManager(this.db, this.config);
    this.managers.hub = new HubManager(this.db, this.config);
    this.managers.site = new SiteManager(this.db, this.config);
    this.managers.analytics = new AnalyticsManager(this.db, this.config);
    
    // 监听事件
    this.managers.product.on('productAdded', (product) => {
      this.emit('productAdded', product);
      // 自动同步到HUB
      this.managers.hub.syncProduct(product);
    });
    
    this.logger.info('✅ 管理器初始化完成');
  }

  /**
   * 启动定时任务
   */
  startScheduledTasks() {
    const cron = require('node-cron');
    
    // 每5分钟发送心跳
    cron.schedule('*/5 * * * *', async () => {
      this.logger.debug('执行定时任务: 心跳上报');
      await this.managers.hub.sendHeartbeats();
    });
    
    // 每小时检查同步状态
    cron.schedule('0 * * * *', async () => {
      this.logger.debug('执行定时任务: 同步检查');
      await this.managers.hub.checkSyncStatus();
    });
    
    // 每天优化站点
    cron.schedule('0 2 * * *', async () => {
      this.logger.info('执行定时任务: 站点优化');
      await this.managers.site.optimize();
    });
    
    this.logger.info('⏰ 定时任务已启动');
  }

  /**
   * 启动HTTP服务
   */
  async startHttpServer() {
    const express = require('express');
    const cors = require('cors');
    const helmet = require('helmet');
    const compression = require('compression');
    const path = require('path');
    
    const app = express();
    const port = this.config.server?.port || 3456;
    
    // 中间件
    app.use(helmet({
      contentSecurityPolicy: false  // 允许加载外部字体
    }));
    app.use(cors());
    app.use(compression());
    app.use(express.json());
    
    // 静态文件服务（店铺前台UI）
    app.use(express.static(path.join(__dirname, '../public')));
    
    // API: 获取商户信息和商品（供前端调用）
    app.get('/api/merchant/info', async (req, res) => {
      try {
        // 获取商户信息
        const merchant = await this.db.get(
          'SELECT * FROM merchants ORDER BY created_at DESC LIMIT 1'
        );
        
        // 获取商品列表
        const products = await this.db.all(
          'SELECT * FROM products WHERE status = ? ORDER BY created_at DESC',
          ['active']
        );
        
        res.json({
          success: true,
          merchant: merchant ? {
            name: merchant.name,
            description: merchant.description,
            contact: {
              email: merchant.email,
              phone: merchant.phone
            },
            tags: merchant.tags ? JSON.parse(merchant.tags) : {}
          } : {
            name: this.config.merchant?.name || '未命名商户',
            description: this.config.merchant?.description || '暂无描述',
            contact: this.config.merchant?.contact || {},
            tags: {
              categories: this.config.merchant?.tags?.categories || [],
              capabilities: this.config.merchant?.tags?.capabilities || [],
              location: this.config.merchant?.tags?.location || ''
            }
          },
          products: products.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: p.price,
            stock: p.stock,
            category: p.category,
            image: p.images ? JSON.parse(p.images)[0] : null
          }))
        });
      } catch (error) {
        this.logger.error('获取商户信息失败:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });
    
    // 根路由 - 返回店铺首页
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });
    
    // HUB回调路由
    app.post('/hub/webhook/:hubId', async (req, res) => {
      try {
        const { hubId } = req.params;
        const event = req.body;
        
        this.logger.info(`收到HUB ${hubId} 的Webhook:`, event.type);
        
        // 处理事件
        await this.handleHubWebhook(hubId, event);
        
        res.json({ success: true });
      } catch (error) {
        this.logger.error('处理Webhook失败:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    // 查询接口（HUB调用）
    app.post('/api/v1/query', async (req, res) => {
      try {
        const result = await this.handleQuery(req.body);
        res.json(result);
      } catch (error) {
        this.logger.error('处理查询失败:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    // 健康检查
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', version: '0.1.0', type: 'merchant' });
    });
    
    // 启动服务器
    this.httpServer = app.listen(port, () => {
      this.logger.info(`🌐 HTTP服务已启动: http://localhost:${port}`);
      this.logger.info(`🏪 店铺前台: http://localhost:${port}/`);
    });
  }

  /**
   * 处理HUB Webhook
   */
  async handleHubWebhook(hubId, event) {
    switch (event.type) {
      case 'order.created':
        // 处理订单创建（预留）
        this.emit('orderCreated', { hubId, order: event.data });
        break;
        
      case 'sync.request':
        // HUB请求同步
        await this.managers.hub.syncToHub(hubId);
        break;
        
      default:
        this.logger.warn(`未知的Webhook类型: ${event.type}`);
    }
  }

  /**
   * 处理查询请求
   */
  async handleQuery(query) {
    this.logger.info('处理查询请求:', query.keywords);
    
    // 查询商品
    const products = await this.managers.product.search(query);
    
    return {
      success: true,
      data: {
        products,
        total: products.length
      }
    };
  }

  // ========== 命令接口 ==========

  /**
   * 设置商户信息
   */
  async setupMerchant(data) {
    return this.managers.product.setupMerchant(data);
  }

  /**
   * 添加商品
   */
  async addProduct(data) {
    return this.managers.product.add(data);
  }

  /**
   * 列出商品
   */
  async listProducts(options = {}) {
    return this.managers.product.list(options);
  }

  /**
   * 连接HUB
   */
  async connectHub(data) {
    return this.managers.hub.connect(data);
  }

  /**
   * 同步到HUB
   */
  async syncToHub(hubId = null) {
    return this.managers.hub.syncAll(hubId);
  }

  /**
   * 生成/打开站点
   */
  async openSite() {
    return this.managers.site.open();
  }

  /**
   * 获取统计数据
   */
  async getAnalytics() {
    return this.managers.analytics.getDashboard();
  }
}

module.exports = { MerchantSkill };
