/**
 * 日志工具类
 */

const winston = require('winston');
const path = require('path');

class Logger {
  constructor(name = 'MerchantSkill') {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ level, message, timestamp }) => {
          return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'error.log'),
          level: 'error'
        }),
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'combined.log')
        })
      ]
    });
    this.name = name;
  }

  info(message, ...args) {
    this.logger.info(`[${this.name}] ${message}`, ...args);
  }

  error(message, ...args) {
    this.logger.error(`[${this.name}] ${message}`, ...args);
  }

  warn(message, ...args) {
    this.logger.warn(`[${this.name}] ${message}`, ...args);
  }

  debug(message, ...args) {
    this.logger.debug(`[${this.name}] ${message}`, ...args);
  }
}

module.exports = { Logger };
