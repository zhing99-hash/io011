# IO011 仓库迁移记录

日期：2026-11-18。范围：仅发布代码替换分支及草稿 PR，不合并 main，不执行部署或数据库操作。

## 基线与历史

- main：3f069607442f6c6c09a6ab8cef5a765f613a9053。
- v2.3.6-dev：f4e1e0e6f3825953082d3fdf0bff30052dd77843。
- 替换分支：next/enterprise-gateway，保留旧 main 的祖先关系。
- 归档引用：archive/aicart-main-2026-11-18、archive/aicart-v2.3.6-2026-11-18，分别固定上述旧提交；全部原分支保持原指向。

为方便审阅，先以单独提交移除旧 hub/node_modules 跟踪项，再提交新平台目录。旧产品代码、依赖与环境文件仍存在于 Git 历史；本次没有重写历史或读取旧环境变量值。

## 迁入与验证

迁入 agent-gateway 与 docs/agent-gateway，保留原 LICENSE；新增根说明、贡献说明、忽略规则、文本行尾规则和仅测试用途的 CI。公开 TLS 夹具为自动化测试材料。实际配置、密钥、数据库、依赖目录和本机安装备份不在新提交的源码树中。

在独立本地检出中，使用 Node.js 24.22.3、pnpm 11.25.0 安装冻结锁定依赖并禁用安装脚本，94 项测试全部通过。文件哈希、文档本地链接、工作流 YAML 与暂存树另外核对。GitHub CI 的结果以 PR Checks 为准。

## 发布边界

GitHub 中原有 Actions 运行记录为空，已核对旧 main 与 v2.3.6-dev 未含 .github 工作流。此次新增 CI 仅在指向 main 的 PR 或手动运行时执行测试，contents 权限只读，没有部署步骤、生产凭证或 SSH。

独立分支发布由仓库维护者授权；外部 webhook、部署平台及服务器定时拉取未在当前连接器能力内完成核验。此次没有执行服务器操作，不把未合并的 PR 视作生产切换。合并 main 前仍须确认外部自动化影响。

平台处于开发预览，功能缺口见 [进度记录](docs/agent-gateway/03-implementation-status.md)。
