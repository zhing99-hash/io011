# IO011 需要上传的代码清单

> 上传到服务器 `/opt/io011/github-repo/` 目录

---

## ✅ 需要上传的目录/文件

### 核心项目 (必须)

| 目录/文件 | 说明 | 需要构建 |
|-----------|------|----------|
| `hub/` | Hub 后端 (API) | ✅ npm install |
| `hub-ui/` | Hub 前端 (用户界面) | ✅ npm install |
| `hub-admin/` | Hub 后台 (管理界面) | ✅ npm install + build |
| `merchant-frontend/` | 商户端 Web 后台 | ✅ npm install + build |
| `merchant-skill/` | 商户端 Skill (A2A) | ✅ npm install |
| `user-frontend/` | 用户端 (开发测试用) | ✅ npm install + build |

### 文档 (可选)

| 目录/文件 | 说明 |
|-----------|------|
| `docs/` | 系统架构文档、部署配置 |
| `DEPLOY.md` | 部署指南 (完整版) |
| `docs/DEPLOY_CONFIG.md` | 详细配置手册 |
| `docs/QUICK_DEPLOY.md` | 快速部署指南 |

---

## ❌ 不需要上传 (已排除)

| 目录 | 原因 |
|------|------|
| `node_modules/` | 巨大，服务器上 `npm install` 自动生成 |
| `.git/` | 不需要 |
| `hub/dist/` | 构建产物，无需上传 |

---

## 📦 上传命令 (示例)

```bash
# 上传到服务器
scp -r hub hub-ui hub-admin merchant-frontend merchant-skill user-frontend user@服务器IP:/opt/io011/github-repo/

# 或逐个上传
scp -r hub user@服务器IP:/opt/io011/github-repo/
scp -r hub-ui user@服务器IP:/opt/io011/github-repo/
# ... 以此类推
```

---

## 🔧 服务器构建步骤 (上传后执行)

```bash
cd /opt/io011/github-repo

# 1. Hub 后端
cd hub && npm install && cd ..

# 2. Hub 前端
cd hub-ui && npm install && cd ..

# 3. Hub 后台
cd hub-admin && npm install && npm run build && cd ..

# 4. 商户端 Web
cd merchant-frontend && npm install && npm run build && cd ..

# 5. 商户端 Skill
cd merchant-skill && npm install && cd ..
```

---

## 📊 目录大小参考

| 目录 | 大小 (无 node_modules) |
|------|------------------------|
| hub | ~500KB |
| hub-ui | ~50KB |
| hub-admin | ~300KB |
| merchant-frontend | ~200KB |
| merchant-skill | ~1MB |
| user-frontend | ~300KB |
| **总计** | **~2.5MB** |

**上传一次只需几秒钟！** 🐹