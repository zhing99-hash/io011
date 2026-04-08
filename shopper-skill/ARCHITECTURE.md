# IO011/AICart 用户端架构设计文档

> **版本**: v1.0  
> **日期**: 2026-03-29  
> **作者**: 后端架构师  
> **目标**: 设计用户端Skill的技术架构

---

## 1. 架构概览

### 1.1 系统定位

IO011/AICart 用户端是一个**智能购物助手**，通过聚合多个商户的商品数据，为用户提供统一的商品搜索和发现体验。

### 1.2 架构原则

| 原则 | 说明 |
|------|------|
| **低延迟优先** | 用户查询2秒内必须返回结果 |
| **高可用** | 支持部分商户故障，不影响整体服务 |
| **可扩展** | 支持商户动态接入，无需修改核心代码 |
| **数据一致性** | 商品价格等关键数据实时获取，避免缓存导致的误差 |

### 1.3 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         IO011/AICart 用户端 (io011-shopper)                  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Skill API Layer                              │   │
│  │        (对外暴露 Skill 接口，接收用户搜索请求)                        │   │
│  └───────────────────────────────┬─────────────────────────────────────┘   │
│                                  │                                          │
│  ┌───────────────────────────────▼─────────────────────────────────────┐   │
│  │                      Parallel Query Engine                           │   │
│  │   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │   │
│  │   │  Hub Client     │  │ Merchant A2A    │  │ Result          │    │   │
│  │   │  (标签搜索)      │  │ Client (WebSocket│  │ Aggregator      │    │   │
│  │   │                 │  │  商户直连)       │  │ (结果聚合)       │    │   │
│  │   └────────┬────────┘  └────────┬────────┘  └────────┬────────┘    │   │
│  └────────────┼──────────────────┼──────────────────┼─────────────┘   │
│               │                  │                  │                  │
│  ┌────────────┴──────────────────┴──────────────────┴─────────────────┐   │
│  │                        Circuit Breaker Layer                        │   │
│  │              (熔断保护、重试策略、降级逻辑)                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
         │                         │                        │
         ▼                         ▼                        ▼
┌─────────────┐          ┌─────────────────────┐   ┌─────────────────────┐
│  Hub API    │          │   Merchant A2A      │   │   Merchant A2A      │
│  (标签索引)  │          │   wss://merchant-1  │   │   wss://merchant-2  │
└─────────────┘          └─────────────────────┘   └─────────────────────┘
```

---

## 2. 核心模块设计

### 2.1 模块职责划分

```
┌─────────────────────────────────────────────────────────┐
│                    io011-shopper Skill                   │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐  │
│  │ HubClient   │ │MerchantA2A  │ │ResultAggregator │  │
│  │  (Hub API)  │ │  Client     │ │                 │  │
│  └─────────────┘ └─────────────┘ └─────────────────┘  │
│         │               │                  ▲          │
│         └───────────────┼──────────────────┘          │
│                         │                             │
│  ┌──────────────────────┼──────────────────────┐      │
│  │           ParallelQueryEngine                │      │
│  │    (协程池、超时控制、并发限制)               │      │
│  └──────────────────────┼──────────────────────┘      │
│                         │                             │
│  ┌──────────────────────▼──────────────────────┐      │
│  │           CircuitBreakerManager               │      │
│  │    (熔断、限流、重试、健康检查)               │      │
│  └─────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────┘
```

---

### 2.2 Hub 客户端模块 (HubClient)

**职责**: 与Hub服务通信，获取商户列表和基础标签索引

#### 接口定义

```typescript
interface HubClientConfig {
  baseUrl: string;           // Hub API 基础地址
  apiKey: string;            // API 密钥
  timeout: number;           // 请求超时 (ms)
  retryCount: number;        // 重试次数
}

interface TagSearchParams {
  tags: string[];            // 标签列表，如 ["茶具", "手工"]
  minPrice?: number;         // 最低价格
  maxPrice?: number;         // 最高价格
  category?: string;         // 商品分类
  limit?: number;            // 返回数量限制
}

