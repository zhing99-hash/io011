# 文件格式检查：实现范围和验证

日期：2026-11-18｜阶段：T05 局部实现

## 运行方式

网关启动本地审查时，先通过独立 Node 工作线程读取文件字节副本并执行格式规则，再连接病毒扫描服务。格式拒绝则不发送给扫描器。检查结果和检查器版本绑定审查记录，文件前后摘要验证沿用隔离模块。当前策略版本为 `v2-antivirus-format`，旧审查记录保持原版本不修改。

线程默认上限：3 秒、64 MiB JavaScript 老生代堆、4 MiB 栈。单文件最多 2 MiB；Office 最多 256 项、单项 2 MiB、累计展开 8 MiB、单项压缩比最多 100。工作线程隔离解析负载并支持超时终止，但没有操作系统级文件/网络权限沙箱，不能将它称为生产安全沙箱。Buffer 和原生库内存不完全受 JavaScript 堆上限控制，另由内容大小和展开限额约束。

## 格式规则

| 类型 | 已实现 | 保留限制 |
| --- | --- | --- |
| Markdown | 严格 UTF-8、控制字符/常见二进制头检查、部分活动 HTML 拒绝、其他 HTML 待审 | 作为不可信文本使用；未提供 HTML 渲染器，未穷尽所有 HTML/Markdown 语法或提示词注入 |
| XML | 使用 saxes 校验良构性、命名空间、深度/节点/属性上限；拒绝 DTD、处理指令、XInclude 和 schema 引用 | 首期只接收 UTF-8；不执行 XSLT、不加载实体、schema 或外部资源；没有业务 XSD 校验 |
| DOCX/XLSX | 使用 yauzl 读取包目录及受限条目，不落盘解压；校验 CRC、类型声明、主部件和入口关系；拒绝宏/活动对象、外部关系、重复路径、加密、路径逃逸和过量展开 | 仅覆盖常用 Transitional OOXML 结构；Strict OOXML、旧 Office、复杂媒体及其他部件可能拒绝或待审；不是 Office 完整语义校验或内容净化 |
| PDF | 基础头/尾标识检查，明显伪装拒绝 | 符合标识也只标记 `PDF_INSPECTOR_REQUIRED`；完整对象/流、加密、活动内容检查尚未实现 |

Office 图片允许进入受限读取和病毒扫描，但标记需进一步媒体审查；外部关系（包括超链接）采用保守拒绝策略，因此可能拒绝业务上正常的文件。当前限额为开发验证参数，需要通过真实企业样本再调整。

## 状态规则

- 格式不符或触发拒绝策略：`rejected`。
- 内容在审查期间变化：`isolated`。
- 扫描引擎异常或故障：`scan_failed`。
- 病毒检测命中：`isolated`。
- 格式检查完成且病毒未检出：仍为 `review_required / ENTERPRISE_POLICY_REQUIRED`。
- PDF/媒体/解析超时等能力不足：`review_required`，记录具体原因；不会标记 passed。

尚未实施企业敏感数据、目标系统字段规则及生产审批，因此所有文件仍然没有可交付状态和放行接口。`inspected` 仅表示检查器执行了当前结构规则，不表示文件可信或无未知恶意内容。

## 依赖和复现

使用锁定依赖 `saxes@6.0.0`（ISC）和 `yauzl@3.4.0`（MIT）；传递依赖和完整性摘要记录于 `pnpm-lock.yaml`。许可证依据安装包声明；发布时仍需随包保留原许可文本并完成依赖审计，不能由本表替代。接口行为核对了两库本地 README 与公开源码文档。

```powershell
pnpm install --frozen-lockfile --ignore-scripts --node-linker=hoisted
node --preserve-symlinks --preserve-symlinks-main --test
```

安装采用平铺依赖布局，兼容当前 Windows 受限环境。pnpm 11 的配置记录在 `pnpm-workspace.yaml`，禁用安装脚本。

格式自动化测试使用最小 OOXML 包和构造的异常输入，覆盖包类型混淆、宏部件、外链、重复项、路径逃逸、压缩膨胀、XML DTD 和超限、PDF 待审、线程超时；尚需更多真实文档兼容测试及独立安全审计。病毒相关测试仍为协议模拟，未完成真实 ClamAV 检测验收。
