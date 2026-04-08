# IO011 v2.3.3 部署指南

**版本**: 2.3.3  
**日期**: 2026-04-03  
**状态**: 🆕 新部署 + Logo UI 调整

---

## 📦 代码包

### 位置
- `github-repo/io011-v2.3.3-full.zip` (本地)
- GitHub 分支: `v2.3.1-dev`

### 主要更新内容
1. **后端 API 新增**
   - 登录认证: `/api/v1/auth/*`
   - 订单管理: `/api/v1/orders/*`
   - 商品管理: `/api/v1/products/*`

2. **展示中心页面** (www.io011.com)
   - 新首页 (HubHome)
   - 商家列表 (HubMerchants)
   - API文档 (HubDocs)
   - Logo 调整为紫色圆角

3. **用户端** (user.io011.com:1556)
   - 登录页 (UserLogin) - 蓝色Logo
   - 订单页 (UserOrders)
   - 个人中心 (UserProfile)

4. **商户端** (shop.io011.com:1588)
   - 商品管理页面 (MerchantProducts)
   - Logo 调整为绿色圆角

5. **Hub后台** (hub-admin.io011.com:1568)
   - 登录页 Logo 调整

---

## 🗄️ 数据库更新 (重要!)

执行以下 SQL 创建新表:

```bash
# 登录数据库
psql -U aicart -d aicart_hub

# 执行 schema
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(36) PRIMARY KEY,
    order_number VARCHAR(32) NOT NULL UNIQUE,
    merchant_id VARCHAR(32) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    items JSONB NOT NULL DEFAULT '[]',
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    contact VARCHAR(100),
    address TEXT,
    tracking_number VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(36) PRIMARY KEY,
    merchant_id VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    original_price DECIMAL(10, 2),
    category VARCHAR(100),
    images JSONB NOT NULL DEFAULT '[]',
    stock INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);
```

---

## 🚀 部署步骤 (重要!)

### 1. 解压代码
```bash
cd /web
unzip io011-v2.3.3-full.zip
```

### 2. 重新构建 Hub Admin (关键!)
```bash
cd hub-admin

# 安装依赖
npm install

# 构建 (必须!)
npm run build

# 重启 Hub 后端
cd ../hub
npm install
npm run build
pm2 restart hub
```

**重要**: 路由已修复，构建后:
- `/` → 展示中心首页 (HubHome)
- `/merchants` → 商家列表
- `/docs` → API文档
- `/admin` → Hub后台管理
```bash
cd hub

# 安装依赖
npm install

# 构建
npm run build

# 重启服务
pm2 restart hub
# 或
node dist/index.js
```

**验证**: `curl https://api.io011.com/health`

### 3. 展示中心 (端口 1566)
```bash
cd hub-admin

# 安装依赖
npm install

# 构建
npm run build

# 配置 Nginx 指向 dist/
```

**域名**: www.io011.com

### 4. 用户端 (端口 1556)
```bash
cd user-frontend

# 安装依赖
npm install

# 构建
npm run build
```

**域名**: user.io011.com

### 5. 商户端 (端口 1588)
```bash
cd merchant-frontend

# 安装依赖
npm install

# 构建
npm run build
```

**域名**: shop.io011.com

---

## 🔧 端口配置

| 服务 | 端口 | 域名 |
|------|------|------|
| Hub API | 1569 | api.io011.com |
| 展示中心 | 1566 | www.io011.com |
| Hub 后台 | 1568 | hub-admin.io011.com |
| 用户端 | 1556 | user.io011.com |
| 商户端 | 1588 | shop.io011.com |

---

## ✅ 验证清单

部署完成后检查:

- [ ] `https://api.io011.com/health` 返回版本 **2.3.3**
- [ ] `https://www.io011.com` 显示展示中心首页 (紫色Logo)
- [ ] `https://www.io011.com/merchants` 显示商家列表
- [ ] `https://www.io011.com/docs` 显示API文档
- [ ] `https://user.io011.com` 显示用户端 (蓝色Logo)
- [ ] `https://shop.io011.com` 显示商户端 (绿色Logo)
- [ ] `https://hub-admin.io011.com` 登录页 (紫色Logo)

---

## 🔐 测试账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
| 运营人员 | operator | admin123 |
| 商户测试 | (任意) | merchant123 |

---

## 📤 GitHub 推送说明

### 方法一: 本地推送 (推荐, 如果网络通)
```bash
cd io011

# 添加远程仓库 (如果还没有)
git remote add origin https://github.com/zhing99-hash/io011.git

# 提交所有更改
git add .
git commit -m "v2.3.3: logo updates and UI adjustments"

# 推送到 GitHub
git push --set-upstream origin v2.3.1-dev
```

### 方法二: 打包发送
如果网络不通:
1. 本地执行: `git archive -o io011-v2.3.3-full.zip HEAD`
2. 把 zip 文件发给小鹰
3. 小鹰解压后执行上述 git 命令

---

## 📞 支持

如有疑问请联系: hello@io011.com

---

*整理: 蜜鼠 🐹*  
*日期: 2026-04-03*  
*版本: v2.3.3*