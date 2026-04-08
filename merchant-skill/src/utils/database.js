/**
 * 数据库工具类
 * SQLite封装
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class DatabaseManager {
  constructor(dbPath = null) {
    this.dbPath = dbPath || path.join(process.cwd(), 'data', 'merchant.db');
    this.db = null;
  }

  /**
   * 连接数据库
   */
  async connect() {
    // 确保目录存在
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    
    console.log(`✅ 数据库已连接: ${this.dbPath}`);
  }

  /**
   * 执行SQL
   */
  async exec(sql) {
    return this.db.exec(sql);
  }

  /**
   * 运行SQL（带参数）
   */
  async run(sql, params = []) {
    const stmt = this.db.prepare(sql);
    return stmt.run(params);
  }

  /**
   * 查询单条
   */
  async get(sql, params = []) {
    const stmt = this.db.prepare(sql);
    return stmt.get(params);
  }

  /**
   * 查询多条
   */
  async all(sql, params = []) {
    const stmt = this.db.prepare(sql);
    return stmt.all(params);
  }

  /**
   * 关闭连接
   */
  close() {
    if (this.db) {
      this.db.close();
      console.log('📦 数据库已关闭');
    }
  }
}

module.exports = { DatabaseManager };
