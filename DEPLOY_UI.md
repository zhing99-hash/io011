# IO011 前端 UI 部署指南

> 本文档用于服务器端 OpenClaw 自动部署 Hub 和商户端的前台界面

## 📋 部署概览

| 组件 | 域名 | 端口 | 说明 |
|------|------|------|------|
| Hub | www.io011.com | 8080 | 平台导航中心 |
| 商户端 | shop.io011.com | 3456 | 商户店铺前台 |

---

## 前置条件

```bash
# 1. 确保项目代码已克隆
cd /opt/io011
git clone https://github.com/zhing99-hash/aicart.git

# 2. 确保 Node.js 环境
node --version  # >= 18.0.0
npm --version   # >= 9.0.0

# 3. 确保数据库已启动
# PostgreSQL: localhost:5432
# Redis: localhost:6379
```

---

## 第一部分：Hub 前端部署 (www.io011.com)

### 1.1 进入 Hub 目录

```bash
cd /opt/io011/github-repo/hub
```

### 1.2 安装依赖（包含静态文件服务）

```bash
# 安装 @fastify/static 用于提供前端UI
npm install @fastify/static

# 安装所有依赖
npm install
```

### 1.3 确保前端文件存在

```bash
# 检查 public 目录
ls -la public/

# 应该包含:
# - index.html (Hub首页)
```

如果文件不存在，创建 `public/index.html`：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IO011 Hub - A2A Commerce</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      color: #333;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    header {
      text-align: center;
      padding: 60px 20px;
      color: white;
    }
    h1 {
      font-size: 3rem;
      margin-bottom: 10px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }
    .tagline {
      font-size: 1.2rem;
      opacity: 0.9;
    }
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-top: 40px;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 30px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      transition: transform 0.3s;
    }
    .card:hover {
      transform: translateY(-5px);
    }
    .card h3 {
      color: #667eea;
      margin-bottom: 15px;
      font-size: 1.3rem;
    }
    .card p {
      color: #666;
      line-height: 1.6;
      margin-bottom: 20px;
    }
    .btn {
      display: inline-block;
      padding: 12px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 500;
      transition: opacity 0.3s;
    }
    .btn:hover {
      opacity: 0.9;
    }
    .status-bar {
      background: rgba(255,255,255,0.95);
      padding: 15px 30px;
      border-radius: 12px;
      margin-top: 30px;
      display: flex;
      justify-content: space-around;
      flex-wrap: wrap;
      gap: 20px;
    }
    .status-item {
      text-align: center;
    }
    .status-item .number {
      font-size: 2rem;
      font-weight: bold;
      color: #667eea;
    }
    .status-item .label {
      color: #666;
      font-size: 0.9rem;
    }
    .api-section {
      background: rgba(255,255,255,0.95);
      border-radius: 16px;
      padding: 30px;
      margin-top: 30px;
    }
    .api-section h2 {
      color: #333;
      margin-bottom: 20px;
    }
    .endpoint {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 8px;
      margin: 10px 0;
      font-family: monospace;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .method {
      background: #667eea;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: bold;
    }
    footer {
      text-align: center;
      padding: 40px;
      color: rgba(255,255,255,0.8);
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🏪 IO011 Hub</h1>
      <p class="tagline">A2A Commerce - 我的数据我做主</p>
    </header>

    <div class="cards">
      <div class="card">
        <h3>🔍 商户搜索</h3>
        <p>通过标签快速发现优质商户，支持类目、能力、地区等多维度筛选。</p>
        <a href="/api/v1/search" class="btn">访问 API</a>
      </div>
      <div class="card">
        <h3>🏪 商户注册</h3>
        <p>注册您的商户，加入 IO011 生态，让用户通过 AI 助手发现您的商品。</p>
        <a href="#" onclick="alert('请使用 POST /api/v1/merchants/register 注册')" class="btn">立即注册</a>
      </div>
      <div class="card">
        <h3>📖 API 文档</h3>
        <p>查看完整的 API 文档，了解如何与 Hub 进行集成。</p>
        <a href="/health" class="btn">健康检查</a>
      </div>
    </div>

    <div class="status-bar">
      <div class="status-item">
        <div class="number" id="merchant-count">0</div>
        <div class="label">注册商户</div>
      </div>
      <div class="status-item">
        <div class="number">-</div>
        <div class="label">在线商户</div>
      </div>
      <div class="status-item">
        <div class="number">v2.2.2</div>
        <div class="label">系统版本</div>
      </div>
    </div>

    <div class="api-section">
      <h2>🔌 API 端点</h2>
      <div class="endpoint">
        <span class="method">GET</span>
        <span>/health</span>
      </div>
      <div class="endpoint">
        <span class="method">GET</span>
        <span>/api/v1/search?tags=xxx</span>
      </div>
      <div class="endpoint">
        <span class="method">POST</span>
        <span>/api/v1/merchants/register</span>
      </div>
      <div class="endpoint">
        <span class="method">GET</span>
        <span>/api/v1/categories</span>
      </div>
    </div>

    <footer>
      <p>© 2024 IO011 / AICart - 数据主权 100%</p>
    </footer>
  </div>
</body>
</html>
```

### 1.4 修改 src/index.js 添加静态文件服务

在 `src/index.js` 中添加以下代码（在注册插件后）：

```javascript
const path = require('path');

// Serve static files (frontend UI)
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, '../public'),
  prefix: '/',
});

