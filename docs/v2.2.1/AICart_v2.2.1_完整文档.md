# AICart (IO011) A2A电商协议 - 完整项目文档

**版本**: v2.2.1  
**更新日期**: 2026年3月24日  
**更新内容**: 纯导航架构方案确认 - 标签化索引 + 并行查询  
**品牌 Slogan**: 我的数据我做主  
**架构理念**: Agent-to-Agent (A2A) Commerce

---

## 版本历史

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v1.1.1 | 2026-03-23 | 旧三层架构（Studio/Hub/Connect） |
| v2.1.1 | 2026-03-24 | A2A架构初版（Hub Skill化） |
| **v2.2.1** | 2026-03-24 | 纯导航架构确认（标签化 + 并行查询） |

---

## 文档目录

1. 项目概述与愿景
2. 纯导航架构设计
3. 产品功能设计
4. UI/UX 设计
5. 技术实现方案
6. 开发与部署计划
7. 开源规划

---

# 一、项目概述与愿景

## 1.1 品牌理念

**Slogan**: 我的数据我做主

**核心理念**: 在 AI 时代，每个商家都应该完全拥有自己的数据，通过开放的协议进行 Commerce，而不是被平台绑架。

**三大原则**:
- **数据主权100%**: 商户商品数据完全本地存储，Hub只存标签
- **Agent 自治**: 商户和用户都有自己的 AI 助手（Skill）
- **协议开放**: A2A (Agent-to-Agent) 标准协议，任何 AI 助手都可以接入

## 1.2 架构承诺

**Hub 绝对不存储**:
- 商品图片
- 商品详细描述
- 库存精确数据
- 订单信息
- 用户联系方式
- 交易记录

**Hub 只存储**:
- 商户ID
- 商户标签（类目/能力）
- 在线状态
- 连接端点
- 信誉评分（聚合值）

## 1.3 极简链路（纯导航版）

```
┌─────────────────────────────────────────────────────────┐
│              AICart 纯导航极简链路                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1️⃣ 商户注册标签      2️⃣ Hub标签匹配        3️⃣ 并行查询商户    │
│       ↓                      ↓                        ↓      │
│  ┌───────────┐           ┌───────────┐           ┌───────────┐ │
│  │ 上传类目标│           │ 根据标签找│           │ 直连商户  │ │
│  │ 签/能力标 │    ──►   │ 商户端点  │    ──►   │ 获取商品  │ │
│  │ 签        │           │ (0.1秒)   │           │ (1-2秒)   │ │
│  └───────────┘           └───────────┘           └───────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

# 二、纯导航架构设计

## 2.1 系统架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    AICART PURE-NAVIGATION ARCHITECTURE                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌───────────────────┐                      ┌───────────────────┐     │
│   │   商户AI助手       │                      │   用户AI助手       │     │
│   │ (io011-merchant)  │◄────────────────────►│  (io011-shopper)  │     │
│   │    Skill          │    端到端直连通信      │     Skill         │     │
│   └─────────┬─────────┘                      └─────────┬─────────┘     │
│             │                                          │               │
│             │ 注册标签                                 │ 查询标签       │
│             ▼                                          ▼               │
│   ┌───────────────────────────────────────────────────────────────┐   │
│   │              AICart Hub (Pure Navigation)                      │   │
│   ├───────────────────────────────────────────────────────────────┤   │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │   │
│   │  │ 商户注册中心  │  │ 标签索引引擎  │  │ 智能路由中心  │          │   │
│   │  │ Registry     │  │ Tag Indexer  │  │ Router       │          │   │
│   │  └──────────────┘  └──────────────┘  └──────────────┘          │   │
│   │                                                                  │   │
│   │  💡 只存标签，不存商品！数据主权100%保障                         │   │
│   └───────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 2.2 Hub 数据模型（纯导航）

### 商户注册信息

| 字段 | 类型 | 说明 |
|------|------|------|
| merchant_id | string | 全局唯一ID |
| name | string | 商户名称 |
| logo_url | string | Logo地址（商户自有域名） |
| endpoint | string | A2A连接端点（WebSocket） |
| public_key | string | 用于加密通信 |
| tags.categories | array | 经营类目标签 |
| tags.capabilities | array | 服务能力标签 |
| tags.location | string | 地区标签 |
| tags.price_range | object | 价格区间 |
| status.online | boolean | 在线状态 |
| status.last_seen | timestamp | 最后心跳时间 |
| reputation.score | float | 信誉评分 |
| reputation.total_transactions | int | 交易总数 |

### 标签索引结构示例

```json
{
  "tag_index": {
    "茶具": ["mer_abc123", "mer_def456", "mer_ghi789"],
    "陶瓷": ["mer_abc123", "mer_jkl012"],
    "手工": ["mer_abc123", "mer_mno345"],
    "支持定制": ["mer_abc123"],
    "48小时发货": ["mer_abc123", "mer_def456"]
  }
}
```

## 2.3 核心流程

### 商户注册流程

```
Step 1: 商户安装 io011-merchant Skill
    ↓
