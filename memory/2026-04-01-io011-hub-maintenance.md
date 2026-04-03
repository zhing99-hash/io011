# IO011 Hub 系统维护报告

**日期:** 2026-04-01  
**时间:** 04:07 - 04:47 EDT  
**维护类型:** 故障修复 + 全面检查

---

## 📋 系统清单

| 系统 | 域名 | 后端端口 | PM2 服务 |
|------|------|----------|----------|
| Hub 前端 | www.io011.com | 1566 | hub-ui |
| Hub 后台 | hub-admin.io011.com | 1568 | hub-admin |
| Hub API | api.io011.com | 1569 | hub-api |
| 商户端 Web | shop.io011.com | 1588 | merchant-frontend |
| 商户端 Skill | s-api.io011.com | 1589 | merchant-skill |

---

## 🔍 问题发现

### 初始报告
用户反馈：`api.io011.com` 访问失败

### 初步诊断
```bash
curl -s https://api.io011.com
# 返回：502 Bad Gateway (OpenResty)
```

### 日志分析
查看 Nginx Proxy Manager 错误日志：
```
SSL_do_handshake() failed (SSL: error:0A00010B:SSL routines::wrong version number)
while SSL handshaking to upstream
```

**根本原因：** Nginx 配置中 `forward_scheme` 设置为 `https`，尝试用 HTTPS 连接后端，但后端服务只监听 HTTP 端口，导致 SSL 握手失败。

---

## 🔧 修复操作

### 1. api.io011.com (端口 1569)

**配置文件:** `/data/nginx/proxy_host/8.conf`

**修改内容:**
```diff
- set $forward_scheme https;
+ set $forward_scheme http;
```

**命令:**
```bash
docker exec f84fdec53be7 sed -i 's/set \$forward_scheme https;/set \$forward_scheme http;/' /data/nginx/proxy_host/8.conf
docker exec f84fdec53be7 nginx -s reload
```

**验证:**
```json
{
  "status": "ok",
  "version": "2.2.1",
  "timestamp": "2026-04-01T08:22:59.422Z"
}
```

---

### 2. 全面检查扩展

用户要求对所有 5 个系统进行全面检查和修复。

#### 检查结果

| 域名 | 初始状态 | 问题 |
|------|----------|------|
| www.io011.com | ✅ 200 OK | 无 |
| hub-admin.io011.com | ❌ 502 Bad Gateway | forward_scheme 错误 |
| api.io011.com | ❌ 502 Bad Gateway | forward_scheme 错误 (已修复) |
| shop.io011.com | ✅ 200 OK | 无 |
| s-api.io011.com | ❌ 502 Bad Gateway | forward_scheme 错误 |

---

### 3. hub-admin.io011.com (端口 1568)

**配置文件:** `/data/nginx/proxy_host/7.conf`

**修改内容:**
```diff
- set $forward_scheme https;
+ set $forward_scheme http;
```

**命令:**
```bash
docker exec f84fdec53be7 sed -i 's/set \$forward_scheme https;/set \$forward_scheme http;/' /data/nginx/proxy_host/7.conf
```

---

### 4. s-api.io011.com (端口 1589)

**配置文件:** `/data/nginx/proxy_host/9.conf`

**修改内容:**
```diff
- set $forward_scheme https;
+ set $forward_scheme http;
```

**命令:**
```bash
docker exec f84fdec53be7 sed -i 's/set \$forward_scheme https;/set \$forward_scheme http;/' /data/nginx/proxy_host/9.conf
```

---

### 5. 重新加载 Nginx

```bash
docker exec f84fdec53be7 nginx -s reload
```

---

## ✅ 最终验证

```bash
for domain in www.io011.com hub-admin.io011.com api.io011.com shop.io011.com s-api.io011.com; do
  echo "=== $domain ==="
  curl -sk -o /dev/null -w "%{http_code} %{time_total}s\n" https://$domain/
done
```

**结果:**
| 域名 | HTTP 状态 | 响应时间 |
|------|-----------|----------|
| www.io011.com | 200 | 0.053s |
| hub-admin.io011.com | 200 | 0.049s |
| api.io011.com | 200 | 0.058s |
| shop.io011.com | 200 | 0.050s |
| s-api.io011.com | 200 | 0.050s |

---

## 📊 PM2 服务状态

