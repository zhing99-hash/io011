/**
 * AICart Merchant Skill - 主入口
 * 
 * 商户端AI助手核心模块
 */

const { MerchantSkill } = require('./skill');
const { ConfigManager } = require('./utils/config');
const { Logger } = require('./utils/logger');
const path = require('path');

// 初始化日志
const logger = new Logger('MerchantSkill');

// 主函数
async function main() {
  try {
    logger.info('🚀 AICart Merchant Skill 启动中...');
    logger.info('版本: 0.1.0 | 协议: A2A v0.1');

    // 加载配置
    const configPath = path.join(process.cwd(), 'config', 'merchant.yaml');
    const configManager = new ConfigManager(configPath);
    const config = await configManager.load();
    
    logger.info(`📦 配置加载完成: ${config.merchant?.name || '未命名商户'}`);

    // 初始化Skill
    const skill = new MerchantSkill(config);
    
    // 启动
    await skill.start();
    
    logger.info('✅ Skill启动成功！');
    logger.info('可用命令: /merchant setup, /product add, /hub connect, /site open');

  } catch (error) {
    logger.error('❌ Skill启动失败:', error.message);
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝:', reason);
});

// 运行
if (require.main === module) {
  main();
}

module.exports = { main };
