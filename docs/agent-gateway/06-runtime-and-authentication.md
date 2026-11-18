# HTTPS 联调入口、账号维护及数据库升级

日期：2026-11-18｜适用：单企业、单进程开发联调；尚未通过生产验收

## 1. 本轮可运行的路径

配置文件 → 本地初始化管理员 → 加载已有数据库并升级 → 使用企业提供的证书启动 HTTPS → 账号登录 → 使用 Bearer 会话调用 API 或 `/mcp` → 读取被授权的目标与本人文件状态。没有默认账号或默认密码，没有 HTTP 降级；测试结束后服务已关闭。

MCP 使用官方 v2 SDK，并由同一套认证、Host/Origin、入口限流和权限服务保护。登录接口的普通 Bearer 会话用于联调与管理；另已增加可选的[浏览器 OAuth 模式](07-oauth-integration.md)，支持预登记客户端的 PKCE、刷新、撤销和持久化。三类实际助手的插件自动登录仍需实机验证。

## 2. 配置与初始化

将项目内 `config.example.json` 复制到企业私有配置目录，修改数据库、隔离目录、证书与私钥路径，设置实际 HTTPS 域名和端口。路径必须是绝对路径。`listenHost` 默认 `127.0.0.1`；测试或联调阶段保留本机监听。允许的连接目标必须通过 `allowedConnectorOrigins` 预先列出。

配置中不保存密码、登录令牌或私钥正文。管理员需设置配置、数据库、证书私钥和隔离目录的操作系统权限；当前没有密钥管理服务。`test/fixtures` 中的证书与私钥是公开测试材料，不得用于企业部署。

先在进程停止时备份旧数据库和隔离目录，再初始化新实例（已初始化实例不能再次初始化）：

```powershell
Get-Content -Raw C:/private/bootstrap-input.json | node --preserve-symlinks --preserve-symlinks-main scripts/bootstrap.mjs C:/private/gateway-config.json
node --preserve-symlinks --preserve-symlinks-main scripts/serve.mjs C:/private/gateway-config.json
```

初始化输入为 JSON 对象，包含 `username` 与 `password` 两个字段；密码至少 12 个字符，最多 1024 个字符。输入可由受控工具通过标准输入直接提供，避免放在命令行参数和终端历史。若使用上述文件方式，必须限制其权限并按企业流程销毁该临时文件。命令只输出初始化结果或错误码，不输出密码和令牌。当前尚未提供图形化安装向导。

启动成功输出 `listening`、配置域名和实际监听端口。支持 SIGINT/SIGTERM 关闭；最长等待 5 秒后关闭仍占用的连接。CLI 启动验证使用临时目录和本机测试证书，未在外网运行。

## 3. HTTPS 与请求规则

- 服务只启动 HTTPS，最低 TLS 1.2；客户端必须验证证书和域名。
- 请求 Host 必须匹配 `publicOrigin` 的域名及端口；浏览器提供 Origin 时必须精确匹配。
- 无跨域放行；REST API 使用 Authorization Bearer 会话。启用 OAuth 时，网页账号入口及授权流程使用各自受保护的 Cookie；REST API 不接受 Cookie 替代 Bearer。
- JSON 请求最多 16 KiB，二进制上传最多 2 MiB；字段类型受检，未知顶层字段拒绝。
- 头大小 8 KiB、头数上限 64；请求接收超时 15 秒、头接收超时 10 秒、keep-alive 5 秒。
- 响应不缓存并带服务端生成的请求编号。业务审计与请求编号目前尚未形成完整链路追踪；错误响应不包含原始异常或凭证。

默认单进程内存限流：每来源每分钟 120 个请求、每来源每分钟 10 次登录、每规范化账号每 15 分钟 5 次登录尝试，成功登录也计数。来源按实际 TCP 对端获取，不信任 X-Forwarded-For。限流键最多一万个，达到容量时新键请求被拒绝；返回 429 和 Retry-After。账号自身仍有连续 5 次失败锁定 15 分钟的持久规则。

**运行边界：**限流窗口会在重启时清空，不支持多进程共享；同一代理后的用户会共用来源额度。未实现受信代理配置，暂不建议代理转发。密码派生和部分数据库操作仍同步执行，需要后续异步化及并发压测；当前配置不能当作生产容量承诺。