interface MerchantInfo {
  merchantId: string;        // 商户ID
  name: string;              // 商户名称
  a2aEndpoint: string;       // A2A WebSocket 地址
  supportedTags: string[];   // 支持的标签
  rating: number;            // 商户评分
  responseTime: number;      // 平均响应时间(ms)
}

interface HubSearchResponse {
  merchants: MerchantInfo[]; // 匹配的商户列表
  total: number;             // 总商户数
  searchId: string;          // 搜索请求ID（用于追踪）
}

// HubClient 类接口
class HubClient {
  constructor(config: HubClientConfig);
  
  // 根据标签搜索匹配的商户
  async searchMerchants(params: TagSearchParams): Promise<HubSearchResponse>;
  
  // 获取商户详情
  async getMerchantInfo(merchantId: string): Promise<MerchantInfo>;
  
  // 健康检查
  async healthCheck(): Promise<boolean>;
}
```

#### 调用模式

```
用户查询 → HubClient.searchMerchants() → GET /api/v1/search?tags=...
                                              ↓
                                    返回匹配的商户列表
                                    ┌─────────────────┐
                                    │ Merchant-1      │
                                    │ Merchant-2      │
                                    │ Merchant-3      │
                                    └─────────────────┘
```

---

### 2.3 商户A2A客户端模块 (MerchantA2AClient)

**职责**: 通过WebSocket与商户服务建立长连接，发送搜索请求并接收商品数据

#### 接口定义

```typescript
interface A2AClientConfig {
  endpoint: string;          // WebSocket 地址
  connectionTimeout: number; // 连接超时 (ms)
  requestTimeout: number;    // 请求超时 (ms)
  maxReconnectAttempts: number; // 最大重连次数
  heartbeatInterval: number; // 心跳间隔 (ms)
}

interface ProductSearchRequest {
  action: "search_products";
  searchId: string;          // 搜索请求ID
  query: string;             // 搜索关键词
  filters: {
    minPrice?: number;
    maxPrice?: number;
    tags?: string[];
    category?: string;
    inStock?: boolean;
  };
  context?: {
    userId?: string;
    sessionId?: string;
    location?: string;
  };
}

interface Product {
  id: string;                // 商品ID
  name: string;              // 商品名称
  description: string;       // 商品描述
  price: number;             // 价格
  currency: string;          // 货币单位
  images: string[];          // 图片URL列表
  tags: string[];            // 标签
  merchantId: string;        // 所属商户ID
  merchantName: string;      // 商户名称
  stock: number;             // 库存
  rating: number;            // 评分
  url: string;               // 商品链接
}

interface ProductSearchResponse {
  searchId: string;          // 搜索请求ID
  merchantId: string;        // 商户ID
  products: Product[];       // 商品列表
  total: number;             // 该商户匹配的总商品数
  searchTime: number;        // 搜索耗时(ms)
  meta?: {
    hasMore: boolean;        // 是否有更多结果
    nextCursor?: string;     // 分页游标
  };
}

// MerchantA2AClient 类接口
class MerchantA2AClient {
  constructor(merchantInfo: MerchantInfo, config: Partial<A2AClientConfig>);
  
  // 连接商户WebSocket
  async connect(): Promise<void>;
  
  // 发送商品搜索请求
  async searchProducts(request: ProductSearchRequest): Promise<ProductSearchResponse>;
  
  // 检查连接状态
  isConnected(): boolean;
  
  // 关闭连接
  async disconnect(): Promise<void>;
  
  // 连接状态事件
  on(event: "connected" | "disconnected" | "error", callback: Function): void;
}
```

#### 通信协议

```
WebSocket: wss://merchant.io011.com/a2a

