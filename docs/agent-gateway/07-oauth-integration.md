# 浏览器 OAuth 接入：配置、验证与边界

日期：2026-11-18｜状态：开发联调实现，尚未生产验收

## 1. 本轮实现

协议处理使用锁定版本 `oidc-provider@9.15.0`，由成熟组件完成授权码、PKCE S256、资源绑定、短期访问令牌、刷新令牌轮换、重放保护及撤销。网关提供已有账号验证、登录/授权交互、持久化适配器和实时业务权限检查，不自行设计 OAuth 协议。

当前流程：MCP 请求返回授权发现信息 → 标准客户端读取资源和授权服务器元数据 → 打开企业登录页 → 用户验证账号并确认客户端 → 浏览器回到已登记地址 → 客户端携带 PKCE verifier 换取令牌 → 调用 `/mcp`。不再需要在该流程中手工复制访问令牌。

目前仅支持管理员预登记的公共原生客户端。动态注册、远程客户端元数据文档、浏览器跨域客户端、第三方账号登录及三款具体助手安装适配仍未实现。公共客户端 ID 不是秘密，也不能作为软件真实性证明；安全边界依赖已登记回调、PKCE、用户确认及服务端权限。

## 2. 开启方式

默认 `config.example.json` 保持原有不启用 OAuth 的模式。要开启 OAuth，参考 `config.oauth.example.json`，增加 `oauth.secretsFile` 和 `oauth.clients`。

先使用运维身份在私有目录创建密钥文件：

```powershell
node --preserve-symlinks --preserve-symlinks-main scripts/create-oauth-secrets.mjs C:/gateway-private/oauth-secrets.json
```

文件包含签名私钥、Cookie 签名密钥及 OAuth 数据加密密钥；命令不会覆盖已有文件，也不会把密钥打印到终端。需要操作系统 ACL 保护；Windows 的 mode 参数不保证实际 ACL。密钥必须与数据库分别备份并保持对应，不能每次重启生成。更换存储加密密钥会被拒绝，完整密钥轮换/恢复流程尚待实现。

每个客户端配置：`clientId`、给用户展示的 `clientName`、`redirectUris`。只允许 HTTPS 回调或 HTTP 回环 IP 回调；禁止凭证、查询串和片段。实际匹配遵循组件的原生客户端规则（包括回环端口规则），不允许转移到任意外部地址。不要假设 Codex、WorkBuddy、DeepSeek Harness 使用同一回调或同一安装参数，需后续分别核验。

启动方式沿用 `scripts/serve.mjs <绝对配置路径>`。企业账号仍使用平台自带账号；可通过管理员创建，或使用现有原型账号。临时密码用户现可直接在 OAuth 登录交互中更新密码，随后继续原来的 PKCE 和授权确认流程；也可从 `/account/password` 更新。账号和连接管理详见 `09-account-management.md`。

## 3. 元数据和接口

| 路径 | 用途 |
| --- | --- |
| `/.well-known/oauth-protected-resource`，以及 `/mcp` 路径形式 | 声明唯一受保护资源 `https://企业域名/mcp` 与授权服务器 |
| `/.well-known/oauth-authorization-server` | 声明授权、令牌、撤销、PKCE 和客户端认证能力 |
| `/.well-known/openid-configuration` | 组件提供的发现信息 |
| `/oauth/auth` | 发起授权码流程 |
| `/oauth/interaction/:uid` | 登录和用户确认页面 |
| `/oauth/token` | 授权码交换与刷新，由组件处理 |
| `/oauth/revoke` | 撤销本客户端令牌及相应授权 |
| `/oauth/jwks` | 仅发布公共签名材料，不发布私钥 |

访问令牌最多 10 分钟，刷新令牌与授权最多 24 小时，浏览器会话最多 8 小时，授权码 60 秒，交互 10 分钟。请求范围为 `mcp:read`；此令牌只用于 MCP 的四个查询工具，不能调用平台账号管理 API。普通平台 Bearer 会话仍保留作联调和管理用途。

OAuth 协议表单由组件提供有界解析（当前组件上限 56 KiB），自定义登录/确认表单上限 16 KiB。原有全局请求限流、Host/Origin/TLS 检查继续适用；浏览器登录另有来源及账号限流。暂未提供反向代理信任、多实例限流或开放跨域配置。

## 4. 授权、存储与撤销

授权记录与协议状态写入同一 SQLite 数据库，索引中的令牌/授权/账号标识使用摘要；协议载荷使用独立 256 位密钥进行 AES-GCM 加密并绑定模型和记录标识。密码、访问令牌、刷新令牌、授权码和签名私钥不写入业务审计或 HTML。

数据库升级到版本 2，原有账号和审计保留。网关每次 MCP 请求验证令牌的有效期、资源、范围、授权存在性及账号状态，并构造仅内部代码能创建的请求身份对象。业务工具仍实时验证目标权限，不因 OAuth 授权获得更多业务访问范围。客户端被移出启动配置后，新请求也拒绝其令牌。

本人通过平台登录后调用 `/v1/revoke-client`，`clientId` 使用实际 OAuth 客户端 ID，即可撤销该客户端的授权记录和令牌。管理员停用账号、重置密码或本人改密时，在同一数据库事务中删除相关 OAuth 状态。刷新轮换的旧令牌若再次使用，组件会撤销授权族；旧授权码重复使用同样触发保护。`/oauth/revoke` 只允许处理属于发起客户端的令牌。

授权审计记录登录、允许/拒绝连接、令牌发放及授权撤销的主体和客户端，不记录敏感凭证。数据库和密钥的访问权限仍是运维责任；尚未实现过期 OAuth 记录定期清理、完整密钥轮换与灾备恢复验收。

## 5. 页面与测试

登录和确认页面无需外部脚本或字体，不包含调试协议数据。使用 HttpOnly/Secure/SameSite Cookie、交互绑定 CSRF、POST Origin 检查、无缓存、禁止嵌入及限制 CSP；客户端名称转义显示，表单提供可见标签、键盘焦点和密码管理器属性。样式依据 UI/UX 技能内置默认规则；环境未提供可运行 Python，未使用设计检索结果。

自动化通过本机真实 HTTPS 连接完成浏览器流程模拟，并由官方 MCP 客户端执行元数据发现、PKCE 和工具调用。测试覆盖：同意/拒绝、错误回调、缺失/错误 PKCE、CSRF、错误资源、重复授权码、刷新轮换/重放、撤销、改密失效、重启恢复、密文篡改和错误存储密钥。

尚未在真实浏览器完成视觉和辅助技术验收，也未在实际 Codex/WorkBuddy/DeepSeek Harness 完成插件安装和回调测试。当前实现用于继续开发与联调，不表示一键安装目标或生产安全验收已经完成。

后续新增的共用 stdio 连接器和三款开发接入包见 `08-client-adapters.md`。已通过随机回环端口的真实 stdio → 浏览器流程模拟 → HTTPS 调用，令牌仅在客户端进程内保存；Codex CLI 已接受相同配置，但真实三客户端安装验收仍未完成。

协议组件来源：[oidc-provider 官方项目](https://github.com/panva/node-oidc-provider)、[官方交互示例](https://github.com/panva/node-oidc-provider/blob/main/example/routes/express.js)。具体行为已结合所安装 9.15.0 源码及官方 MCP 客户端测试核对。
