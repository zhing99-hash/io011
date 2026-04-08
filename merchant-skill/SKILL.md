# AICart Merchant Skill

**版本**: v0.1.0  
**协议**: AICart-A2A v0.1  
**运行时**: OpenClaw

## 概述

商户端AI助手Skill，帮助商户自动运营店铺、管理商品、对接HUB平台。

## 核心能力

### 1. 商品AI处理
- 从图片识别商品属性
- 自动生成营销文案
- 智能推荐标签和分类

### 2. 站点自动生成
- 基于模板生成静态站点
- 自动优化SEO
- 响应式设计（PC/移动端）

### 3. HUB对接管理
- 支持多HUB平台连接
- 自动同步商品数据
- 实时库存同步

### 4. 自主运营
- 定时任务执行
- 数据分析和优化建议
- 异常自动处理

## 触发器

### 对话命令

| 命令 | 描述 | 示例 |
|------|------|------|
| `/merchant setup` | 初始化商户配置 | `/merchant setup` |
| `/product add` | 添加商品 | `/product add` |
| `/product list` | 查看商品列表 | `/product list` |
| `/hub connect <url>` | 连接HUB | `/hub connect https://hub.aicart.io` |
| `/hub sync` | 同步商品 | `/hub sync` |
| `/site open` | 打开站点 | `/site open` |
| `/analytics` | 查看数据 | `/analytics` |

### 文件触发

| 路径 | 事件 | 动作 |
|------|------|------|
| `data/products/*.json` | 文件创建/修改 | 自动处理并同步到HUB |
| `config/merchant.yaml` | 配置修改 | 自动重载配置 |
| `templates/*` | 模板修改 | 自动重新生成站点 |

### 定时任务

| 任务 | 频率 | 描述 |
|------|------|------|
| `heartbeat` | 每5分钟 | 向HUB发送心跳 |
| `sync-check` | 每小时 | 检查同步状态 |
| `site-optimize` | 每天 | 优化站点性能 |

## 数据存储

### 本地存储路径

```
workspace/
├── data/
│   ├── merchant.json      # 商户配置
│   ├── products/          # 商品数据
│   ├── orders/            # 订单数据（预留）
│   └── analytics/         # 统计数据
├── config/
│   └── merchant.yaml      # 运行配置
├── templates/             # 站点模板
├── generated-site/        # 生成的站点
└── uploads/               # 上传的图片
```

### 数据库Schema

见 [docs/database-schema.md](./docs/database-schema.md)

## 配置

### merchant.yaml

```yaml
merchant:
  name: "商户名称"
  description: "商户描述"
  contact:
    email: "merchant@example.com"
    phone: "+86 xxx"

site:
  template: "minimal"
  domain: "auto"  # 或自定义域名
  theme:
    primary_color: "#6366F1"

hubs:
  - name: "AICart主站"
    url: "https://hub.aicart.io"
    api_key: "${HUB_API_KEY_1}"
    auto_sync: true
  # 可添加更多HUB

ai:
  model: "default"  # 使用OpenClaw默认模型
  auto_process: true
  confidence_threshold: 0.8
```

## 依赖

- OpenClaw Gateway >= 2024.3
- Node.js >= 18
- SQLite3

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 运行测试
npm test

# 构建
npm run build
```

## 协议实现

本Skill实现了 [AICart-A2A协议 v0.1](./docs/protocol/A2A-PROTOCOL-v0.1.md)：

- ✅ 商户注册接口
- ✅ 商品索引同步
- ✅ 心跳上报
- ✅ 查询响应
- ⏳ 订单处理（预留）

## 故障排除

### 常见问题

**Q: HUB连接失败？**  
A: 检查API Key是否正确，网络是否连通

**Q: 商品同步失败？**  
A: 查看日志 `logs/sync.log`，检查商品数据格式

**Q: 站点无法访问？**  
A: 确认端口未被占用，防火墙设置正确

## 更新日志

### v0.1.0 (2024-03-27)
- 🎉 初始版本发布
- ✨ 商品AI处理
- ✨ HUB对接
- ✨ 站点自动生成

## 更多信息

- 详细文档：[./docs/](./docs/)
- 协议规范：[A2A-PROTOCOL-v0.1.md](./docs/protocol/A2A-PROTOCOL-v0.1.md)
- 问题反馈：[GitHub Issues](https://github.com/io011/merchant-skill/issues)
