# AICart (IO011) - A2A Commerce Protocol

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-v2.2.1-blue.svg)](https://github.com/aicart-io011/releases)

> **Slogan**: 我的数据我做主  
> **Architecture**: Agent-to-Agent (A2A) Commerce with Pure Navigation

## 📖 What is AICart?

AICart is an open **Agent-to-Agent (A2A) commerce protocol** that enables merchants and customers to conduct business through their AI assistants, without surrendering data sovereignty to centralized platforms.

### Core Principles

1. **💯 Data Sovereignty**: Merchants keep 100% ownership of their product data
2. **🤖 Agent Autonomy**: Both merchants and users have their own AI assistants (Skills)
3. **🔓 Open Protocol**: Standard A2A protocol, any AI assistant can integrate

## 🏗️ Architecture

```
┌───────────────────┐         ┌───────────────────┐
│  Merchant Agent   │◄───────►│   Shopper Agent   │
│ (io011-merchant)  │  Direct │  (io011-shopper)  │
└─────────┬─────────┘  Connect └─────────┬─────────┘
          │                              │
          │ Register Tags                │ Query Tags
          ▼                              ▼
┌─────────────────────────────────────────────────────┐
│           AICart Hub (Pure Navigation)               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│  │   Registry   │ │ Tag Indexer  │ │   Router     │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ │
│                                                      │
│  💡 Only stores tags, NEVER stores product data!     │
└─────────────────────────────────────────────────────┘
```

### What Hub Stores vs Doesn't Store

| ✅ Hub Stores | ❌ Hub NEVER Stores |
|-------------|---------------------|
| Merchant ID | Product images |
| Tags (categories, capabilities) | Product descriptions |
| Connection endpoints | Inventory data |
| Online status | Order information |
| Reputation score | Customer data |

## 📁 Repository Structure

```
aicart-io011/
├── 📁 docs/                     # Documentation
│   ├── v1.1.1/                 # Legacy 3-layer architecture
│   ├── v2.1.1/                 # A2A initial version
│   └── v2.2.1/                 # Pure navigation (current)
├── 📁 hub/                      # Hub (Navigation Layer)
│   ├── src/                    # Source code
│   ├── tests/                  # Test suites
│   └── Dockerfile             # Container config
├── 📁 merchant-skill/           # Merchant Agent Skill
│   ├── src/                    # Source code
│   └── config/                 # Configuration templates
├── 📁 shopper-skill/            # Shopper Agent Skill
│   ├── src/                    # Source code
│   └── config/                 # Configuration templates
├── 📁 protocol/                 # A2A Protocol Specs
│   ├── a2a-protocol-v1.md      # Protocol specification
│   └── schemas/                # JSON schemas
└── 📁 examples/                 # Example implementations
    ├── merchant-example/       # Sample merchant setup
    └── integration-tests/      # E2E tests
```

## 🚀 Quick Start

### 1. Deploy Hub (Navigation Layer)

```bash
cd hub
npm install
npm run setup
cp .env.example .env
# Edit .env with your database config
npm run migrate
npm start
```

### 2. Setup Merchant Agent

```bash
cd merchant-skill
npm install
npm run configure
# Follow interactive setup
npm start
```

### 3. Setup Shopper Agent

```bash
cd shopper-skill
npm install
npm run configure
npm start
```

## 📚 Documentation

| Version | Description | Link |
|---------|-------------|------|
| v2.2.1 | Pure Navigation Architecture (Current) | [Feishu](https://feishu.cn/docx/GwzCd5ICfokXN3x8vA3cvgwkntd) |
| v2.1.1 | A2A Initial Version | [Feishu](https://feishu.cn/docx/KIzOdtHCBonwSQxe0jYcHUoanDg) |
| v1.1.1 | Legacy 3-Layer Architecture | [Feishu](...) |

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Roadmap

- [x] v2.2.1: Pure Navigation Architecture
- [ ] Hub MVP (Week 1-2)
- [ ] Merchant Skill (Week 3-4)
- [ ] Shopper Skill (Week 5-6)
- [ ] Payment Integration
- [ ] Reputation System
- [ ] Multi-platform Support

## 📄 License

This project is licensed under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- OpenClaw community for the AI assistant framework
- All contributors who believe in data sovereignty

---

**AICart - 我的数据我做主** 🚀
