# 客户端引导安装、回退与中断恢复

核对日期：2026-11-18。当前提供终端引导和可审阅计划，进一步减少手工编辑配置。尚未提供独立安装运行时、图形安装向导、系统凭证库或三客户端完整实机验收。

## 1. 管理员与员工各自做什么

管理员负责一次性准备企业 HTTPS/OAuth 服务、账号权限，以及企业连接配置文件；该文件只包含企业最终 MCP 地址、预登记客户端 ID 和授权等待设置，不含员工密码、客户端密钥或令牌。

员工在已安装 Node.js 24 和本项目依赖的设备上运行：

```powershell
Set-Location F:\codex\saas\agent-gateway
node --preserve-symlinks --preserve-symlinks-main scripts/install-client.mjs setup F:\private\client.json
```

引导依次要求选择助手、填写已存在的项目目录，显示将新增或合入的文件及企业地址，输入“安装”后执行。员工不需要编辑 MCP JSON/TOML，不需要在聊天里提供密码或复制令牌。无交互终端时拒绝运行引导，部署人员可使用下述计划/应用命令。

安装只完成本机配置。随后重新打开助手，调用企业网关工具，在企业网页登录和确认权限；服务可达性、账号可用性和业务权限由这一步验证。安装器不会替用户登录，也不会因此获得企业平台管理权限。

## 2. 三款助手的安装范围

| 助手 | 自动配置 | 技能与当前限制 |
| --- | --- | --- |
| Codex | 指定项目的 `.codex/config.toml`，追加 enterprise_gateway 服务项及授权等待所需超时 | 安装到项目 `.agents/skills/enterprise-gateway/SKILL.md`；采用项目方式，不重复安装 portable 插件；项目是否受信任及配置是否生效仍由实际客户端策略决定 |
| WorkBuddy | 指定项目的 `.workbuddy/mcp.json`，局部加入 enterprise_gateway 项 | Skill 保存到恢复目录内的 skill 文件夹，仍需通过 WorkBuddy 正式技能导入入口完成；没有猜测未核实的技能目录 |
| DeepSeek Harness | 指定项目内的 YAML 补丁文件，默认 `cordis.patch.yml`，加入 insert 插件条目 | 应选择正在使用的 profile 目录，或指定已被 `--patch` 加载的相对路径；Skill 由该部署的技能加载器导入；安装器不启动 Harness 或解析整个配置层叠结果 |

三者使用相同本地 stdio 连接器。配置中的可执行文件、参数和桥接代码路径由安装器构建，不能通过安装请求指定任意命令或脚本。三款助手都支持“配置合入”不等于三款助手完整安装体验已通过。

DeepSeek Harness 当前采用分层补丁；直接把普通插件条目当作完整 profile 覆盖并不合适。安装器按官方 insert 结构生成，保留既有补丁和 `!!js` 文本，编辑时不执行表达式。YAML 别名、非预期标签、错误结构以及明显的同名条目会被拒绝。没有读取其他层或 include 的完整内容，运行时同名冲突仍须在实际 Harness 环境确认。

## 3. 可审阅计划与非交互部署

参考 `install-request.example.json`，部署人员创建请求文件：

```json
{
  "client": "codex",
  "projectDir": "F:/employee-project",
  "connection": {
    "serverUrl": "https://gateway.example.com/mcp",
    "clientId": "enterprise-desktop"
  }
}
```

`client` 取 codex、workbuddy 或 deepseek-harness；目录必须已存在、使用绝对路径，不能是卷根目录或符号链接。Harness 可额外设置 `harnessPatchPath`，例如 `config/team.patch.yml`，只能指向所选目录内的相对 YAML 文件，不能穿越目录或指向安装器恢复区。

```powershell
# 生成计划：只读取项目；新建的计划文件由部署人员明确指定，拒绝覆盖。
node --preserve-symlinks --preserve-symlinks-main scripts/install-client.mjs plan F:\private\request.json F:\private\install-plan.json

# 应用已检查的计划。
node --preserve-symlinks --preserve-symlinks-main scripts/install-client.mjs apply F:\private\install-plan.json

# 查看安装状态。
node --preserve-symlinks --preserve-symlinks-main scripts/install-client.mjs status codex F:\employee-project
```

计划包含目标目录、企业连接参数、文件名、安装前后摘要、桥接源码摘要和说明，不包含原有配置全文。应用时重新构建计划并比较；计划被编辑、代码版本发生相关变化、原配置已改变、同名服务器/技能已存在时停止，不自动覆盖。已经安装的项目需要先按原计划卸载，再准备新安装；尚未实现自动升级。

## 4. 如何保留现有配置

