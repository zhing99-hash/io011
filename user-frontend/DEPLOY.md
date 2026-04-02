# IO011 用户端前端部署文档

> 版本: v2.3.1  
> 日期: 2026-04-01  
> 端口配置: **5174** (用户端)

---

## 📋 部署信息总览

| 项目 | 值 |
|------|-----|
| 项目名称 | user-frontend |
| 项目路径 | `github-repo/user-frontend` |
| 构建命令 | `npm run build` |
| 启动命令 | `npm run preview -- --port 5174` |
| **生产端口** | **5174** |
| 构建产物 | `dist/` |

---

## 🔌 端口配置确认

| 服务 | 端口 | 说明 |
|------|------|------|
| **用户端 (user-frontend)** | **5174** | 本次部署 |
| Hub 前端 (hub-ui) | 1566 | 已部署 |
| 商户端 (shop) | 1588 | 下一阶段 |

---

## 🚀 服务器部署步骤

### 方式一: 使用 OpenClaw 自动部署 (推荐)

在服务器上的 OpenClaw 中发送:

```
请帮我部署 IO011 用户端前端:
1. 进入 github-repo/user-frontend 目录
2. 执行 npm install
3. 执行 npm run build
4. 使用 npm run preview -- --port 5174 启动服务
```

### 方式二: 手动部署

```bash
# 1. 进入项目目录
cd github-repo/user-frontend

# 2. 安装依赖
npm install

# 3. 构建生产版本
npm run build

# 4. 启动服务 (端口 5174)
npm run preview -- --port 5174
```

### 方式三: 使用 serve 部署 (生产环境推荐)

```bash
# 1. 全局安装 serve
npm install -g serve

# 2. 进入构建目录
cd github-repo/user-frontend

# 3. 构建
npm run build

# 4. 启动服务
serve dist -l 5174
```

---

## 📁 项目结构

```
github-repo/user-frontend/
├── dist/                    # 构建产物 (部署用)
│   ├── index.html
│   └── assets/
├── src/                     # 源代码
├── public/                  # 静态资源
├── package.json             # 项目配置
├── vite.config.ts           # Vite 配置
├── tailwind.config.js       # Tailwind 配置
├── DEPLOY.md                # 本文档
└── README.md                # 项目说明
```

---

## ✅ 部署检查清单

- [ ] Node.js 版本 ≥ 18.0.0
- [ ] npm install 执行成功
- [ ] npm run build 执行成功
- [ ] 服务启动在端口 5174
- [ ] 访问 http://服务器IP:5174 正常显示

---

## 🔧 常用命令

```bash
# 开发模式 (热更新)
npm run dev

# 生产构建
npm run build

# 预览构建结果
npm run preview

# 运行测试
npm test
```

---

## 🆘 故障排查

### 端口被占用
```bash
# 查看端口占用
netstat -ano | findstr 5174

# 杀死占用进程
taskkill /PID <进程ID> /F
```

### 构建失败
```bash
# 清除缓存重新安装
rm -rf node_modules package-lock.json
npm install
npm run build
```

### 访问不了
- 检查防火墙是否开放 5174 端口
- 检查服务是否启动成功

---

## 📞 支持

如有问题，请检查:
1. 控制台错误信息
2. Node.js 版本
3. 端口是否被占用

---

**部署端口: 5174** (请务必使用此端口)