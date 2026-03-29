/**
 * IO011 Shopper - 核心类型定义
 */

// ========== 用户查询相关 ==========

export interface UserQuery {
  rawInput: string;        // 原始输入
  category: string;        // 商品类目
  keywords?: string[];     // 关键词列表
  minPrice?: number;       // 最低价格
  maxPrice?: number;       // 最高价格
  confidence: number;      // 置信度 0-1
}

// ========== 商户相关 ==========

export interface Merchant {
  id: string;              // 商户ID
  name: string;            // 商户名称
  a2aEndpoint: string;     // A2A WebSocket地址
  tags: string[];          // 标签
  rating?: number;         // 评分
}

export interface MerchantInfo {
  id: string;
  name: string;
  a2aEndpoint: string;
  supportedTags: string[];
  rating: number;
  responseTime?: number;
}

// ========== 商品相关 ==========

export interface Product {
  id: string;              // 商品ID
  name: string;            // 商品名称
  description?: string;    // 描述
  price: number;           // 价格
  currency: string;        // 货币，默认CNY
  category: string;        // 类目
  merchantId: string;      // 所属商户ID
  merchantName: string;    // 商户名称
  image?: string;          // 图片URL
  url?: string;            // 购买链接
  stock?: number;          // 库存
  tags?: string[];         // 标签
}

// ========== Hub API 相关 ==========

export interface HubSearchParams {
  category: string;
  tags?: string[];
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}

export interface HubSearchResponse {
  merchants: MerchantInfo[];
  total: number;
  searchId: string;
}

// ========== A2A 协议相关 ==========

export interface A2AQueryMessage {
  action: 'search_products';
  searchId: string;
  query: string;
  filters: {
    minPrice?: number;
    maxPrice?: number;
    category?: string;
    limit?: number;
  };
}

export interface A2AResponse {
  type: 'products';
  searchId: string;
  merchantId: string;
  products: Product[];
  total: number;
}

// ========== 查询结果相关 ==========

export interface MerchantResult {
  merchantId: string;
  merchantName: string;
  success: boolean;
  products?: Product[];
  error?: string;
  latency: number;         // 响应时间ms
}

export interface SearchResult {
  success: boolean;
  query: UserQuery;
  products: Product[];
  total: number;
  message?: string;        // 提示信息
  merchants?: Array<{
    id: string;
    name: string;
    responded: boolean;
  }>;
  timeMs: number;
}

// ========== 配置相关 ==========

export interface HubClientConfig {
  baseUrl: string;
  timeout: number;
  apiKey?: string;
}

export interface QueryEngineConfig {
  maxConcurrency: number;
  timeout: number;
  maxProductsPerMerchant: number;
}