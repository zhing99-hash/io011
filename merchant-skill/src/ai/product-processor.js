/**
 * 商品AI处理模块
 * 
 * 使用OpenClaw绑定的AI模型进行多模态商品分析
 */

const { Logger } = require('../utils/logger');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

class ProductProcessor {
  constructor(config = {}) {
    this.config = config;
    this.logger = new Logger('ProductProcessor');
    this.confidenceThreshold = config.ai?.confidence_threshold || 0.8;
    this.language = config.ai?.language || 'zh-CN';
  }

  /**
   * 处理商品 - 主入口
   * @param {string} imagePath - 商品图片路径
   * @param {string} textHint - 用户提供的文字描述提示
   * @returns {Promise<Object>} 结构化商品数据
   */
  async processProduct(imagePath, textHint = '') {
    this.logger.info(`开始处理商品: ${imagePath}`);
    
    try {
      // 验证图片路径
      if (!fs.existsSync(imagePath)) {
        throw new Error(`图片文件不存在: ${imagePath}`);
      }

      // 步骤1: 使用AI分析图片提取信息
      const imageAnalysis = await this.analyzeImage(imagePath, textHint);
      
      // 步骤2: 使用LLM生成优化后的商品描述
      const enhancedDescription = await this.generateDescription(imageAnalysis, textHint);
      
      // 步骤3: 结构化数据
      const structuredData = this.structureProductData(imageAnalysis, enhancedDescription);
      
      // 步骤4: 生成唯一ID
      structuredData.id = this.generateProductId(structuredData);
      
      this.logger.info(`商品处理完成: ${structuredData.name}`);
      
      return {
        success: true,
        data: structuredData,
        metadata: {
          processedAt: new Date().toISOString(),
          confidence: imageAnalysis.confidence || 0.85,
          aiVersion: 'v1.0'
        }
      };
      
    } catch (error) {
      this.logger.error('商品处理失败:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * 使用AI分析商品图片
   * @param {string} imagePath - 图片路径
   * @param {string} textHint - 文字提示
   * @returns {Promise<Object>} 分析结果
   */
  async analyzeImage(imagePath, textHint) {
    this.logger.debug('分析商品图片...');
    
    // 构建分析提示词
    const analysisPrompt = `请详细分析这张商品图片，提取以下信息：

${textHint ? `用户提供的描述: "${textHint}"` : ''}

请提取并返回以下JSON格式的信息：
{
  "productName": "商品名称（简短准确）",
  "category": "商品分类（如: 电子产品、服装、食品等）",
  "subCategory": "子分类（如: 手机、T恤、零食等）",
  "estimatedPrice": "预估价格范围（如: 100-200元）",
  "brand": "品牌（如有明显标识）",
  "color": "主要颜色",
  "material": "材质（如适用）",
  "size": "尺寸规格（如适用）",
  "condition": "新旧程度（全新/九成新等）",
  "keyFeatures": ["主要特点1", "主要特点2", "主要特点3"],
  "targetAudience": "目标用户群体",
  "tags": ["标签1", "标签2", "标签3", "标签4", "标签5"],
  "stockEstimate": "库存预估数量（数字）",
  "confidence": 0.85
}

请确保返回的是有效的JSON格式。`;

    try {
      // 模拟AI分析结果（实际使用时通过image工具调用）
      // 在实际实现中，这里应该调用 OpenClaw 的 image 工具
      const analysisResult = await this.callImageAnalysis(imagePath, analysisPrompt);
      
      return {
        ...analysisResult,
        originalImage: imagePath,
        textHint: textHint
      };
    } catch (error) {
      this.logger.error('图片分析失败:', error);
      // 返回基本结构作为fallback
      return {
        productName: '未命名商品',
        category: '其他',
        subCategory: '其他',
        estimatedPrice: '0-100元',
        brand: '',
        color: '',
        material: '',
        size: '',
        condition: '全新',
        keyFeatures: [],
        targetAudience: '通用',
        tags: ['待分类'],
        stockEstimate: '10',
        confidence: 0.5,
        originalImage: imagePath,
        textHint: textHint
      };
    }
  }

  /**
   * 调用图片分析（实际实现使用OpenClaw image工具）
   * @param {string} imagePath - 图片路径
   * @param {string} prompt - 分析提示词
   * @returns {Promise<Object>} 分析结果
   */
  async callImageAnalysis(imagePath, prompt) {
    // 这是一个占位实现
    // 实际使用时通过OpenClaw的image工具调用AI模型
    // 例如: await image({ image: imagePath, prompt: prompt });
    
    // 模拟AI响应（开发测试用）
    return {
      productName: '示例商品名称',
      category: '电子产品',
      subCategory: '智能手机配件',
      estimatedPrice: '50-100元',
      brand: '未知品牌',
      color: '黑色',
      material: '硅胶+塑料',
      size: '标准',
      condition: '全新',
      keyFeatures: ['防摔设计', '轻薄便携', '精准开孔'],
      targetAudience: '手机用户',
      tags: ['手机壳', '保护套', '配件', '防摔', '硅胶'],
      stockEstimate: '50',
      confidence: 0.9
    };
  }

  /**
   * 生成商品描述
   * @param {Object} imageAnalysis - 图片分析结果
   * @param {string} textHint - 用户提示
   * @returns {Promise<string>} 优化后的描述
   */
  async generateDescription(imageAnalysis, textHint) {
    this.logger.debug('生成商品描述...');
    
    const descriptionPrompt = `基于以下商品信息，生成一个吸引人的商品描述（${this.language === 'zh-CN' ? '中文' : 'English'}）：

商品名称: ${imageAnalysis.productName}
分类: ${imageAnalysis.category} / ${imageAnalysis.subCategory}
价格区间: ${imageAnalysis.estimatedPrice}
品牌: ${imageAnalysis.brand || '未知'}
颜色: ${imageAnalysis.color || '未标注'}
材质: ${imageAnalysis.material || '未标注'}
尺寸: ${imageAnalysis.size || '标准'}
新旧程度: ${imageAnalysis.condition}
主要特点: ${(imageAnalysis.keyFeatures || []).join(', ')}
目标用户: ${imageAnalysis.targetAudience}

${textHint ? `用户补充描述: ${textHint}` : ''}

请生成三段描述：
1. 简短描述（50字以内，用于列表展示）
2. 详细描述（200-300字，包含产品特点和卖点）
3. 卖点列表（3-5条，每条一句话）

返回JSON格式：
{
  "short": "简短描述",
  "detailed": "详细描述",
  "sellingPoints": ["卖点1", "卖点2", "卖点3"]
}`;

    try {
      // 实际使用时调用LLM
      // 模拟生成结果
      return {
        short: `${imageAnalysis.productName}，${imageAnalysis.color}${imageAnalysis.subCategory}，${imageAnalysis.keyFeatures[0] || '品质保证'}。`,
        detailed: `这款${imageAnalysis.productName}是${imageAnalysis.targetAudience}的理想选择。采用优质${imageAnalysis.material || '材料'}制作，${imageAnalysis.color ? `经典的${imageAnalysis.color}设计` : '简约时尚的外观'}，${(imageAnalysis.keyFeatures || []).join('，')}。无论是自用还是送礼，都是不错的选择。`,
        sellingPoints: imageAnalysis.keyFeatures || ['品质保证', '性价比高', '售后无忧']
      };
    } catch (error) {
      this.logger.error('描述生成失败:', error);
      return {
        short: `${imageAnalysis.productName}`,
        detailed: `优质${imageAnalysis.subCategory || '商品'}，品质保证。`,
        sellingPoints: ['品质保证', '正品行货']
      };
    }
  }

  /**
   * 结构化商品数据
   * @param {Object} analysis - 分析结果
   * @param {Object} description - 生成的描述
   * @returns {Object} 标准化商品数据
   */
  structureProductData(analysis, description) {
    // 提取价格范围中的平均值
    const priceRange = analysis.estimatedPrice || '0-100元';
    const priceMatch = priceRange.match(/(\d+(?:\.\d+)?)/g);
    let price = 0;
    if (priceMatch && priceMatch.length >= 2) {
      price = (parseFloat(priceMatch[0]) + parseFloat(priceMatch[priceMatch.length - 1])) / 2;
    } else if (priceMatch && priceMatch.length === 1) {
      price = parseFloat(priceMatch[0]);
    }

    // 提取库存
    let stock = 10;
    if (analysis.stockEstimate) {
      const stockMatch = analysis.stockEstimate.toString().match(/\d+/);
      if (stockMatch) {
        stock = parseInt(stockMatch[0], 10);
      }
    }

    return {
      name: analysis.productName,
      description: description.detailed,
      shortDescription: description.short,
      sellingPoints: JSON.stringify(description.sellingPoints),
      category: analysis.category,
      subCategory: analysis.subCategory,
      price: price,
      currency: 'CNY',
      stock: stock,
      brand: analysis.brand || '',
      color: analysis.color || '',
      material: analysis.material || '',
      size: analysis.size || '',
      condition: analysis.condition || '全新',
      tags: JSON.stringify(analysis.tags || []),
      targetAudience: analysis.targetAudience || '通用',
      images: JSON.stringify([analysis.originalImage]),
      aiMetadata: JSON.stringify({
        confidence: analysis.confidence,
        textHint: analysis.textHint,
        features: analysis.keyFeatures
      }),
      status: 'active'
    };
  }

  /**
   * 生成商品唯一ID
   * @param {Object} productData - 商品数据
   * @returns {string} 商品ID
   */
  generateProductId(productData) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const nameHash = crypto
      .createHash('md5')
      .update(productData.name)
      .digest('hex')
      .substring(0, 8);
    return `prod_${nameHash}_${timestamp}_${random}`;
  }

  /**
   * 批量处理商品
   * @param {Array<{imagePath: string, textHint: string}>} items - 商品列表
   * @returns {Promise<Array>} 处理结果
   */
  async batchProcess(items) {
    this.logger.info(`开始批量处理 ${items.length} 个商品`);
    
    const results = [];
    for (const item of items) {
      const result = await this.processProduct(item.imagePath, item.textHint);
      results.push(result);
      
      // 添加小延迟避免请求过快
      await this.delay(100);
    }
    
    const successCount = results.filter(r => r.success).length;
    this.logger.info(`批量处理完成: ${successCount}/${items.length} 成功`);
    
    return results;
  }

  /**
   * 更新商品AI信息
   * @param {Object} existingProduct - 现有商品
   * @param {string} newImagePath - 新图片路径（可选）
   * @returns {Promise<Object>} 更新后的商品数据
   */
  async reprocessProduct(existingProduct, newImagePath = null) {
    const imagePath = newImagePath || existingProduct.images?.[0];
    if (!imagePath) {
      throw new Error('没有可用的图片进行重新处理');
    }
    
    const result = await this.processProduct(imagePath, existingProduct.description);
    
    if (result.success) {
      // 保留原有ID和创建时间
      result.data.id = existingProduct.id;
      result.data.createdAt = existingProduct.createdAt;
    }
    
    return result;
  }

  /**
   * 延迟函数
   * @param {number} ms - 毫秒
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { ProductProcessor };
