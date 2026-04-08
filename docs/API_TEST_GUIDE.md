# IO011 API 测试教程

**版本:** v2.3.1  
**日期:** 2026-04-02

---

## 📋 测试前准备

### 访问地址
| 服务 | 地址 |
|------|------|
| Hub API | http://api.io011.com 或 http://localhost:1569 |
| Hub 前端 | http://www.io011.com 或 http://localhost:1566 |
| Hub 后台 | http://hub-admin.io011.com 或 http://localhost:1568 |
| 商户 Web | http://shop.io011.com 或 http://localhost:1588 |

---

## 🧪 API 测试（使用 curl）

### 1. 健康检查
```bash
curl http://localhost:1569/health
```
**预期:** `{"status":"ok","version":"2.2.1",...}`

---

### 2. 分类列表
```bash
curl http://localhost:1569/api/v1/categories
```
**预期:** 返回分类数组

---

### 3. 商户列表
```bash
curl http://localhost:1569/api/v1/merchants
```
**预期:** `{"merchants":[...],"total":3,...}`

---

### 4. 商户详情
```bash
# 查看商户列表获取 ID
curl http://localhost:1569/api/v1/merchants

# 替换下面的 ID
curl http://localhost:1569/api/v1/merchants/mer_xxx
```
**预期:** 返回商户详情

---

### 5. 搜索功能

#### 按标签搜索（单个）
```bash
curl "http://localhost:1569/api/v1/search?tags=茶具"
```
**预期:** 返回包含"茶具"标签的商户

#### 按标签搜索（多个）
```bash
curl "http://localhost:1569/api/v1/search?tags=茶具,手工"
```
**预期:** 返回同时包含两个标签的商户

#### 按分类搜索
```bash
curl "http://localhost:1569/api/v1/search?category=陶瓷"
```
**预期:** 返回"陶瓷"分类的商户

---

### 6. 商户注册
```bash
curl -X POST http://localhost:1569/api/v1/merchants/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试商户",
    "endpoint": "http://localhost:3456",
    "tags": {
      "categories": ["测试"],
      "capabilities": ["API"],
      "location": "北京"
    }
  }'
```
**预期:** 返回新商户信息，包含 `merchant_id` 和 `api_key`

---

### 7. 商户端测试

#### 商户端健康检查
```bash
curl http://localhost:1589/health
```
**预期:** `{"status":"ok",...}`

#### 商户信息
```bash
curl http://localhost:1589/api/merchant/info
```
**预期:** 返回商户信息

---

## 🌐 浏览器测试

### 前端页面测试
| 页面 | 访问地址 | 检查内容 |
|------|----------|----------|
| 用户端首页 | http://www.io011.com | 搜索框、商品列表 |
| 商户后台 | http://shop.io011.com | 登录页面、商品管理 |
| Hub 后台 | http://hub-admin.io011.com | 登录页面、商户管理 |

### 测试流程（用户端）
1. 打开 http://www.io011.com
2. 在搜索框输入 "茶具"
3. 点击搜索按钮
4. 应该看到商户列表

---

## ✅ 验收标准

| 功能 | 检查点 |
|------|--------|
| 健康检查 | 返回 200 + JSON |
| 分类列表 | 返回分类数组 |
| 商户列表 | 返回商户数量 |
| 商户详情 | 返回单个商户信息 |
| 搜索功能 | 按标签/分类过滤 |
| 前端页面 | 页面正常加载，无报错 |

---

## 🔧 常见问题

### 1. 502 Bad Gateway
**解决:** 检查 Nginx 配置，`forward_scheme` 应为 `http`

### 2. 404 Not Found
**解决:** 确保服务已启动，端口正确

### 3. 连接被拒绝
**解决:** `pkill node && cd /opt/io011/github-repo/hub && node src/index.js &`

---

**测试完成！** 🎉