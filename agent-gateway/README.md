# 企业 AI 连接网关：开发联调版

企业自部署的多助手连接基础。当前包含自带账号、用户/组授权、目标登记、HTTPS API、浏览器 OAuth 授权、官方 SDK 的查询型 MCP 入口、隔离上传、受限格式检查、ClamAV 适配器和审计。**项目尚未完成生产验收，也没有完成三款客户端插件的一键接入。**

## 安装与测试

需要 Node 24 与 pnpm 11。依赖版本和完整性锁定，安装脚本禁用；平铺依赖布局兼容当前 Windows 工作区。

```powershell
pnpm install --frozen-lockfile --ignore-scripts --node-linker=hoisted
node --preserve-symlinks --preserve-symlinks-main --test
```

当前测试使用临时目录、协议模拟扫描服务、本机 HTTP/HTTPS 服务及官方 MCP SDK 客户端。测试不要求真实企业凭证。`test/fixtures` 内的证书和密钥是公开测试材料，不得用于实际部署。

## 本地 HTTPS 联调

1. 复制 `config.example.json` 到私有配置目录，修改绝对路径、HTTPS 域名、端口及企业证书路径，保留本机监听。
2. 通过标准输入提供管理员账号 JSON，运行 `scripts/bootstrap.mjs <绝对配置路径>`；只有空数据库允许初始化，不提供默认密码。
3. 运行 `scripts/serve.mjs <绝对配置路径>`，或 `pnpm start <绝对配置路径>`。服务只提供 HTTPS，没有明文降级。

完整命令和运行边界见 [HTTPS 与账号联调](../docs/agent-gateway/06-runtime-and-authentication.md)。HTTP `startDevApi` 只是只监听本机的测试夹具。

开启浏览器 OAuth 时改用 `config.oauth.example.json`，先生成独立密钥文件，再配置管理员预登记的客户端和回调地址。步骤见 [OAuth 接入说明](../docs/agent-gateway/07-oauth-integration.md)。密钥文件应与数据库分别安全备份，不得在重启时重新生成。

启用 OAuth 后，可打开企业域名的 `/account` 管理自己的连接和密码。临时密码用户可在授权过程中直接网页改密，再继续原来的客户端连接；撤销连接会使对应平台会话及 OAuth 令牌失效。详见 [账号与连接管理](../docs/agent-gateway/09-account-management.md)。

## 客户端接入包

新增共用 stdio 连接器与企业网关 Skill，可生成 Codex 插件/配置、WorkBuddy MCP 配置和 DeepSeek Harness 插件条目。启动和工具发现无需登录，首次调用打开企业网页登录，使用平台账号及 S256 PKCE；令牌只在连接器进程内保存，支持运行期间刷新，重启后重新授权。

现在也可使用终端引导安装：管理员先准备不含凭证的企业连接配置，员工选择助手和项目目录，查看变更后安装。支持配置合入、状态检查、卸载和中断恢复，操作说明见 [客户端引导安装与回退](../docs/agent-gateway/10-client-installation.md)。

```powershell
node --preserve-symlinks --preserve-symlinks-main scripts/install-client.mjs setup F:\private\client.json
```

```powershell
# 先由管理员将 client.example.json 中的企业地址和客户端 ID 改为实际配置。
node --preserve-symlinks --preserve-symlinks-main scripts/prepare-client.mjs F:\private\client.json F:\private\enterprise-client
```

输出目录必须不存在，接入包生成过程不改动用户现有客户端配置；引导安装则按预览的计划合入指定项目。当前两种方式均绑定生成设备的 Node/代码绝对路径，依赖本项目，尚不是独立运行时或一键发行安装包。完整导入、卸载、超时、回调登记和验收边界见 [三客户端接入说明](../docs/agent-gateway/08-client-adapters.md)。

## 当前接口与规则

- 登录、注销、客户端会话撤销、本人改密及管理员重置；密码变化撤销全部旧会话，管理员重置后强制改密。
- GET `/v1/connections` 分页返回本人的有效平台会话和 OAuth 授权摘要；不返回令牌或其他用户的数据。
- 管理用户、组、成员、目标、用户/组提交授权；无明确授权默认拒绝。
- GET `/v1/targets` 仅返回当前授权的目标，不返回内部 URL；GET `/v1/admin/audit` 返回最多最近 500 条审计。
- POST `/v1/files` 接收至多 2 MiB 二进制内容到隔离目录；POST `/v1/files/status` 仅查询本人状态。旧开发路径暂保留。
- POST `/mcp` 暴露身份、授权目标、提交权限检查及本人文件状态四个查询工具。

MCP 使用每请求独立 SDK 服务，实时验证身份和业务权限。启用 OAuth 后，预登记客户端可通过浏览器登录确认、S256 PKCE、访问/刷新令牌调用四个查询工具；支持轮换、撤销和重启恢复。普通平台 Bearer 会话仍用于管理与开发联调。三类助手的自动安装和实际 OAuth 回调仍未验证。公共 OAuth 客户端 ID 和原有会话标签均不能单独证明软件真实性。

## 文件审查与交付边界

本地工作进程先执行受限格式检查，再调用 ClamAV 适配器；所有文件仍不能进入可交付状态。格式检查完成且病毒未检出时，仍等待企业数据规则；PDF 仍需完整结构检查。没有用户可调用的原文下载、直接放行或实际下游交付接口。

目录权限需由部署者设置，Windows 不保证 `mode` 参数提供 ACL 隔离。本地文件与数据库不能原子提交，崩溃可能留下孤儿文件；未实现清理和完整恢复。解析工作线程限制执行时间和 JavaScript 堆，但不是操作系统安全沙箱。真实 ClamAV 引擎、病毒库更新和检测效果尚未验收。

出站组件已独立验证 HTTPS 来源与 CIDR、解析后 IP 固定、证书验证、跳转拒绝及超时/大小限制，尚未接入实际交付流程。目标 CIDR 配得过宽会扩大可访问范围。

## 下一阶段

三客户端安装与 OAuth 实机适配、动态客户端管理、生产数据库/密钥轮换/沙箱方案、企业数据规则、完整 PDF 处理、持久交付和回执、备份恢复及真实试点。限流当前仅单进程有效，密码派生与部分 I/O 仍同步执行；正式容量和高可用尚未验证。

文档：[产品需求](../docs/agent-gateway/01-product-requirements.md)、[开发规划](../docs/agent-gateway/02-development-plan.md)、[实际进度](../docs/agent-gateway/03-implementation-status.md)、[扫描接入](../docs/agent-gateway/04-scan-integration.md)、[格式边界](../docs/agent-gateway/05-format-inspection.md)。
