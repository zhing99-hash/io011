# IO011/AICart 用户端 - 关键技术选型建议

> 本文档提供各核心组件的技术选型对比与推荐方案

---

## 1. 运行时环境

### 推荐选型: Node.js 20+

```
┌─────────────────────────────────────────────────────────────────┐
│                      运行时对比分析                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Node.js   │  │    Deno     │  │     Bun     │             │
│  │    20.x     │  │    1.x      │  │    1.x      │             │
│  └──────┬──────┘  └─────────────┘  └─────────────┘             │
│         │                                                       │
│  ✓ 生态成熟: npm 包数量 200万+                                  │
│  ✓ 长期支持: LTS 版本稳定                                       │
│  ✓ 企业认可: 大厂生产环境验证                                   │
│  ✓ WebSocket 支持完善                                           │
│  ✓ 调试工具丰富                                                 │
│                                                                 │
│  ⚠ Deno: 安全性好但生态较小，A2A 客户端可能缺少库支持           │
│  ⚠ Bun: 速度快但不够稳定，生产环境风险高                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**推荐理由**: 
- 成熟的 WebSocket 生态 (`ws` 库)
- 丰富的 HTTP 客户端选择
- 完善的异步/并发控制库
- 稳定的长期支持版本

---

## 2. WebSocket 客户端

### 推荐选型: `ws`

| 特性 | `ws` | `socket.io` | native `WebSocket` |
|------|------|-------------|-------------------|
| 体积 | 轻量 (~100KB) | 较重 | 内置 |
| 重连机制 | 需自行实现 | 内置 | 需自行实现 |
| 心跳检测 | 需自行实现 | 内置 | 需自行实现 |
| 二进制支持 | 优秀 | 良好 | 良好 |
| 兼容性 | 优秀 | 优秀 | 现代环境 |
| 类型支持 | `@types/ws` | 官方 | 内置 |

**选型理由**:
1. **轻量级**: 仅需 WebSocket 基础功能，无需 socket.io 的额外开销
2. **控制力强**: 可精细控制重连、心跳策略
3. **生态成熟**: 生产环境广泛使用

```javascript
// 示例：ws + 自定义重连策略
import WebSocket from 'ws';

class ResilientWebSocket {
  constructor(url, options = {}) {
    this.url = url;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 3;
    this.reconnectDelay = options.reconnectDelay || 1000;
  }
  
  connect() {
    this.ws = new WebSocket(this.url);
    this.ws.on('close', () => this.handleReconnect());
    this.setupHeartbeat();
  }
  
  setupHeartbeat() {
    // 自定义心跳策略
    setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ action: 'ping' }));
      }
    }, 30000);
  }
}
```

---

## 3. HTTP 客户端

### 推荐选型: `axios`

| 特性 | `axios` | `fetch` | `got` |
|------|---------|---------|-------|
| 拦截器 | ✓ 完善 | ✗ 需自行封装 | ✓ 完善 |
| 超时控制 | ✓ 简单配置 | ✓ 需 AbortController | ✓ 完善 |
| 重试机制 | 配合 `axios-retry` | 需自行实现 | 内置 |
| 类型支持 | 优秀 | 内置 | 优秀 |
| 浏览器兼容 | 优秀 | 现代浏览器 | Node only |
| 包体积 | 中等 (~50KB) | 0 | 中等 |

**选型理由**:
1. **拦截器丰富**: 便于统一处理认证、日志、错误
2. **Hub API 专用**: 无需流式传输，axios 足够
3. **生态完善**: `axios-retry` 提供标准重试能力

```javascript
// 示例：带重试的 Hub 客户端
import axios from 'axios';
import axiosRetry from 'axios-retry';

const hubClient = axios.create({
  baseURL: 'https://hub.io011.com',
  timeout: 5000,
});

axiosRetry(hubClient, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
           error.response?.status >= 500;
  },
});
```

---

## 4. 并发控制

### 推荐选型: `p-limit`

```
┌─────────────────────────────────────────────────────────────────┐
│                     并发控制方案对比                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  p-limit (推荐)                                          │   │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │   │
│  │  ✓ 资源友好: 使用协程池，内存占用低                       │   │
│  │  ✓ 控制精准: 可精确控制并发数                             │   │
│  │  ✓ 类型支持: TypeScript 原生支持                          │   │
│  │  示例: p-limit(4) 同时只运行4个查询                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Promise.all (不推荐用于生产)                             │   │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │   │
│  │  ✗ 无限制: 所有 Promise 同时执行                          │   │
│  │  ✗ 资源风险: 商户过多时可能耗尽连接数                     │   │
│  │  适用场景: 已知少量固定的异步操作                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  async-pool                                             │   │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │   │
│  │  △ 类似 p-limit，但维护活跃度较低                         │   │
│  │  △ 功能相当，优先选择社区更活跃的 p-limit                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**核心代码模式**:

