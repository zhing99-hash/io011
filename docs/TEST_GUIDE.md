# IO011 系统测试文档

> 版本: v2.3.1  
> 日期: 2026-04-01  
> 用途: OpenClaw 自动执行全流程测试

---

## 📋 测试范围

| 模块 | 测试内容 |
|------|----------|
| Hub 后端 API | 健康检查、商户注册、搜索功能 |
| Hub 前端 | 页面访问、加载 |
| 商户端 Skill | A2A 接口、商户信息 |
| 商户端 Web | 页面访问 |
| 数据流转 | 用户搜索 → Hub → 商户 → 返回结果 |

---

## 🔧 测试命令清单

### 1. Hub 后端 API 测试

```bash
# 1.1 健康检查
curl -s http://localhost:1569/api/health
# 预期: {"status":"ok","service":"AICart Hub"}

# 1.2 商户列表 (空)
curl -s http://localhost:1569/api/merchants
# 预期: {"merchants":[]}

# 1.3 商户注册
curl -s -X POST http://localhost:1569/api/merchants/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试商户",
    "endpoint": "http://localhost:1589",
    "tags": {
      "categories": ["茶具", "陶瓷"],
      "capabilities": ["支持定制"],
      "region": "景德镇"
    }
  }'
# 预期: 返回新商户信息，包含 id 和 api_key

# 1.4 商户列表 (有数据)
curl -s http://localhost:1569/api/merchants
# 预期: {"merchants":[{"id":"...","name":"测试商户"...}]}

# 1.5 搜索测试
curl -s "http://localhost:1569/api/search?tags=茶具"
# 预期: 返回匹配的商户和商品

# 1.6 标签列表
curl -s http://localhost:1569/api/tags
# 预期: 返回标签列表
```

---

### 2. 商户端 Skill 测试

```bash
# 2.1 健康检查
curl -s http://localhost:1589/api/health
# 预期: {"status":"ok"}

# 2.2 商户信息
curl -s http://localhost:1589/api/merchant/info
# 预期: 返回商户名称、标签等信息

# 2.3 商品查询接口
curl -s -X POST http://localhost:1589/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{"query":"茶具","limit":5}'
# 预期: 返回商品列表
```

---

### 3. 前端页面测试

```bash
# 3.1 Hub 前端 (用户界面)
curl -s http://localhost:1566 | head -c 500
# 预期: 返回 HTML 页面，包含 "AI Cart Hub" 或 "io011"

# 3.2 Hub 后台 (管理界面)
curl -s http://localhost:1568 | head -c 500
# 预期: 返回 HTML 页面

# 3.3 商户端 Web
curl -s http://localhost:1588 | head -c 500
# 预期: 返回 HTML 页面
```

---

### 4. 全流程测试 (端到端)

```bash
# 4.1 用户搜索流程
# 假设前端调用: GET /api/search?query=茶具&filters={}

# 测试完整搜索
curl -s "http://localhost:1569/api/search?tags=茶具"
# 预期返回:
# {
#   "merchants": [{...}],
#   "products": [{...}],
#   "totalResults": N,
#   "query": {"tags":["茶具"]}
# }

# 4.2 商户状态更新
# 获取商户 ID
MERCHANT_ID=$(curl -s http://localhost:1569/api/merchants | jq -r '.merchants[0].id')

# 商户详情
curl -s "http://localhost:1569/api/merchants/$MERCHANT_ID"
# 预期: 返回商户详情

# 4.3 商户封禁/解封
curl -s -X PUT "http://localhost:1569/api/merchants/$MERCHANT_ID/status" \
  -H "Content-Type: application/json" \
  -d '{"status":"banned","reason":"测试封禁"}'
# 或
curl -s -X PUT "http://localhost:1569/api/merchants/$MERCHANT_ID/status" \
  -H "Content-Type: application/json" \
  -d '{"status":"active"}'
```

---

## 🤖 OpenClaw 测试脚本

请把以下内容保存到服务器执行:

```bash
#!/bin/bash

echo "========================================"
echo "IO011 系统自动化测试"
echo "========================================"

PASS=0
FAIL=0

test_api() {
    local name="$1"
    local url="$2"
    local expected="$3"
    
    result=$(curl -s "$url")
    if echo "$result" | grep -q "$expected"; then
        echo "✅ 通过: $name"
        PASS=$((PASS+1))
    else
        echo "❌ 失败: $name"
        echo "   返回: $result"
        FAIL=$((FAIL+1))
    fi
}

echo ""
echo "=== 1. Hub API 测试 ==="
test_api "Hub 健康检查" "http://localhost:1569/api/health" "ok"
test_api "商户列表" "http://localhost:1569/api/merchants" "merchants"
test_api "搜索功能" "http://localhost:1569/api/search?tags=茶具" "merchants"

echo ""
echo "=== 2. 商户 Skill 测试 ==="
test_api "Skill 健康检查" "http://localhost:1589/api/health" "ok"

echo ""
echo "=== 3. 前端页面测试 ==="
test_api "Hub 前端" "http://localhost:1566" "html"
test_api "商户后台" "http://localhost:1588" "html"

echo ""
echo "========================================"
echo "测试结果: $PASS 通过, $FAIL 失败"
echo "========================================"

if [ $FAIL -eq 0 ]; then
    echo "🎉 所有测试通过!"
    exit 0
else
    echo "⚠️ 有测试失败，请检查"
    exit 1
fi
```

---

## 🆕 新增商户测试

每次新增商户后，执行以下测试:

```bash
# 新商户注册
NEW_MERCHANT=$(curl -s -X POST http://localhost:1569/api/merchants/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "新商户测试",
    "endpoint": "http://localhost:1589",
    "tags": {"categories":["测试类目"]}
  }')

MERCHANT_ID=$(echo $NEW_MERCHANT | jq -r '.id')

# 验证商户可搜索
curl -s "http://localhost:1569/api/search?tags=测试类目"
# 预期: 能搜索到新商户
```

---

## 🔄 回归测试 (每次部署后必跑)

```bash
# 1. 检查所有端口
netstat -ano | grep -E "1566|1568|1569|1588|1589"

# 2. 运行完整测试脚本
./test-io011.sh

# 3. 验证数据一致性
# 商户注册后，搜索结果应包含该商户
curl -s "http://localhost:1569/api/merchants" | jq '.merchants | length'
curl -s "http://localhost:1569/api/search?tags=茶具" | jq '.totalResults'
```

---

## ⚠️ 测试失败处理

| 错误 | 解决方法 |
|------|----------|
| 连接拒绝 | 检查服务是否启动 |
| 404 | 检查端口和路由配置 |
| 500 | 查看日志 `hub/logs/error.log` |
| 超时 | 检查数据库和 Redis 连接 |

---

**文档版本**: v2.3.1  
**维护者**: 蜜鼠