# IO011 系统架构与部署方案 (v2.3.1)

> 最后更新: 2026-04-01  
> 状态: 生产环境就绪

---

## 🏗️ 完整架构

```
┌──────────────────────────────────────────────────────────────────┐
│                            用户端                                │
│              www.io011.com:1566 (Hub 前端)                      │
│              • 搜索框、进度展示、商户/商品结果                    │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼ 用户搜索商品
┌──────────────────────────────────────────────────────────────────┐
│                         Hub 中心                                  │
│                                                                │
│  ┌─────────────────┐     ┌─────────────────────────────────┐   │
│  │  Hub 前端       │     │  Hub API                        │   │
│  │  www.io011.com  │     │  api.io011.com (公网域名)       │   │
│  │  端口 1566      │     │  端口 1569                      │   │
│  └─────────────────┘     └─────────────────────────────────┘   │
│                                                                │
│  数据库:                                                       │
│  • merchants 表 (endpoint, tags, api_key)                     │
│  • tags 表 (类目、地区)                                        │
│  • users 表 (用户管理)                                         │
└────────────────────────────┬─────────────────────────────────────┘
                             │
               ┌─────────────┼─────────────┐
               ▼             ▼             ▼
        ┌───────────┐ ┌───────────┐ ┌───────────┐
        │ 官方商户   │ │ 商户 A    │ │ 商户 B    │
        │ shop.io   │ │ 自定义    │ │ 自定义    │
        │ (测试商户) │ │           │ │           │
        └───────────┘ └───────────┘ └───────────┘
              │               │             │
              ▼               ▼             ▼
        ┌─────────────────────────────────────────────────────┐
        │              商户端 (A2A 接口)                       │
        │  • OpenClaw Skill: merchant-skill                  │
        │  • API 端点: /api/v1/query (接收 Hub 请求)          │
        │  • API 端点: /api/merchant/info (商户信息)          │
        └─────────────────────────────────────────────────────┘
```

---

## 🔌 端口/域名配置

| 服务 | 域名/URL | 端口 | 说明 |
|------|----------|------|------|
| **Hub 前端** | www.io011.com | 1566 | 用户访问入口 |
| **Hub API** | api.io011.com | 1569 | 所有 API 接口 |
| 官方商户 Web | shop.io011.com | 1588 | 测试商户后台 |
| 官方商户 Skill | shop.io011.com | 1589 | 测试商户 A2A |
| 其他商户 | (自定义) | (动态) | 按注册时提交 |

---

## 📦 部署清单

### 1. Hub 后端 (API 服务)
```bash
cd /opt/io011/github-repo/hub

# 配置 .env
echo "PORT=1569" > .env

# 启动
node src/index.js

# 验证
curl http://localhost:1569/api/health
```

**数据库依赖**: PostgreSQL + Redis (需提前启动)

---

### 2. Hub 前端 (用户界面)
```bash
cd /opt/io011/github-repo/hub-ui

# 修改端口
sed -i 's/19800/1566/' server.py

# 启动
python server.py

# 或用 serve
serve dist -l 1566
```

---

### 3. 官方商户端 (测试用)

#### 3.1 Skill (A2A 接口)
```bash
cd /opt/io011/github-repo/merchant-skill

# 配置
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

# 启动
node src/index.js
```

#### 3.2 Web 后台
```bash
cd /opt/io011/github-repo/merchant-frontend
npm install
npm run build
serve dist -l 1588
```

---

## 🔗 服务对接步骤

### Step 1: 启动所有服务后验证
```bash
# Hub API 健康检查
curl http://localhost:1569/api/health

# 商户 Skill 健康检查
curl http://localhost:1589/api/health
```

### Step 2: 注册官方商户到 Hub
```bash
curl -X POST http://localhost:1569/api/merchants/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "官方测试商户",
    "endpoint": "http://localhost:1589",
    "logo_url": "https://io011.com/logo.png",
    "tags": {
      "categories": ["茶具", "陶瓷", "手工艺术品"],
      "capabilities": ["支持定制", "48小时发货", "包邮"],
      "region": "景德镇"
    }
  }'
```

### Step 3: 验证商户列表
```bash
curl http://localhost:1569/api/merchants
```

### Step 4: 测试搜索
```bash
curl "http://localhost:1569/api/search?tags=茶具"
```

---

## 🔧 商户接入规范 (A2A 模式)

### 商户需完成的步骤

1. **安装 OpenClaw 助手**
2. **安装 merchant-skill**
3. **配置 merchant.yaml**:
   ```yaml
   server:
     port: 自动分配
   
   merchant:
     name: "商户名称"
     description: "商户描述"
   
   hubs:
     - name: "AICart Hub"
       url: "https://api.io011.com"  # 正式环境用此地址
       api_key: "{商户申请到的Key}"
       auto_sync: true
   ```

4. **启动 Skill** (获得 A2A 接口地址)
5. **到 Hub 商户后台注册** (提交 endpoint)

---

### 商户必须实现的 API

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/merchant/info` | GET | 返回商户信息 |
| `/api/v1/query` | POST | 接收查询请求，返回商品 |

---

## ⚠️ 重要配置

### 1. 域名绑定 (生产环境)

需要配置:
- `www.io011.com` → 1566 (前端)
- `api.io011.com` → 1569 (API)

Nginx/Caddy 配置示例:
```nginx
# www.io011.com -> 1566
server {
    server_name www.io011.com;
    location / {
        proxy_pass http://127.0.0.1:1566;
    }
}

# api.io011.com -> 1569
server {
    server_name api.io011.com;
    location / {
        proxy_pass http://127.0.0.1:1569;
    }
}
```

### 2. 防火墙

开放端口: 80, 443, 1566, 1569, 1588, 1589

---

## ✅ 部署后检查清单

- [ ] Hub 后端 (1569) 运行正常
- [ ] Hub 前端 (1566) 运行正常
- [ ] 商户端 Skill (1589) 运行正常
- [ ] 商户端 Web (1588) 运行正常
- [ ] 商户注册成功
- [ ] 搜索测试通过

---

**文档版本**: v2.3.1  
**维护者**: 蜜鼠