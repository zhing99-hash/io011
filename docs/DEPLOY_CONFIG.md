# IO011 / AICart 部署配置手册

> 版本: v2.3.1  
> 更新日期: 2026-04-01  
> 状态: 生产部署就绪

---

## 📋 系统架构总览

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                  用户端                                          │
│                      www.io011.com (前端: 1566)                                │
│                              ↓                                                  │
│                          Hub API                                               │
│                   api.io011.com (API: 1569)                                   │
└────────────────────────────┬────────────────────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   官方商户     │    │   商户 A      │    │   商户 B      │
│ shop.io011.com│    │  (自定义域名) │    │  (自定义域名) │
│  Web:1588     │    │               │    │               │
│  Skill:1589   │    │   Skill:A2A  │    │   Skill:A2A   │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## 🎯 服务器信息配置表

### 生产环境 (需填写)

| 项目 | 值 | 说明 |
|------|------|------|
| **服务器公网 IP** | _______ | 请填写服务器 IP |
| **域名 - Hub 前端** | www.io011.com | 用户访问入口 |
| **域名 - Hub API** | api.io011.com | API 接口域名 |
| **域名 - 商户 Web** | shop.io011.com | 官方商户后台 |
| **数据库 Host** | localhost | PostgreSQL |
| **数据库端口** | 5432 | |
| **Redis Host** | localhost | |
| **Redis 端口** | 6379 | |

---

## 🖥️ 服务部署清单

### 1. Hub 后端 (API 服务) - 最重要

| 项目 | 配置 |
|------|------|
| **项目路径** | `/opt/io011/github-repo/hub` |
| **端口** | **1569** |
| **域名** | `api.io011.com` |
| **依赖** | PostgreSQL + Redis |
| **启动命令** | `node src/index.js` |
| **验证命令** | `curl http://localhost:1569/api/health` |

**配置文件** (`hub/.env`):
```bash
PORT=1569
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aicart_hub
DB_USER=aicart
DB_PASSWORD=your_password
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

### 2. Hub 前端 (用户界面)

| 项目 | 配置 |
|------|------|
| **项目路径** | `/opt/io011/github-repo/hub-ui` |
| **端口** | **1566** |
| **域名** | `www.io011.com` |
| **启动命令** | `python server.py` (需修改端口为 1566) |
| **验证命令** | `curl http://localhost:1566` |

**端口修改** (`hub-ui/server.py`):
```python
PORT = 1566  # 原来是 19800
```

---

### 3. 用户端 (开发测试用)

| 项目 | 配置 |
|------|------|
| **项目路径** | `/opt/io011/github-repo/user-frontend` |
| **端口** | **5174** |
| **说明** | 开发测试用，生产环境可用 hub 前端替代 |
| **启动命令** | `npm run dev -- --port 5174` |

---

### 4. 官方商户端 - Web 后台

| 项目 | 配置 |
|------|------|
| **项目路径** | `/opt/io011/github-repo/merchant-frontend` |
| **端口** | **1588** |
| **域名** | `shop.io011.com` |
| **依赖** | 无 |
| **构建命令** | `npm run build` |
| **启动命令** | `serve dist -l 1588` |

---

### 5. 官方商户端 - Skill (A2A 接口)

| 项目 | 配置 |
|------|------|
| **项目路径** | `/opt/io011/github-repo/merchant-skill` |
| **端口** | **1589** |
| **域名** | `shop.io011.com` (用于 A2A 对接) |
| **配置文件** | `merchant-skill/config/merchant.yaml` |
| **启动命令** | `node src/index.js` |
| **验证命令** | `curl http://localhost:1589/api/health` |

**配置文件** (`merchant-skill/config/merchant.yaml`):
```yaml
server:
  port: 1589

merchant:
  name: "官方测试商户"
  description: "IO011 官方测试商户"

hubs:
  - name: "AICart Hub"
    url: "http://服务器IP:1569"  # 开发环境用 localhost
    # url: "https://api.io011.com"  # 生产环境用这个
    api_key: "test_api_key"
    auto_sync: true
```

---

### 6. Hub 后台 (管理界面)

| 项目 | 配置 |
|------|------|
| **项目路径** | `/opt/io011/github-repo/hub-admin` |
| **端口** | **1568** |
| **说明** | 平台运营管理后台 |
| **构建命令** | `npm run build` |
| **启动命令** | `serve dist -l 1568` |

---

## 🔌 端口分配总表

| 端口 | 服务 | 域名 | 用途 |
|------|------|------|------|
| **1566** | Hub 前端 | www.io011.com | 用户访问 |
| **1569** | Hub 后端 API | api.io011.com | 所有 API |
| **1568** | Hub 后台 | (运营管理) | 运营管理 |
| **1588** | 商户端 Web | shop.io011.com | 商户后台 |
| **1589** | 商户端 Skill | shop.io011.com | A2A 接口 |
| **1568** | Hub 后台 | (运营管理) | 平台管理 |
| **5174** | 用户端前端 | localhost | 开发测试 |

