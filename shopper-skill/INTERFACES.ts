/**
 * IO011/AICart 用户端 - 核心接口定义
 * 
 * 此文件定义所有核心模块的 TypeScript 接口
 * 注意：仅作架构设计参考，不包含具体实现
 */

// ============================================================================
// 基础类型定义
// ============================================================================

/** 商品货币类型 */
type Currency = 'CNY' | 'USD' | 'EUR';

/** 排序策略 */
type RankingStrategy = 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'distance';

/** A2A 协议版本 */
type A2AVersion = 'v1' | 'v2';

// ============================================================================
// Hub 客户端模块接口
// ============================================================================

/**
 * Hub 客户端配置
 */
interface HubClientConfig {
  /** Hub API 基础地址 */
  baseUrl: string;
  /** API 密钥 */
  apiKey: string;
  /** 请求超时 (毫秒) */
  timeout: number;
  /** 重试次数 */
  retryCount: number;
  /** 是否启用缓存 */
  enableCache?: boolean;
  /** 缓存有效期 (毫秒) */
  cacheTtl?: number;
}

/**
 * 标签搜索参数
 */
interface TagSearchParams {
  /** 标签列表，如 ["茶具", "手工"] */
  tags: string[];
  /** 最低价格 */
  minPrice?: number;
  /** 最高价格 */
  maxPrice?: number;
  /** 商品分类 */
  category?: string;
  /** 返回数量限制 */
  limit?: number;
  /** 地理位置 */
  location?: string;
}

/**
 * 商户信息
 */
interface MerchantInfo {
  /** 商户唯一ID */
  merchantId: string;
  /** 商户名称 */
  name: string;
  /** A2A WebSocket 地址 */
  a2aEndpoint: string;
  /** 商户支持的标签列表 */
  supportedTags: string[];
  /** 商户评分 (0-5) */
  rating: number;
  /** 平均响应时间 (毫秒) */
  responseTime: number;
  /** 商户状态 */
  status: 'active' | 'inactive' | 'suspended';
  /** 商户权重 (用于排序) */
  weight?: number;
}

/**
 * Hub 搜索响应
 */
interface HubSearchResponse {
  /** 匹配的商户列表 */
  merchants: MerchantInfo[];
  /** 总商户数 */
  total: number;
  /** 搜索请求ID（用于追踪） */
  searchId: string;
  /** 查询耗时 */
  queryTime: number;
}

/**
 * Hub 客户端接口定义
 */
declare class HubClient {
  constructor(config: HubClientConfig);
  
  /**
   * 根据标签搜索匹配的商户
   */
  searchMerchants(params: TagSearchParams): Promise<HubSearchResponse>;
  
  /**
   * 获取指定商户详情
   */
  getMerchantInfo(merchantId: string): Promise<MerchantInfo>;
  
  /**
   * 批量获取商户详情
   */
  getMerchantsInfo(merchantIds: string[]): Promise<MerchantInfo[]>;
  
  /**
   * 健康检查
   */
  healthCheck(): Promise<boolean>;
  
  /**
   * 更新缓存的商户列表
   */
  refreshCache(): Promise<void>;
}

// ============================================================================
// 商户 A2A 客户端模块接口
// ============================================================================

/**
 * A2A 客户端配置
 */
interface A2AClientConfig {
  /** WebSocket 地址 */
  endpoint: string;
  /** 连接超时 (毫秒) */
  connectionTimeout: number;
  /** 请求超时 (毫秒) - 核心：2秒超时 */
  requestTimeout: number;
  /** 最大重连次数 */
  maxReconnectAttempts: number;
  /** 心跳间隔 (毫秒) */
  heartbeatInterval: number;
  /** 协议版本 */
  protocolVersion?: A2AVersion;
}

/**
 * 商品搜索请求
 */
interface ProductSearchRequest {
  action: 'search_products';
  /** 搜索请求ID */
  searchId: string;
  /** 搜索关键词 */
  query: string;
  /** 过滤条件 */
  filters: {
    minPrice?: number;
    maxPrice?: number;
    tags?: string[];
    category?: string;
    inStock?: boolean;
    brand?: string;
  };
  /** 请求上下文 */
  context?: {
    userId?: string;
    sessionId?: string;
    location?: string;
    userAgent?: string;
  };
  /** 分页参数 */
  pagination?: {
    limit: number;
    cursor?: string;
  };
}