TLS 实现依据：[Node 24 HTTPS 文档](https://r2.nodejs.org/docs/latest-v24.x/api/https.html)。

## 4. 账号与密码维护

| 接口 | 行为 |
| --- | --- |
| POST `/v1/login` | 输入 username/password/clientId，返回短期会话；clientId 是声明标签，不是软件身份验证 |
| GET `/v1/me` | 返回本人身份和是否需要改密 |
| GET `/v1/connections` | 分页列出本人的有效平台会话与 OAuth 授权摘要；支持 after 游标 |
| POST `/v1/password/change` | 验证 currentPassword，设置 newPassword，撤销该用户全部会话，要求重新登录 |
| POST `/v1/admin/users/reset-password` | 管理员输入 userId/temporaryPassword；撤销目标用户全部会话，要求其登录后改密 |
| POST `/v1/logout` | 撤销当前会话 |
| POST `/v1/revoke-client` | 撤销本人指定 clientId 的所有会话 |

启用 OAuth 后，新增 `/account`、`/account/password` 与 `/account/connections` 网页；临时密码也可在 OAuth 登录交互中直接更新并继续连接。网页会话最长 30 分钟，临时更新会话 10 分钟，均有服务端期限；密码验证失败与登录共享持久锁定。详细流程及保护见 `09-account-management.md`。

管理员重置后，临时密码会话仅可查看本人基本身份、改密、退出或撤销会话，不能进行业务操作或调用 MCP 工具。临时密码由企业通过独立可信渠道交给员工，平台不自动发送消息。普通用户不能重置其他人的密码；管理员本人使用改密接口。尚未实现邮件找回、丢失最后一个管理员凭证的恢复和多因素认证。当前管理员创建新用户时设置的初始密码并未自动强制改密，此项应在正式用户邀请流程中完善。

新密码使用 Node scrypt，N=2^14、r=8、p=5，独立随机盐；存储参数便于升级。既有原型 p=1 的密码在成功登录后自动更新为 p=5。密码不做可逆加密，日志和接口不返回派生结果。参数依据：[OWASP 密码存储指南](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)。参数升级不等于完整身份系统安全验收。

## 5. 数据库升级范围

现阶段继续使用 Node 24 + SQLite 作为单实例联调实现，当前 `user_version=2`。启动在事务中补充已有原型缺失的密码参数、改密标记、审计客户端列、目标地址列及 OAuth 状态表；旧目标缺地址时自动停用，需重新登记与授权。审计使用具名字段写入，兼容旧列顺序。高于当前支持版本的数据库拒绝启动，不尝试降级。

测试覆盖：无版本的已记录原型结构升级、原账号登录与密码参数升级、旧审计保留、无地址目标停用、重复启动及未来版本拒绝。它不是任意 SQLite 文件或未知变体的修复器。旧库备份和迁移回退需由运维保留原数据库及其配套隔离文件；不能将一次升级测试当作备份恢复验收。

当前不承诺 PostgreSQL、多实例和高可用支持。是否保留 SQLite 作为正式小规模版本或增加 PostgreSQL，需要在实际并发、企业部署样本及恢复演练后形成独立决定。

## 6. 标准 MCP 验证范围

`POST /mcp` 由 `@modelcontextprotocol/server@2.4.0` 与 `@modelcontextprotocol/node@2.1.2` 提供，官方客户端 `@modelcontextprotocol/client@2.4.0` 用于测试。包版本和完整性摘要已锁定；服务端构造方式核对了[官方 SDK HTTP 说明](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/http.md)。每个 HTTP 请求独立创建服务，令牌与用户上下文不会跨请求复用；入站会话每次重新验证。

工具：`get_my_profile`、`list_authorized_targets`、`check_submission_access`、`get_file_review_status`。它们只查询和检查，不接收文件原文、不执行下游任务。工具参数由严格 schema 校验；目标列表按实时授权过滤，不返回目标内部 URL。目标列表最多 1000 项；状态读取限本人，拒绝跨用户枚举。订阅、GET/DELETE 会话流及文件交付暂不开放。

官方 SDK 客户端已实测工具发现、并发用户隔离、目标过滤、跨用户文件拒绝及实时撤权；新增 OAuth 测试也已覆盖发现、PKCE、刷新轮换、授权页面和真实 HTTPS 调用，详见 `07-oauth-integration.md`。真实 Codex、WorkBuddy、DeepSeek Harness 尚未安装适配包并验证，不能把 SDK 联调等同于已达成“傻瓜化接入”。
