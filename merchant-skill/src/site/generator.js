/**
 * 站点生成器模块
 *
 * 根据商品数据生成静态站点
 */

const { Logger } = require('../utils/logger');
const fs = require('fs');
const path = require('path');

class SiteGenerator {
  constructor(db, config = {}) {
    this.db = db;
    this.config = config;
    this.logger = new Logger('SiteGenerator');
    this.outputPath = path.join(process.cwd(), 'generated-site');
    this.templatePath = path.join(process.cwd(), 'templates', config.site?.template || 'minimal');
  }

  /**
   * 生成站点
   * @param {Object} options - 生成选项
   * @returns {Promise<Object>}
   */
  async generate(options = {}) {
    this.logger.info('开始生成站点...');

    try {
      const startTime = Date.now();

      // 确保输出目录存在
      this.ensureDirectory(this.outputPath);

      // 获取商户信息
      const merchant = await this.getMerchantData();

      // 获取商品数据
      const products = await this.getProductsData(options);

      // 生成HTML页面
      await this.generateIndexPage(merchant, products);
      await this.generateProductPages(merchant, products);
      await this.generateCategoryPages(merchant, products);

      // 复制静态资源
      await this.copyStaticAssets();

      // 生成CSS
      await this.generateStyles();

      // 生成JavaScript
      await this.generateScripts();

      const duration = Date.now() - startTime;

      this.logger.info(`✅ 站点生成完成: ${this.outputPath} (${duration}ms)`);

      return {
        success: true,
        outputPath: this.outputPath,
        productCount: products.length,
        duration: duration,
        pages: {
          index: 'index.html',
          products: products.length,
          categories: this.getUniqueCategories(products).length
        }
      };

    } catch (error) {
      this.logger.error('站点生成失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取商户数据
   * @returns {Promise<Object>}
   */
  async getMerchantData() {
    const merchant = await this.db.get('SELECT * FROM merchants LIMIT 1');

    if (!merchant) {
      return {
        name: '未命名商户',
        description: '',
        email: '',
        phone: ''
      };
    }

    return {
      id: merchant.id,
      name: merchant.name,
      description: merchant.description || '',
      email: merchant.email || '',
      phone: merchant.phone || '',
      address: merchant.address || '',
      logo: merchant.logo || '',
      website: merchant.website || ''
    };
  }

  /**
   * 获取商品数据
   * @param {Object} options - 查询选项
   * @returns {Promise<Array>}
   */
  async getProductsData(options = {}) {
    let sql = 'SELECT * FROM products WHERE status = "active"';
    const params = [];

    if (options.category) {
      sql += ' AND category = ?';
      params.push(options.category);
    }

    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    sql += ' ORDER BY updated_at DESC';

    const products = await this.db.all(sql, params);

    return products.map(p => this.parseProduct(p));
  }

  /**
   * 解析商品数据
   * @param {Object} product - 原始商品数据
   * @returns {Object}
   */
  parseProduct(product) {
    const parsed = { ...product };

    ['tags', 'images', 'sellingPoints'].forEach(field => {
      if (parsed[field]) {
        try {
          parsed[field] = JSON.parse(parsed[field]);
        } catch (e) {
          parsed[field] = [];
        }
      } else {
        parsed[field] = [];
      }
    });

    return parsed;
  }

  /**
   * 生成首页
   */
  async generateIndexPage(merchant, products) {
    const featuredProducts = products.slice(0, 8);
    const categories = this.getUniqueCategories(products);

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${merchant.name}</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header class="header">
        <div class="container">
            <h1 class="logo">${merchant.name}</h1>
            <nav class="nav">
                <a href="index.html" class="nav-link">首页</a>
                <a href="products.html" class="nav-link">全部商品</a>
            </nav>
        </div>
    </header>

    <main class="main">
        <section class="hero">
            <div class="container">
                <h2>${merchant.description || '欢迎来到我们的商店'}</h2>
            </div>
        </section>

        <section class="featured">
            <div class="container">
                <h2 class="section-title">精选商品</h2>
                <div class="product-grid">
                    ${featuredProducts.map(p => this.renderProductCard(p)).join('')}
                </div>
            </div>
        </section>
    </main>

    <footer class="footer">
        <div class="container">
            <p>&copy; ${new Date().getFullYear()} ${merchant.name}</p>
        </div>
    </footer>

    <script src="app.js"></script>
</body>
</html>`;

    fs.writeFileSync(path.join(this.outputPath, 'index.html'), html);
  }

  /**
   * 渲染商品卡片
   */
  renderProductCard(product) {
    return `
        <div class="product-card">
            <a href="product-${this.slugify(product.id)}.html">
                <div class="product-image">
                    ${product.images?.length > 0
                      ? `<img src="${product.images[0]}" alt="${product.name}">`
                      : `<div class="no-image">暂无图片</div>`
                    }
                </div>
                <div class="product-content">
                    <h3>${product.name}</h3>
                    <p class="price">¥${product.price}</p>
                </div>
            </a>
        </div>
    `;
  }

  /**
   * 生成商品列表页
   */
  async generateProductPages(merchant, products) {
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <title>全部商品 - ${merchant.name}</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <h1>全部商品 (${products.length})</h1>
        <div class="product-grid">
            ${products.map(p => this.renderProductCard(p)).join('')}
        </div>
    </div>
</body>
</html>`;

    fs.writeFileSync(path.join(this.outputPath, 'products.html'), html);
  }

  /**
   * 生成分类页面
   */
  async generateCategoryPages(merchant, products) {
    const categories = this.getUniqueCategories(products);
    for (const category of categories) {
      const categoryProducts = products.filter(p => p.category === category);
      const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <title>${category} - ${merchant.name}</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <h1>${category} (${categoryProducts.length})</h1>
        <div class="product-grid">
            ${categoryProducts.map(p => this.renderProductCard(p)).join('')}
        </div>
    </div>
</body>
</html>`;
      fs.writeFileSync(path.join(this.outputPath, `category-${this.slugify(category)}.html`), html);
    }
  }

  /**
   * 生成CSS
   */
  async generateStyles() {
    const css = `:root {
  --primary: ${this.config.site?.theme?.primary_color || '#6366F1'};
  --secondary: ${this.config.site?.theme?.secondary_color || '#14B8A6'};
}

* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: system-ui, sans-serif; line-height: 1.6; }
.container { max-width: 1200px; margin: 0 auto; padding: 20px; }
.header { background: var(--primary); color: white; padding: 1rem; }
.logo { font-size: 1.5rem; font-weight: bold; }
.product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; }
.product-card { border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
.product-card img { width: 100%; height: 200px; object-fit: cover; }
.product-content { padding: 15px; }
.price { color: var(--primary); font-weight: bold; font-size: 1.2rem; }
`;
    fs.writeFileSync(path.join(this.outputPath, 'styles.css'), css);
  }

  /**
   * 生成JS
   */
  async generateScripts() {
    const js = `// AICart Site App
console.log('AICart site loaded');
`;
    fs.writeFileSync(path.join(this.outputPath, 'app.js'), js);
  }

  /**
   * 复制静态资源
   */
  async copyStaticAssets() {
    if (fs.existsSync(this.templatePath)) {
      const assetsPath = path.join(this.templatePath, 'assets');
      if (fs.existsSync(assetsPath)) {
        this.copyDirectory(assetsPath, path.join(this.outputPath, 'assets'));
      }
    }
  }

  /**
   * 优化站点
   */
  async optimize() {
    return { success: true, message: '优化完成' };
  }

  // 辅助方法
  ensureDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  copyDirectory(src, dest) {
    this.ensureDirectory(dest);
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  getUniqueCategories(products) {
    return [...new Set(products.map(p => p.category).filter(Boolean))];
  }

  slugify(text) {
    return text.toString().toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-');
  }
}

module.exports = { SiteGenerator };
