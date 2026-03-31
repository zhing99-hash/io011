# IO011 / AICart 同机原生部署指南 (无 Docker)

> 适用于 MVP 阶段快速部署，Hub 和商户端运行在同一台服务器上

## 📋 环境要求

| 组件 | 版本要求 | 说明 |
|------|----------|------|
| Node.js | >= 18.0.0 | 运行环境 |
| PostgreSQL | >= 14.0 | Hub 数据库 |
| Redis | >= 6.0 | Hub 缓存 |
| OpenClaw | 最新版 | 运行商户端 Skill |
| SQLite | 内置 | 商户端本地存储 |

## 🗂️ 部署架构

```
同一台服务器
├── PostgreSQL (端口 5432)
├── Redis (端口 6379)
├── AICart Hub (端口 8080)
│   └── Node.js 服务
└── OpenClaw Gateway
    └── Merchant Skill (端口 3456)
        └── SQLite 数据库
```

---

## 第一步：安装系统依赖

### Ubuntu/Debian

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node --version  # v18.x.x
npm --version   # 9.x.x

# 安装 PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# 安装 Redis
sudo apt install -y redis-server

# 启动服务
sudo systemctl start postgresql
sudo systemctl start redis
sudo systemctl enable postgresql
sudo systemctl enable redis
```

### CentOS/RHEL

```bash
# 安装 Node.js
sudo dnf module install nodejs:18

# 安装 PostgreSQL
sudo dnf install -y postgresql-server postgresql-contrib
sudo postgresql-setup --initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 安装 Redis
sudo dnf install -y redis
sudo systemctl start redis
sudo systemctl enable redis
```

---

## 第二步：部署 AICart Hub

### 1. 创建数据库

```bash
# 切换到 postgres 用户
sudo -u postgres psql

# 创建数据库和用户
CREATE DATABASE aicart_hub;
CREATE USER aicart WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE aicart_hub TO aicart;

# 退出
\q
```

### 2. 安装 Hub 服务

```bash
# 进入项目目录
cd /opt
git clone https://github.com/zhing99-hash/aicart.git
cd aicart/github-repo/hub

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
nano .env  # 或 vim .env
```

**编辑 .env 文件：**

```env
# Server
PORT=8080
HOST=0.0.0.0
NODE_ENV=production

# Database (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aicart_hub
DB_USER=aicart
DB_PASSWORD=your_secure_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Security (生成随机密钥)
JWT_SECRET=$(openssl rand -base64 32)
API_KEY_SALT=$(openssl rand -base64 16)

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Merchant Query
MERCHANT_QUERY_TIMEOUT_MS=2000
MAX_CONCURRENT_QUERIES=5

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# CORS
CORS_ORIGIN=*

# WebSocket
WS_HEARTBEAT_INTERVAL_MS=30000
WS_HEARTBEAT_TIMEOUT_MS=60000
```

### 3. 初始化数据库

```bash
# 执行数据库 schema
psql -U aicart -d aicart_hub -f database/schema.sql
```

### 4. 启动 Hub 服务

```bash
# 测试启动
npm start

# 或使用 PM2 守护进程
sudo npm install -g pm2
pm2 start src/index.js --name aicart-hub
pm2 save
pm2 startup
```

---

## 第三步：安装 OpenClaw

```bash
# 安装 OpenClaw CLI
npm install -g openclaw

# 验证安装
openclaw --version

# 初始化配置
openclaw init
```

---

## 第四步：部署商户端 Skill

### 1. 安装 Skill

```bash
# 进入商户端目录
cd /opt/aicart/github-repo/merchant-skill

# 安装依赖
npm install

# 配置商户信息
cp config/merchant.yaml config/my-merchant.yaml
nano config/my-merchant.yaml
```

**编辑商户配置：**

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
    url: "http://localhost:8080"  # 指向本机 Hub
    api_key: "${HUB_API_KEY}"     # 从 Hub 注册后获取
    auto_sync: true

ai:
  auto_process: true
  confidence_threshold: 0.8
  language: "zh-CN"
```

### 2. 注册商户到 Hub

```bash
# 调用 Hub API 注册商户
curl -X POST http://localhost:8080/api/v1/merchants/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "您的商户名称",
    "endpoint": "http://localhost:3456/a2a",
    "tags": {
      "categories": ["分类1", "分类2"],
      "capabilities": ["支持定制"],
      "location": "您的位置",
      "price_range": {"min": 50, "max": 500}
    }
  }'

# 记录返回的 API Key，填入 merchant.yaml
```