┌──────────┐                    ┌──────────┐
│  Client  │ ──── CONNECT ────> │ Merchant │
│          │ <─── CONNECTED ─── │  Server  │
│          │                    │          │
│          │ ──── HEARTBEAT ──> │          │
│          │ <─── HEARTBEAT ─── │          │
│          │                    │          │
│          │ ── search_products >│          │
│          │ <─── products ─────│          │
│          │                    │          │
│          │ ──── DISCONNECT ─> │          │
└──────────┘                    └──────────┘
```

---

### 2.4 并行查询引擎 (ParallelQueryEngine)

**职责**: 同时向多个商户发送查询请求，管理并发和超时

#### 接口定义

```typescript
interface QueryEngineConfig {
  maxConcurrency: number;    // 最大并发查询数
  timeout: number;           // 全局超时时间 (ms) - 默认2000ms
  perMerchantTimeout: number; // 单个商户超时 (ms)
  enableCircuitBreaker: boolean; // 是否启用熔断
}

interface QueryTask {
  merchantId: string;
  client: MerchantA2AClient;
  request: ProductSearchRequest;
  priority: number;          // 优先级（用于排序）
}

interface QueryResult {
  merchantId: string;
  success: boolean;
  data?: ProductSearchResponse;
  error?: Error;
  latency: number;           // 实际耗时(ms)
}

interface AggregatedQueryResult {
  searchId: string;
  completedAt: string;
  totalMerchants: number;
  successfulQueries: number;
  failedQueries: number;
  results: QueryResult[];
  aggregatedProducts: Product[];
  totalProducts: number;
  searchLatency: number;     // 总耗时(ms)
}

// ParallelQueryEngine 类接口
class ParallelQueryEngine {
  constructor(config: QueryEngineConfig);
  
  // 注册商户客户端
  registerMerchant(client: MerchantA2AClient): void;
  
  // 执行并行查询
  async executeQuery(
    merchants: MerchantInfo[],
    request: ProductSearchRequest
  ): Promise<AggregatedQueryResult>;
  
  // 带优先级的查询（优先查询响应快的商户）
  async executePrioritizedQuery(
    merchants: MerchantInfo[],
    request: ProductSearchRequest,
    priorityFn?: (m: MerchantInfo) => number
  ): Promise<AggregatedQueryResult>;
  
  // 获取引擎统计信息
  getStats(): {
    totalQueries: number;
    avgLatency: number;
    successRate: number;
    activeQueries: number;
  };
}
```

#### 并发控制策略

```
┌────────────────────────────────────────────────────────────────┐
│                    并行查询执行流程                             │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  1. 初始化查询池 (根据商户历史响应时间排序)                      │
│     ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│     │ Merchant│ │ Merchant│ │ Merchant│ │ Merchant│           │
│     │ A(120ms)│ │ B(200ms)│ │ C(350ms)│ │ D(500ms)│           │
│     └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘           │
│          │           │           │           │                 │
│  2. 并发执行 (最多4个同时查询)                                  │
│          ▼           ▼           ▼           ▼                 │
│     ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│     │  Query  │ │  Query  │ │  Query  │ │  Query  │           │
│     │ Worker 1│ │ Worker 2│ │ Worker 3│ │ Worker 4│           │
│     └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘           │
│          │           │           │           │                 │
│  3. 超时控制 (2000ms全局超时)                                   │
│          │           │           │           │                 │
│     ┌────┴───────────┴───────────┴───────────┴────┐           │
│     │              Timeout Manager                 │           │
│     │         (2秒内优先返回，后续结果追加)         │           │
│     └──────────────────┬───────────────────────────┘           │
│                        │                                       │
│  4. 结果收集            ▼                                       │
│     ┌─────────────────────────────────────────┐                │
│     │          ResultAggregator               │                │
│     └─────────────────────────────────────────┘                │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

### 2.5 结果聚合器 (ResultAggregator)

**职责**: 合并多个商户返回的商品数据，去重、排序、格式化

#### 接口定义

