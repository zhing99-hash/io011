/**
 * 商户设置命令模块
 * 
 * 管理商户基本信息和配置
 */

const { Logger } = require('../utils/logger');

class MerchantManager {
  constructor(db, config = {}) {
    this.db = db;
    this.config = config;
    this.logger = new Logger('MerchantManager');
  }

  /**
   * 初始化商户（首次设置）
   * @param {Object} data - 商户信息
   * @returns {Promise<Object>}
   */
  async init(data) {
    this.logger.info('初始化商户设置...');
    
    try {
      // 检查是否已有商户
      const existing = await this.db.get('SELECT * FROM merchants LIMIT 1');
      
      if (existing) {
        return {
          success: false,
          error: '商户已存在，请使用 update 命令更新信息',
          merchantId: existing.id
        };
      }
      
      // 生成商户ID
      const merchantId = this.generateMerchantId();
      const now = new Date().toISOString();
      
      // 构建商户数据
      const merchantData = {
        id: merchantId,
        name: data.name,
        description: data.description || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        logo: data.logo || '',
        website: data.website || '',
        business_hours: data.businessHours || '',
        social_media: JSON.stringify(data.socialMedia || {}),
        settings: JSON.stringify(data.settings || {}),
        created_at: now,
        updated_at: now
      };
      
      // 插入数据库
      const fields = Object.keys(merchantData);
      const placeholders = fields.map(() => '?').join(',');
      
      await this.db.run(
        `INSERT INTO merchants (${fields.join(',')}) VALUES (${placeholders})`,
        Object.values(merchantData)
      );
      
      this.logger.info(`商户初始化成功: ${merchantId}`);
      
      return {
        success: true,
        merchantId: merchantId,
        message: '商户初始化成功',
        data: this.parseMerchantData(merchantData)
      };
      
    } catch (error) {
      this.logger.error('商户初始化失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取商户信息
   * @returns {Promise<Object>}
   */
  async getInfo() {
    try {
      const merchant = await this.db.get('SELECT * FROM merchants LIMIT 1');
      
      if (!merchant) {
        return {
          success: false,
          error: '商户尚未设置，请先运行 init 命令'
        };
      }
      
      return {
        success: true,
        data: this.parseMerchantData(merchant)
      };
      
    } catch (error) {
      this.logger.error('获取商户信息失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 更新商户信息
   * @param {Object} data - 更新的数据
   * @returns {Promise<Object>}
   */
  async update(data) {
    this.logger.info('更新商户信息...');
    
    try {
      // 获取现有商户
      const existing = await this.db.get('SELECT * FROM merchants LIMIT 1');
      
      if (!existing) {
        return {
          success: false,
          error: '商户尚未设置，请先运行 init 命令'
        };
      }
      
      // 构建更新字段
      const allowedFields = {
        name: data.name,
        description: data.description,
        email: data.email,
        phone: data.phone,
        address: data.address,
        logo: data.logo,
        website: data.website,
        business_hours: data.businessHours
      };
      
      const updates = [];
      const values = [];
      
      for (const [dbField, value] of Object.entries(allowedFields)) {
        if (value !== undefined) {
          updates.push(`${dbField} = ?`);
          values.push(value);
        }
      }
      
      // 处理JSON字段
      if (data.socialMedia !== undefined) {
        updates.push('social_media = ?');
        values.push(JSON.stringify(data.socialMedia));
      }
      
      if (data.settings !== undefined) {
        updates.push('settings = ?');
        values.push(JSON.stringify(data.settings));
      }
      
      if (updates.length === 0) {
        return {
          success: false,
          error: '没有要更新的字段'
        };
      }
      
      // 添加更新时间
      updates.push('updated_at = ?');
      values.push(new Date().toISOString());
      
      // 添加商户ID
      values.push(existing.id);
      
      await this.db.run(
        `UPDATE merchants SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
      
      this.logger.info(`商户信息更新成功: ${existing.id}`);
      
      // 获取更新后的数据
      const updated = await this.db.get(
        'SELECT * FROM merchants WHERE id = ?',
        [existing.id]
      );
      
      return {
        success: true,
        message: '商户信息更新成功',
        data: this.parseMerchantData(updated)
      };
      
    } catch (error) {
      this.logger.error('更新商户信息失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 删除商户（危险操作）
   * @param {boolean} confirm - 确认删除
   * @returns {Promise<Object>}
   */
  async delete(confirm = false) {
    if (!confirm) {
      return {
        success: false,
        error: '请确认删除操作，这将删除所有商户数据',
        warning: '此操作不可恢复，所有商品和设置将被删除'
      };
    }
    
    try {
      // 删除商户
      await this.db.run('DELETE FROM merchants');
      
      // 可选：清空所有相关数据
      // await this.db.run('DELETE FROM products');
      // await this.db.run('DELETE FROM hub_connections');
      
      this.logger.warn('商户数据已删除');
      
      return {
        success: true,
        message: '商户数据已删除'
      };
      
    } catch (error) {
      this.logger.error('删除商户失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 更新商户设置
   * @param {Object} settings - 设置项
   * @returns {Promise<Object>}
   */
  async updateSettings(settings) {
    try {
      const merchant = await this.db.get('SELECT * FROM merchants LIMIT 1');
      
      if (!merchant) {
        return {
          success: false,
          error: '商户尚未设置'
        };
      }
      
      // 合并现有设置
      const currentSettings = merchant.settings ? JSON.parse(merchant.settings) : {};
      const newSettings = { ...currentSettings, ...settings };
      
      await this.db.run(
        'UPDATE merchants SET settings = ?, updated_at = ? WHERE id = ?',
        [JSON.stringify(newSettings), new Date().toISOString(), merchant.id]
      );
      
      return {
        success: true,
        settings: newSettings
      };
      
    } catch (error) {
      this.logger.error('更新设置失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取商户设置
   * @returns {Promise<Object>}
   */
  async getSettings() {
    try {
      const merchant = await this.db.get('SELECT settings FROM merchants LIMIT 1');
      
      if (!merchant) {
        return {
          success: false,
          error: '商户尚未设置'
        };
      }
      
      const settings = merchant.settings ? JSON.parse(merchant.settings) : {};
      
      return {
        success: true,
        settings: settings
      };
      
    } catch (error) {
      this.logger.error('获取设置失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取商户统计
   * @returns {Promise<Object>}
   */
  async getStats() {
    try {
      const merchant = await this.db.get('SELECT * FROM merchants LIMIT 1');
      
      if (!merchant) {
        return {
          success: false,
          error: '商户尚未设置'
        };
      }
      
      // 统计商品
      const productStats = await this.db.get(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN stock > 0 AND status = 'active' THEN 1 ELSE 0 END) as in_stock,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active
        FROM products
      `);
      
      // 统计分类
      const categoryStats = await this.db.all(`
        SELECT category, COUNT(*) as count 
        FROM products 
        WHERE status = 'active'
        GROUP BY category
      `);
      
      // 统计HUB连接
      const hubStats = await this.db.get(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active
        FROM hub_connections
      `);
      
      return {
        success: true,
        merchant: this.parseMerchantData(merchant),
        stats: {
          products: productStats,
          categories: categoryStats,
          hubs: hubStats
        }
      };
      
    } catch (error) {
      this.logger.error('获取统计失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 导出商户数据
   * @returns {Promise<Object>}
   */
  async export() {
    try {
      const merchant = await this.db.get('SELECT * FROM merchants LIMIT 1');
      const products = await this.db.all('SELECT * FROM products');
      const connections = await this.db.all('SELECT * FROM hub_connections');
      
      return {
        success: true,
        data: {
          merchant: merchant ? this.parseMerchantData(merchant) : null,
          products: products.map(p => this.parseProductData(p)),
          connections: connections,
          exportedAt: new Date().toISOString()
        }
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
   * 生成商户ID
   * @returns {string}
   */
  generateMerchantId() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `MCH${timestamp}${random}`;
  }

  /**
   * 解析商户数据
   * @param {Object} data - 原始数据
   * @returns {Object}
   */
  parseMerchantData(data) {
    if (!data) return null;
    
    const parsed = { ...data };
    
    // 解析JSON字段
    ['social_media', 'settings'].forEach(field => {
      if (parsed[field]) {
        try {
          parsed[field] = JSON.parse(parsed[field]);
        } catch (e) {
          // 保持原样
        }
      }
    });
    
    // 字段名转换
    return {
      id: parsed.id,
      name: parsed.name,
      description: parsed.description,
      email: parsed.email,
      phone: parsed.phone,
      address: parsed.address,
      logo: parsed.logo,
      website: parsed.website,
      businessHours: parsed.business_hours,
      socialMedia: parsed.social_media || {},
      settings: parsed.settings || {},
      createdAt: parsed.created_at,
      updatedAt: parsed.updated_at
    };
  }

  /**
   * 解析商品数据
   * @param {Object} data - 原始数据
   * @returns {Object}
   */
  parseProductData(data) {
    if (!data) return null;
    
    const parsed = { ...data };
    
    // 解析JSON字段
    ['tags', 'images', 'sellingPoints', 'aiMetadata'].forEach(field => {
      if (parsed[field]) {
        try {
          parsed[field] = JSON.parse(parsed[field]);
        } catch (e) {
          // 保持原样
        }
      }
    });
    
    return parsed;
  }
}

module.exports = { MerchantManager };
