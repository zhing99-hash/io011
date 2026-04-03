# AICart Merchant Skill

> 🏪 商户端AI助手 - 让AI自动运营您的商业

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Protocol: A2A](https://img.shields.io/badge/Protocol-A2A%20v0.1-blue.svg)](./docs/protocol/A2A-PROTOCOL-v0.1.md)
[![OpenClaw](https://img.shields.io/badge/Powered%20by-OpenClaw-green.svg)](https://openclaw.ai)

## 🎯 愿景

**我的数据我做主**

AICart Merchant Skill 是一个开源的商户端AI助手，让商户能够：
- 🤖 **AI自动运营**：商品录入、描述优化、库存管理全程自动化
- 🏠 **数据本地存储**：完全掌控自己的商业数据
- 🔌 **多HUB对接**：一键连接多个销售平台
- 🌍 **独立部署**：在自己的服务器上运行，真正拥有自主权

## ✨ 核心特性

| 特性 | 描述 |
|------|------|
| **AI商品处理** | 上传图片自动生成商品信息、营销文案、推荐标签 |
| **自动站点生成** | AI自动生成完整的商户展示站点 |
| **多HUB同步** | 支持同时对接多个AICart HUB平台 |
| **自我管理** | Skill自动维护站点、处理订单、优化运营 |
| **协议开放** | 基于A2A开放协议，任何人可以自建HUB |

## 🚀 快速开始

### 环境要求

- Node.js 18+
- OpenClaw Gateway
- SQLite（内置，无需额外安装）

### 一键安装

```bash
# 克隆仓库
git clone https://github.com/io011/merchant-skill.git
cd merchant-skill

# 安装依赖
npm install

# 启动OpenClaw Gateway
openclaw gateway start

# 部署Skill
openclaw skills install ./

# 配置商户信息
openclaw chat
> /merchant setup
```

### AI助手引导配置

安装完成后，AI助手会自动引导您完成：
1. 商户信息设置（名称、描述、联系方式）
2. HUB平台连接（输入API Key）
3. 站点主题选择
4. 首件商品录入

## 📖 使用指南

### 与AI助手对话

```
# 添加商品
> 添加商品 [上传图片]
AI：已识别商品：蓝色T恤，棉质，建议售价¥99。
   已生成营销文案，是否保存？

# 查看站点
> 我的站点
AI：您的站点已生成：https://your-shop.aicart.io
   今日访问：128次，新增订单：3个

# 同步到HUB
> 同步到HUB
AI：正在同步到3个HUB平台...
   ✅ AICart主站：已同步12件商品
   ✅ 某HUB：已同步12件商品
   ⚠️ 某HUB：连接超时，已加入重试队列
```

### 管理命令

| 命令 | 说明 |
|------|------|
| `/merchant setup` | 初始化商户配置 |
| `/product add` | 添加商品 |
| `/product list` | 查看商品列表 |
| `/hub connect` | 连接HUB平台 |
| `/hub sync` | 同步商品到HUB |
| `/site open` | 打开商户站点 |
| `/analytics` | 查看经营数据 |

## 🏗️ 架构

```
商户服务器
├── OpenClaw Gateway
│   └── Merchant Skill (本仓库)
│       ├── 命令处理器 (/src/commands)
│       ├── AI处理模块 (/src/ai)
│       ├── HUB客户端 (/src/hub-client)
│       └── 站点生成器 (/src/site-generator)
├── SQLite 数据库 (本地存储)
├── 生成的站点文件 (静态HTML)
└── 上传的图片资源
```

## 📚 文档

- [A2A协议规范](./docs/protocol/A2A-PROTOCOL-v0.1.md) - HUB对接标准
- [部署指南](./docs/deploy/README.md) - 详细部署说明
- [自定义开发](./docs/customize/README.md) - 扩展Skill功能
- [API参考](./docs/api/README.md) - 内部API文档

## 🤝 贡献

我们欢迎所有形式的贡献！

- 🐛 [提交Bug](https://github.com/io011/merchant-skill/issues)
- 💡 [功能建议](https://github.com/io011/merchant-skill/discussions)
- 🔧 [提交PR](https://github.com/io011/merchant-skill/pulls)
- 📖 [改进文档](./docs/)

### 贡献者

感谢所有为AICart生态做出贡献的开发者！

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件

## 🔗 相关项目

- [AICart HUB](https://github.com/io011/hub) - HUB平台实现
- [AICart Protocol](https://github.com/io011/protocol) - A2A协议规范
- [OpenClaw](https://github.com/openclaw/openclaw) - AI助手运行时

## 💬 社区

- [Discord](https://discord.gg/aicart)
- [论坛](https://forum.aicart.io)
- [Twitter](https://twitter.com/aicart_io)

---

**让每个人都能拥有AI驱动的商业自主权和数据主权** 🚀
