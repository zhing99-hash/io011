# AICart A2A Protocol v0.1

> **Agent-to-Agent Commerce Protocol**  
> AI时代的去中心化商业协议草案  
> 版本: v0.1 | 状态: Draft | 最后更新: 2025-03-27

---

## 1. 概述 (Overview)

### 1.1 愿景 (Vision)

**"我的数据我做主"**

AICart A2A Protocol 旨在构建一个开放、去中心化的AI原生商业协议，让商户能够：
- **自主掌控数据** — 商品详情本地存储，不依赖中心化平台
- **AI自动运营** — Agent自动完成商品上架、客服、推荐
- **多Hub兼容** — 一个商户可同时接入多个流量Hub
- **协议开放** — MIT许可，任何人可参与

### 1.2 核心原则 (Core Principles)

| 原则 | 描述 |
|------|------|
| **Data Sovereignty (数据主权)** | 商户拥有完整数据所有权，Hub仅存储索引 |
| **Minimal Trust (最小信任)** | 去中心化架构，不依赖单一平台 |
| **AI-Native (AI原生)** | 协议设计以AI Agent为核心用户 |
| **Open & Extensible (开放可扩展)** | 开放协议，支持多Hub生态 |

### 1.3 协议范围 (Scope)

**MVP阶段核心闭环：**

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  商户端   │────→│  HUB端   │←────│  用户端   │────→│  商户端   │
│(Merchant)│     │  (HUB)   │     │  (User)  │     │(Merchant)│
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                 │                 │                 │
  商品录入          索引同步           查询请求           详情回源
  Product          Index            Query             Detail
  Ingest          Sync             Request            Fetch
```

**本期实现：**
- ✅ 商户注册与信息管理
- ✅ 商品索引同步（增量）
- ✅ 用户查询与商户回源
- ✅ 心跳与状态监控

**预留扩展：**
- 🔄 订单创建与状态通知
- 🔄 AI推荐协议
- 🔄 智能合约结算

---

## 2. 协议基础 (Protocol Basics)

### 2.1 协议标识 (Protocol Identity)

```yaml
Name: AICart A2A Protocol
Version: 0.1.0
Full Name: aicart-a2a/0.1.0
Content-Type: application/json
Charset: UTF-8
Base Path: /api/v1/a2a
```

### 2.2 传输协议 (Transport)

- **协议**: HTTPS (强制)
- **端口**: 443 (标准) 或 自定义
- **格式**: JSON
- **编码**: UTF-8
- **Content-Type**: `application/json`

### 2.3 认证机制 (Authentication)

#### 2.3.1 API Key 管理

```
┌─────────────────────────────────────────────────────────────┐
│                    API Key 结构                              │
├─────────────────────────────────────────────────────────────┤
│  ak_live_xxxxxxxxxxxxxxxx  - 生产环境 Key                     │
│  ak_test_xxxxxxxxxxxxxxxx  - 测试环境 Key                     │
│  sk_xxxxxxxxxxxxxxxx       - 签名密钥 (Server-side only)     │
└─────────────────────────────────────────────────────────────┘
```

**Key 格式：**
- 前缀: `ak_` (Access Key) / `sk_` (Secret Key)
- 环境: `live` / `test`
- 主体: 24位随机字符串 (Base64URL)

#### 2.3.2 请求签名算法

**签名流程：**

```
StringToSign = Method + "\n" +
               Path + "\n" +
               Timestamp + "\n" +
               BodyHash

Signature = HMAC-SHA256(StringToSign, SecretKey)
```

**请求头：**

```http
Authorization: AICART-A2A-V1 {AccessKey}:{Signature}
X-A2A-Timestamp: 1711536000
X-A2A-Nonce: uuid-v4-string
```

**签名示例代码 (Python):**

```python
import hmac
import hashlib
import base64
from datetime import datetime

def sign_request(method: str, path: str, body: str, secret_key: str) -> str:
    timestamp = str(int(datetime.utcnow().timestamp()))
    body_hash = hashlib.sha256(body.encode()).hexdigest()
    
    string_to_sign = f"{method}\n{path}\n{timestamp}\n{body_hash}"
    signature = hmac.new(
        secret_key.encode(),
        string_to_sign.encode(),
        hashlib.sha256
    ).digest()
    
    return base64.urlsafe_b64encode(signature).decode().rstrip('=')
```

### 2.4 限流策略 (Rate Limiting)

| 端点类型 | 限流级别 | 说明 |
|----------|----------|------|
| 注册/认证 | 10 req/min | 防止暴力破解 |
| 商品同步 | 1000 req/min | 批量同步支持 |
| 查询请求 | 10000 req/min | 高并发查询 |
| 心跳上报 | 60 req/min | 每分钟1次 |

**响应头：**

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1711536600
```

---

## 3. 接口定义 (API Specification)

### 3.1 商户 → HUB 接口

#### 3.1.1 商户注册 (Merchant Register)

```http
POST /api/v1/a2a/merchants/register
```

**请求体：**

```json
{
  "merchant": {
    "name": "智能数码店",
    "description": "专注3C数码产品",
    "endpoint": "https://shop.example.com/a2a",
    "webhook_url": "https://shop.example.com/webhook",
    "contact": {
      "email": "admin@example.com",
      "phone": "+86-138-xxxx-xxxx"
    },
    "categories": ["electronics", "phones"],
    "regions": ["CN", "US"],
    "supported_currencies": ["CNY", "USD"]
  },
  "signature_public_key": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
}
```

**响应体 (201 Created):**