Step 2: 填写商户信息（名称、Logo、类目标签）
    ↓
Step 3: 生成 A2A 端点地址
    ↓
Step 4: 上传到 Hub 注册中心
    ↓
Step 5: Hub 提取标签，构建索引
    ↓
Step 6: ✅ 商户上线，可被搜索
```

### 用户查询流程

```
Step 1: 用户输入自然语言需求
    例: "想买手工茶杯，预算100-200"
    ↓
Step 2: AI助手解析意图
    类目: 茶具
    标签: 手工
    预算: 100-200
    ↓
Step 3: Hub 标签匹配（0.1秒）
    类目匹配 → 3个商户
    标签匹配 → 2个商户
    返回: 2个商户端点
    ↓
Step 4: 并行查询商户（1-2秒）
    同时向2个商户发起查询
    超时2秒，失败则跳过
    ↓
Step 5: 渐进式展示结果
    先显示商户信息
    再逐个显示商品
```

---

# 三、产品功能设计

## 3.1 Hub 端功能（Pure Navigation）

### 商户注册服务

| 功能 | 说明 | 方法 |
|------|------|------|
| 商户注册 | 新商户接入平台 | POST /api/v1/merchants/register |
| 信息更新 | 更新标签/信息 | PUT /api/v1/merchants/{id} |
| 心跳检测 | 维护在线状态 | POST /api/v1/merchants/{id}/heartbeat |
| 商户注销 | 退出平台 | DELETE /api/v1/merchants/{id} |

### 标签索引服务

| 功能 | 说明 | 方法 |
|------|------|------|
| 标签匹配 | 根据标签找商户 | GET /api/v1/search?tags=茶具,手工 |
| 类目浏览 | 查看类目下商户 | GET /api/v1/categories/{category}/merchants |
| 智能推荐 | 热门商户推荐 | GET /api/v1/merchants/recommended |

### 智能路由服务

| 功能 | 说明 |
|------|------|
| 端点解析 | 获取商户连接地址 |
| 负载均衡 | 多节点分发 |
| 故障转移 | 离线商户剔除 |

## 3.2 数据主权保障机制

**Hub 允许存储的字段**:
- merchant_id, name, logo_url, endpoint
- tags (categories, capabilities, location, price_range)
- status (online, last_seen)
- reputation (score, total_transactions)

**Hub 禁止存储的字段**:
- products (商品数据)
- inventory (库存数据)
- orders (订单信息)
- customer_data (用户数据)
- revenue (营收数据)

---

# 四、UI/UX 设计

## 4.1 渐进式查询展示

### 查询过程 UI

```
用户: "想买手工茶杯，100-200元"

