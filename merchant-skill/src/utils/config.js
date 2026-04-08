/**
 * 配置管理工具
 */

const yaml = require('yaml');
const fs = require('fs').promises;
const path = require('path');

class ConfigManager {
  constructor(configPath) {
    this.configPath = configPath;
    this.config = null;
  }

  /**
   * 加载配置
   */
  async load() {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      this.config = yaml.parse(content);
      
      // 加载环境变量
      this.loadEnvVars();
      
      return this.config;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('⚠️ 配置文件不存在，使用默认配置');
        return this.getDefaultConfig();
      }
      throw error;
    }
  }

  /**
   * 加载环境变量
   */
  loadEnvVars() {
    // 替换 ${VAR_NAME} 为环境变量值
    const replaceEnv = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          obj[key] = obj[key].replace(/\$\{(\w+)\}/g, (match, varName) => {
            return process.env[varName] || match;
          });
        } else if (typeof obj[key] === 'object') {
          replaceEnv(obj[key]);
        }
      }
    };
    
    replaceEnv(this.config);
  }

  /**
   * 默认配置
   */
  getDefaultConfig() {
    return {
      merchant: {
        name: '未命名商户',
        description: ''
      },
      server: {
        port: 3456
      },
      hubs: [],
      ai: {
        auto_process: true
      }
    };
  }

  /**
   * 保存配置
   */
  async save(config) {
    const yamlStr = yaml.stringify(config);
    await fs.writeFile(this.configPath, yamlStr, 'utf-8');
    this.config = config;
  }
}

module.exports = { ConfigManager };
