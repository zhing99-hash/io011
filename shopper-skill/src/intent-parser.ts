/**
 * 意图解析器 - 将自然语言转换为结构化查询
 */

import { UserQuery } from './types';

export class IntentParser {
  /**
   * 解析用户输入
   * 支持格式：
   * - "想买茶杯，100-200元"
   * - "茶具 预算100块左右"
   * - "200元以下的茶壶"
   */
  async parse(input: string): Promise<UserQuery> {
    const rawInput = input.trim();
    
    // 提取类目
    const category = this.extractCategory(rawInput);
    
    // 提取价格区间
    const { minPrice, maxPrice } = this.extractPriceRange(rawInput);
    
    // 提取关键词（简单分词）
    const keywords = this.extractKeywords(rawInput, category);
    
    // 计算置信度
    const confidence = this.calculateConfidence(category, minPrice, maxPrice);

    return {
      rawInput,
      category,
      keywords,
      minPrice,
      maxPrice,
      confidence,
    };
  }

  /**
   * 提取商品类目
   */
  private extractCategory(input: string): string {
    // 类目映射表
    const categoryMap: Record<string, string[]> = {
      '茶杯': ['茶杯', '杯子', '茶盏', '品茗杯'],
      '茶壶': ['茶壶', '壶', '紫砂壶', '陶壶'],
      '茶具': ['茶具', '茶器', '茶道', '茶盘'],
      '茶叶': ['茶叶', '茶', '绿茶', '红茶', '普洱', '铁观音'],
      '茶盘': ['茶盘', '茶台', '茶海'],
    };

    for (const [category, keywords] of Object.entries(categoryMap)) {
      for (const keyword of keywords) {
        if (input.includes(keyword)) {
          return category;
        }
      }
    }

    // 默认返回"茶具"
    return '茶具';
  }

  /**
   * 提取价格区间
   * 支持格式：
   * - "100-200元"
   * - "100到200块"
   * - "200以下"
   * - "100以上"
   * - "预算100左右"
   */
  private extractPriceRange(input: string): { minPrice?: number; maxPrice?: number } {
    let minPrice: number | undefined;
    let maxPrice: number | undefined;

    // 匹配 "100-200元" 或 "100到200块"
    const rangeMatch = input.match(/(\d+)[\-\~到](\d+)[元块]?/);
    if (rangeMatch) {
      minPrice = parseInt(rangeMatch[1], 10);
      maxPrice = parseInt(rangeMatch[2], 10);
      return { minPrice, maxPrice };
    }

    // 匹配 "200元以下" "200以内"
    const belowMatch = input.match(/(\d+)[元块]?(以下|以内|以下|之内)/);
    if (belowMatch) {
      maxPrice = parseInt(belowMatch[1], 10);
      return { minPrice, maxPrice };
    }

    // 匹配 "100元以上" "100以上"
    const aboveMatch = input.match(/(\d+)[元块]?(以上|以上|起步|起)/);
    if (aboveMatch) {
      minPrice = parseInt(aboveMatch[1], 10);
      return { minPrice, maxPrice };
    }

    // 匹配 "预算100左右" "100左右"
    const aroundMatch = input.match(/(?:预算)?(\d+)[元块]?左右/);
    if (aroundMatch) {
      const price = parseInt(aroundMatch[1], 10);
      minPrice = Math.floor(price * 0.8);
      maxPrice = Math.ceil(price * 1.2);
      return { minPrice, maxPrice };
    }

    return { minPrice, maxPrice };
  }

  /**
   * 提取关键词（简单实现）
   */
  private extractKeywords(input: string, category: string): string[] {
    const keywords: string[] = [];
    
    // 材质关键词
    const materials = ['紫砂', '陶瓷', '玻璃', '竹', '木', '铁', '银'];
    for (const material of materials) {
      if (input.includes(material)) {
        keywords.push(material);
      }
    }

    // 工艺关键词
    const crafts = ['手工', '机制', '复古', '现代', '日式', '中式'];
    for (const craft of crafts) {
      if (input.includes(craft)) {
        keywords.push(craft);
      }
    }

    return keywords;
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(category: string, minPrice?: number, maxPrice?: number): number {
    let confidence = 0.5;
    
    // 识别到类目增加置信度
    if (category && category !== '茶具') {
      confidence += 0.3;
    }

    // 识别到价格增加置信度
    if (minPrice !== undefined || maxPrice !== undefined) {
      confidence += 0.2;
    }

    return Math.min(confidence, 1.0);
  }
}