// Root route - serve index.html
fastify.get('/', async (request, reply) => {
  return reply.sendFile('index.html');
});
```

### 1.5 启动 Hub 服务

```bash
# 开发模式
npm run dev

# 或生产模式（推荐）
npm start

# 或使用 PM2 守护进程
pm2 start src/index.js --name aicart-hub
pm2 save
```

### 1.6 验证部署

```bash
# 检查服务状态
curl http://localhost:8080/health
curl http://localhost:8080/

# 查看日志
pm2 logs aicart-hub
```

---

## 第二部分：商户端前端部署 (shop.io011.com)

### 2.1 进入商户端目录

```bash
cd /opt/io011/github-repo/merchant-skill
```

### 2.2 安装依赖

```bash
npm install
```

### 2.3 确保前端文件存在

```bash
# 检查 public 目录
ls -la public/

# 应该包含:
# - index.html (店铺首页)
# - 404.html (错误页面)
```

### 2.4 修改 src/skill.js 添加前端路由

在 `startHttpServer()` 方法中，添加以下路由：

```javascript
const path = require('path');

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
```

### 2.5 配置商户信息

编辑 `config/merchant.yaml`：

```yaml
merchant:
  name: "您的商户名称"
  description: "商户描述"
  contact:
    email: "your@email.com"
    phone: "+86 13800138000"

site:
  template: "minimal"
  domain: "auto"
  theme:
    primary_color: "#6366F1"
    secondary_color: "#14B8A6"

server:
  port: 3456

hubs:
  - name: "本地HUB"
    url: "http://localhost:8080"
    api_key: "your_api_key_here"
    auto_sync: true
```

### 2.6 启动商户端服务

```bash
# 启动服务
npm start

# 或使用 PM2
pm2 start src/index.js --name merchant-skill
pm2 save
```

### 2.7 验证部署

```bash
# 检查服务状态
curl http://localhost:3456/health
curl http://localhost:3456/
curl http://localhost:3456/api/merchant/info

# 查看日志
pm2 logs merchant-skill
```

---

## 第三部分：Nginx 反向代理配置

### 3.1 安装 Nginx

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y nginx

# CentOS/RHEL
sudo yum install -y nginx
sudo systemctl start nginx
```

### 3.2 配置 Hub (www.io011.com)

创建文件 `/etc/nginx/sites-available/www.io011.com`：