AI助手:
┌─────────────────────────────────────────┐
│ 🔍 正在搜索...                          │
│                                         │
│ Step 1/3: 解析需求 ✓                    │
│   类目: 茶具 | 标签: 手工 | 预算: 100-200│
│                                         │
│ Step 2/3: 匹配商户 ✓                    │
│   找到 3 家相关商户                     │
│   • 老茶铺工作室 [景德镇 | 4.8⭐]        │
│   • 青瓷工坊 [龙泉 | 4.9⭐]             │
│   • 紫砂之家 [宜兴 | 4.7⭐]             │
│                                         │
│ Step 3/3: 获取商品...                   │
│   [████████░░] 67%                      │
│   已返回 2/3 商户结果                   │
└─────────────────────────────────────────┘
```

### 查询结果 UI

```
AI助手:
┌─────────────────────────────────────────┐
│ ✅ 搜索完成！找到 3 家商户              │
│                                         │
│ 🏪 老茶铺工作室 ⭐4.8 分               │
│ ┌─────────────────────────────────────┐ │
│ │ 📦 手工陶瓷茶杯        ¥128         │ │
│ │    库存: 50件 | 48小时发货          │ │
│ │    [查看详情] [购买]                │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 🏪 青瓷工坊 ⭐4.9 分                   │
│ ┌─────────────────────────────────────┐ │
│ │ 🍵 龙泉青瓷茶杯        ¥168         │ │
│ │    库存: 20件 | 手工拉坯            │ │
│ │    [查看详情] [购买]                │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ⚠️ 紫砂之家 响应超时，已跳过            │
└─────────────────────────────────────────┘
```

## 4.2 商户端标签管理

```
┌─────────────────────────────────────────┐
│ 🏪 商户中心 - 标签管理                   │
├─────────────────────────────────────────┤
│                                         │
│ 当前标签:                               │
│ ┌─────────────────────────────────────┐ │
│ │ 类目标签:                            │ │
│ │ [茶具] [陶瓷] [手工] [+]            │ │
│ │                                      │ │
│ │ 能力标签:                            │ │
│ │ [支持定制] [48小时发货] [包邮] [+]  │ │
│ │                                      │ │
│ │ 地区标签:                            │ │
│ │ [景德镇]                            │ │
│ │                                      │ │
│ │ 价格区间: 50-500元                  │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 💡 提示: 标签越多，被用户发现的几率越大 │
│                                         │
│ [保存标签]                              │
└─────────────────────────────────────────┘
```

---

# 五、技术实现方案

## 5.1 技术栈

| 组件 | 技术选型 | 说明 |
|------|----------|------|
| API框架 | Fastify (Node.js) | 高性能异步API |
| 数据库 | PostgreSQL | 商户元数据存储 |
| 缓存 | Redis | 标签索引、热点数据 |
| 搜索 | Redis Search | 标签快速检索 |
| 消息 | WebSocket | 实时状态更新 |

## 5.2 核心API设计

### 商户注册API

```http
POST /api/v1/merchants/register
Content-Type: application/json

{
  "name": "老茶铺工作室",
  "logo_url": "https://example.com/logo.png",
  "endpoint": "wss://my-shop.io011.com/a2a",
  "public_key": "-----BEGIN PUBLIC KEY-----...",
  "tags": {
    "categories": ["茶具", "陶瓷"],
    "capabilities": ["支持定制"],
    "location": "景德镇",
    "price_range": {"min": 50, "max": 500}
  }
}

Response:
{
  "merchant_id": "mer_abc123",
  "api_key": "sk_live_xxx",
  "status": "active"
}
```

### 标签搜索API

```http
GET /api/v1/search?tags=茶具,手工&min_price=100&max_price=200

Response:
{
  "merchants": [
    {
      "id": "mer_abc123",
      "name": "老茶铺工作室",
      "endpoint": "wss://my-shop.io011.com/a2a",
      "reputation": {"score": 4.8, "transactions": 230},
      "match_tags": ["茶具", "手工"]
    }
  ],
  "total": 3
}
```

## 5.3 并行查询算法

```javascript
// 并行查询多个商户
async function parallelMerchantQuery(merchants, query, options = {}) {
  const { timeout = 2000, maxConcurrent = 5 } = options;
  
  // 创建查询任务
  const tasks = merchants.map(merchant => 
    querySingleMerchant(merchant, query, timeout)
  );
  
  // 并行执行，保留顺序
  const results = await Promise.allSettled(tasks);
  
  // 过滤成功结果
  return results
    .filter(r => r.status === 'fulfilled' && r.value.status === 'success')
    .map(r => r.value);
}

