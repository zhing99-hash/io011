# AICart (IO011) - A2A 商业协议

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-v2.2.1-blue.svg)](https://github.com/aicart-io011/releases)

> **口号**：我的数据我做主  
> **架构**：基于纯导航的 Agent-to-Agent (A2A) 商业协议

📖 [View English Version / 查看英文版本](README.md)

---

## 📖 什么是 AICart？

AICart 是一个开放的 **Agent-to-Agent（A2A）商业协议**，允许商家和消费者通过各自的 AI 助手直接进行交易，无需将数据主权让渡给中心化平台。

### 核心理念

1. **💯 数据主权**：商家完全自主掌控 100% 的商品数据
2. **🤖 智能体自治**：商家与用户各自拥有独立的 AI 助手（技能模块）
3. **🔓 开放协议**：基于标准 A2A 协议，任何 AI 助手均可接入

---

## 🏗️ 系统架构

```
┌───────────────────┐         ┌───────────────────┐
│    商家智能体      │◄───────►│    购物智能体      │
│ (io011-merchant)  │  直连   │  (io011-shopper)  │
└─────────┬─────────┘         └─────────┬─────────┘
          │                              │
          │ 注册标签                     │ 查询标签
          ▼                              ▼
┌─────────────────────────────────────────────────────┐
│              AICart Hub（纯导航层）                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│  │    注册表     │ │  标签索引器  │ │    路由器    │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ │
│                                                      │
│  💡 仅存储标签，绝不存储任何商品数据！                │
└─────────────────────────────────────────────────────┘
```

### Hub 存储与不存储的内容对比

| ✅ Hub 存储的内容 | ❌ Hub 绝不存储的内容 |
|---|---|
| 商家 ID | 商品图片 |
| 标签（分类、能力描述） | 商品描述 |
| 连接端点 | 库存数据 |
| 在线状态 | 订单信息 |
| 信誉评分 | 用户数据 |

---

## 📁 仓库目录结构

```
aicart-io011/
├── 📁 docs/                     # 文档
│   ├── v1.1.1/                 # 旧版三层架构
│   ├── v2.1.1/                 # A2A 初始版本
│   └── v2.2.1/                 # 纯导航架构（当前版本）
├── 📁 hub/                      # Hub（导航层）
│   ├── src/                    # 源代码
│   ├── tests/                  # 测试套件
│   └── Dockerfile             # 容器配置
├── 📁 merchant-skill/           # 商家智能体技能模块
│   ├── src/                    # 源代码
│   └── config/                 # 配置模板
├── 📁 shopper-skill/            # 购物智能体技能模块
│   ├── src/                    # 源代码
│   └── config/                 # 配置模板
├── 📁 protocol/                 # A2A 协议规范
│   ├── a2a-protocol-v1.md      # 协议说明文档
│   └── schemas/                # JSON Schema 定义
└── 📁 examples/                 # 示例实现
    ├── merchant-example/       # 商家接入示例
    └── integration-tests/      # 端到端测试
```

---

## 🚀 快速上手

### 1. 部署 Hub（导航层）

```bash
cd hub
npm install
npm run setup
cp .env.example .env
# 编辑 .env，填写数据库配置
npm run migrate
npm start
```

### 2. 配置商家智能体

```bash
cd merchant-skill
npm install
npm run configure
# 按照交互提示完成配置
npm start
```

### 3. 配置购物智能体

```bash
cd shopper-skill
npm install
npm run configure
npm start
```

---

## 📚 文档版本

| 版本 | 说明 | 链接 |
|---|---|---|
| v2.2.1 | 纯导航架构（当前版本） | [飞书文档](https://feishu.cn/docx/GwzCd5ICfokXN3x8vA3cvgwkntd) |
| v2.1.1 | A2A 初始版本 | [飞书文档](https://feishu.cn/docx/KIzOdtHCBonwSQxe0jYcHUoanDg) |
| v1.1.1 | 旧版三层架构 | [飞书文档](...) |

---

## 🤝 参与贡献

欢迎贡献代码！请参阅 [CONTRIBUTING.md](CONTRIBUTING.md) 了解贡献指南。

### 开发路线图

- [x] v2.2.1：纯导航架构
- [ ] Hub MVP（第 1-2 周）
- [ ] 商家技能模块（第 3-4 周）
- [ ] 购物技能模块（第 5-6 周）
- [ ] 支付集成
- [ ] 信誉系统
- [ ] 多平台支持

---

## 📄 开源许可

本项目采用 [MIT 许可证](LICENSE)。

## 🙏 致谢

- 感谢 OpenClaw 社区提供的 AI 助手框架支持
- 感谢所有相信数据主权理念的贡献者

---

**AICart - 我的数据我做主** 🚀
