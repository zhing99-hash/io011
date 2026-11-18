# 三客户端接入包与通用连接器

核对日期：2026-11-18。阶段：开发联调。当前已完成共用连接器、配置生成及技能包；“非技术用户安装后直接使用”的整体验收仍未完成。

## 1. 接入方式与兼容性证据

三款助手通过各自支持的本地 stdio MCP 启动同一个 Node 连接器，再由连接器通过 HTTPS 访问企业平台。身份和授权由平台决定，Skill 负责工具使用说明。这样不要求三款助手原生 OAuth 的实现相同。

| 客户端 | 本轮适配产物 | 已验证 | 未验证 |
| --- | --- | --- | --- |
| Codex | portable plugin.json、mcp.json、Skill，以及可选项目 TOML 片段 | 本机 CLI 0.169.0-alpha.11.1 使用只读 `mcp get` 接受相同 stdio/超时配置；标准 SDK 能启动生成配置中的子进程 | 插件导入、真实会话调用、浏览器弹窗及卸载的完整实机过程 |
| WorkBuddy | 官方 mcpServers 结构的配置和 Skill | 生成配置启动真实 stdio 子进程、列出四个工具 | 本机未发现 WorkBuddy 可执行程序；导入入口、工具调用超时与技能安装待指定版本实测 |
| DeepSeek Harness | dsh-mcp-client 的一个插件配置条目和 Skill | stdio 配置结构按官方文档；探测时不登录；连接器子进程协议验证 | 本机未发现 dsh；整个 Harness 启动、探测、技能加载与退出待实机验证 |

Codex 的命令行校验没有安装插件、登录企业平台、修改现有配置，也没有调用模型。配置解析通过不等于整个客户端接入通过。

DeepSeek Harness 当前官方文档也描述了原生 OAuth 和显式授权管理能力；本轮优先使用共用连接器，不据此声称其原生 OAuth 不支持。WorkBuddy 已核实本地 MCP 配置；没有推断它支持与 Codex 相同的 OAuth 字段。

## 2. 管理员准备

1. 按 `07-oauth-integration.md` 启用企业 HTTPS 和 OAuth；证书应被客户端操作系统或 Node 信任。连接器启用 Node 系统 CA，不提供忽略证书验证开关。
2. 在服务端预登记一个公开客户端，例如 `enterprise-desktop`，回调登记 `http://127.0.0.1:34567/callback`。没有客户端密钥，客户端 ID 也不构成软件真实性证明。多个应用共用此 ID 时，平台撤销会同时影响该用户以此 ID 获得的连接；需要分别撤销时，管理员为三款应用分别登记 ID 并分别生成配置。
3. 连接器每次授权实际监听 `127.0.0.1` 的随机端口，固定 `/callback` 路径。当前 oidc-provider 原生应用回环规则允许已登记回环 URI 的端口变化；随机端口授权已通过集成测试。不得把它扩大为任意主机或路径的通配回调。
4. 创建平台账号并授予组/目标权限。被管理员重置为临时密码的用户可在 OAuth 登录页面直接更新密码，随后继续连接；也可打开 `/account` 更新。详见 `09-account-management.md`。
5. 将 `client.example.json` 复制到本设备的私有配置目录，填写最终 HTTPS MCP 地址和预登记 ID。配置拒绝密码、令牌、客户端密钥及未知字段。

配置示例：

```json
{
  "serverUrl": "https://gateway.example.com/mcp",
  "clientId": "enterprise-desktop",
  "openBrowser": true,
  "authorizationTimeoutMs": 180000
}
```

`serverUrl` 必须是规范化的最终 HTTPS 地址，路径固定 `/mcp`，没有凭证、查询参数或片段。`authorizationTimeoutMs` 在 1000～600000 毫秒之间，默认 180000。此配置只描述企业连接，不接受用户指定的数据库地址、任意 API 目的地或扫描结果。

## 3. 生成与导入

当前需要已安装依赖的项目、Node.js 24 和本机运行路径。由管理员/部署人员运行：

如果希望直接合入项目配置，可改用新增的终端引导安装器，见 `10-client-installation.md`；它提供安装预览、合入、卸载和恢复。下面的命令仍只生成单独接入包。

```powershell
Set-Location F:\codex\saas\agent-gateway
node --preserve-symlinks --preserve-symlinks-main scripts/prepare-client.mjs F:\private\client.json F:\private\enterprise-client
```

配置与输出均使用绝对路径，输出目录必须不存在，缺失父目录会自动建立。生成器输出文件数与目录，不输出凭证。它不修改用户真实的助手配置，也不下载或执行安装脚本。

```text
enterprise-client/
├── client.json
├── INSTALL.md
├── package-receipt.json
├── codex/
│   ├── plugin.json
│   ├── mcp.json
│   ├── config.toml
│   └── skills/enterprise-gateway/SKILL.md
├── workbuddy/
│   ├── mcp.json
│   └── skills/enterprise-gateway/SKILL.md
└── deepseek-harness/
    ├── mcp-entry.json
    ├── connector.patch.yml
    └── skills/enterprise-gateway/SKILL.md
```