```typescript
interface AggregationConfig {
  deduplicateEnabled: boolean;   // 是否启用去重
  deduplicateThreshold: number;  // 去重相似度阈值 (0-1)
  maxResults: number;            // 最大返回结果数
  rankingStrategy: "relevance" | "price_asc" | "price_desc" | "rating" | "distance";
  merchantWeights?: Map<string, number>; // 商户权重
}

interface AggregatedProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  images: string[];
  tags: string[];
  source: {
    merchantId: string;
    merchantName: string;
    productUrl: string;
    originalId: string;
  };
  score: number;                 // 综合评分
  matches: number;               // 匹配的商户数（同款商品）
  alternativePrices?: {          // 其他商户的价格
    merchantId: string;
    merchantName: string;
    price: number;
  }[];
}

interface AggregationResult {
  searchId: string;
  query: string;
  totalFound: number;
  returned: number;
  aggregationTime: number;
  products: AggregatedProduct[];
  merchantsQueried: number;
  merchantsSucceeded: number;
  facets: {
    priceRange: { min: number; max: number };
    merchants: { merchantId: string; count: number }[];
    tags: { tag: string; count: number }[];
  };
}

// ResultAggregator 类接口
class ResultAggregator {
  constructor(config: AggregationConfig);
  
  // 聚合多个商户的查询结果
  aggregate(results: QueryResult[], query: string): AggregationResult;
  
  // 商品去重（基于名称、图片、规格相似度）
  private deduplicate(products: Product[]): Product[][];
  
  // 计算商品相关性得分
  private calculateScore(product: Product, query: string): number;
  
  // 按策略排序
  private sortProducts(products: AggregatedProduct[], strategy: string): AggregatedProduct[];
  
  // 生成聚合统计
  private generateFacets(products: AggregatedProduct[]): AggregationResult['facets'];
}
```

#### 去重算法策略

```
┌─────────────────────────────────────────────────────────────────┐
│                      商品去重策略                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  输入: 多商户商品列表                                            │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ 商品A(商户1) │    │ 商品A'(商户2)│    │ 商品B(商户3)│         │
│  │ - 手工茶壶   │    │ - 手工茶壶   │    │ - 竹制茶盘   │         │
│  │ - ¥168      │    │ - ¥158      │    │ - ¥128      │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│                                                                 │
│  Step 1: 特征提取                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  - 名称标准化 (去除品牌后缀、空格)                        │
│  │  - 图片特征向量 ( perceptual hash / image embedding )    │
│  │  - 价格区间分组 (±15%视为同款)                           │
│  │  - 规格标签匹配                                          │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Step 2: 相似度计算                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  similarity(商品A, 商品A') =                             │
│  │    0.4 * text_similarity(name) +                        │
│  │    0.4 * image_similarity(phash) +                      │
│  │    0.2 * price_similarity(price)                        │
│  │  = 0.92 (> 0.85 阈值 → 判定为同款)                       │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Step 3: 聚合结果                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  商品A (聚合款)                                          │   │
│  │  ├── 来源: 商户1 (¥168)                                  │   │
│  │  └── 同款: 商户2 (¥158) ← 更低价                        │   │
│  │                                                          │   │
│  │  商品B (独立款)                                          │   │
│  │  └── 来源: 商户3 (¥128)                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 数据流图

### 3.1 完整搜索流程

```
┌──────────┐      ┌────────────────────────────────────────────────────────────────────────┐
│          │      │                           io011-shopper Skill                         │
│   User   │      │                                                                        │
│          │      │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐│
└────┬─────┘      │  │  Skill API   │  │   Parallel   │  │    Result    │  │  Response   ││
     │            │  │   Handler    │  │    Query     │  │  Aggregator  │  │  Formatter  ││
     │            │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘│
     │            │         │                 │                 │                 │       │
     │ 1.search  │         │                 │                 │                 │       │
     │───────────>│─────────>                 │                 │                 │       │
     │ tags:茶具  │         │                 │                 │                 │       │
     │            │         │ 2.getMerchants  │                 │                 │       │
     │            │         │────────────────>│                 │                 │       │
     │            │         │                 │                 │                 │       │
     │            │    ┌────┴─────────────────┴─────────────────┴────┐            │       │
     │            │    │            Circuit Breaker Layer            │            │       │
     │            │    └────┬───────────────────────────────┬────────┘            │       │
     │            │         │                               │                     │       │
     │            │         ▼                               ▼                     │       │
     │            │  ┌─────────────┐               ┌─────────────────────┐        │       │
     │            │  │  Hub API    │               │  Merchant A2A Pool  │        │       │
     │            │  │             │               │                     │        │       │
     │            │  │ GET /search │               │ ┌─────┐ ┌─────┐    │        │       │
     │            │  │ tags=茶具   │               │ │ WS1 │ │ WS2 │ ...│        │       │
     │            │  └──────┬──────┘               │ └──┬──┘ └──┬──┘    │        │       │
     │            │         │                      └────┼───────┼───────┘        │       │
     │            │         │                         │       │                  │       │
     │            │         │ 3.merchant list         │       │                  │       │
     │            │         │<────────────────────────┘       │                  │       │
     │            │         │                         4.parallel queries         │       │
     │            │         │<────────────────────────────────┘                  │       │
     │            │         │                                                      │       │
     │            │         │ 5.raw results                                        │       │
     │            │         │─────────────────────────────────────────────────────>│       │
     │            │         │                                                      │       │
     │            │         │                  6.aggregated products               │       │
     │            │         │<─────────────────────────────────────────────────────│       │
     │            │         │                                                      │       │
     │            │         │ 7.format response                                    │       │
     │            │         │─────────────────────────────────────────────────────>│       │
     │            │         │                                                      │       │
     │            │         │                                                      │       │
     │ 8.result   │         │                                                      │       │
     │<───────────│<────────┘                                                      │       │
     │ products[] │                                                                │       │
     │            │                                                                │       │
     │            │                                                                │       │
     └────────────┘                                                                │       │
                                                                                   └───────┘