```
┌────┬──────────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┐
│ id │ name                 │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │
├────┼──────────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┤
│ 1  │ hub-admin            │ default     │ N/A     │ fork    │ 416342   │ 97m    │ 0    │ online    │
│ 6  │ hub-api              │ default     │ 0.1.0   │ fork    │ 420159   │ 83m    │ 1    │ online    │
│ 0  │ hub-ui               │ default     │ N/A     │ fork    │ 416289   │ 97m    │ 0    │ online    │
│ 2  │ merchant-frontend    │ default     │ N/A     │ fork    │ 416366   │ 97m    │ 0    │ online    │
│ 4  │ merchant-skill       │ default     │ 1.0.0   │ fork    │ 416704   │ 96m    │ 0    │ online    │
└────┴──────────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┘
```

所有服务正常运行。

---

## 🗂️ 配置文件位置

### Nginx Proxy Manager (Docker 容器内)
- 容器 ID: `f84fdec53be7`
- 配置目录: `/data/nginx/proxy_host/`

| 文件 | 域名 | 后端 |
|------|------|------|
| 1.conf | manage.io011.com | web.luoriguixi.top:10000 (HTTPS) |
| 2.conf | ngx.io011.com | web.luoriguixi.top:30081 (HTTP) |
| 3.conf | pan.io011.com | web.luoriguixi.top:5244 (HTTP) |
| 4.conf | shop.io011.com | 172.18.0.1:1588 (HTTP) |
| 5.conf | io011.com / www.io011.com | 172.18.0.1:1566 (HTTP) |
| 6.conf | opc.5527714.xyz | 23.95.123.250:18789 (HTTP) |
| 7.conf | hub-admin.io011.com | 172.18.0.1:1568 (HTTP) ← **已修复** |
| 8.conf | api.io011.com | 172.18.0.1:1569 (HTTP) ← **已修复** |
| 9.conf | s-api.io011.com | 172.18.0.1:1589 (HTTP) ← **已修复** |

### 后端服务
- 代码目录: `/web/hub/`, `/web/merchant-frontend/`, `/web/merchant-skill/`
- PM2 日志: `/root/.pm2/logs/`
- 环境变量: `/web/hub/.env`

---

## 📝 问题模式总结

### 共同特征
所有故障都表现为：
1. **症状:** 502 Bad Gateway
2. **错误日志:** `SSL_do_handshake() failed ... wrong version number`
3. **根本原因:** Nginx 配置 `forward_scheme https` 但后端只支持 HTTP

### 修复模式
```bash
# 通用修复命令（替换 <file_id> 为配置文件编号）
docker exec f84fdec53be7 sed -i 's/set \$forward_scheme https;/set \$forward_scheme http;/' /data/nginx/proxy_host/<file_id>.conf

# 重新加载
docker exec f84fdec53be7 nginx -s reload
```

---

## ⚠️ 后续建议

### 1. 监控告警
建议添加健康检查监控：
```bash
# 示例：每 5 分钟检查一次
curl -sk https://api.io011.com/health | grep -q '"status":"ok"' || alert
```

### 2. 配置审计
定期检查 Nginx Proxy Manager 配置：
```bash
docker exec f84fdec53be7 grep "forward_scheme" /data/nginx/proxy_host/*.conf
```

### 3. 证书管理
- SSL 证书由 Let's Encrypt 自动续期
- 证书位置：`/etc/letsencrypt/live/npm-XX/`
- 注意：shop.io011.com 当前证书 CN 为 `merchant.io011.com`，建议确认是否需要单独证书

### 4. 数据库连接
- PostgreSQL 用户：`aicart`
- 数据库：`aicart_hub`
- 配置位置：`/web/hub/.env`

---

## 📅 下次维护待办

- [ ] 确认 shop.io011.com SSL 证书是否需要更新为正确域名
- [ ] 添加系统健康检查端点（部分服务缺少 /health）
- [ ] 配置自动化监控告警
- [ ] 审查其他域名配置（manage.io011.com, ngx.io011.com, pan.io011.com 等）
- [ ] 备份数据库和配置文件

---

**维护完成时间:** 2026-04-01 04:47 EDT  
**下次检查建议:** 2026-04-02 或根据监控告警

---

*此文档由 OpenClaw 自动生成，保存于 `/root/.openclaw/workspace/memory/2026-04-01-io011-hub-maintenance.md`*
