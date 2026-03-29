/**
 * 并行查询引擎 - 同时查询多个商户
 */

import { MerchantInfo, UserQuery, MerchantResult } from './types';
import { MerchantA2AClient } from './merchant-a2a-client';

interface QueryEngineConfig {
  maxConcurrency: number;
  timeout: number;
  maxProductsPerMerchant: number;
}

export class ParallelQueryEngine {
  private config: QueryEngineConfig;

  constructor(config: QueryEngineConfig) {
    this.config = config;
  }

  /**
   * 并行查询多个商户
   */
  async queryMerchants(
    merchants: MerchantInfo[],
    query: UserQuery,
    timeout: number
  ): Promise<MerchantResult[]> {
    // 限制并发数
    const limitedMerchants = merchants.slice(0, this.config.maxConcurrency);
    
    console.log(`  [QueryEngine] 开始并行查询 ${limitedMerchants.length} 个商户 (超时: ${timeout}ms)`);

    // 创建查询任务
    const queryTasks = limitedMerchants.map(merchant => 
      this.querySingleMerchant(merchant, query, timeout)
    );

    // 并行执行所有查询
    const results = await Promise.all(queryTasks);

    const successCount = results.filter(r => r.success).length;
    console.log(`  [QueryEngine] 查询完成: ${successCount}/${results.length} 成功`);

    return results;
  }

  /**
   * 查询单个商户（带超时控制）
   */
  private async querySingleMerchant(
    merchant: MerchantInfo,
    query: UserQuery,
    timeout: number
  ): Promise<MerchantResult> {
    const startTime = Date.now();
    const client = new MerchantA2AClient(merchant);

    try {
      // 创建超时Promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), timeout);
      });

      // 竞争：查询vs超时
      const { products, latency } = await Promise.race([
        client.searchProducts(query, timeout),
        timeoutPromise,
      ]);

      return {
        merchantId: merchant.id,
        merchantName: merchant.name,
        success: true,
        products: products.slice(0, this.config.maxProductsPerMerchant),
        latency: Date.now() - startTime,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isTimeout = errorMessage === 'Timeout';

      return {
        merchantId: merchant.id,
        merchantName: merchant.name,
        success: false,
        error: isTimeout ? '响应超时' : errorMessage,
        latency: Date.now() - startTime,
      };
    }
  }
}
