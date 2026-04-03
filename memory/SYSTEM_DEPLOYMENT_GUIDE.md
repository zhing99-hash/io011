# 系统部署经验总结

**项目:** IO011 / AICart Hub  
**日期:** 2026-04-01 ~ 2026-04-02  
**版本:** v2.3.1

---

## 📋 部署流程标准操作流程 (SOP)

### 1. 准备工作

```bash
# 1.1 备份当前代码
mv /opt/io011/github-repo /opt/io011/github-repo.bak-$(date +%Y%m%d)

# 1.2 克隆最新代码
cd /opt/io011
git clone https://github.com/zhing99-hash/io011.git github-repo

# 1.3 切换分支
cd github-repo
git checkout v2.3.1-dev
```

### 2. 环境配置

```bash
# 2.1 配置数据库密码和端口
cd hub
vim .env
# 修改: DB_PASSWORD=AicartHub2026Safe
# 修改: PORT=1569

# 2.2 安装依赖
npm install

# 2.3 验证数据库连接
npm start
```

### 3. 服务启动

```bash
# Hub API (1569)
lsof -ti:1569 | xargs -r kill -9
cd /opt/io011/github-repo/hub && node src/index.js &

# Hub/用户前端 (1566)
cd /opt/io011/github-repo/user-frontend && npx vite build
npx serve dist -p 1566 &

# Hub 后台 (1568)
# 需要确保 dist 目录存在，否则构建
cd /opt/io011/github-repo/hub-admin
npm install && npm run build  # 如有构建错误，使用备份
npx serve dist -l 1568 &

# 商户 Web (1588)
cd /opt/io011/github-repo/merchant-frontend
npm install && npm run build
npx serve dist -l 1588 &

# 商户 Skill (1589)
cd /opt/io011/github-repo/merchant-skill
sed -i 's/port: 3456/port: 1589/' config/merchant.yaml
npm start &
```

### 4. Nginx 配置修复 (502 问题)

```bash
# 修复 SSL 握手失败导致的 502
docker exec f84fdec53be7 sed -i 's/set \$forward_scheme https;/set \$forward_scheme http;/' /data/nginx/proxy_host/{5,7,8,9}.conf
docker exec f84fdec53be7 nginx -s reload
```

### 5. 验证测试

```bash
# 端口检查
for port in 1566 1568 1569 1588 1589; do
  echo -n "Port $port: "
  curl -s --connect-timeout 2 http://localhost:$port >/dev/null 2>&1 && echo "OK" || echo "FAIL"
done

# API 测试
curl http://localhost:1569/health
curl http://localhost:1569/api/v1/merchants
curl "http://localhost:1569/api/v1/search?tags=茶具"

# 外部域名测试
for domain in www.io011.com api.io011.com hub-admin.io011.com shop.io011.com s-api.io011.com; do
  echo -n "$domain: "
  curl -so /dev/null -w "%{http_code}\n" https://$domain/
done
```

---

## 🔧 常见问题及解决方案

### 问题 1: 502 Bad Gateway

**原因:** Nginx 的 forward_scheme 配置为 https，但后端只支持 http

**解决:**
```bash
docker exec f84fdec53be7 sed -i 's/set \$forward_scheme https;/set \$forward_scheme http;/' /data/nginx/proxy_host/*.conf
docker exec f84fdec53be7 nginx -s reload
```

### 问题 2: 搜索 API 返回 400

**原因:** PostgreSQL JSONB 查询语法问题

**解决:** 确保 GitHub 代码最新已是修复后的版本

### 问题 3: TypeScript 构建失败 (hub-admin)

**原因:** mockMerchants.ts 文件编码错误

**解决:** 使用备份的 hub-admin 目录覆盖

### 问题 4: API 版本号不对

**解决:**
```bash
# 修改 hub/src/index.js
sed -i "s/version: '2.2.1'/version: '2.3.1'/g" hub/src/index.js
```

### 问题 5: 前端 API 地址错误

**解决:**
```bash
# 修改 user-frontend/src/api/search.ts
sed -i "s|const API_BASE_URL = '/api/v1';|const API_BASE_URL = 'https://api.io011.com/api/v1';|g" user-frontend/src/api/search.ts
```

---

## 📁 关键路径

| 项目 | 路径 |
|------|------|
| 主代码 | `/opt/io011/github-repo/` |
| Hub API | `/opt/io011/github-repo/hub/` |
| 用户前端 | `/opt/io011/github-repo/user-frontend/` |
| Hub 后台 | `/opt/io011/github-repo/hub-admin/` |
| 商户前端 | `/opt/io011/github-repo/merchant-frontend/` |
| 商户 Skill | `/opt/io011/github-repo/merchant-skill/` |
| 代码备份 | `/opt/io011/github-repo.bak-*/` |
| Nginx 容器 | `f84fdec53be7` |

---

## ⚙️ 核心配置

### Hub API (.env)
```
PORT=1569
DB_PASSWORD=AicartHub2026Safe
```

### Merchant Skill (config/merchant.yaml)
```yaml
server:
  port: 1589
```

---

## 📊 服务端口映射

| 服务 | 端口 | 域名 |
|------|------|------|
| 用户端/Hub前端 | 1566 | www.io011.com |
| Hub 后台 | 1568 | hub-admin.io011.com |
| Hub API | 1569 | api.io011.com |
| 商户 Web | 1588 | shop.io011.com |
| 商户 Skill | 1589 | s-api.io011.com |

---

## ⚠️ 注意事项

1. **数据库一致性**: 确保 .env 中的密码与生产环境一致
2. **Nginx 配置**: 每次部署后检查是否有 502 错误
3. **前端构建**: hub-admin 构建可能失败，建议使用备份
4. **版本号**: 记得更新版本号
5. **API 地址**: 用户端需要配置正确的 API 地址

---

## 🔄 部署清单 (Checklist)

- [ ] 备份当前代码
- [ ] 克隆/拉取最新代码
- [ ] 配置数据库密码和端口
- [ ] 安装依赖 (npm install)
- [ ] 构建前端 (vite build)
- [ ] 启动所有服务
- [ ] 修复 Nginx 502 问题
- [ ] 验证 API 功能
- [ ] 测试外部域名访问
- [ ] 更新版本号
- [ ] 验证用户端 API 地址

---

## 🐛 待蜜鼠修复的 GitHub 问题

1. **hub-admin 构建错误** - mockMerchants.ts 语法错误
2. **shop.io011.com SSL** - 证书是 merchant.io011.com

---

*本文档由小鹰自动生成，记录 IO011 项目部署经验*