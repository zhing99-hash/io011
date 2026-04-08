# IO011 商户端 - 后端对接文档

**版本**: v1.0  
**日期**: 2026-04-04  
**状态**: 开发完成

---

## 📋 概述

本文档说明 IO011 商户端如何与 Hub 后端系统对接。

---

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                      商户端 (浏览器)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  login.html │  │ dashboard   │  │ products    │        │
│  │  (登录页)    │  │ (仪表盘)     │  │ (商品管理)   │        │
│  │             │  │             │  │             │        │
│  │  orders     │  │ inactive    │  │  js/api.js  │        │
│  │  (订单管理)  │  │ (下架商品)   │  │ (API服务)   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Hub 后端 (端口 1569)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ /api/auth   │  │ /api/products│  │ /api/orders │        │
│  │ (认证)       │  │ (商品)       │  │ (订单)       │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│  ┌─────────────┐  ┌─────────────┐                        │
│  │ /api/merchants│ │ PostgreSQL  │                        │
│  │ (商户)       │  │ (数据库)     │                        │
│  └─────────────┘  └─────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔌 API 端点

### 1. 认证 API

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/auth/merchant/login` | 商户登录 |
| POST | `/api/auth/merchant/verify` | 验证token |
| POST | `/api/auth/admin/login` | 管理员登录 |

#### 商户登录请求
```bash
POST /api/auth/merchant/login
Content-Type: application/json

{
  "merchant_id": "mer_xxx",
  "password": "xxx"
}
```

#### 响应
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "merchant": {
    "id": "mer_xxx",
    "name": "商户名称"
  }
}
```

---

### 2. 商品 API

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/products` | 获取商品列表 |
| GET | `/api/products/:id` | 获取商品详情 |
| POST | `/api/products` | 创建商品 |
| PUT | `/api/products/:id` | 更新商品 |
| DELETE | `/api/products/:id` | 删除商品 |

#### 获取商品列表
```bash
GET /api/products?merchant_id=mer_xxx&status=active
```

#### 创建商品
```bash
POST /api/products
Content-Type: application/json

{
  "merchant_id": "mer_xxx",
  "name": "商品名称",
  "price": 99.00,
  "category": "电子产品",
  "description": "商品描述",
  "image": "data:image/png;base64,..."
}
```

---

### 3. 订单 API

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/orders` | 获取订单列表 |
| GET | `/api/orders/:id` | 获取订单详情 |
| PUT | `/api/orders/:id` | 更新订单状态 |

#### 订单状态流转
```
pending → paid → shipped → completed
```

---

### 4. 商户 API

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/merchants/:id` | 获取商户信息 |
| PUT | `/api/merchants/:id` | 更新商户信息 |
| POST | `/api/merchants/:id/heartbeat` | 心跳 |

---

## 📁 文件结构

```
work/io011-merchant/
├── js/
│   └── api.js          # API 服务层
├── login.html          # 登录页
├── dashboard.html      # 仪表盘
├── index.html          # 商品管理
├── inactive.html       # 下架商品
├── orders.html         # 订单管理
└── README.md           # 本文档
```

---

## 🔧 配置

### API 地址配置

在 `js/api.js` 中修改：

```javascript
// 本地开发
const API_BASE = 'http://localhost:1569/api';

// 生产环境
const API_BASE = 'https://api.io011.com/api';
```

---

## 🧪 测试

### 本地测试模式
- 使用测试账号：`test` / `123456`
- 数据存储在浏览器 localStorage
- 无需启动后端服务

### 生产模式
1. 启动 Hub 后端 (端口 1569)
2. 注册商户获取 merchant_id 和密码
3. 修改 js/api.js 中的 API_BASE
4. 使用真实账号登录

---

## ⚠️ 注意事项

1. **CORS**: 生产环境需配置跨域资源共享
2. **HTTPS**: 生产环境必须使用 HTTPS
3. **Token 过期**: 需要实现 token 过期处理
4. **图片存储**: 当前使用 Base64，建议使用对象存储

---

## 📝 数据结构

### 商户 (Merchant)
```json
{
  "id": "mer_xxx",
  "name": "商户名称",
  "logo_url": "https://...",
  "endpoint": "http://...",
  "tags": {
    "categories": ["电子产品"],
    "regions": ["华东"]
  },
  "api_key": "sk_live_xxx",
  "status": "active",
  "created_at": "2026-01-01T00:00:00Z"
}
```

### 商品 (Product)
```json
{
  "id": "prod_xxx",
  "merchant_id": "mer_xxx",
  "name": "商品名称",
  "price": 99.00,
  "category": "电子产品",
  "description": "描述",
  "image": "data:image/...",
  "status": "active",
  "created_at": "2026-01-01T00:00:00Z"
}
```

### 订单 (Order)
```json
{
  "id": "ord_xxx",
  "merchant_id": "mer_xxx",
  "product_id": "prod_xxx",
  "user_id": "user_xxx",
  "quantity": 1,
  "total_amount": 99.00,
  "status": "pending",
  "tracking_number": "SF123456789",
  "created_at": "2026-01-01T00:00:00Z"
}
```

---

*整理: 蜜鼠 🐹*
*日期: 2026-04-04*