```nginx
server {
    listen 80;
    server_name www.io011.com;
    
    # 强制 HTTPS（如果有SSL证书）
    # return 301 https://$server_name$request_uri;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# HTTPS 配置（如果有SSL证书）
server {
    listen 443 ssl http2;
    server_name www.io011.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3.3 配置商户端 (shop.io011.com)

创建文件 `/etc/nginx/sites-available/shop.io011.com`：

```nginx
server {
    listen 80;
    server_name shop.io011.com;
    
    location / {
        proxy_pass http://localhost:3456;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# HTTPS 配置（可选）
server {
    listen 443 ssl http2;
    server_name shop.io011.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3456;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3.4 启用配置

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/www.io011.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/shop.io011.com /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

---

## 第四部分：防火墙配置

```bash
# 开放 HTTP/HTTPS 端口
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 内部端口（可选，如果只用 Nginx 代理）
sudo ufw allow from 127.0.0.1 to any port 8080
sudo ufw allow from 127.0.0.1 to any port 3456

# 数据库端口（仅限本地）
sudo ufw allow from 127.0.0.1 to any port 5432
sudo ufw allow from 127.0.0.1 to any port 6379

# 启用防火墙
sudo ufw enable
```

---

## 第五部分：自动化部署脚本

创建部署脚本 `deploy.sh`：

```bash
#!/bin/bash

set -e

echo "🚀 IO011 前端 UI 部署脚本"
echo "=========================="

# 配置
PROJECT_DIR="/opt/io011/github-repo"
HUB_DIR="$PROJECT_DIR/hub"
MERCHANT_DIR="$PROJECT_DIR/merchant-skill"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 函数：打印信息
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# 1. 检查环境
check_env() {
    info "检查环境..."
    
    if ! command -v node &> /dev/null; then
        error "Node.js 未安装"
    fi
    
    if ! command -v pm2 &> /dev/null; then
        warn "PM2 未安装，尝试安装..."
        npm install -g pm2
    fi
    
    info "环境检查通过"
}

# 2. 部署 Hub
deploy_hub() {
    info "部署 Hub..."
    
    cd $HUB_DIR
    
    # 安装依赖
    npm install
    
    # 确保静态文件服务依赖已安装
    npm list @fastify/static || npm install @fastify/static
    
    # 检查 public 目录
    if [ ! -f "public/index.html" ]; then
        warn "Hub public/index.html 不存在，需要手动创建"
    fi
    
    # 重启或启动服务
    if pm2 list | grep -q "aicart-hub"; then
        info "重启 Hub 服务..."
        pm2 restart aicart-hub
    else
        info "启动 Hub 服务..."
        pm2 start src/index.js --name aicart-hub
    fi
    
    info "Hub 部署完成"
}

# 3. 部署商户端
deploy_merchant() {
    info "部署商户端..."
    
    cd $MERCHANT_DIR
    
    # 安装依赖
    npm install
    
    # 检查 public 目录
    if [ ! -f "public/index.html" ]; then
        warn "商户端 public/index.html 不存在，需要手动创建"
    fi
    
    # 重启或启动服务
    if pm2 list | grep -q "merchant-skill"; then
        info "重启商户端服务..."
        pm2 restart merchant-skill
    else
        info "启动商户端服务..."
        pm2 start src/index.js --name merchant-skill
    fi
    
    info "商户端部署完成"
}

# 4. 保存 PM2 配置
save_pm2() {
    info "保存 PM2 配置..."
    pm2 save
}

# 5. 检查服务状态
check_status() {
    info "检查服务状态..."
    
    sleep 2
    
    # 检查 Hub
    if curl -s http://localhost:8080/health > /dev/null; then
        info "✅ Hub 服务运行正常 (http://localhost:8080)"
    else
        error "❌ Hub 服务未响应"
    fi
    
    # 检查商户端
    if curl -s http://localhost:3456/health > /dev/null; then
        info "✅ 商户端服务运行正常 (http://localhost:3456)"
    else
        error "❌ 商户端服务未响应"
    fi
}

# 主流程
main() {
    check_env
    deploy_hub
    deploy_merchant
    save_pm2
    check_status
    
    echo ""
    echo "=========================="
    info "🎉 部署完成！"
    echo ""
    echo "Hub 前端:      http://localhost:8080  -> https://www.io011.com"
    echo "商户端前端:    http://localhost:3456  -> https://shop.io011.com"
    echo ""
    echo "查看日志:"
    echo "  pm2 logs aicart-hub"
    echo "  pm2 logs merchant-skill"
}

# 执行
main
```

使用脚本：

```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 第六部分：故障排查

### 6.1 服务无法启动

```bash
# 查看详细错误
pm2 logs aicart-hub --lines 50
pm2 logs merchant-skill --lines 50

# 检查端口占用
sudo netstat -tulpn | grep 8080
sudo netstat -tulpn | grep 3456
```

### 6.2 Nginx 502 错误

```bash
# 检查后端服务是否运行
curl http://localhost:8080/health
curl http://localhost:3456/health

# 检查 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log
```

### 6.3 前端页面空白

```bash
# 检查 public 目录权限
ls -la /opt/io011/github-repo/hub/public/
ls -la /opt/io011/github-repo/merchant-skill/public/

# 确保文件可读
chmod -R 755 public/
```

---

## 📚 附录

### API 端点速查

| 服务 | 端点 | 说明 |
|------|------|------|
| Hub | GET / | 首页 UI |
| Hub | GET /health | 健康检查 |
| Hub | GET /api/v1/search | 商户搜索 |
| 商户 | GET / | 店铺首页 UI |
| 商户 | GET /health | 健康检查 |
| 商户 | GET /api/merchant/info | 商户数据 API |

### 端口速查

| 端口 | 用途 |
|------|------|
| 80 | HTTP 入口 |
| 443 | HTTPS 入口 |
| 8080 | Hub 服务 |
| 3456 | 商户端服务 |
| 5432 | PostgreSQL |
| 6379 | Redis |

---

**文档版本**: v1.0  
**更新日期**: 2026-03-31  
**适用版本**: IO011 v2.2.2
