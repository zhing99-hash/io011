/**
 * 结果聚合器 - 合并多商户商品结果
 */

import { Product, MerchantResult } from './types';

export class ResultAggregator {
  /**
   * 聚合多个商户的查询结果
   * MVP阶段：简单去重+排序
   */
  aggregate(results: MerchantResult[]): Product[] {
    // 收集所有成功结果的商品
    const allProducts: Product[] = [];
    
    for (const result of results) {
      if (result.success && result.products) {
        allProducts.push(...result.products);
      }
    }

    console.log(`  [Aggregator] 聚合前: ${allProducts.length} 个商品`);

    // 去重
    const dedupedProducts = this.deduplicate(allProducts);
    console.log(`  [Aggregator] 去重后: ${dedupedProducts.length} 个商品`);

    // 排序（按价格升序）
    const sortedProducts = this.sortByPrice(dedupedProducts);

    return sortedProducts;
  }

  /**
   * 商品去重
   * MVP阶段：简单规则（同商户同名称去重）
   * Post-MVP：可升级为图像识别+语义相似度
   */
  private deduplicate(products: Product[]): Product[] {
    const seen = new Set<string>();
    const unique: Product[] = [];

    for (const product of products) {
      // 去重键：商户ID+商品名称
      const key = `${product.merchantId}-${product.name}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(product);
      }
    }

    return unique;
  }

  /**
   * 按价格升序排序
   */
  private sortByPrice(products: Product[]): Product[] {
    return products.sort((a, b) => a.price - b.price);
  }

  /**
   * 格式化结果（用于展示）
   */
  formatForDisplay(products: Product[]): string {
    if (products.length === 0) {
      return '未找到符合条件的商品';
    }

    const lines: string[] = [''];
    lines.push(`找到 ${products.length} 个商品：`);
    lines.push('');

    products.forEach((product, index) => {
      lines.push(`${index + 1}. ${product.name}`);
      lines.push(`   价格: ¥${product.price}  商户: ${product.merchantName}`);
      if (product.stock !== undefined) {
        lines.push(`   库存: ${product.stock}件`);
      }
      lines.push(`   链接: ${product.url || '暂无'}`);
      lines.push('');
    });

    return lines.join('\n');
  }
}