/**
 * 商品信息
 */
interface Product {
  /** 商品唯一ID */
  id: string;
  /** 商品名称 */
  name: string;
  /** 商品描述 */
  description: string;
  /** 价格 */
  price: number;
  /** 原价（如果有折扣） */
  originalPrice?: number;
  /** 货币单位 */
  currency: Currency;
  /** 商品图片URL列表 */
  images: string[];
  /** 标签列表 */
  tags: string[];
  /** 所属商户ID */
  merchantId: string;
  /** 商户名称 */
  merchantName: string;
  /** 库存数量 */
  stock: number;
  /** 商品评分 (0-5) */
  rating: number;
  /** 评价数量 */
  reviewCount?: number;
  /** 商品链接 */
  url: string;
  /** 规格参数 */
  specifications?: Record<string, string>;
  /** 配送信息 */
  shipping?: {
    freeShipping: boolean;
    shippingFee?: number;
    estimatedDays?: number;
  };
}

/**
 * 商品搜索响应
 */
interface ProductSearchResponse {
  /** 搜索请求ID */
  searchId: string;
  /** 商户ID */
  merchantId: string;
  /** 商品列表 */
  products: Product[];
  /** 该商户匹配的总商品数 */
  total: number;
  /** 搜索耗时 (毫秒) */
  searchTime: number;
  /** 元数据 */
  meta?: {
    /** 是否有更多结果 */
    hasMore: boolean;
    /** 分页游标 */
    nextCursor?: string;
    /** 商户协议版本 */
    protocolVersion?: string;
  };
}

/**
 * A2A 连接状态
 */
type A2AConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

/**
 * A2A 客户端接口定义
 */
declare class MerchantA2AClient {
  constructor(merchantInfo: MerchantInfo, config?: Partial<A2AClientConfig>);
  
  /**
   * 连接商户WebSocket
   */
  connect(): Promise<void>;
  
  /**
   * 发送商品搜索请求
   */
  searchProducts(request: ProductSearchRequest): Promise<ProductSearchResponse>;
  
  /**
   * 发送心跳保持连接
   */
  sendHeartbeat(): Promise<void>;
  
  /**
   * 检查连接状态
   */
  isConnected(): boolean;
  
  /**
   * 获取当前连接状态
   */
  getConnectionState(): A2AConnectionState;
  
  /**
   * 关闭连接
   */
  disconnect(): Promise<void>;
  
  /**
   * 注册事件监听器
   */
  on(event: 'connected' | 'disconnected' | 'error' | 'message', callback: (data: any) => void): void;
  
  /**
   * 移除事件监听器
   */
  off(event: string, callback: Function): void;
}

// ============================================================================
// 并行查询引擎模块接口
// ============================================================================

/**
 * 查询引擎配置
 */
interface QueryEngineConfig {
  /** 最大并发查询数 */
  maxConcurrency: number;
  /** 全局超时时间 (毫秒) - 默认2000ms */
  timeout: number;
  /** 单个商户超时 (毫秒) */
  perMerchantTimeout: number;
  /** 是否启用熔断 */
  enableCircuitBreaker: boolean;
  /** 优先查询响应快的商户 */
  prioritizeFastMerchants: boolean;
  /** 慢商户重试间隔 */
  slowMerchantRetryDelay?: number;
}

/**
 * 查询任务
 */
interface QueryTask {
  /** 商户ID */
  merchantId: string;
  /** A2A 客户端实例 */
  client: MerchantA2AClient;
  /** 搜索请求 */
  request: ProductSearchRequest;
  /** 优先级（数值越小优先级越高） */
  priority: number;
  /** 最大重试次数 */
  maxRetries: number;
}

/**
 * 单个查询结果
 */
interface QueryResult {
  /** 商户ID */
  merchantId: string;
  /** 是否成功 */
  success: boolean;
  /** 响应数据 */
  data?: ProductSearchResponse;
  /** 错误信息 */
  error?: Error | {
    code: string;
    message: string;
    retryable: boolean;
  };
  /** 实际耗时 (毫秒) */
  latency: number;
  /** 重试次数 */
  retryCount: number;
}

/**
 * 聚合查询结果
 */
