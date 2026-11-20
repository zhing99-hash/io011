# IO011 · 企业 AI 连接平台（开发预览）

面向企业自行部署的多助手连接基础，统一接口、身份、权限及数据接入。业务 Agent 与工作流由企业独立实现。

当前提供 HTTPS API、平台账号、OAuth/MCP 查询、隔离上传与受限审查、网页连接管理，以及 Codex、WorkBuddy、DeepSeek Harness 的配置适配和终端安装器。

**仍处于开发联调阶段。三款助手完整实机、真实扫描器、可靠交付、独立安装运行时和生产验收尚未完成。**

## 快速开始

需要 Node.js 24 和 pnpm 11。

```powershell
git clone --branch next/enterprise-gateway https://github.com/zhing99-hash/io011.git
cd io011/agent-gateway
pnpm install --frozen-lockfile --ignore-scripts --node-linker=hoisted
pnpm test
```

服务启动、证书与管理员初始化见[运行说明](docs/agent-gateway/06-runtime-and-authentication.md)；客户端安装见[引导安装](docs/agent-gateway/10-client-installation.md)。实际密钥、数据文件与企业配置应放在仓库外。

- [产品需求](docs/agent-gateway/01-product-requirements.md)
- [开发规划](docs/agent-gateway/02-development-plan.md)
- [实现进度与验证范围](docs/agent-gateway/03-implementation-status.md)
- [模块完整说明](agent-gateway/README.md)
- [代码仓库替换方案](docs/agent-gateway/11-io011-repository-transition.md)

原 AICart 商家/购物系统与新版平台属于不同产品方向；旧版本可在原分支和 Git 历史查阅，新版不承诺旧业务接口或数据库兼容。仓库替换不代表服务器已切换。

许可证见 [LICENSE](LICENSE)。

本版本通过迁移分支和草稿 PR 审阅；当前默认分支仍保留旧版代码。[迁移记录](MIGRATION-NOTES.md)说明基线、验证和历史保留方式。
