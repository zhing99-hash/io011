# IO011 / AICart 完整部署文档

> 版本: v2.3.1  
> 更新日期: 2026-04-01  
> 用途: 服务器端 OpenClaw 自动化部署

---

## 📋 系统架构

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                                    用户端                                       │
│                         www.io011.com (端口 1566)                             │
│                              ↓                                                 │
│                          Hub API                                              │
│                    api.io011.com (端口 1569)                                  │
└────────────────────────────────┬───────────────────────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        ↓                        ↓                        ↓
┌───────────────┐        ┌───────────────┐        ┌───────────────┐
│   官方商户     │        │   商户 A      │        │   商户 B      │
│ shop.io011.com│        │  (自定义域名) │        │  (自定义域名) │
│  Web: 1588    │        │               │        │               │
│  Skill: 1589  │        │  Skill: A2A  │        │  Skill: A2A  │
└───────────────┘        └───────────────┘        └───────────────┘
```

---

## 🔌 端口配置总表

| 端口 | 服务 | 项目路径 | 域名 | 说明 |
|------|------|----------|------|------|
| **1566** | Hub 前端 | hub-ui | www.io011.com | 用户访问入口 |
| **1568** | Hub 后台 | hub-admin | (内部) | 平台运营管理 |
| **1569** | Hub API | hub | api.io011.com | 所有 API 接口 |
| **1588** | 商户端 Web | merchant-frontend | shop.io011.com | 商户后台 |
| **1589** | 商户端 Skill | merchant-skill | shop.io011.com | A2A 接口 |

---

## 🚀 部署步骤

请按顺序执行以下步骤：

---

### 步骤 1: 环境准备

```bash
# 创建目录
mkdir -p /opt/io011/github-repo
mkdir -p /opt/io011/logs

# 确保 Node.js 版本 >= 18
node --version

# 确保 PostgreSQL 和 Redis 已启动
pg_ctl status
redis-cli ping
```

---

### 步骤 2: 上传代码

将以下目录上传到服务器 `/opt/io011/github-repo/`：

```
github-repo/
├── hub/                    # Hub 后端 API (端口 1569)
├── hub-ui/                 # Hub 前端 (端口 1566)
├── hub-admin/              # Hub 后台 (端口 1568)
├── merchant-frontend/      # 商户端 Web (端口 1588)
├── merchant-skill/         # 商户端 Skill (端口 1589)
└── docs/                   # 文档 (可选)
```

---

### 步骤 3: 部署 Hub 后端 (API) - 最重要

```bash
# 进入目录
cd /opt/io011/github-repo/hub

# 安装依赖
npm install

# 配置环境变量
cat > .env << 'EOF'
PORT=1569
HOST=0.0.0.0
NODE_ENV=production

DB_HOST=localhost
DB_PORT=5432
DB_NAME=aicart_hub
DB_USER=aicart
DB_PASSWORD=your_password

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=your_jwt_secret_key_change_this
API_KEY_SALT=your_api_key_salt_change_this
EOF

# 启动服务 (后台运行)
nohup node src/index.js > /opt/io011/logs/hub.log 2>&1 &

# 验证服务启动
sleep 3
curl -s http://localhost:1569/api/health
# 预期返回: {"status":"ok","service":"AICart Hub",...}
```

---

### 步骤 4: 部署 Hub 前端

```bash
# 进入目录
cd /opt/io011/github-repo/hub-ui

# 安装依赖
npm install

# 修改端口 (如果需要)
# 编辑 server.py 将 PORT 改为 1566

# 启动服务
nohup python server.py > /opt/io011/logs/hub-ui.log 2>&1 &

# 验证
curl -s http://localhost:1566 | head -c 200
```

---

### 步骤 5: 部署 Hub 后台 (管理界面)

```bash
# 进入目录
cd /opt/io011/github-repo/hub-admin

# 安装依赖
npm install

# 构建
npm run build

# 启动服务
nohup npx serve dist -l 1568 > /opt/io011/logs/hub-admin.log 2>&1 &