async function querySingleMerchant(merchant, query, timeout) {
  try {
    const ws = new WebSocket(merchant.endpoint);
    
    // 发送查询
    ws.send(JSON.stringify({
      action: 'search_products',
      query: query,
      timestamp: Date.now()
    }));
    
    // 等待响应（带超时）
    const response = await Promise.race([
      waitForMessage(ws),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), timeout)
      )
    ]);
    
    return {
      merchant: merchant,
      products: response.products,
      status: 'success'
    };
    
  } catch (error) {
    return {
      merchant: merchant,
      products: [],
      status: 'error',
      error: error.message
    };
  }
}
```

---

# 六、开发与部署计划

## 6.1 里程碑规划

### Phase 1: Hub MVP（Week 1-2）

**目标**: 搭建纯导航Hub，支持商户注册和标签匹配

| 任务 | 时间 | 产出 |
|------|------|------|
| 数据库设计 | Day 1-2 | 商户表、标签索引表 |
| 注册API | Day 3-4 | 商户注册、标签提取 |
| 搜索API | Day 5-6 | 标签匹配、商户返回 |
| 心跳检测 | Day 7 | 在线状态维护 |
| 部署上线 | Day 8-10 | 云服务器部署 |

### Phase 2: 商户端（Week 3-4）

**目标**: 商户可以注册并响应查询

| 任务 | 时间 | 产出 |
|------|------|------|
| Skill框架 | Day 1-3 | io011-merchant基础 |
| 商品管理 | Day 4-5 | 本地商品录入 |
| A2A接口 | Day 6-7 | 响应Hub查询 |
| Hub对接 | Day 8-10 | 注册、心跳、查询响应 |

### Phase 3: 用户端（Week 5-6）

**目标**: 用户可以搜索并购买

| 任务 | 时间 | 产出 |
|------|------|------|
| Skill框架 | Day 1-3 | io011-shopper基础 |
| 查询接口 | Day 4-5 | 调用Hub、并行查询 |
| 商品展示 | Day 6-7 | 聚合结果展示 |
| 下单流程 | Day 8-10 | 直连商户下单 |

## 6.2 开源计划

### GitHub 仓库结构

```
aicart-io011/
├── README.md                 # 项目介绍
├── LICENSE                   # MIT开源协议
├── docs/                     # 文档
│   ├── v1.1.1/              # 旧版架构文档
│   ├── v2.1.1/              # A2A初版文档
│   └── v2.2.1/              # 纯导航版文档
├── hub/                      # Hub端代码
│   ├── src/
│   ├── tests/
│   └── Dockerfile
├── merchant-skill/           # 商户端Skill
│   ├── src/
│   ├── config/
│   └── README.md
├── shopper-skill/            # 用户端Skill
│   ├── src/
│   ├── config/
│   └── README.md
├── protocol/                 # A2A协议规范
│   ├── a2a-protocol-v1.md
│   └── schemas/
└── examples/                 # 示例代码
    ├── merchant-example/
    └── integration-tests/
```

### 开源协议

MIT License - 允许自由使用、修改、商用

---

# 七、总结

## 核心设计原则

1. **数据主权100%**: Hub只存标签，不碰商品数据
2. **并行查询**: 同时查询多个商户，保证效率
3. **渐进展示**: 用户先看到进度，再看到结果
4. **容错设计**: 单个商户失败不影响整体体验

## 下一步行动

1. ✅ 创建 GitHub 仓库
2. ✅ 编写 Hub 端 MVP 代码
3. ⏳ 部署测试环境
4. ⏳ 开发商户端 Skill
5. ⏳ 开发用户端 Skill
6. ⏳ 端到端联调测试

---

**文档维护**: 本文档遵循语义化版本管理

**AICart - 我的数据我做主**