---

## 🌐 域名绑定配置

### Nginx 配置示例

```nginx
# /etc/nginx/sites-available/io011

# www.io011.com -> Hub 前端 (1566)
server {
    listen 80;
    server_name www.io011.com;
    location / {
        proxy_pass http://127.0.0.1:1566;
        proxy_set_header Host $host;
    }
}

# api.io011.com -> Hub 后端 API (1569)
server {
    listen 80;
    server_name api.io011.com;
    location / {
        proxy_pass http://127.0.0.1:1569;
        proxy_set_header Host $host;
    }
}

# shop.io011.com -> 商户端 Web (1588)
server {
    listen 80;
    server_name shop.io011.com;
    location / {
        proxy_pass http://127.0.0.1:1588;
        proxy_set_header Host $host;
    }
}
```

### 防火墙配置

```bash
# 开放端口
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw allow 1566/tcp # Hub 前端
ufw allow 1569/tcp # Hub API
ufw allow 1588/tcp # 商户 Web
ufw allow 1589/tcp # 商户 Skill

# 重启防火墙
ufw reload
```

---

## 🚀 部署步骤

### 顺序: 1 → 2 → 3 → 4 → 5

#### Step 1: 部署 Hub 后端 (核心)
```bash
cd /opt/io011/github-repo/hub

# 1. 安装依赖
npm install

# 2. 配置环境变量
cat > .env << EOF
PORT=1569
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aicart_hub
DB_USER=aicart
DB_PASSWORD=your_password
REDIS_HOST=localhost
REDIS_PORT=6379
EOF

# 3. 启动服务 (后台运行)
nohup node src/index.js > hub.log 2>&1 &

# 4. 验证
curl http://localhost:1569/api/health
```

#### Step 2: 部署 Hub 前端
```bash
cd /opt/io011/github-repo/hub-ui

# 1. 安装依赖
npm install

# 2. 修改端口
sed -i 's/PORT = 19800/PORT = 1566/' server.py

# 3. 启动服务
nohup python server.py > hub-ui.log 2>&1 &

# 4. 验证
curl http://localhost:1566
```

#### Step 3: 部署商户端 Web
```bash
cd /opt/io011/github-repo/merchant-frontend

# 1. 安装依赖
npm install

# 2. 构建
npm run build

# 3. 启动
nohup serve dist -l 1588 > merchant-web.log 2>&1 &

# 4. 验证
curl http://localhost:1588
```

#### Step 4: 部署商户端 Skill
```bash
cd /opt/io011/github-repo/merchant-skill

# 1. 安装依赖
npm install

# 2. 配置
cat > config/merchant.yaml << EOF
server:
  port: 1589

merchant:
  name: "官方测试商户"
  description: "IO011 官方测试商户"

hubs:
  - name: "AICart Hub"
    url: "http://localhost:1569"
    api_key: "test_key"
    auto_sync: true
EOF

# 3. 启动
nohup node src/index.js > merchant-skill.log 2>&1 &

# 4. 验证
curl http://localhost:1589/api/health
```

#### Step 5: 注册商户到 Hub
```bash
# 商户注册
curl -X POST http://localhost:1569/api/merchants/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "官方测试商户",
    "endpoint": "http://localhost:1589",
    "logo_url": "https://io011.com/logo.png",
    "tags": {
      "categories": ["茶具", "陶瓷"],
      "capabilities": ["支持定制", "48小时发货"],
      "region": "景德镇"
    }
  }'

# 验证商户列表
curl http://localhost:1569/api/merchants
```

---

## ✅ 部署验证检查表

部署完成后，逐一检查:

- [ ] `curl http://localhost:1569/api/health` → 返回 {"status":"ok"}
- [ ] `curl http://localhost:1566` → 返回 Hub 前端 HTML
- [ ] `curl http://localhost:1588` → 返回商户后台 HTML
- [ ] `curl http://localhost:1589/api/health` → 返回 {"status":"ok"}
- [ ] `curl http://localhost:1569/api/merchants` → 返回商户列表

---

## 🔧 常用管理命令

```bash
# 查看所有服务状态
netstat -ano | findstr "1566 1569 1588 1589"

# 查看日志
tail -f /opt/io011/github-repo/hub/hub.log

# 重启服务
pkill -f "node src/index.js" && cd /opt/io011/github-repo/hub && nohup node src/index.js > hub.log 2>&1 &

# 备份数据库
pg_dump aicart_hub > backup_$(date +%Y%m%d).sql
```

---

## ⚠️ 重要提醒

1. **数据库和 Redis 必须先启动**
2. **防火墙端口**: 80, 443, 1566, 1569, 1588, 1589
3. **生产环境**用 `https://api.io011.com` 替换 `http://localhost:1569`
4. **商户注册**后，搜索功能才能正常使用

---

**文档版本**: v2.3.1  
**维护者**: 蜜鼠  
**部署前请确保所有配置项已填写正确！**