# 验证
curl -s http://localhost:1568 | head -c 200
```

---

### 步骤 6: 部署商户端 Web 后台

```bash
# 进入目录
cd /opt/io011/github-repo/merchant-frontend

# 安装依赖
npm install

# 构建
npm run build

# 启动服务
nohup npx serve dist -l 1588 > /opt/io011/logs/merchant-web.log 2>&1 &

# 验证
curl -s http://localhost:1588 | head -c 200
```

---

### 步骤 7: 部署商户端 Skill (A2A 接口)

```bash
# 进入目录
cd /opt/io011/github-repo/merchant-skill

# 安装依赖
npm install

# 配置商户信息
mkdir -p config
cat > config/merchant.yaml << 'EOF'
server:
  port: 1589

merchant:
  name: "官方测试商户"
  description: "IO011 官方测试商户"

hubs:
  - name: "AICart Hub"
    url: "http://localhost:1569"
    api_key: "test_api_key"
    auto_sync: true
EOF

# 启动服务
nohup node src/index.js > /opt/io011/logs/merchant-skill.log 2>&1 &

# 验证
curl -s http://localhost:1589/api/health
```

---

### 步骤 8: 注册商户到 Hub

```bash
# 商户注册
curl -s -X POST http://localhost:1569/api/merchants/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "官方测试商户",
    "endpoint": "http://localhost:1589",
    "tags": {
      "categories": ["茶具", "陶瓷", "手工艺术品"],
      "capabilities": ["支持定制", "48小时发货", "包邮"],
      "region": "景德镇"
    }
  }'

# 验证商户列表
curl -s http://localhost:1569/api/merchants

# 验证搜索功能
curl -s "http://localhost:1569/api/search?tags=茶具"
```

---

## ✅ 部署验证

### 检查所有端口

```bash
# 查看端口监听状态
netstat -tlnp | grep -E "1566|1568|1569|1588|1589"
```

预期输出:
```
tcp        0      0 0.0.0.0:1566      0.0.0.0:*       LISTEN      xxxx/node
tcp        0      0 0.0.0.0:1568      0.0.0.0:*       LISTEN      xxxx/node
tcp        0      0 0.0.0.0:1569      0.0.0.0:*       LISTEN      xxxx/node
tcp        0      0 0.0.0.0:1588      0.0.0.0:*       LISTEN      xxxx/node
tcp        0      0 0.0.0.0:1589      0.0.0.0:*       LISTEN      xxxx/node
```

### 测试 API

```bash
# 1. Hub API
curl -s http://localhost:1569/api/health
# 预期: {"status":"ok",...}

# 2. 商户 Skill
curl -s http://localhost:1589/api/health
# 预期: {"ok":true}

# 3. 商户列表
curl -s http://localhost:1569/api/merchants
# 预期: {"merchants":[...]}

# 4. 搜索测试
curl -s "http://localhost:1569/api/search?tags=茶具"
# 预期: 返回商户和商品数据
```

---

## 🔄 服务管理命令

### 查看日志
```bash
tail -f /opt/io011/logs/hub.log          # Hub 后端
tail -f /opt/io011/logs/hub-ui.log       # Hub 前端
tail -f /opt/io011/logs/merchant-skill.log  # 商户 Skill
```

### 重启服务
```bash
# 重启 Hub 后端
pkill -f "node src/index.js" && cd /opt/io011/github-repo/hub && nohup node src/index.js > /opt/io011/logs/hub.log 2>&1 &

# 或者使用 PM2 (推荐)
cd /opt/io011/github-repo/hub
pm2 start src/index.js --name "io011-hub"
pm2 save
```

### 启动所有服务 (一键脚本)
```bash
#!/bin/bash

echo "启动 IO011 所有服务..."

# Hub 后端
cd /opt/io011/github-repo/hub
nohup node src/index.js > /opt/io011/logs/hub.log 2>&1 &

# Hub 前端
cd /opt/io011/github-repo/hub-ui
nohup python server.py > /opt/io011/logs/hub-ui.log 2>&1 &