### 3. 启动 Skill

```bash
# 方式1：作为 OpenClaw Skill 运行
openclaw skills install ./

# 方式2：独立运行（测试）
npm start

# 方式3：使用 PM2 守护
pm2 start src/index.js --name merchant-skill
```

---

## 第五步：防火墙配置

```bash
# 开放必要端口
sudo ufw allow 8080/tcp    # Hub API
sudo ufw allow 3456/tcp    # Merchant Skill
sudo ufw allow 5432/tcp    # PostgreSQL (仅限本地)
sudo ufw allow 6379/tcp    # Redis (仅限本地)

# 如果使用云服务器，在安全组中开放 8080 端口
```

---

## 第六步：验证部署

### 1. 检查服务状态

```bash
# 检查 Hub
curl http://localhost:8080/health

# 检查商户端
curl http://localhost:3456/health

# 测试商户搜索
curl "http://localhost:8080/api/v1/search?tags=您的分类"
```

### 2. 查看日志

```bash
# Hub 日志
pm2 logs aicart-hub

# 商户端日志
pm2 logs merchant-skill

# 或查看文件日志
tail -f /var/log/aicart/hub.log
tail -f /var/log/aicart/merchant.log
```

---

## 🔧 故障排查

### PostgreSQL 连接失败

```bash
# 检查 PostgreSQL 状态
sudo systemctl status postgresql

# 检查监听配置
sudo nano /etc/postgresql/14/main/postgresql.conf
# 确保: listen_addresses = 'localhost'

# 检查认证配置
sudo nano /etc/postgresql/14/main/pg_hba.conf
# 添加: host aicart_hub aicart 127.0.0.1/32 md5

# 重启 PostgreSQL
sudo systemctl restart postgresql
```

### Redis 连接失败

```bash
# 检查 Redis 状态
sudo systemctl status redis

# 测试连接
redis-cli ping  # 应返回 PONG

# 检查配置
sudo nano /etc/redis/redis.conf
# 确保: bind 127.0.0.1
```

### 端口冲突

```bash
# 检查端口占用
sudo netstat -tulpn | grep 8080
sudo netstat -tulpn | grep 3456

# 修改端口
# 编辑 .env 修改 PORT
# 编辑 merchant.yaml 修改 server.port
```

---

## 📊 性能优化

### 1. PostgreSQL 优化

```bash
# 编辑配置文件
sudo nano /etc/postgresql/14/main/postgresql.conf

# 添加以下配置
shared_buffers = 256MB
effective_cache_size = 768MB
work_mem = 8MB
maintenance_work_mem = 64MB
```

### 2. Node.js 优化

```bash
# 设置环境变量
export NODE_OPTIONS="--max-old-space-size=1024"

# 或使用 PM2 配置
pm2 start src/index.js --name aicart-hub --node-args="--max-old-space-size=1024"
```

### 3. 使用 Nginx 反向代理

```bash
# 安装 Nginx
sudo apt install -y nginx

# 创建配置
sudo nano /etc/nginx/sites-available/aicart
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 启用配置
sudo ln -s /etc/nginx/sites-available/aicart /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔄 更新维护

```bash
# 更新 Hub
cd /opt/aicart/github-repo/hub
git pull
npm install
pm2 restart aicart-hub

# 更新商户端
cd /opt/aicart/github-repo/merchant-skill
git pull
npm install
pm2 restart merchant-skill
```

---

## 📝 总结

| 组件 | 端口 | 部署方式 | 数据存储 |
|------|------|----------|----------|
| Hub | 8080 | Node.js + PM2 | PostgreSQL + Redis |
| 商户端 | 3456 | OpenClaw Skill | SQLite |

**优势**：
- ✅ 无需 Docker，资源占用低
- ✅ 部署简单，适合 MVP 阶段
- ✅ 便于调试和开发

**注意事项**：
- ⚠️ 生产环境建议分离部署
- ⚠️ 定期备份 PostgreSQL 和 SQLite 数据
- ⚠️ 配置防火墙限制内网访问

---

## 📚 相关文档

- [Hub API 文档](./hub/README.md)
- [商户端使用指南](./merchant-skill/README.md)
- [A2A 协议规范](./protocol/A2A-PROTOCOL-v0.1.md)