```

### 3.2 商户A2A通信流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Merchant A2A 通信流程                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐                           ┌─────────────────────┐          │
│  │  A2A Client │                           │   Merchant Server   │          │
│  └──────┬──────┘                           └──────────┬──────────┘          │
│         │                                             │                      │
│         │ 1. WebSocket Connect                        │                      │
│         │────────────────────────────────────────────>│                      │
│         │                                             │                      │
│         │ 2. Connection Established                   │                      │
│         │<────────────────────────────────────────────│                      │
│         │                                             │                      │
│         │ 3. Heartbeat (every 30s)                    │                      │
│         │<────────────────────────────────────────────>│                      │
│         │                                             │                      │
│         │ 4. Send: search_products                    │                      │
│         │ {                                           │                      │
│         │   action: "search_products",                │                      │
│         │   searchId: "uuid",                         │                      │
│         │   query: "茶具",                            │                      │
│         │   filters: {...}                            │                      │
│         │ }──────────────────────────────────────────>│                      │
│         │                                             │                      │
│         │ 5. Receive: products                        │                      │
│         │ {                                           │                      │
│         │   searchId: "uuid",                         │                      │
│         │   merchantId: "m1",                         │                      │
│         │   products: [...],                          │                      │
│         │   total: 42,                                │                      │
│         │   searchTime: 156                           │                      │
│         │ }<──────────────────────────────────────────│                      │
│         │                                             │                      │
│         │ 6. Close / Timeout                          │                      │
│         │────────────────────────────────────────────>│                      │
│         │                                             │                      │
└─────────┴─────────────────────────────────────────────┴──────────────────────┘
```

