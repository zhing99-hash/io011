/**
 * Hub 客户端 - 调用Hub API搜索商户
 */

import { HubClientConfig, HubSearchParams, MerchantInfo, HubSearchResponse } from './types';

export class HubClient {
  private config: HubClientConfig;

  constructor(config: HubClientConfig) {
    this.config = config;
  }

  /**
   * 搜索匹配的商户
   * 
   * MVP阶段：如果Hub不可用，返回Mock商户
   */
  async searchMerchants(params: HubSearchParams): Promise<MerchantInfo[]> {
    try {
      // 构建查询URL
      const queryParams = new URLSearchParams();
      queryParams.append('category', params.category);
      if (params.tags && params.tags.length > 0) {
        queryParams.append('tags', params.tags.join(','));
      }
      if (params.minPrice !== undefined) {
        queryParams.append('min_price', params.minPrice.toString());
      }
      if (params.maxPrice !== undefined) {
        queryParams.append('max_price', params.maxPrice.toString());
      }
      if (params.limit) {
        queryParams.append('limit', params.limit.toString());
      }

      const url = `${this.config.baseUrl}/api/v1/search?${queryParams.toString()}`;
      console.log(`  [HubClient] GET ${url}`);

      // 调用Hub API
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`Hub API error: ${response.status} ${response.statusText}`);
      }

      const data: HubSearchResponse = await response.json();
      console.log(`  [HubClient] Hub返回 ${data.merchants.length} 个商户`);
      return data.merchants;

    } catch (error) {
      console.warn(`  [HubClient] Hub API调用失败，使用Mock商户:`, error);
      // MVP阶段：Hub不可用时返回Mock数据
      return this.getMockMerchants(params);
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/health`, {
        signal: AbortSignal.timeout(2000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Mock商户数据（MVP阶段使用）
   */
  private getMockMerchants(params: HubSearchParams): MerchantInfo[] {
    const mockMerchants: MerchantInfo[] = [
      {
        id: 'mer_tea_001',
        name: '茶韵轩',
        a2aEndpoint: 'wss://mock-merchant1.io011.com/a2a',
        supportedTags: ['茶具', '茶杯', '茶壶', '紫砂'],
        rating: 4.8,
        responseTime: 150,
      },
      {
        id: 'mer_tea_002',
        name: '茗香阁',
        a2aEndpoint: 'wss://mock-merchant2.io011.com/a2a',
        supportedTags: ['茶具', '茶叶', '陶瓷'],
        rating: 4.6,
        responseTime: 200,
      },
      {
        id: 'mer_tea_003',
        name: '清茶馆',
        a2aEndpoint: 'wss://mock-merchant3.io011.com/a2a',
        supportedTags: ['茶具', '玻璃', '现代'],
        rating: 4.5,
        responseTime: 180,
      },
    ];

    // 根据类目过滤
    return mockMerchants
      .filter(m => m.supportedTags.includes(params.category))
      .slice(0, params.limit || 3);
  }
}