```javascript
import pLimit from 'p-limit';
import pTimeout from 'p-timeout';

const limit = pLimit(4); // 最多4个并发
const MERCHANT_TIMEOUT = 2000; // 2秒超时

async function executeParallelQueries(merchants, request) {
  const tasks = merchants.map(merchant => 
    limit(async () => {
      const client = getClient(merchant);
      try {
        // 核心：2秒超时控制
        return await pTimeout(
          client.searchProducts(request),
          { milliseconds: MERCHANT_TIMEOUT }
        );
      } catch (error) {
        return { merchantId: merchant.merchantId, error, success: false };
      }
    })
  );
  
  return Promise.all(tasks);
}
```

---

## 5. 熔断器

### 推荐选型: `opossum`

| 特性 | `opossum` | `cockatiel` | 自研 |
|------|-----------|-------------|------|
| 功能完整性 | 优秀 | 良好 | 需大量开发 |
| 状态机 | 标准 (CLOSED/OPEN/HALF_OPEN) | 标准 | 自行实现 |
| 事件系统 | 丰富 | 中等 | 自行实现 |
| 指标暴露 | 内置 Prometheus | 需自行实现 | 自行实现 |
| 类型支持 | 官方 @types | 原生 TypeScript | 自行定义 |
| 维护状态 | 活跃 (Netflix 开源) | 活跃 | - |

**选型理由**:
1. **功能完善**: 支持失败率阈值、超时、重试、半开状态
2. **事件驱动**: 可监听状态变化，用于监控
3. **生产验证**: Netflix Hystrix 模式实现

```javascript
import CircuitBreaker from 'opossum';

const options = {
  timeout: 3000,                    // 3秒超时
  errorThresholdPercentage: 50,     // 失败率50%触发熔断
  resetTimeout: 30000,              // 30秒后尝试恢复
  rollingCountTimeout: 10000,       // 统计窗口10秒
  rollingCountBuckets: 10,          // 10个统计桶
};

const breaker = new CircuitBreaker(searchMerchant, options);

// 事件监听
breaker.on('open', () => console.log('熔断器打开'));
breaker.on('halfOpen', () => console.log('熔断器半开'));
breaker.on('close', () => console.log('熔断器关闭'));

// 使用
async function queryWithCircuitBreaker(merchant, request) {
  try {
    return await breaker.fire(merchant, request);
  } catch (error) {
    if (breaker.opened) {
      // 熔断状态，快速失败
      throw new Error(`Circuit breaker open for merchant ${merchant.merchantId}`);
    }
    throw error;
  }
}
```

---

## 6. 日志系统

### 推荐选型: `pino`

| 特性 | `pino` | `winston` | `console` |
|------|--------|-----------|-----------|
| 性能 | 优秀 (最快) | 中等 | 基础 |
| JSON 输出 | 原生 | 需配置 | 需自行处理 |
| 结构化日志 | 原生支持 | 支持 | 不支持 |
| 日志级别 | 完善 | 完善 | 基础 |
| 子 logger | 轻量 | 中等 | 无 |
| 类型支持 | 原生 | @types | 内置 |

**选型理由**:
1. **性能优先**: 日志不应影响 2秒超时目标
2. **结构化**: 便于后续日志分析和追踪
3. **子 logger**: 支持按 searchId 分组日志

```javascript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: {
    service: 'io011-shopper',
    version: '1.0.0',
  },
  // 生产环境启用 JSON 格式
  transport: process.env.NODE_ENV === 'development' 
    ? { target: 'pino-pretty' } 
    : undefined,
});

// 使用示例
const searchLogger = logger.child({ searchId: 'uuid-123' });
searchLogger.info({ tags: ['茶具'], merchantCount: 5 }, 'Query started');
searchLogger.warn({ merchantId: 'm2', latency: 2000 }, 'Merchant timeout');
```

