/**
 * 站点管理命令模块
 *
 * 管理商户站点的生成、部署和热更新
 */

const { EventEmitter } = require('events');
const { Logger } = require('../utils/logger');
const { SiteGenerator } = require('../site/generator');
const path = require('path');
const fs = require('fs');
const http = require('http');

class SiteManager extends EventEmitter {
  constructor(db, config = {}) {
    super();
    this.db = db;
    this.config = config;
    this.logger = new Logger('SiteManager');
    this.generator = new SiteGenerator(db, config);
    this.server = null;
    this.watchers = new Map();
    this.isGenerating = false;
  }

  /**
   * 生成站点
   * @param {Object} options - 生成选项
   * @returns {Promise<Object>}
   */
  async generate(options = {}) {
    this.logger.info('开始生成站点...');

    try {
      if (this.isGenerating) {
        return {
          success: false,
          error: '站点生成正在进行中，请稍后再试'
        };
      }

      this.isGenerating = true;
      this.emit('siteGenerating');

      const result = await this.generator.generate(options);

      this.isGenerating = false;

      if (result.success) {
        this.emit('siteGenerated', {
          outputPath: result.outputPath,
          productCount: result.productCount
        });
      }

      return result;

    } catch (error) {
      this.isGenerating = false;
      this.logger.error('生成站点失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 启动站点服务器
   * @param {Object} options - 服务器选项
   * @returns {Promise<Object>}
   */
  async serve(options = {}) {
    const port = options.port || this.config.server?.port || 3456;
    const outputPath = this.generator.outputPath;

    if (!fs.existsSync(outputPath)) {
      this.logger.info('站点尚未生成，先生成站点...');
      const genResult = await this.generate();
      if (!genResult.success) {
        return genResult;
      }
    }

    // 如果服务器已在运行
    if (this.server) {
      return {
        success: true,
        message: '站点服务器已在运行',
        url: `http://localhost:${port}`,
        outputPath: outputPath
      };
    }

    try {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res, outputPath);
      });

      this.server.listen(port, () => {
        this.logger.info(`🌐 站点服务器已启动: http://localhost:${port}`);
      });

      this.emit('serverStarted', { port, outputPath });

      return {
        success: true,
        message: '站点服务器已启动',
        url: `http://localhost:${port}`,
        outputPath: outputPath
      };

    } catch (error) {
      this.logger.error('启动站点服务器失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 停止站点服务器
   * @returns {Promise<Object>}
   */
  async stop() {
    if (!this.server) {
      return {
        success: true,
        message: '站点服务器未运行'
      };
    }

    return new Promise((resolve) => {
      this.server.close(() => {
        this.server = null;
        this.logger.info('站点服务器已停止');
        this.emit('serverStopped');
        resolve({
          success: true,
          message: '站点服务器已停止'
        });
      });
    });
  }

  /**
   * 打开站点（生成并启动）
   * @returns {Promise<Object>}
   */
  async open() {
    // 先生成站点
    const genResult = await this.generate();
    if (!genResult.success) {
      return genResult;
    }

    // 启动服务器
    const serveResult = await this.serve();

    return serveResult;
  }

  /**
   * 启用热更新
   * @returns {Promise<Object>}
   */
  async enableHotReload() {
    this.logger.info('启用热更新...');

    try {
      // 监听商品表变化
      const productWatcher = setInterval(async () => {
        const lastUpdate = await this.db.get(
          'SELECT MAX(updated_at) as last_update FROM products'
        );

        if (lastUpdate?.last_update) {
          const lastUpdateTime = new Date(lastUpdate.last_update).getTime();
          const lastCheck = this.lastProductCheck || 0;

          if (lastUpdateTime > lastCheck) {
            this.logger.info('检测到商品变化，重新生成站点...');
            this.lastProductCheck = Date.now();
            await this.generate({ incremental: true });
          }
        }
      }, 30000); // 每30秒检查一次

      this.watchers.set('products', productWatcher);

      // 监听商户信息变化
      const merchantWatcher = setInterval(async () => {
        const lastUpdate = await this.db.get(
          'SELECT MAX(updated_at) as last_update FROM merchants'
        );

        if (lastUpdate?.last_update) {
          const lastUpdateTime = new Date(lastUpdate.last_update).getTime();
          const lastCheck = this.lastMerchantCheck || 0;

          if (lastUpdateTime > lastCheck) {
            this.logger.info('检测到商户信息变化，重新生成站点...');
            this.lastMerchantCheck = Date.now();
            await this.generate({ incremental: true });
          }
        }
      }, 60000); // 每60秒检查一次

      this.watchers.set('merchant', merchantWatcher);

      this.emit('hotReloadEnabled');

      return {
        success: true,
        message: '热更新已启用',
        watchers: Array.from(this.watchers.keys())
      };

    } catch (error) {
      this.logger.error('启用热更新失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 禁用热更新
   * @returns {Promise<Object>}
   */
  async disableHotReload() {
    this.logger.info('禁用热更新...');

    for (const [name, watcher] of this.watchers) {
      clearInterval(watcher);
      this.logger.debug(`已停止 ${name} 监听器`);
    }

    this.watchers.clear();

    this.emit('hotReloadDisabled');

    return {
      success: true,
      message: '热更新已禁用'
    };
  }

  /**
   * 获取站点状态
   * @returns {Promise<Object>}
   */
  async getStatus() {
    const outputPath = this.generator.outputPath;
    const exists = fs.existsSync(outputPath);

    let stats = null;
    if (exists) {
      const stat = fs.statSync(outputPath);
      stats = {
        createdAt: stat.birthtime,
        modifiedAt: stat.mtime,
        size: stat.size
      };

      // 统计文件数量
      const files = fs.readdirSync(outputPath, { recursive: true });
      stats.fileCount = files.filter(f =>
        fs.statSync(path.join(outputPath, f)).isFile()
      ).length;
    }

    return {
      success: true,
      generated: exists,
      outputPath: outputPath,
      serverRunning: this.server !== null,
      hotReloadEnabled: this.watchers.size > 0,
      isGenerating: this.isGenerating,
      stats: stats,
      activeWatchers: Array.from(this.watchers.keys())
    };
  }

  /**
   * 清理生成的站点
   * @returns {Promise<Object>}
   */
  async clean() {
    try {
      const outputPath = this.generator.outputPath;

      if (fs.existsSync(outputPath)) {
        // 递归删除目录
        this.deleteDirectory(outputPath);
        this.logger.info(`站点已清理: ${outputPath}`);
      }

      return {
        success: true,
        message: '站点已清理'
      };

    } catch (error) {
      this.logger.error('清理站点失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 部署站点（预留接口）
   * @param {string} target - 部署目标
   * @returns {Promise<Object>}
   */
  async deploy(target = 'local') {
    this.logger.info(`部署站点到: ${target}`);

    // 先确保站点已生成
    const status = await this.getStatus();
    if (!status.generated) {
      const genResult = await this.generate();
      if (!genResult.success) {
        return genResult;
      }
    }

    // TODO: 实现各种部署目标
    // - local: 本地启动服务器
    // - vercel: 部署到Vercel
    // - netlify: 部署到Netlify
    // - s3: 部署到AWS S3
    // - ftp: 通过FTP部署

    return {
      success: true,
      message: `站点已准备部署到 ${target}`,
      target: target,
      outputPath: this.generator.outputPath
    };
  }

  /**
   * 优化站点（压缩、缓存等）
   * @returns {Promise<Object>}
   */
  async optimize() {
    this.logger.info('优化站点...');

    try {
      const result = await this.generator.optimize();
      return result;

    } catch (error) {
      this.logger.error('优化站点失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 处理HTTP请求
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {string} basePath - 基础路径
   */
  handleRequest(req, res, basePath) {
    let filePath = path.join(basePath, req.url === '/' ? 'index.html' : req.url);

    // 安全检查：防止目录遍历
    if (!filePath.startsWith(basePath)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    // 如果请求的是目录，尝试找index.html
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      // 尝试SPA路由：返回index.html
      const indexPath = path.join(basePath, 'index.html');
      if (fs.existsSync(indexPath)) {
        filePath = indexPath;
      } else {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
    }

    // 读取文件
    try {
      const content = fs.readFileSync(filePath);
      const ext = path.extname(filePath);
      const contentType = this.getContentType(ext);

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600'
      });
      res.end(content);

    } catch (error) {
      this.logger.error('读取文件失败:', error);
      res.writeHead(500);
      res.end('Internal Server Error');
    }
  }

  /**
   * 获取Content-Type
   * @param {string} ext - 扩展名
   * @returns {string}
   */
  getContentType(ext) {
    const types = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf'
    };
    return types[ext] || 'application/octet-stream';
  }

  /**
   * 递归删除目录
   * @param {string} dirPath - 目录路径
   */
  deleteDirectory(dirPath) {
    if (fs.existsSync(dirPath)) {
      fs.readdirSync(dirPath).forEach((file) => {
        const curPath = path.join(dirPath, file);
        if (fs.lstatSync(curPath).isDirectory()) {
          this.deleteDirectory(curPath);
        } else {
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(dirPath);
    }
  }
}

module.exports = { SiteManager };
