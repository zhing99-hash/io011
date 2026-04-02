# IO011 代码配置调整说明

> 部署前请确认以下配置

---

## ✅ 已调整 (无需再改)

| 文件 | 配置项 | 新值 |
|------|--------|------|
| `github-repo/hub/.env` | PORT | **1569** |

---

## 🔧 部署后需要调整的代码

### 1. Hub 前端 API 地址 (如需要)

如果 Hub 前端 (1566) 需要直接调用 Hub 后端 (1569)，检查是否有 API 代理配置。

**无需修改** - 使用相对路径 `/api/...` 即可。

---

### 2. 用户端前端 (user-frontend)

**当前状态**: 使用 Mock 数据，无需修改代码

**如需切换到真实 API**:
打开 `github-repo/user-frontend/src/api/search.ts`
找到模拟数据调用，修改为真实 API 调用：

```typescript
// 当前使用 mock
const useSearch = (query: string, filters?: SearchFilters) => {
  // return useQuery 调用的 mock 数据
  return useQuery({
    queryKey: ['search', query, filters],
    queryFn: () => searchMockData(query, filters), // Mock 数据
  })
}

// 改为真实 API
const useSearch = (query: string, filters?: SearchFilters) => {
  return useQuery({
    queryKey: ['search', query, filters],
    queryFn: () => fetchSearch(query, filters), // 真实 API
  })
}
```

---

### 3. 商户端 Skill 配置文件

文件: `github-repo/merchant-skill/config/merchant.yaml`

```yaml
server:
  port: 1589  # 确保是 1589

hubs:
  - name: "AICart主站"
    url: "http://服务器IP:1569"  # 部署后填入实际 Hub 地址
    api_key: "${HUB_API_KEY}"
    auto_sync: true
```

---

## 📋 部署后对接步骤 (必须执行)

### Step 1: 启动所有服务后，验证

```bash
# 检查 Hub 后端
curl http://localhost:1569/api/health

# 检查商户端
curl http://localhost:1589/api/health
```

### Step 2: 注册商户到 Hub

```bash
curl -X POST http://localhost:1569/api/merchants/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "你的商户名",
    "endpoint": "http://localhost:1589",
    "tags": {
      "categories": ["茶具", "陶瓷"],
      "capabilities": ["支持定制", "48小时发货"]
    }
  }'
```

### Step 3: 验证搜索

```bash
curl "http://localhost:1569/api/search?tags=茶具"
```

---

## ⚠️ 重要提醒

1. **数据库和 Redis** - Hub 后端依赖 PostgreSQL + Redis，请确保已启动
2. **防火墙** - 开放端口: 1566, 1569, 1588, 1589
3. **商户注册** - 每次新增商户都需要执行 Step 2 注册

---

**代码层面基本不需要大改，部署后执行对接步骤即可！** 🐹