---

## 7. 配置管理

### 推荐选型: `convict` + 环境变量

```javascript
import convict from 'convict';

const config = convict({
  env: {
    doc: '应用环境',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV',
  },
  hub: {
    baseUrl: {
      doc: 'Hub API 地址',
      format: 'url',
      default: 'https://hub.io011.com',
      env: 'HUB_BASE_URL',
    },
    apiKey: {
      doc: 'Hub API 密钥',
      format: String,
      default: '',
      sensitive: true,
      env: 'HUB_API_KEY',
    },
    timeout: {
      doc: 'Hub 请求超时',
      format: 'nat',
      default: 5000,
      env: 'HUB_TIMEOUT',
    },
  },
  engine: {
    maxConcurrency: {
      doc: '最大并发查询数',
      format: 'nat',
      default: 8,
      env: 'ENGINE_MAX_CONCURRENCY',
    },
    timeout: {
      doc: '全局超时 (核心: 2秒)',
      format: 'nat',
      default: 2000,
      env: 'ENGINE_TIMEOUT',
    },
  },
});

config.validate({ allowed: 'strict' });
export default config;
```

---

## 8. 数据验证

### 推荐选型: `zod`

```javascript
import { z } from 'zod';

// 定义 schema
const ProductSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  price: z.number().positive(),
  currency: z.enum(['CNY', 'USD', 'EUR']),
  images: z.array(z.string().url()),
  tags: z.array(z.string()),
  merchantId: z.string(),
  stock: z.number().int().min(0),
  rating: z.number().min(0).max(5),
});

const ProductSearchResponseSchema = z.object({
  searchId: z.string().uuid(),
  merchantId: z.string(),
  products: z.array(ProductSchema),
  total: z.number().int(),
  searchTime: z.number(),
});

// 运行时验证
type Product = z.infer<typeof ProductSchema>;
type ProductSearchResponse = z.infer<typeof ProductSearchResponseSchema>;

// 使用
function validateResponse(data: unknown): ProductSearchResponse {
  return ProductSearchResponseSchema.parse(data);
}
```

**选型理由**:
1. **类型安全**: Schema 即 TypeScript 类型
2. **运行时验证**: 确保外部数据符合预期
3. **错误信息友好**: 详细的验证错误提示
4. **轻量级**: 体积小，性能好

---

## 9. 依赖汇总

### package.json

```json
{
  "name": "io011-shopper",
  "version": "1.0.0",
  "type": "module",
  "engines": {
    "node": ">=20.0.0"
  },
  "dependencies": {
    "axios": "^1.6.0",
    "axios-retry": "^4.0.0",
    "convict": "^6.2.4",
    "opossum": "^8.1.0",
    "p-limit": "^5.0.0",
    "p-timeout": "^6.0.0",
    "pino": "^8.17.0",
    "ws": "^8.16.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/convict": "^6.1.6",
    "@types/node": "^20.10.0",
    "@types/opossum": "^8.1.0",
    "@types/ws": "^8.5.10",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  }
}
```

---

## 10. 架构选型总结

```
┌─────────────────────────────────────────────────────────────────┐
│                    技术栈选型总览                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  运行时        Node.js 20+              (稳定、生态丰富)         │
│       │                                                         │
│  HTTP        axios + axios-retry      (拦截器、重试)            │
│       │                                                         │
│  WebSocket   ws                       (轻量、可控)              │
│       │                                                         │
│  并发控制    p-limit + p-timeout      (协程池、超时)            │
│       │                                                         │
│  熔断器      opossum                  (Netflix 模式)            │
│       │                                                         │
│  日志        pino                     (高性能、结构化)          │
│       │                                                         │
│  配置        convict                  (环境变量、验证)          │
│       │                                                         │
│  验证        zod                      (类型+运行时)             │
│       │                                                         │
│  测试        vitest                   (Vite 生态、快速)         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 核心性能指标

| 指标 | 目标 | 技术选型支撑 |
|------|------|--------------|
| P99 延迟 < 2s | ✅ | p-timeout 精确控制 |
| 并发 8 商户 | ✅ | p-limit 协程池 |
| 故障快速失败 | ✅ | opossum 熔断器 |
| 日志不阻塞 | ✅ | pino 异步日志 |
| 类型安全 | ✅ | TypeScript + zod |

---

**文档结束**
