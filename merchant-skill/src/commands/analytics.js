/**
 * 统计分析命令模块
 * 
 * 提供销售统计、商品分析、流量查看等功能
 */

const { EventEmitter } = require('events');
const { Logger } = require('../utils/logger');

class AnalyticsManager extends EventEmitter {
  constructor(db, config = {}) {
    super();
    this.db = db;
    this.config = config;
    this.logger = new Logger('AnalyticsManager');
  }

  /**
   * 获取数据仪表盘
   * @returns {Promise<Object>} 仪表盘数据
   */
  async getDashboard() {
    this.logger.info('获取数据仪表盘...');
    
    try {
      // 并行获取各项统计数据
      const [
        overview,
        categoryStats,
        priceDistribution,
        stockStats,
        recentActivity,
        hubStats
      ] = await Promise.all([
        this.getOverviewStats(),
        this.getCategoryStats(),
        this.getPriceDistribution(),
        this.getStockStats(),
        this.getRecentActivity(),
        this.getHubStats()
      ]);
      
      return {
        success: true,
        data: {
          overview,
          categoryStats,
          priceDistribution,
          stockStats,
          recentActivity,
          hubStats,
          generatedAt: new Date().toISOString()
        }
      };
      
    } catch (error) {
      this.logger.error('获取仪表盘失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取概览统计
   * @returns {Promise<Object>}
   */
  async getOverviewStats() {
    // 商品统计
    const productStats = await this.db.get(`
      SELECT 
        COUNT(*) as total_products,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_products,
        SUM(CASE WHEN stock > 0 AND status = 'active' THEN 1 ELSE 0 END) as in_stock_products,
        SUM(CASE WHEN stock = 0 AND status = 'active' THEN 1 ELSE 0 END) as out_of_stock_products,
        SUM(CASE WHEN status = 'deleted' THEN 1 ELSE 0 END) as deleted_products,
        AVG(price) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price,
        SUM(stock) as total_stock,
        SUM(price * stock) as inventory_value
      FROM products
    `);
    
    // 商户信息
    const merchant = await this.db.get('SELECT * FROM merchants LIMIT 1');
    
    // HUB连接统计
    const hubStats = await this.db.get(`
      SELECT 
        COUNT(*) as total_hubs,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_hubs
      FROM hub_connections
    `);
    
    // 计算商品价值分布
    const valueRanges = await this.db.all(`
      SELECT 
        CASE 
          WHEN price < 50 THEN '0-50'
          WHEN price < 100 THEN '50-100'
          WHEN price < 200 THEN '100-200'
          WHEN price < 500 THEN '200-500'
          WHEN price < 1000 THEN '500-1000'
          ELSE '1000+'
        END as price_range,
        COUNT(*) as count
      FROM products
      WHERE status = 'active'
      GROUP BY price_range
      ORDER BY MIN(price)
    `);
    
    return {
      products: {
        total: productStats?.total_products || 0,
        active: productStats?.active_products || 0,
        inStock: productStats?.in_stock_products || 0,
        outOfStock: productStats?.out_of_stock_products || 0,
        deleted: productStats?.deleted_products || 0
      },
      pricing: {
        average: parseFloat(productStats?.avg_price || 0).toFixed(2),
        minimum: parseFloat(productStats?.min_price || 0).toFixed(2),
        maximum: parseFloat(productStats?.max_price || 0).toFixed(2),
        inventoryValue: parseFloat(productStats?.inventory_value || 0).toFixed(2)
      },
      inventory: {
        totalStock: productStats?.total_stock || 0,
        valueRanges: valueRanges
      },
      hubs: {
        total: hubStats?.total_hubs || 0,
        active: hubStats?.active_hubs || 0
      },
      merchant: merchant ? {
        name: merchant.name,
        createdAt: merchant.created_at,
        updatedAt: merchant.updated_at
      } : null
    };
  }

  /**
   * 获取分类统计
   * @returns {Promise<Array>}
   */
  async getCategoryStats() {
    const stats = await this.db.all(`
      SELECT 
        category,
        COUNT(*) as product_count,
        SUM(stock) as total_stock,
        AVG(price) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price,
        SUM(price * stock) as category_value
      FROM products
      WHERE status = 'active'
      GROUP BY category
      ORDER BY product_count DESC
    `);
    
    return stats.map(s => ({
      category: s.category,
      productCount: s.product_count,
      totalStock: s.total_stock,
      averagePrice: parseFloat(s.avg_price).toFixed(2),
      priceRange: `¥${parseFloat(s.min_price).toFixed(2)} - ¥${parseFloat(s.max_price).toFixed(2)}`,
      categoryValue: parseFloat(s.category_value).toFixed(2)
    }));
  }

  /**
   * 获取价格分布
   * @returns {Promise<Object>}
   */
  async getPriceDistribution() {
    const distribution = await this.db.all(`
      SELECT 
        CASE 
          WHEN price < 50 THEN '0-50'
          WHEN price < 100 THEN '50-100'
          WHEN price < 200 THEN '100-200'
          WHEN price < 500 THEN '200-500'
          WHEN price < 1000 THEN '500-1000'
          ELSE '1000+'
        END as range,
        COUNT(*) as count,
        AVG(price) as avg_price
      FROM products
      WHERE status = 'active'
      GROUP BY range
      ORDER BY MIN(price)
    `);
    
    return {
      distribution: distribution.map(d => ({
        range: d.range,
        count: d.count,
        averagePrice: parseFloat(d.avg_price).toFixed(2)
      })),
      totalRanges: distribution.length
    };
  }

  /**
   * 获取库存统计
   * @returns {Promise<Object>}
   */
  async getStockStats() {
    // 库存状态分布
    const stockDistribution = await this.db.all(`
      SELECT 
        CASE 
          WHEN stock = 0 THEN 'out_of_stock'
          WHEN stock < 10 THEN 'low_stock'
          WHEN stock < 50 THEN 'medium_stock'
          ELSE 'high_stock'
        END as stock_status,
        COUNT(*) as count,
        SUM(stock) as total_stock
      FROM products
      WHERE status = 'active'
      GROUP BY stock_status
    `);
    
    // 低库存商品
    const lowStockProducts = await this.db.all(`
      SELECT 
        id,
        name,
        category,
        stock,
        price
      FROM products
      WHERE status = 'active' AND stock > 0 AND stock < 10
      ORDER BY stock ASC
      LIMIT 10
    `);
    
    // 缺货商品
    const outOfStockProducts = await this.db.all(`
      SELECT 
        id,
        name,
        category,
        stock,
        price
      FROM products
      WHERE status = 'active' AND stock = 0
      ORDER BY updated_at DESC
      LIMIT 10
    `);
    
    return {
      distribution: stockDistribution.map(d => ({
        status: d.stock_status,
        label: this.getStockStatusLabel(d.stock_status),
        count: d.count,
        totalStock: d.total_stock
      })),
      lowStock: {
        count: lowStockProducts.length,
        products: lowStockProducts.map(p => ({
          id: p.id,
          name: p.name,
          category: p.category,
          stock: p.stock,
          price: parseFloat(p.price).toFixed(2)
        }))
      },
      outOfStock: {
        count: outOfStockProducts.length,
        products: outOfStockProducts.map(p => ({
          id: p.id,
          name: p.name,
          category: p.category,
          price: parseFloat(p.price).toFixed(2)
        }))
      }
    };
  }

  /**
   * 获取最近活动
   * @returns {Promise<Object>}
   */
  async getRecentActivity() {
    // 最近添加的商品
    const recentProducts = await this.db.all(`
      SELECT 
        id,
        name,
        category,
        price,
        created_at
      FROM products
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    // 最近更新的商品
    const recentlyUpdated = await this.db.all(`
      SELECT 
        id,
        name,
        category,
        price,
        updated_at
      FROM products
      WHERE updated_at != created_at
      ORDER BY updated_at DESC
      LIMIT 10
    `);
    
    // 最近的同步活动
    const recentSyncs = await this.db.all(`
      SELECT 
        hub_id,
        action,
        status,
        message,
        created_at
      FROM sync_logs
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    return {
      recentProducts: recentProducts.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: parseFloat(p.price).toFixed(2),
        createdAt: p.created_at
      })),
      recentlyUpdated: recentlyUpdated.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: parseFloat(p.price).toFixed(2),
        updatedAt: p.updated_at
      })),
      recentSyncs: recentSyncs.map(s => ({
        hubId: s.hub_id,
        action: s.action,
        status: s.status,
        message: s.message,
        createdAt: s.created_at
      }))
    };
  }

  /**
   * 获取HUB统计
   * @returns {Promise<Object>}
   */
  async getHubStats() {
    const connections = await this.db.all(`
      SELECT 
        id,
        name,
        url,
        is_active,
        last_sync,
        created_at
      FROM hub_connections
      ORDER BY created_at DESC
    `);
    
    // 每个HUB的同步统计
    const hubStats = await Promise.all(
      connections.map(async (conn) => {
        const syncStats = await this.db.get(`
          SELECT 
            COUNT(*) as total_syncs,
            SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_syncs,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_syncs
          FROM sync_logs
          WHERE hub_id = ?
        `, [conn.id]);
        
        return {
          id: conn.id,
          name: conn.name,
          url: conn.url,
          isActive: conn.is_active === 1,
          lastSync: conn.last_sync,
          createdAt: conn.created_at,
          syncStats: {
            total: syncStats?.total_syncs || 0,
            successful: syncStats?.successful_syncs || 0,
            failed: syncStats?.failed_syncs || 0,
            successRate: syncStats?.total_syncs > 0 
              ? ((syncStats.successful_syncs / syncStats.total_syncs) * 100).toFixed(1) 
              : 0
          }
        };
      })
    );
    
    return {
      total: connections.length,
      active: connections.filter(c => c.is_active === 1).length,
      inactive: connections.filter(c => c.is_active !== 1).length,
      connections: hubStats
    };
  }

  /**
   * 生成销售报告
   * @param {Object} options - 报告选项
   * @returns {Promise<Object>}
   */
  async generateReport(options = {}) {
    const { startDate, endDate, format = 'json' } = options;
    
    this.logger.info('生成统计报告...');
    
    try {
      const dashboard = await this.getDashboard();
      
      if (!dashboard.success) {
        return dashboard;
      }
      
      const report = {
        title: 'AICart 商户统计报告',
        generatedAt: new Date().toISOString(),
        period: {
          start: startDate || '全部时间',
          end: endDate || new Date().toISOString()
        },
        ...dashboard.data
      };
      
      if (format === 'html') {
        return {
          success: true,
          format: 'html',
          content: this.renderHTMLReport(report)
        };
      }
      
      return {
        success: true,
        format: 'json',
        data: report
      };
      
    } catch (error) {
      this.logger.error('生成报告失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 导出数据
   * @param {string} format - 导出格式
   * @returns {Promise<Object>}
   */
  async exportData(format = 'json') {
    this.logger.info(`导出数据为 ${format} 格式...`);
    
    try {
      const dashboard = await this.getDashboard();
      
      if (!dashboard.success) {
        return dashboard;
      }
      
      if (format === 'csv') {
        // 生成CSV格式的商品数据
        const products = await this.db.all(`
          SELECT 
            id,
            name,
            category,
            subCategory,
            price,
            stock,
            brand,
            status,
            created_at,
            updated_at
          FROM products
          ORDER BY created_at DESC
        `);
        
        const csv = this.convertToCSV(products);
        
        return {
          success: true,
          format: 'csv',
          filename: `products-export-${Date.now()}.csv`,
          content: csv
        };
      }
      
      return {
        success: true,
        format: 'json',
        filename: `analytics-export-${Date.now()}.json`,
        data: dashboard.data
      };
      
    } catch (error) {
      this.logger.error('导出数据失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取趋势数据
   * @param {string} metric - 指标类型
   * @param {number} days - 天数
   * @returns {Promise<Object>}
   */
  async getTrends(metric = 'products', days = 30) {
    this.logger.info(`获取 ${metric} 趋势数据...`);
    
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      if (metric === 'products') {
        // 按日期统计新增商品
        const trends = await this.db.all(`
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as count
          FROM products
          WHERE created_at >= ?
          GROUP BY DATE(created_at)
          ORDER BY date
        `, [startDate.toISOString()]);
        
        return {
          success: true,
          metric: 'products',
          period: `${days}天`,
          data: trends.map(t => ({
            date: t.date,
            count: t.count
          }))
        };
      }
      
      return {
        success: true,
        metric: metric,
        data: []
      };
      
    } catch (error) {
      this.logger.error('获取趋势数据失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取库存状态标签
   * @param {string} status - 状态码
   * @returns {string}
   */
  getStockStatusLabel(status) {
    const labels = {
      'out_of_stock': '缺货',
      'low_stock': '库存紧张',
      'medium_stock': '库存适中',
      'high_stock': '库存充足'
    };
    return labels[status] || status;
  }

  /**
   * 渲染HTML报告
   * @param {Object} report - 报告数据
   * @returns {string} HTML内容
   */
  renderHTMLReport(report) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${report.title}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; border-bottom: 2px solid #4a90e2; padding-bottom: 10px; }
    h2 { color: #666; margin-top: 30px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
    .stat-card { background: #f5f5f5; padding: 20px; border-radius: 8px; }
    .stat-value { font-size: 2rem; font-weight: bold; color: #4a90e2; }
    .stat-label { color: #666; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; font-weight: bold; }
    .status-success { color: #52c41a; }
    .status-failed { color: #f5222d; }
  </style>
</head>
<body>
  <h1>${report.title}</h1>
  <p>生成时间: ${new Date(report.generatedAt).toLocaleString('zh-CN')}</p>
  
  <h2>商品概览</h2>
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value">${report.overview.products.total}</div>
      <div class="stat-label">商品总数</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${report.overview.products.active}</div>
      <div class="stat-label">在售商品</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${report.overview.pricing.average}</div>
      <div class="stat-label">平均价格</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${report.overview.hubs.active}/${report.overview.hubs.total}</div>
      <div class="stat-label">活跃HUB</div>
    </div>
  </div>
  
  <h2>分类统计</h2>
  <table>
    <tr><th>分类</th><th>商品数</th><th>平均价格</th><th>总价值</th></tr>
    ${report.categoryStats.map(c => `
      <tr>
        <td>${c.category}</td>
        <td>${c.productCount}</td>
        <td>¥${c.averagePrice}</td>
        <td>¥${c.categoryValue}</td>
      </tr>
    `).join('')}
  </table>
</body>
</html>`;
  }

  /**
   * 转换为CSV格式
   * @param {Array} data - 数据
   * @returns {string} CSV内容
   */
  convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const rows = data.map(row => 
      headers.map(h => {
        const value = row[h];
        // 处理包含逗号或引号的值
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );
    
    return [headers.join(','), ...rows].join('\\n');
  }
}

module.exports = { AnalyticsManager };