interface AggregatedQueryResult {
  /** 搜索请求ID */
  searchId: string;
  /** 完成时间 */
  completedAt: string;
  /** 查询的商户总数 */
  totalMerchants: number;
  /** 成功查询数 */
  successfulQueries: number;
  /** 失败查询数 */
  failedQueries: number;
  /** 查询结果列表 */
  results: QueryResult[];
  /** 聚合后的商品列表（原始） */
  rawProducts: Product[];
  /** 商品总数 */
  totalProducts: number;
  /** 总耗时 (毫秒) */
  searchLatency: number;
  /** 是否触发降级 */
  degraded: boolean;
}

/**
 * 查询引擎统计信息
 */
interface QueryEngineStats {
  /** 总查询次数 */
  totalQueries: number;
  /** 平均延迟 */
  avgLatency: number;
  /** P99 延迟 */
  p99Latency: number;
  /** 成功率 */
  successRate: number;
  /** 当前活跃查询数 */
  activeQueries: number;
  /** 各商户平均响应时间 */
  merchantLatencies: Record<string, number>;
}

/**
 * 并行查询引擎接口定义
 */
declare class ParallelQueryEngine {
  constructor(config: QueryEngineConfig);
  
  /**
   * 注册商户客户端
   */
  registerMerchant(client: MerchantA2AClient): void;
  
  /**
   * 注销商户客户端
   */
  unregisterMerchant(merchantId: string): void;
  
  /**
   * 执行并行查询
   */
  executeQuery(
    merchants: MerchantInfo[],
    request: ProductSearchRequest
  ): Promise<AggregatedQueryResult>;
  
  /**
   * 带优先级的查询（优先查询响应快的商户）
   */
  executePrioritizedQuery(
    merchants: MerchantInfo[],
    request: ProductSearchRequest,
    priorityFn?: (merchant: MerchantInfo) => number
  ): Promise<AggregatedQueryResult>;
  
  /**
   * 取消进行中的查询
   */
  cancelQuery(searchId: string): void;
  
  /**
   * 获取引擎统计信息
   */
  getStats(): QueryEngineStats;
  
  /**
   * 重置统计数据
   */
  resetStats(): void;
}

// ============================================================================
// 结果聚合器模块接口
// ============================================================================

/**
 * 聚合配置
 */
interface AggregationConfig {
  /** 是否启用去重 */
  deduplicateEnabled: boolean;
  /** 去重相似度阈值 (0-1) */
  deduplicateThreshold: number;
  /** 最大返回结果数 */
  maxResults: number;
  /** 排序策略 */
  rankingStrategy: RankingStrategy;
  /** 商户权重映射 */
  merchantWeights?: Map<string, number>;
  /** 价格区间分桶 */
  priceBuckets?: number[];
  /** 是否启用智能排序 */
  enableSmartRanking?: boolean;
}

/**
 * 聚合后的商品信息
 * 包含跨商户的同款商品信息
 */
interface AggregatedProduct {
  /** 聚合商品唯一ID (哈希生成) */
  id: string;
  /** 商品名称 */
  name: string;
  /** 商品描述 */
  description: string;
  /** 最低价格 */
  price: number;
  /** 最高价格（如果有差异） */
  priceRange?: { min: number; max: number };
  /** 货币单位 */
  currency: Currency;
  /** 去重后的图片列表 */
  images: string[];
  /** 合并后的标签列表 */
  tags: string[];
  /** 主要来源 */
  source: {
    merchantId: string;
    merchantName: string;
    productUrl: string;
    originalId: string;
  };
  /** 综合评分 (算法计算) */
  score: number;
  /** 匹配的商户数量（同款商品） */
  matches: number;
  /** 其他商户的同款价格 */
  alternativePrices: {
    merchantId: string;
    merchantName: string;
    price: number;
    productUrl: string;
  }[];
  /** 平均评分 */
  avgRating: number;
  /** 总库存 */
  totalStock: number;
  /** 规格参数（取交集） */
  commonSpecifications?: Record<string, string>;
}

/**
 * 聚合统计分面
 */
interface AggregationFacets {
  /** 价格区间 */
  priceRange: { 
    min: number; 
    max: number;
    /** 价格分布 */
    distribution?: { range: string; count: number }[];
  };
  /** 商户分布 */
  merchants: { 
    merchantId: string; 
    merchantName: string;
    count: number;
    minPrice: number;
    maxPrice: number;
  }[];
  /** 标签分布 */
  tags: { tag: string; count: number }[];
  /** 评分分布 */
  ratingDistribution?: { rating: number; count: number }[];
}

