/**
 * IO011 Shopper - MVP 主入口
 * 用户端Skill核心实现
 */

import { HubClient } from './hub-client';
import { MerchantA2AClient } from './merchant-a2a-client';
import { ParallelQueryEngine } from './parallel-query-engine';
import { ResultAggregator } from './result-aggregator';
import { IntentParser } from './intent-parser';
import { UserQuery, Product, SearchResult } from './types';

// 配置
const CONFIG = {
  hub: {
    baseUrl: process.env.HUB_URL || 'http://localhost:8080',
    timeout: 5000,
  },
  query: {
    maxConcurrency: 3,      // 最多3个商户并发
    timeout: 5000,          // 5秒超时
    maxProductsPerMerchant: 5,
  }
};

/**
 * IO011 Shopper 主类
 */
export class IO011Shopper {
  private hubClient: HubClient;
  private queryEngine: ParallelQueryEngine;
  private resultAggregator: ResultAggregator;
  private intentParser: IntentParser;

  constructor() {
    this.hubClient = new HubClient(CONFIG.hub);
    this.queryEngine = new ParallelQueryEngine(CONFIG.query);
    this.resultAggregator = new ResultAggregator();
    this.intentParser = new IntentParser();
  }

  /**
   * 主搜索流程
   * 1. 解析用户意图
   * 2. 调用Hub搜索商户
   * 3. 并行查询商户
   * 4. 聚合结果返回
   */
  async search(userInput: string): Promise<SearchResult> {
    const startTime = Date.now();
    
    console.log(`🔍 [Search] 开始处理用户查询: "${userInput}"`);

    try {
      // Step 1: 解析用户意图
      const intent = await this.intentParser.parse(userInput);
      console.log(`✅ [Intent] 提取意图:`, intent);

      // Step 2: 调用Hub搜索商户
      console.log(`📡 [Hub] 搜索匹配商户...`);
      const merchants = await this.hubClient.searchMerchants({
        category: intent.category,
        tags: intent.keywords ? [intent.category, ...intent.keywords] : [intent.category],
        minPrice: intent.minPrice,
        maxPrice: intent.maxPrice,
        limit: CONFIG.query.maxConcurrency,
      });
      
      console.log(`✅ [Hub] 找到 ${merchants.length} 个商户:`, merchants.map(m => m.name).join(', '));

      if (merchants.length === 0) {
        return {
          success: true,
          query: intent,
          products: [],
          total: 0,
          message: `未找到销售"${intent.category}"的商户，建议尝试其他关键词`,
          timeMs: Date.now() - startTime,
        };
      }

      // Step 3: 并行查询商户
      console.log(`🔄 [Query] 并行查询 ${merchants.length} 个商户...`);
      const merchantResults = await this.queryEngine.queryMerchants(
        merchants,
        intent,
        CONFIG.query.timeout
      );

      // Step 4: 聚合结果
      console.log(`📊 [Aggregate] 聚合结果...`);
      const products = this.resultAggregator.aggregate(merchantResults);

      const result: SearchResult = {
        success: true,
        query: intent,
        products,
        total: products.length,
        merchants: merchants.map(m => ({
          id: m.id,
          name: m.name,
          responded: merchantResults.some(r => r.merchantId === m.id && r.success),
        })),
        timeMs: Date.now() - startTime,
      };

      console.log(`✅ [Complete] 搜索完成! 找到 ${products.length} 个商品, 耗时 ${result.timeMs}ms`);
      return result;

    } catch (error) {
      console.error(`❌ [Error] 搜索失败:`, error);
      return {
        success: false,
        query: { category: '', rawInput: userInput },
        products: [],
        total: 0,
        message: '搜索服务暂时不可用，请稍后再试',
        timeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * 确认意图（交互式确认）
   */
  confirmIntent(intent: UserQuery): string {
    let msg = `为您搜索`;
    if (intent.minPrice && intent.maxPrice) {
      msg += `${intent.minPrice}-${intent.maxPrice}元的`;
    } else if (intent.minPrice) {
      msg += `${intent.minPrice}元以上的`;
    } else if (intent.maxPrice) {
      msg += `${intent.maxPrice}元以下的`;
    }
    msg += `${intent.category}，对吗？`;
    return msg;
  }
}

// 导出类型
export * from './types';
export { HubClient, MerchantA2AClient, ParallelQueryEngine, ResultAggregator, IntentParser };