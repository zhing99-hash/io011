# IO011 商户端 - Phase 3 开发完成

**版本**: v2.3.5  
**日期**: 2026-04-04  
**状态**: ✅ 后端对接完成

---

## 📁 文件结构

```
work/io011-merchant/
├── js/
│   └── api.js          # API 服务层
├── login.html          # 登录页
├── dashboard.html      # 仪表盘
├── index.html          # 商品管理
├── inactive.html       # 下架商品
├── orders.html         # 订单管理
├── API.md              # API 文档
└── README.md           # 本文档
```

---

## 🎯 功能完成情况

| 模块 | 本地模式 | 生产模式 | 说明 |
|------|----------|----------|------|
| 商户登录 | ✅ | ✅ | 本地测试 + API对接 |
| 仪表盘 | ✅ | - | 静态假数据 |
| 商品管理 | ✅ | ✅ | CRUD + 上下架 |
| 订单管理 | ✅ | ✅ | 状态流转 |
| 下架商品 | ✅ | ✅ | 重新上架 |

---

## 🧪 测试账号

### 本地模式
| 字段 | 值 |
|------|-----|
| 商户ID | test |
| 密码 | 123456 |
| 商户名 | 测试商户 |

### 生产模式
需要先在 Hub 后台注册商户，获取真正的 merchant_id 和密码。

---

## 🚀 启动方式

### 方式一：直接打开（本地模式）
```bash
# 直接在浏览器打开
C:\Users\Administrator\.openclaw\workspace\work\io011-merchant\login.html
```

### 方式二：本地服务器
```bash
cd work\io011-merchant
python -m http.server 1588
# 访问 http://localhost:1588
```

### 方式三：生产模式
1. 确保 Hub 后端运行在端口 1569
2. 修改 `js/api.js` 中的 API_BASE
3. 使用真实商户账号登录

---

## 🔌 后端对接状态

### 已对接 API
| 功能 | API 端点 | 状态 |
|------|----------|------|
| 登录验证 | POST /api/auth/merchant/login | ✅ |
| 商品列表 | GET /api/products | ✅ |
| 创建商品 | POST /api/products | ✅ |
| 更新商品 | PUT /api/products/:id | ✅ |
| 删除商品 | DELETE /api/products/:id | ✅ |
| 订单列表 | GET /api/orders | ✅ |
| 订单状态 | PUT /api/orders/:id | ✅ |

### 需要的数据库表
- `merchants` - 商户表
- `products` - 商品表
- `orders` - 订单表

---

## 📱 核心代码

### API 服务 (js/api.js)
```javascript
// 初始化
IO011API.login(merchantId, password)

// 获取商品
const result = await IO011API.getProducts()

// 创建商品
await IO011API.createProduct({ name: '商品', price: 99 })

// 更新订单状态
await IO011API.updateOrderStatus(orderId, 'shipped')
```

---

## 🎨 设计风格

- 主色调：绿色 (#10B981) - 商户端
- 深色主题：bg-gray-900
- 响应式布局
- TailwindCSS

---

## ⚠️ 注意事项

1. **浏览器兼容**: 推荐使用 Chrome/Edge
2. **localStorage**: 本地模式数据存储在浏览器
3. **跨域**: 生产模式需要后端配置 CORS
4. **HTTPS**: 生产环境需要配置 SSL

---

## 📖 详细文档

See [API.md](./API.md) for complete API documentation.

---

*整理: 蜜鼠 🐹*
*日期: 2026-04-04*