# Hub 后台
cd /opt/io011/github-repo/hub-admin
nohup npx serve dist -l 1568 > /opt/io011/logs/hub-admin.log 2>&1 &

# 商户 Web
cd /opt/io011/github-repo/merchant-frontend
nohup npx serve dist -l 1588 > /opt/io011/logs/merchant-web.log 2>&1 &

# 商户 Skill
cd /opt/io011/github-repo/merchant-skill
nohup node src/index.js > /opt/io011/logs/merchant-skill.log 2>&1 &

echo "所有服务已启动!"
sleep 2
netstat -tlnp | grep -E "1566|1568|1569|1588|1589"
```

---

## 🌐 域名绑定 (生产环境)

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

# api.io011.com -> Hub API (1569)
server {
    listen 80;
    server_name api.io011.com;
    location / {
        proxy_pass http://127.0.0.1:1569;
        proxy_set_header Host $host;
    }
}

# shop.io011.com -> 商户 Web (1588)
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
ufw allow 1568/tcp # Hub 后台
ufw allow 1569/tcp # Hub API
ufw allow 1588/tcp # 商户 Web
ufw allow 1589/tcp # 商户 Skill

# 重新加载
ufw reload
```

---

## 🧪 自动测试脚本

保存为 `/opt/io011/test-io011.sh` 并执行:

```bash
#!/bin/bash

echo "=========================================="
echo "    IO011 系统自动化测试"
echo "=========================================="

echo ""
echo "=== 1. 检查端口 ==="
for port in 1566 1568 1569 1588 1589; do
    if netstat -tlnp 2>/dev/null | grep -q ":$port "; then
        echo "✅ 端口 $port 正在监听"
    else
        echo "❌ 端口 $port 未运行"
    fi
done

echo ""
echo "=== 2. 测试 Hub API ==="
curl -s http://localhost:1569/api/health | grep -q "ok" && echo "✅ Hub API 正常" || echo "❌ Hub API 异常"

echo ""
echo "=== 3. 测试商户 Skill ==="
curl -s http://localhost:1589/api/health | grep -q "ok" && echo "✅ 商户 Skill 正常" || echo "❌ 商户 Skill 异常"

echo ""
echo "=== 4. 测试前端页面 ==="
curl -s http://localhost:1566 | head -c 100 | grep -q "html" && echo "✅ Hub 前端正常" || echo "❌ Hub 前端异常"
curl -s http://localhost:1588 | head -c 100 | grep -q "html" && echo "✅ 商户 Web 正常" || echo "❌ 商户 Web 异常"

echo ""
echo "=== 5. 测试搜索功能 ==="
result=$(curl -s "http://localhost:1569/api/search?tags=茶具")
echo "$result" | grep -q "merchants" && echo "✅ 搜索功能正常" || echo "❌ 搜索功能异常"

echo ""
echo "=========================================="
echo "    测试完成"
echo "=========================================="
```

---

## 📋 部署检查清单

部署完成后，逐一确认:

- [ ] Hub 后端 (1569) - `curl http://localhost:1569/api/health`
- [ ] Hub 前端 (1566) - `curl http://localhost:1566`
- [ ] Hub 后台 (1568) - `curl http://localhost:1568`
- [ ] 商户端 Web (1588) - `curl http://localhost:1588`
- [ ] 商户端 Skill (1589) - `curl http://localhost:1589/api/health`
- [ ] 商户注册成功
- [ ] 搜索功能正常

---

## 📁 相关文档

| 文档 | 说明 |
|------|------|
| `docs/SYSTEM_ARCH.md` | 系统架构文档 |
| `docs/DEPLOY_CONFIG.md` | 详细配置手册 |
| `docs/QUICK_DEPLOY.md` | 快速部署指南 |
| `docs/TEST_GUIDE.md` | 测试指南 |
| `docs/USER_MANUAL.md` | 用户手册 |

---

**文档版本**: v2.3.1  
**维护者**: 蜜鼠  
**部署前请确保所有配置项已正确填写！**