```json
{
  "merchant_id": "mch_2vPqN5LwR8kT9jX",
  "api_key": {
    "access_key": "ak_live_a1b2c3d4e5f6g7h8i9j0",
    "secret_key": "sk_live_xxxxxxxxxxxxxxxx",
    "created_at": "2025-03-27T07:32:00Z"
  },
  "status": "pending_verification",
  "created_at": "2025-03-27T07:32:00Z"
}
```

#### 3.1.2 更新商户信息 (Update Merchant)

```http
PUT /api/v1/a2a/merchants/{merchant_id}
Authorization: AICART-A2A-V1 {AccessKey}:{Signature}
```

**请求体：**

```json
{
  "name": "智能数码旗舰店",
  "description": "专注3C数码及配件",
  "endpoint": "https://shop.example.com/a2a",
  "categories": ["electronics", "phones", "accessories"]
}
```

**响应体 (200 OK):**

```json
{
  "merchant_id": "mch_2vPqN5LwR8kT9jX",
  "updated_fields": ["name", "description", "categories"],
  "updated_at": "2025-03-27T08:15:00Z"
}
```

#### 3.1.3 同步商品索引 (Sync Product Index)

```http
POST /api/v1/a2a/products/sync
Authorization: AICART-A2A-V1 {AccessKey}:{Signature}
```

**请求体：**

```json
{
  "sync_type": "delta",
  "sync_id": "sync_20250327_001",
  "timestamp": "2025-03-27T07:30:00Z",
  "products": [
    {
      "action": "upsert",
      "product_index": {
        "product_id": "prod_iPhone15_256GB",
        "sku": "APL-IP15-256-BLK",
        "name": "iPhone 15 256GB 黑色",
        "category": ["electronics", "phones", "apple"],
        "price": {
          "currency": "CNY",
          "amount": 6999.00
        },
        "availability": "in_stock",
        "tags": ["新品", "5G", "旗舰"],
        "embedding_id": "emb_abc123",
        "updated_at": "2025-03-27T07:30:00Z"
      }
    },
    {
      "action": "delete",
      "product_id": "prod_iPhone14_128GB"
    }
  ]
}
```

**响应体 (200 OK):**

```json
{
  "sync_id": "sync_20250327_001",
  "processed": 2,
  "successful": 2,
  "failed": 0,
  "results": [
    {
      "product_id": "prod_iPhone15_256GB",
      "status": "success",
      "action": "upserted"
    },
    {
      "product_id": "prod_iPhone14_128GB",
      "status": "success",
      "action": "deleted"
    }
  ],
  "hub_index_version": "v20250327073000"
}
```

#### 3.1.4 心跳/状态上报 (Heartbeat)

```http
POST /api/v1/a2a/heartbeat
Authorization: AICART-A2A-V1 {AccessKey}:{Signature}
```

**请求体：**

```json
{
  "merchant_id": "mch_2vPqN5LwR8kT9jX",
  "timestamp": "2025-03-27T07:32:00Z",
  "status": "active",
  "metrics": {
    "total_products": 156,
    "available_products": 142,
    "avg_response_time_ms": 45,
    "health_score": 98.5
  },
  "capabilities": {
    "query": true,
    "order": false,
    "ai_assistant": true
  }
}
```

**响应体 (200 OK):**

```json
{
  "received_at": "2025-03-27T07:32:01Z",
  "next_expected": "2025-03-27T07:33:00Z",
  "hub_status": "connected",
  "pending_actions": []
}
```

### 3.2 HUB → 商户 接口

#### 3.2.1 商品查询请求 (Product Query)

```http
POST {merchant_endpoint}/query
Authorization: AICART-A2A-V1 {HubAccessKey}:{Signature}
X-A2A-Sender: hub_main
```

**请求体：**

```json
{
  "query_id": "qry_9xY8zW7vU6tS5rR",
  "timestamp": "2025-03-27T07:35:00Z",
  "source": "hub_main",
  "user_context": {
    "session_id": "sess_abc123",
    "language": "zh-CN",
    "region": "CN",
    "currency": "CNY"
  },
  "query": {
    "type": "semantic",
    "text": "适合拍照的手机",
    "embedding": [0.023, -0.156, 0.891, ...],
    "filters": {
      "category": ["phones"],
      "price_range": {
        "min": 5000,
        "max": 10000,
        "currency": "CNY"
      },
      "in_stock": true
    }
  },
  "options": {
    "limit": 10,
    "offset": 0,
    "include_details": true,
    "include_embedding": false
  }
}
```

**响应体 (200 OK):**

```json
{
  "query_id": "qry_9xY8zW7vU6tS5rR",
  "merchant_id": "mch_2vPqN5LwR8kT9jX",
  "responded_at": "2025-03-27T07:35:00.045Z",
  "results": [
    {
      "product_id": "prod_iPhone15_256GB",
      "sku": "APL-IP15-256-BLK",
      "name": "iPhone 15 256GB 黑色",
      "category": ["electronics", "phones", "apple"],
      "price": {
        "currency": "CNY",
        "amount": 6999.00
      },
      "availability": "in_stock",
      "score": 0.95,
      "url": "https://shop.example.com/products/iPhone15-256GB",
      "images": [
        "https://cdn.example.com/img/iphone15-black-1.jpg"
      ],
      "highlights": ["4800万像素主摄", "电影模式", "动作模式"],
      "attributes": {
        "brand": "Apple",
        "model": "iPhone 15",
        "storage": "256GB",
        "color": "黑色"
      }
    }
  ],
  "total": 1,
  "page": {
    "limit": 10,
    "offset": 0,
