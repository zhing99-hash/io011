# IO011 系统测试清单

**日期:** 2026-04-02  
**版本:** v2.3.1  
**目标:** 验证所有服务正常运行，排查已知问题

---

## 📋 测试前检查

### 1. 服务进程检查
```bash
# 检查 PM2 进程状态
pm2 status

# 或手动检查端口
for port in 1566 1568 1569 1588 1589; do
  echo -n "Port $port: "
  curl -s --connect-timeout 2 http://localhost:$port >/dev/null 2>&1 && echo "✅ OK" || echo "❌ DOWN"
done
```

### 2. Nginx 配置检查
```bash
# 检查 forward_scheme 配置（防止 502）
docker exec f84fdec53be7 grep "forward_scheme" /data/nginx/proxy_host/{5,7,8,9}.conf

# 应该显示: set $forward_scheme http;
```

---

## 🧪 功能测试（必须通过）

### Hub API (端口 1569)

| 测试项 | 命令 | 预期结果 |
|--------|------|----------|
| 健康检查 | `curl http://localhost:1569/health` | `{"status":"ok",...}` |
| 分类列表 | `curl http://localhost:1569/api/v1/categories` | 返回分类数组 |
| 商户注册 | `curl -X POST http://localhost:1569/api/v1/merchants/register -H "Content-Type: application/json" -d '{"name":"测试商户","endpoint":"http://localhost:1589","tags":{"categories":["测试"]}}'` | 返回商户信息 |
| 商户详情 | `curl http://localhost:1569/api/v1/merchants/1` | 返回商户详情 |
| **商户列表** ⚠️ | `curl http://localhost:1569/api/v1/merchants` | 返回商户列表（需验证是否修复） |
| **搜索功能** ⚠️ | `curl "http://localhost:1569/api/v1/search?tags=茶具"` | 返回搜索结果（需验证是否修复） |

### 商户 Skill (端口 1589)

| 测试项 | 命令 | 预期结果 |
|--------|------|----------|
| 健康检查 | `curl http://localhost:1589/api/health` | `{"status":"ok",...}` |
| 商户信息 | `curl http://localhost:1589/api/merchant/info` | 返回商户配置 |

### 前端页面

| 测试项 | 命令 | 预期结果 |
|--------|------|----------|
| Hub 前端 | `curl -s -o /dev/null -w "%{http_code}" http://localhost:1566/` | 200 |
| Hub 后台 | `curl -s -o /dev/null -w "%{http_code}" http://localhost:1568/` | 200 |
| 商户后台 | `curl -s -o /dev/null -w "%{http_code}" http://localhost:1588/` | 200 |

### 外部访问（域名）

| 测试项 | 命令 | 预期结果 |
|--------|------|----------|
| www.io011.com | `curl -s -o /dev/null -w "%{http_code}" https://www.io011.com/` | 200 |
| api.io011.com | `curl -s -o /dev/null -w "%{http_code}" https://api.io011.com/health` | 200 |
| hub-admin.io011.com | `curl -s -o /dev/null -w "%{http_code}" https://hub-admin.io011.com/` | 200 |
| shop.io011.com | `curl -s -o /dev/null -w "%{http_code}" https://shop.io011.com/` | 200 |
| s-api.io011.com | `curl -s -o /dev/null -w "%{http_code}" https://s-api.io011.com/api/health` | 200 |

---

## ⚠️ 已知问题（重点验证）

### 问题 1: 商户列表 API 404
```bash
curl http://localhost:1569/api/v1/merchants
# 预期: 返回商户列表
# 如果返回 404，需在后端添加路由
```

### 问题 2: 搜索功能返回 400
```bash
curl "http://localhost:1569/api/v1/search?tags=茶具"
# 预期: 返回搜索结果
# 如果返回 400，需检查 tagIndexer 逻辑
```

---

## 🔧 常见问题排查

### 502 Bad Gateway
```bash
# 原因: Nginx forward_scheme 配置错误
docker exec f84fdec53be7 sed -i 's/set \$forward_scheme https;/set \$forward_scheme http;/' /data/nginx/proxy_host/{7,8,9}.conf
docker exec f84fdec53be7 nginx -s reload
```

### 数据库连接失败
```bash
# 检查数据库密码
cat /opt/io011/github-repo/hub/.env | grep DB_PASSWORD
# 应该是: DB_PASSWORD=AicartHub2026Safe
```

### 端口被占用
```bash
# 查找占用进程
netstat -tlnp | grep -E "1566|1568|1569|1588|1589"
# 杀掉进程
pkill -f "serve.*1566"
```

---

## 📊 测试结果记录

| 测试项 | 结果 | 日期/时间 |
|--------|------|-----------|
| 端口 1566 |  |  |
| 端口 1568 |  |  |
| 端口 1569 |  |  |
| 端口 1588 |  |  |
| 端口 1589 |  |  |
| /health |  |  |
| /api/v1/categories |  |  |
| /api/v1/merchants |  |  |
| /api/v1/search |  |  |
| 外部域名访问 |  |  |

---

## ✅ 验收标准

- [ ] 所有 5 个端口正常响应
- [ ] 外部域名均可访问
- [ ] API 测试 100% 通过
- [ ] 无 502/500 错误
- [ ] 搜索功能正常

---

**测试完成后，请将结果反馈给蜜鼠**

---