# IO011/AICart 线上部署规划

**日期**: 2026-03-29  
**目标**: 美国服务器线上部署  
**规划版本**: v1.0

---

## 📊 架构分析

### 三个端的部署需求

| 端 | 类型 | 是否需要独立服务器 | 说明 |
|----|------|------------------|------|
| **Hub端** | 后端服务 | ✅ 需要 | 提供API服务、标签索引、商户注册 |
| **商户端** | 后端服务 | ✅ 需要 | A2A WebSocket服务、商品数据 |
| **用户端** | 客户端Skill | ❌ 不需要 | 用户加载Skill即可，无需部署 |

**结论**: 只需要部署 **2个服务**（Hub + 商户端），用户端是客户端应用，不需要服务器。

---

## 🏗️ 部署方案选择

### 方案A: 一台服务器 + Docker Compose（推荐）

```
美国服务器 (VPS)
├── Hub服务        → 端口 8080
├── 商户A服务      → 端口 8081
├── 商户B服务      → 端口 8082
├── PostgreSQL    → 端口 5432 (内部)
└── Redis         → 端口 6379 (内部)
```

**优点**:
- 成本低，一台服务器即可
- 管理方便，统一部署
- 适合MVP测试阶段

**缺点**:
- 单点故障
- 扩展性有限

**推荐**: MVP阶段使用此方案

---

### 方案B: 三台独立服务器

```
服务器1: Hub端     → hub.io011.com
服务器2: 商户端1   → merchant1.io011.com  
服务器3: 商户端2   → merchant2.io011.com
```

**优点**:
- 高可用
- 独立扩展
- 真实生产环境

**缺点**:
- 成本高
- 运维复杂

**推荐**: 生产环境后期使用

---

## 🎯 最终建议

**第一阶段: MVP测试（现在）**
- 使用 **一台美国服务器**
- Docker Compose部署
- Hub + 2-3个商户端
- 使用IP或临时域名访问

**第二阶段: 生产环境（后期）**
- Hub独立服务器
- 商户端各自独立部署
- 真实域名 + SSL
- 负载均衡

---

## 📋 部署步骤规划

### 步骤1: 服务器准备
```bash
# 1.1 更新系统
sudo apt update && sudo apt upgrade -y

# 1.2 安装Docker
sudo apt install docker.io docker-compose -y
sudo systemctl enable docker
sudo systemctl start docker

# 1.3 安装Node.js
sudo apt install nodejs npm -y

# 1.4 创建部署目录
mkdir -p /opt/io011
cd /opt/io011
```

---

### 步骤2: 部署Hub端

```bash
# 2.1 上传代码到服务器
# 方式1: git clone
git clone https://github.com/your-org/io011-hub.git hub

# 方式2: 上传压缩包
cd /opt/io011
unzip hub.zip

# 2.2 进入Hub目录
cd hub

# 2.3 配置环境变量
cp .env.example .env
nano .env  # 编辑配置

# 关键配置项:
# PORT=8080
# DB_PASSWORD=your_secure_password
# JWT_SECRET=your_jwt_secret
# NODE_ENV=production

# 2.4 启动服务
docker-compose up -d

# 2.5 验证
 curl http://localhost:8080/health
```

---

### 步骤3: 部署商户端

```bash
# 3.1 创建商户目录
mkdir -p /opt/io011/merchants
cd /opt/io011/merchants

# 3.2 商户1 - 茶韵轩
mkdir merchant1
cd merchant1
# 上传商户端代码
cp ../../hub/.env.example .env
# 编辑配置: PORT=8081, MERCHANT_ID=mer_001, MERCHANT_NAME=茶韵轩
docker-compose up -d

# 3.3 商户2 - 茗香阁
mkdir ../merchant2
cd ../merchant2
# 上传代码
# 编辑配置: PORT=8082, MERCHANT_ID=mer_002, MERCHANT_NAME=茗香阁
docker-compose up -d
```

---

### 步骤4: 配置Nginx反向代理（可选）

```nginx
# /etc/nginx/sites-available/io011

server {
    listen 80;
    server_name _;  # 监听所有域名
    
    # Hub API
    location /hub/ {
        proxy_pass http://localhost:8080/;
        proxy_set_header Host $host;
    }
    
    # 商户1
    location /merchant1/ {
        proxy_pass http://localhost:8081/;
    }
    
    # 商户2
    location /merchant2/ {
        proxy_pass http://localhost:8082/;
    }
}
```

---

### 步骤5: 安全配置

```bash
# 5.1 配置防火墙
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 8080/tcp  # Hub API
sudo ufw allow 8081/tcp  # 商户1
sudo ufw allow 8082/tcp  # 商户2
sudo ufw enable

# 5.2 配置SSL (如果有域名)
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

---

## 🗂️ 服务器目录结构

```
/opt/io011/
├── hub/                      # Hub端
│   ├── docker-compose.yml
│   ├── .env
│   └── src/
│
├── merchants/                # 商户端
│   ├── merchant1/           # 茶韵轩
│   │   ├── docker-compose.yml
│   │   └── .env
│   └── merchant2/           # 茗香阁
│       ├── docker-compose.yml
│       └── .env
│
├── data/                     # 数据持久化
│   ├── postgres/            # Hub数据库
│   └── redis/               # Hub缓存
│
└── scripts/                  # 运维脚本
    ├── deploy.sh
    ├── backup.sh
    └── health-check.sh
```

---

## 📝 部署检查清单

### 部署前
- [ ] 服务器SSH连接正常
- [ ] Docker已安装
- [ ] 防火墙配置
- [ ] 域名解析（如有域名）

### 部署中
- [ ] Hub服务启动
- [ ] 数据库连接成功
- [ ] Redis缓存正常
- [ ] 商户端启动
- [ ] 商户注册到Hub

### 部署后验证
- [ ] Hub Health API: http://IP:8080/health
- [ ] Hub Search API: http://IP:8080/api/v1/search?tags=茶具
- [ ] 商户端Health: http://IP:8081/health
- [ ] 防火墙端口开放
- [ ] 日志无错误

---

## 🔧 测试验证命令

```bash
# 1. 测试Hub健康
curl http://YOUR_SERVER_IP:8080/health

# 2. 测试搜索API
curl "http://YOUR_SERVER_IP:8080/api/v1/search?tags=茶具&limit=3"

# 3. 测试商户注册
curl -X POST http://YOUR_SERVER_IP:8080/api/v1/merchants/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试商户",
    "endpoint": "http://YOUR_SERVER_IP:8081/a2a",
    "tags": {"categories": ["茶具"]}
  }'

# 4. 查看服务状态
docker-compose ps
docker-compose logs -f
```

---

## 🚀 下一步行动

请提供以下信息，我立即准备部署脚本：

1. **服务器IP地址**: ________________
2. **SSH登录信息**: 用户名 / 密码或密钥
3. **操作系统**: Ubuntu / CentOS / Debian ?
4. **是否有域名**: 有 / 无（使用IP访问）
5. **是否需要我远程协助**: 是 / 否

收到信息后，我将：
1. 准备一键部署脚本
2. 生成配置文件
3. 协助执行部署
4. 验证服务状态

---

*IO011 / AICart - 我的数据我做主*