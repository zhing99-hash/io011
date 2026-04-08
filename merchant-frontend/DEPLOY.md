# IO011 商户端前端部署文档

> 版本: v2.3.1  
> 日期: 2026-04-01  
> 端口配置: **1588** (商户端)

---

## 📋 部署信息总览

| 项目 | 值 |
|------|-----|
| 项目名称 | merchant-frontend |
| 项目路径 | `github-repo/merchant-frontend` |
| 构建命令 | `npm run build` |
| 启动命令 | `npm run preview -- --port 1588` |
| **生产端口** | **1588** |
| 构建产物 | `dist/` |

---

## 🔌 端口配置确认

| 服务 | 端口 | 说明 |
|------|------|------|
| **商户端 (merchant-frontend)** | **1588** | 本次部署 |
| 用户端 (user-frontend) | 5174 | 已部署 |
| Hub 前端 (hub-ui) | 1566 | 已部署 |

---

## 🚀 服务器部署步骤

### 方式一: 使用 OpenClaw 自动部署 (推荐)

在服务器上的 OpenClaw 中发送:

```
请帮我部署 IO011 商户端后台:
1. 进入 github-repo/merchant-frontend 目录
2. 执行 npm install
3. 执行 npm run build
4. 使用 npm run preview -- --port 1588 启动服务
```

### 方式二: 手动部署

```bash
# 1. 进入项目目录
cd github-repo/merchant-frontend

# 2. 安装依赖
npm install

# 3. 构建生产版本
npm run build

# 4. 启动服务 (端口 1588)
npm run preview -- --port 1588
```

### 方式三: 使用 serve 部署 (生产环境推荐)

```bash
# 1. 全局安装 serve
npm install -g serve

# 2. 进入构建目录
cd github-repo/merchant-frontend

# 3. 构建
npm run build

# 4. 启动服务
serve dist -l 1588
```

---

## 📁 项目结构

```
github-repo/merchant-frontend/
├── dist/                    # 构建产物 (部署用)
│   ├── index.html
│   └── assets/
├── src/
│   ├── api/                 # API 和 Mock 数据
│   ├── components/          # 组件
│   ├── pages/               # 页面
│   │   ├── Login.tsx        # 登录页
│   │   ├── Dashboard.tsx    # 仪表盘
│   │   ├── Products.tsx     # 商品管理
│   │   ├── ProductEdit.tsx  # 商品编辑
│   │   ├── Tags.tsx         # 标签管理
│   │   ├── Orders.tsx       # 订单管理
│   │   └── Analytics.tsx    # 数据分析
│   ├── stores/              # 状态管理
│   ├── router/              # 路由
│   ├── types/               # 类型定义
│   └── utils/               # 工具函数
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
- [ ] 服务启动在端口 **1588**
- [ ] 访问 http://服务器IP:1588 正常显示登录页

---

## 🔧 常用命令

```bash
# 开发模式 (热更新)
npm run dev -- --port 1588

# 生产构建
npm run build

# 预览构建结果
npm run preview

# 运行测试
npm test
```

---

## 🌐 页面访问地址

部署成功后可访问:

| 页面 | 路径 |
|------|------|
| 登录页 | /login |
| 仪表盘 | / |
| 商品管理 | /products |
| 商品编辑 | /products/:id |
| 标签管理 | /tags |
| 订单管理 | /orders |
| 数据分析 | /analytics |

---

## 🆘 故障排查

### 端口被占用
```bash
# 查看端口占用
netstat -ano | findstr 1588

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
- 检查防火墙是否开放 1588 端口
- 检查服务是否启动成功

---

## 📞 支持

如有问题，请检查:
1. 控制台错误信息
2. Node.js 版本
3. 端口是否被占用

---

**部署端口: 1588** (请务必使用此端口)