### 3.3 错误处理与降级流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    错误处理与降级策略                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        查询失败场景                                  │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                     │   │
│  │  Scene 1: Hub API 不可用时                                          │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐ │   │
│  │  │  Hub API    │    │   Fallback  │    │  使用缓存的商户列表      │ │   │
│  │  │   Down      │───>│  Strategy   │───>│  或默认热门商户          │ │   │
│  │  └─────────────┘    └─────────────┘    └─────────────────────────┘ │   │
│  │                                                                     │   │
│  │  Scene 2: 单个商户A2A超时                                           │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐ │   │
│  │  │  Merchant   │    │   Circuit   │    │  标记该商户为"慢节点"    │ │   │
│  │  │   Timeout   │───>│  Breaker    │───>│  后续查询降低优先级      │ │   │
│  │  └─────────────┘    └─────────────┘    └─────────────────────────┘ │   │
│  │                                                                     │   │
│  │  Scene 3: 多数商户失败                                              │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐ │   │
│  │  │  Multiple   │    │   Graceful  │    │  返回部分结果 +          │ │   │
│  │  │   Failures  │───>│  Degradation│───>│  友好提示                │ │   │
│  │  └─────────────┘    └─────────────┘    │  "更多商户结果加载中..." │ │   │
│  │                                        └─────────────────────────┘ │   │
│  │                                                                     │   │
│  │  Scene 4: 所有商户失败                                              │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐ │   │
│  │  │  All Merchants│   │   Error     │    │  返回预定义热门商品      │ │   │
│  │  │   Failed    │───>│  Handler    │───>│  + 建议稍后重试          │ │   │
│  │  └─────────────┘    └─────────────┘    └─────────────────────────┘ │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        熔断器状态机                                  │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │   
│  │                                                                     │   │
│  │                         ┌─────────────┐                            │   │
│  │                ┌───────>│   CLOSED    │                            │   │
│  │                │        │  (正常请求)  │                            │   │
│  │    失败率<50%  │        └──────┬──────┘                            │   │
│  │                │               │ 失败率>=50%                        │   │
│  │                │               ▼                                    │   │
│  │                │        ┌─────────────┐     持续失败                │   │
│  │                └────────│    OPEN     │<────────────────            │   │
│  │                         │  (拒绝请求)  │                            │   │
│  │                         └──────┬──────┘                            │   │
│  │                                │ 超时时间到                          │   │
│  │                                ▼                                    │   │
│  │                         ┌─────────────┐                            │   │
│  │                         │  HALF_OPEN  │                            │   │
│  │                         │ (试探请求)   │                            │   │
│  │                         └─────────────┘                            │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. 关键技术选型建议

### 4.1 技术栈对比

| 组件 | 选型A (推荐) | 选型B | 选型C | 选型理由 |
|------|-------------|-------|-------|----------|
| **运行时** | Node.js 20+ | Deno | Bun | 生态成熟，async/IO性能优秀 |
| **WebSocket** | ws | socket.io | native | 轻量级，兼容性好 |
| **HTTP Client** | axios | fetch | got | 拦截器丰富，错误处理完善 |
| **并发控制** | p-limit | native Promise.all | async-pool | 控制精准，资源友好 |
| **熔断器** | opossum | cockatiel | 自研 | 功能完善，维护活跃 |
| **缓存** | Redis | Node-Cache | LRU-Cache | 持久化，支持集群 |

### 4.2 核心依赖建议

```json
{
  "dependencies": {
    // HTTP 客户端
    "axios": "^1.6.0",
    
    // WebSocket 客户端
    "ws": "^8.16.0",
    
    // 并发控制
    "p-limit": "^5.0.0",
    "p-timeout": "^6.0.0",
    
    // 熔断器
    "opossum": "^8.1.0",
    
    // 日志
    "pino": "^8.17.0",
    
    // 配置管理
    "convict": "^6.2.4",
    
    // 数据验证
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/ws": "^8.5.10",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  }
}
```

### 4.3 配置模板

```yaml
# config.yaml
server:
  port: 3000
  env: production

hub:
  baseUrl: "https://hub.io011.com"
  apiKey: "${HUB_API_KEY}"
  timeout: 5000
  retryCount: 3

a2a:
  connectionTimeout: 3000
  requestTimeout: 2000      # 核心：2秒超时
  maxReconnectAttempts: 2
  heartbeatInterval: 30000

engine:
  maxConcurrency: 8         # 同时查询商户数
  globalTimeout: 2000       # 全局超时2秒
  enableCircuitBreaker: true

circuitBreaker:
  timeout: 3000
  errorThresholdPercentage: 50
  resetTimeout: 30000

aggregation:
  maxResults: 50
  deduplicateEnabled: true
  deduplicateThreshold: 0.85
  rankingStrategy: "relevance"
```

