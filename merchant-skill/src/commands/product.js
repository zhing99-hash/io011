/**
 * 商品管理命令模块
 * 
 * 提供商品的增删改查功能
 */

const { EventEmitter } = require('events');
const { Logger } = require('../utils/logger');
const { ProductProcessor } = require('../ai/product-processor');

class ProductManager extends EventEmitter {
  constructor(db, config = {}) {
    super();
    this.db = db;
    this.config = config;
    this.logger = new Logger('ProductManager');
    this.processor = new ProductProcessor(config);
  }

  /**
   * 添加商品
   * @param {Object} data - 商品数据
   * @returns {Promise<Object>} 添加结果
   */
  async add(data) {
    this.logger.info('添加新商品...');
    
    try {
      let productData;
      
      // 如果有图片，使用AI处理
      if (data.imagePath) {
        this.logger.info('使用AI处理商品图片...');
        const processResult = await this.processor.processProduct(
          data.imagePath, 
          data.textHint || data.description || ''
        );
        
        if (!processResult.success) {
          throw new Error(`AI处理失败: ${processResult.error}`);
        }
        
        productData = processResult.data;
        
        // 合并用户手动输入的数据（优先级更高）
        if (data.name) productData.name = data.name;
        if (data.price !== undefined) productData.price = data.price;
        if (data.stock !== undefined) productData.stock = data.stock;
        if (data.category) productData.category = data.category;
        if (data.description) productData.description = data.description;
        
      } else {
        // 无图片，使用手动输入
        productData = this.buildManualProductData(data);
      }
      
      // 添加SKU（如果没有）
      if (!productData.sku) {
        productData.sku = this.generateSKU(productData);
      }
      
      // 添加时间戳
      productData.created_at = new Date().toISOString();
      productData.updated_at = productData.created_at;
      
      // 插入数据库
      const fields = Object.keys(productData);
      const placeholders = fields.map(() => '?').join(',');
      const values = Object.values(productData);
      
      await this.db.run(
        `INSERT INTO products (${fields.join(',')}) VALUES (${placeholders})`,
        values
      );
      
      this.logger.info(`商品添加成功: ${productData.id}`);
      
      // 触发事件
      this.emit('productAdded', productData);
      
      return {
        success: true,
        product: productData
      };
      
    } catch (error) {
      this.logger.error('添加商品失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 列出商品
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 商品列表
   */
  async list(options = {}) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        category = null, 
        status = null,
        search = null,
        sortBy = 'updated_at',
        sortOrder = 'DESC'
      } = options;
      
      const offset = (page - 1) * limit;
      
      let sql = 'SELECT * FROM products WHERE 1=1';
      const params = [];
      
      if (category) {
        sql += ' AND category = ?';
        params.push(category);
      }
      
      if (status) {
        sql += ' AND status = ?';
        params.push(status);
      }
      
      if (search) {
        sql += ' AND (name LIKE ? OR description LIKE ? OR sku LIKE ?)';
        const keyword = `%${search}%`;
        params.push(keyword, keyword, keyword);
      }
      
      // 获取总数
      const countResult = await this.db.get(
        sql.replace('SELECT *', 'SELECT COUNT(*) as total'),
        params
      );
      
      // 排序和分页
      sql += ` ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
      params.push(limit, offset);
      
      const products = await this.db.all(sql, params);
      
      // 解析JSON字段
      const parsedProducts = products.map(p => this.parseProduct(p));
      
      return {
        success: true,
        products: parsedProducts,
        pagination: {
          page,
          limit,
          total: countResult?.total || 0,
          totalPages: Math.ceil((countResult?.total || 0) / limit)
        }
      };
      
    } catch (error) {
      this.logger.error('列出商品失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取单个商品
   * @param {string} id - 商品ID
   * @returns {Promise<Object>}
   */
  async get(id) {
    try {
      const product = await this.db.get(
        'SELECT * FROM products WHERE id = ?',
        [id]
      );
      
      if (!product) {
        return {
          success: false,
          error: '商品不存在'
        };
      }
      
      return {
        success: true,
        product: this.parseProduct(product)
      };
      
    } catch (error) {
      this.logger.error('获取商品失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 更新商品
   * @param {string} id - 商品ID
   * @param {Object} data - 更新数据
   * @returns {Promise<Object>}
   */
  async update(id, data) {
    this.logger.info(`更新商品: ${id}`);
    
    try {
      // 检查商品是否存在
      const existing = await this.db.get(
        'SELECT * FROM products WHERE id = ?',
        [id]
      );
      
      if (!existing) {
        return {
          success: false,
          error: '商品不存在'
        };
      }
      
      // 如果有新图片，重新进行AI处理
      if (data.imagePath && data.imagePath !== existing.images) {
        this.logger.info('检测到新图片，重新进行AI处理...');
        const processResult = await this.processor.processProduct(
          data.imagePath,
          data.textHint || data.description || ''
        );
        
        if (processResult.success) {
          // 合并AI处理结果和手动数据
          data = { ...processResult.data, ...data };
        }
      }
      
      // 构建更新字段
      const updates = [];
      const values = [];
      
      const allowedFields = [
        'name', 'description', 'shortDescription', 'price', 'stock',
        'category', 'subCategory', 'brand', 'color', 'material', 'size',
        'condition', 'tags', 'status', 'images', 'sku'
      ];
      
      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          updates.push(`${field} = ?`);
          values.push(data[field]);
        }
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
      
      // 添加ID
      values.push(id);
      
      await this.db.run(
        `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
      
      // 获取更新后的商品
      const updated = await this.get(id);
      
      this.logger.info(`商品更新成功: ${id}`);
      
      // 触发事件
      this.emit('productUpdated', updated.product);
      
      return {
        success: true,
        product: updated.product
      };
      
    } catch (error) {
      this.logger.error('更新商品失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 删除商品
   * @param {string} id - 商品ID
   * @param {boolean} softDelete - 是否软删除（默认true）
   * @returns {Promise<Object>}
   */
  async delete(id, softDelete = true) {
    this.logger.info(`删除商品: ${id}`);
    
    try {
      if (softDelete) {
        await this.db.run(
          'UPDATE products SET status = "deleted", updated_at = ? WHERE id = ?',
          [new Date().toISOString(), id]
        );
      } else {
        await this.db.run(
          'DELETE FROM products WHERE id = ?',
          [id]
        );
      }
      
      this.logger.info(`商品删除成功: ${id}`);
      
      // 触发事件
      this.emit('productDeleted', { id, softDelete });
      
      return {
        success: true,
        message: softDelete ? '商品已标记为删除' : '商品已永久删除'
      };
      
    } catch (error) {
      this.logger.error('删除商品失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 搜索商品（供HUB调用）
   * @param {Object} query - 查询条件
   * @returns {Promise<Array>}
   */
  async search(query) {
    const { 
      keywords = '', 
      category = null,
      minPrice = null,
      maxPrice = null,
      inStock = null,
      limit = 10,
      offset = 0
    } = query;
    
    let sql = 'SELECT * FROM products WHERE status = "active"';
    const params = [];
    
    if (keywords) {
      sql += ' AND (name LIKE ? OR description LIKE ? OR tags LIKE ?)';
      const keyword = `%${keywords}%`;
      params.push(keyword, keyword, keyword);
    }
    
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    
    if (minPrice !== null) {
      sql += ' AND price >= ?';
      params.push(minPrice);
    }
    
    if (maxPrice !== null) {
      sql += ' AND price <= ?';
      params.push(maxPrice);
    }
    
    if (inStock) {
      sql += ' AND stock > 0';
    }
    
    sql += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const products = await this.db.all(sql, params);
    return products.map(p => this.parseProduct(p));
  }

  /**
   * 批量添加商品
   * @param {Array<Object>} items - 商品数据数组
   * @returns {Promise<Object>}
   */
  async batchAdd(items) {
    this.logger.info(`批量添加 ${items.length} 个商品`);
    
    const results = [];
    for (const item of items) {
      const result = await this.add(item);
      results.push(result);
    }
    
    const successCount = results.filter(r => r.success).length;
    
    return {
      success: successCount > 0,
      results: results,
      summary: {
        total: items.length,
        success: successCount,
        failed: items.length - successCount
      }
    };
  }

  /**
   * 获取商品分类统计
   * @returns {Promise<Object>}
   */
  async getCategoryStats() {
    try {
      const stats = await this.db.all(`
        SELECT 
          category,
          COUNT(*) as count,
          AVG(price) as avg_price,
          SUM(stock) as total_stock
        FROM products 
        WHERE status = "active"
        GROUP BY category
        ORDER BY count DESC
      `);
      
      return {
        success: true,
        stats: stats
      };
      
    } catch (error) {
      this.logger.error('获取分类统计失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 设置商户信息
   * @param {Object} data - 商户数据
   * @returns {Promise<Object>}
   */
  async setupMerchant(data) {
    try {
      const merchantId = `mch_${Date.now()}`;
      
      await this.db.run(`
        INSERT OR REPLACE INTO merchants 
        (id, name, description, email, phone, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        merchantId,
        data.name,
        data.description || '',
        data.email || '',
        data.phone || '',
        new Date().toISOString()
      ]);
      
      return {
        success: true,
        merchantId: merchantId
      };
      
    } catch (error) {
      this.logger.error('设置商户信息失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 构建手动商品数据
   * @param {Object} data - 输入数据
   * @returns {Object}
   */
  buildManualProductData(data) {
    return {
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name: data.name || '未命名商品',
      description: data.description || '',
      shortDescription: data.shortDescription || data.description?.substring(0, 50) || '',
      sellingPoints: JSON.stringify(data.sellingPoints || []),
      price: parseFloat(data.price) || 0,
      currency: data.currency || 'CNY',
      stock: parseInt(data.stock, 10) || 0,
      category: data.category || '其他',
      subCategory: data.subCategory || '',
      brand: data.brand || '',
      color: data.color || '',
      material: data.material || '',
      size: data.size || '',
      condition: data.condition || '全新',
      tags: JSON.stringify(data.tags || []),
      sku: data.sku || '',
      images: JSON.stringify(data.images || []),
      status: data.status || 'active'
    };
  }

  /**
   * 解析商品数据（转换JSON字段）
   * @param {Object} product - 数据库中的商品
   * @returns {Object}
   */
  parseProduct(product) {
    if (!product) return null;
    
    const parsed = { ...product };
    
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

  /**
   * 生成SKU
   * @param {Object} product - 商品数据
   * @returns {string}
   */
  generateSKU(product) {
    const categoryCode = (product.category || 'OT').substring(0, 2).toUpperCase();
    const nameCode = (product.name || 'ITEM').substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().substring(8);
    const random = Math.random().toString(36).substring(2, 4).toUpperCase();
    return `${categoryCode}-${nameCode}-${timestamp}${random}`;
  }
}

module.exports = { ProductManager };