/**
 * 聚合结果
 */
interface AggregationResult {
  /** 搜索请求ID */
  searchId: string;
  /** 查询关键词 */
  query: string;
  /** 找到的商品总数 */
  totalFound: number;
  /** 实际返回数量 */
  returned: number;
  /** 聚合耗时 (毫秒) */
  aggregationTime: number;
  /** 聚合后的商品列表 */
  products: AggregatedProduct[];
  /** 查询的商户数量 */
  merchantsQueried: number;
  /** 成功的商户数量 */
  merchantsSucceeded: number;
  /** 统计分面 */
  facets: AggregationFacets;
  /** 是否触发降级 */
  degraded?: boolean;
  /** 降级原因 */
  degradationReason?: string;
}

/**
 * 结果聚合器接口定义
 */
declare class ResultAggregator {
  constructor(config: AggregationConfig);
  
  /**
   * 聚合多个商户的查询结果
   */
  aggregate(results: QueryResult[], query: string): AggregationResult;
  
  /**
   * 设置排序策略
   */
  setRankingStrategy(strategy: RankingStrategy): void;
  
  /**
   * 设置商户权重
   */
  setMerchantWeights(weights: Map<string, number>): void;
  
  /**
   * 更新配置
   */
  updateConfig(config: Partial<AggregationConfig>): void;
}

// ============================================================================
// Skill 对外接口
// ============================================================================

/**
 * Skill 搜索请求
 */
interface ShopperSearchRequest {
  /** 搜索关键词 */
  query: string;
  /** 标签过滤 */
  tags?: string[];
  /** 价格范围 */
  priceRange?: { min?: number; max?: number };
  /** 分类过滤 */
  category?: string;
  /** 排序方式 */
  sortBy?: RankingStrategy;
  /** 分页 */
  limit?: number;
  offset?: number;
  /** 地理位置 */
  location?: string;
}

/**
 * Skill 搜索响应
 */
interface ShopperSearchResponse {
  /** 搜索请求ID */
  searchId: string;
  /** 商品列表 */
  products: AggregatedProduct[];
  /** 总数 */
  total: number;
  /** 分页信息 */
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  /** 统计信息 */
  facets: AggregationFacets;
  /** 搜索耗时 */
  searchTime: number;
  /** 元数据 */
  meta: {
    merchantsQueried: number;
    merchantsSucceeded: number;
    degraded: boolean;
  };
}

/**
 * IO011 Shopper Skill 主接口
 */
declare class IO011ShopperSkill {
  constructor(config: {
    hub: HubClientConfig;
    engine: QueryEngineConfig;
    aggregation: AggregationConfig;
  });
  
  /**
   * 初始化 Skill
   */
  initialize(): Promise<void>;
  
  /**
   * 执行搜索
   */
  search(request: ShopperSearchRequest): Promise<ShopperSearchResponse>;
  
  /**
   * 获取热门商品
   */
  getTrendingProducts(limit?: number): Promise<AggregatedProduct[]>;
  
  /**
   * 获取商户列表
   */
  getMerchants(): Promise<MerchantInfo[]>;
  
  /**
   * 健康检查
   */
  healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    hub: boolean;
    merchants: { merchantId: string; healthy: boolean }[];
  }>;
  
  /**
   * 销毁 Skill（清理资源）
   */
  destroy(): Promise<void>;
}

// ============================================================================
// 导出
// ============================================================================

export type {
  // 基础类型
  Currency,
  RankingStrategy,
  A2AVersion,
  
  // Hub 模块
  HubClientConfig,
  TagSearchParams,
  MerchantInfo,
  HubSearchResponse,
  
  // A2A 模块
  A2AClientConfig,
  ProductSearchRequest,
  Product,
  ProductSearchResponse,
  A2AConnectionState,
  
  // 查询引擎模块
  QueryEngineConfig,
  QueryTask,
  QueryResult,
  AggregatedQueryResult,
  QueryEngineStats,
  
  // 聚合器模块
  AggregationConfig,
  AggregatedProduct,
  AggregationFacets,
  AggregationResult,
  
  // Skill 接口
  ShopperSearchRequest,
  ShopperSearchResponse,
};

export {
  HubClient,
  MerchantA2AClient,
  ParallelQueryEngine,
  ResultAggregator,
  IO011ShopperSkill,
};