### 4.4 性能基准

| 指标 | 目标值 | 说明 |
|------|--------|------|
| **P99 延迟** | < 2s | 99%请求在2秒内完成 |
| **P50 延迟** | < 800ms | 中位数响应时间 |
| **并发查询** | 8 商户 | 同时查询的商户数 |
| **成功率** | > 99.5% | 整体查询成功率 |
| **内存占用** | < 256MB | 运行时内存峰值 |

---

## 5. 扩展性设计

### 5.1 商户接入扩展

```
新商户接入流程：

1. 商户注册 → Hub API 注册商户信息
2. 协议对接 → 实现标准A2A接口
3. 灰度测试 → 小流量验证
4. 正式上线 → 加入商户池

代码层面：MerchantA2AClient 通过配置驱动
无需修改核心代码，只需配置：
{
  merchantId: "new_merchant",
  a2aEndpoint: "wss://new.io011.com/a2a"
}
```

### 5.2 协议演进预留

```typescript
// 预留协议版本支持
interface A2AProtocol {
  version: "v1" | "v2";  // 支持多版本
  capabilities: string[]; // 能力协商
}

// 预留扩展字段
interface ProductSearchRequest {
  // ...基础字段
  _extensions?: {
    [key: string]: any;  // 商户自定义扩展
  };
}
```

---

## 6. 监控与可观测性

### 6.1 关键指标

| 类别 | 指标名 | 类型 |
|------|--------|------|
| **性能** | query_latency_p99 | Histogram |
| **性能** | merchant_response_time | Gauge |
| **可靠性** | query_success_rate | Counter |
| **可靠性** | circuit_breaker_state | Gauge |
| **业务** | products_per_query | Histogram |
| **业务** | merchants_queried | Counter |

### 6.2 日志规范

```
[2026-03-29T12:56:00.123Z] [INFO] [search:uuid] Query started: tags=[茶具,手工]
[2026-03-29T12:56:00.456Z] [INFO] [search:uuid] Hub returned 5 merchants
[2026-03-29T12:56:01.234Z] [INFO] [search:uuid] Merchant merchant-1 responded in 456ms, 12 products
[2026-03-29T12:56:01.567Z] [WARN] [search:uuid] Merchant merchant-2 timeout after 2000ms
[2026-03-29T12:56:02.000Z] [INFO] [search:uuid] Query completed: 3/5 succeeded, 34 products
```

---

## 7. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Hub API 故障 | 无法发现商户 | 本地缓存商户列表 + 定期刷新 |
| 商户响应慢 | 拖慢整体查询 | 2秒超时 + 熔断器 |
| WebSocket 连接数过多 | 资源耗尽 | 连接池 + 短连接模式 |
| 数据不一致 | 价格过期 | 实时查询，不缓存价格 |
| 商户返回大量数据 | 内存溢出 | 流式处理 + 限制单商户返回数量 |

---

## 附录: 接口速查

### Hub API

```
GET /api/v1/search?tags={tags}&min_price={min}&max_price={max}

Response:
{
  "merchants": [
    {
      "merchantId": "string",
      "name": "string",
      "a2aEndpoint": "wss://...",
      "supportedTags": ["string"],
      "rating": number,
      "responseTime": number
    }
  ],
  "total": number,
  "searchId": "string"
}
```

### Merchant A2A

```
WebSocket: wss://merchant.io011.com/a2a

Request:
{
  "action": "search_products",
  "searchId": "string",
  "query": "string",
  "filters": {
    "minPrice": number,
    "maxPrice": number,
    "tags": ["string"],
    "inStock": boolean
  }
}

Response:
{
  "searchId": "string",
  "merchantId": "string",
  "products": [...],
  "total": number,
  "searchTime": number
}
```

---

**文档结束**