- Codex：从当前版本支持的本地插件/私有来源入口导入 `codex` 目录；或者将 `config.toml` 中服务器项合入项目配置，二选一。配置片段已设置首次授权工具超时；插件路径还需在真实客户端核对超时策略。
- WorkBuddy：在 MCP 配置入口加入生成的 `enterprise_gateway` 项，保留原有服务器；技能通过其技能入口导入。接入包生成不会修改已有配置，需要自动合入时使用新增安装器。
- DeepSeek Harness：把 `connector.patch.yml` 通过现有启动命令的 `--patch` 参数加载，或使用安装器合入实际 profile 补丁；`mcp-entry.json` 只供条目参考，不是完整 profile，不能直接覆盖运行配置。部署人员按所用技能加载器添加 Skill；没有虚构统一的技能安装目录。

本机路径写入了生成配置，因此移动源代码、Node 或输出目录后需要重新生成。不能直接把该目录复制到另一台机器当作通用发行包。此步骤尚有部署人员参与，是对“一键安装”目标的基础实现。

## 4. 用户连接体验

1. 导入后询问助手“检查企业网关连接”。初始化和工具发现不会联网登录，也不会因 DeepSeek Harness 的临时探测进程重复弹窗。
2. 首次调用四个查询工具之一时，连接器创建临时本机回调，打开企业登录网页。用户在网页中输入平台账号密码并确认授权，不向助手提供密码或令牌。
3. 浏览器收到授权后显示固定提示，用户回到助手；连接器交换授权码并执行 HTTPS 查询。同一进程中的后续请求使用内存令牌，刷新轮换串行处理。
4. 自动打开浏览器失败时，连接器向 stderr 提供企业授权链接，用户可从客户端 MCP 日志打开。MCP stdout 仅用于协议消息。不同客户端如何显示日志仍需实测。
5. 用户拒绝、超时、网络错误或授权失效时，工具返回固定错误，不放行。重试可重新发起显式授权；撤权失败的原调用不会直接重新弹窗。

默认授权等待三分钟。Codex 配置片段和 Harness 插件条目包含较长的工具调用超时；WorkBuddy 以及 Codex 插件安装后的实际超时需实测。若客户端提前取消，不能据此声称服务端授权未发生，应检查平台连接记录并按需撤销。

## 5. 安全与卸载

连接器只暴露身份、授权目标、提交权限核验及本人文件审查状态四个查询工具，与服务器共用同一工具定义。它不读取本地业务文件、不访问业务数据库，也没有上传/交付能力。工具列表可匿名发现，真正调用必须授权，服务端继续实时检查主体与业务权限。

OAuth 发现、令牌和 MCP 网络请求只允许配置的 HTTPS 企业源，不跟随重定向，限制响应体 2 MiB 和单次网络等待。回调只监听回环 IP，检查方法、Host、路径、随机 state、唯一参数和 issuer，拒绝伪造及重复回调。成功/失败页面不回显授权码。网页登录仍由已集成的 oidc-provider 与官方 MCP SDK 完成协议处理。

令牌、PKCE verifier 只在进程内使用，没有明文令牌配置文件或跨进程凭证持久化；连接器退出即清除其持有的引用，但不承诺对 JavaScript 内存作物理擦除。重启后再次授权；系统凭证库和免重复登录尚待开发。退出进程、删除文件、退出浏览器均不等同于撤销平台上的历史授权。

先在客户端移除服务器/插件及技能，确认连接器退出，再清理生成目录：

```powershell
node --preserve-symlinks --preserve-symlinks-main scripts/prepare-client.mjs --remove F:\private\enterprise-client
```

清理器读取生成收据，对文件逐项验证路径与摘要，拒绝符号链接、路径穿越和被修改的生成文件；不会递归删除未知目录，用户新增文件保留。收据用于本地清理防误删，不是数字签名或发布供应链证明。服务器撤销可登录 `/account/connections` 选择客户端并确认，或使用已有 `/v1/revoke-client` 接口。

## 6. 验证和下一步

客户端接入包阶段新增 11 项自动化验证，当时完整回归合计 68 项通过；最新结果见 `03-implementation-status.md`。覆盖：严格客户端配置、恶意回调、超时/取消/拒绝、同源网络限制、响应大小、首次懒授权、并发调用串行化、令牌刷新轮换、撤权失效、真实 stdio 子进程 → 浏览器流程模拟 → 真实本机 HTTPS 工具调用、退出回收和安全清理。测试使用公开测试证书与虚构账户，没有访问真实企业服务或修改用户客户端配置。

Skill 已检查 frontmatter、命名、用途边界和工具范围，真实工具发现与调用已验证。环境未安装可运行 Python，技能自带 `quick_validate.py` 无法运行，未把手动结构检查称为该验证器通过。

后续已新增浏览器临时密码更新和连接管理，见 `09-account-management.md`；终端引导、配置合入及卸载/中断回退见 `10-client-installation.md`。接下来补齐可携带运行时的正式安装包、系统凭证库、签名、剩余技能导入和升级；锁定三款助手版本，完成真实安装/登录/撤权/文件提交闭环与非技术用户成功率测试。原生 OAuth 可按客户端另开适配，不能用当前 SDK 模拟替代实机验收。

官方参考：[OpenAI 插件打包](https://developers.openai.com/plugins/build/plugins)、[Agent Plugins manifest](https://agent-plugins.org/schemas/1.0.0/plugin.schema.json)、[MCP schema](https://agent-plugins.org/schemas/1.0.0/mcp.schema.json)、[WorkBuddy MCP](https://www.codebuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/MCP-Guide)、[DeepSeek Harness MCP Client](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/mcp/mcp-client/README.md)。