- Codex 解析原 TOML 后追加独立服务段，保留原有文本、注释、日期及整数表示。遇到无法合法扩展的 inline table 结构时停止，不重写整份 TOML。
- WorkBuddy 使用 JSON 局部编辑，只插入本平台的服务器项。格式可能调整，其他配置值及大整数原文保留；拒绝重复键和错误 JSON，避免对有歧义的文件执行合入。
- Harness 使用 YAML 语法树编辑，保留原有条目、注释、整数和表达式。允许空补丁，拒绝不支持的结构，避免把未解析清楚的配置写回。
- 所有目标路径在选定目录内，逐级检查符号链接/Windows junction；固定目录冲突、已有同名技能、过大文件等情况拒绝。

安装器使用本项目专用互斥锁、持久恢复记录和同目录临时文件；写入后 fsync，再替换目标。新文件以独占方式创建。每次写入前再次检查摘要，卸载前检查全部恢复目标和备份。

安装前应退出目标客户端，避免应用或编辑器同时回写配置。互斥锁只协调本安装器进程，不能提供针对所有外部写入程序的跨进程事务，也没有原子地比较文件摘要并替换文件的操作系统保证。

## 5. 恢复记录和文件保护

每个客户端在选定项目的 `.enterprise-gateway/<客户端>/` 内保存连接配置、当前安装指针，以及按安装 ID 保存的 journal 和备份；Codex Skill 另写入正式项目技能目录。恢复区使用自身 `.gitignore` 排除，历史备份不会在卸载后自动清除，空目录也会保留。

原配置可能包含其他 MCP 服务的凭证，因此备份按原配置同级保护，终端和计划不输出其内容；备份没有额外加密。Windows 上在写入内容前复制访问规则，保护备份不继承更宽的目录权限，同时保留原访问描述供恢复；校验所有者及组一致，不转移所有权。无法保留文件保护时停止。POSIX 路径会保留文件模式，但当前整体验证运行于 Windows，不能据此宣称 macOS/Linux 或网络共享文件系统已验收。

恢复记录与备份用于防误删和正常故障恢复，不是密码学签名，不抵御有权限任意改写全部本机代码和记录的攻击者。文件内容摘要用于并发检查；安装后单独修改 ACL/文件权限不作为该摘要的一部分，应在卸载前复核相关保护。`not_installed` 状态也不表示恢复区内不存在历史或准备阶段留下的备份。

## 6. 卸载与中断恢复

```powershell
# 退出助手后，恢复原配置并移除本次创建的连接配置/技能文件。
node --preserve-symlinks --preserve-symlinks-main scripts/install-client.mjs remove codex F:\employee-project

# 若安装进程中断或记录显示 recovery_required，尝试安全回退。
node --preserve-symlinks --preserve-symlinks-main scripts/install-client.mjs recover codex F:\employee-project
```

`remove` 仅处理已安装状态，`recover` 用于 applying/removing/recovery_required 等未完成状态。正常写入失败会自动回退；进程直接退出后可通过 journal 恢复，并仅在确认锁对应的旧进程已退出时清理死锁。无法确认时停止。

如果目标文件出现预期外的用户修改，或备份摘要不匹配，卸载/恢复会在改动任何客户端文件前停止；保留现有内容及恢复记录，供管理员先处理差异。不会用旧备份直接覆盖用户的新设置，也不会递归删除未知文件。历史备份和记录的清理、升级保留期限尚未自动化。

本地卸载不撤销服务器历史授权；需要让旧连接失效时，用户在企业 `/account/connections` 撤销对应客户端。共用客户端 ID 的设备会一起撤销。

## 7. 验证范围

新增 13 项自动化检查：三种配置分别安装、启动真实 stdio 子进程并发现工具、卸载逐字节恢复；计划无项目副作用、旧计划/篡改拒绝；同名/语法/别名/路径链接冲突；普通写入故障自动回退；真实子进程直接退出后的恢复；并发用户修改、备份篡改、活动锁保护；CLI 操作和 Windows 受保护 ACL 保留。

测试只使用隔离临时项目、占位企业地址和虚构配置，没有修改用户实际助手设置、启动真实企业连接或调用模型。本机还用真实交互终端走通了选择 WorkBuddy → 指定隔离项目 → 预览 → 确认安装 → 状态检查 → 卸载。真实非技术用户试用和助手实际加载仍待完成；最新完整回归结果见 `03-implementation-status.md`。

依赖锁定 jsonc-parser 3.3.1、smol-toml 1.9.1、yaml 2.9.1，禁用安装脚本。核验参考：[Microsoft JSON 局部编辑](https://github.com/microsoft/node-jsonc-parser)、[smol-toml](https://github.com/squirrelchat/smol-toml)、[YAML 文档编辑](https://eemeli.org/yaml/)、[Codex 项目 Skill](https://learn.chatgpt.com/docs/build-skills#where-codex-loads-local-skills)、[WorkBuddy MCP](https://www.codebuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/MCP-Guide)、[Harness 补丁插入](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/index.md#register-it-in-cordisyml)、[Windows ACL 复制约束](https://learn.microsoft.com/en-us/dotnet/api/system.io.file.setaccesscontrol?view=netframework-4.8.1)。
