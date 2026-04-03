# IO011 快速部署指南

> 只需这一页！

---

## 🎯 核心信息 (必填)

服务器公网 IP: _____________

---

## 📦 部署顺序

```
1. Hub 后端 (1569)     ← 最先启动
2. Hub 前端 (1566)
3. 商户端 Skill (1589)
4. 商户端 Web (1588)
5. 注册商户 → 完成
```

---

## 🔌 端口速查

| 端口 | 服务 | 命令 |
|------|------|------|
| **1569** | Hub API | `cd hub && node src/index.js` |
| **1566** | Hub 前端 | `cd hub-ui && python server.py` |
| **1589** | 商户 Skill | `cd merchant-skill && node src/index.js` |
| **1588** | 商户 Web | `cd merchant-frontend && serve dist -l 1588` |

---

## ⚡ 快速启动

```bash
# 1. Hub 后端
cd /opt/io011/github-repo/hub
npm install
echo "PORT=1569" > .env
node src/index.js &

# 2. Hub 前端
cd /opt/io011/github-repo/hub-ui
npm install
sed -i 's/19800/1566/' server.py
python server.py &

# 3. 商户 Skill
cd /opt/io011/github-repo/merchant-skill
npm install
node src/index.js &

# 4. 商户 Web
cd /opt/io011/github-repo/merchant-frontend
npm install && npm run build
serve dist -l 1588 &
```

---

## ✅ 验证命令

```bash
# 检查服务
curl http://localhost:1569/api/health   # Hub API
curl http://localhost:1589/api/health   # 商户 Skill

# 注册商户
curl -X POST http://localhost:1569/api/merchants/register \
  -H "Content-Type: application/json" \
  -d '{"name":"测试商户","endpoint":"http://localhost:1589","tags":{"categories":["茶具"],"capabilities":["支持定制"]}}'
```

---

## 🆘 故障处理

| 问题 | 解决方法 |
|------|----------|
| 端口被占用 | `netstat -ano \| findstr PORT` 找进程 |
| 数据库连不上 | 检查 PostgreSQL 是否启动 |
| 商户搜不到 | 执行商户注册命令 |

---

**详细文档**: `docs/DEPLOY_CONFIG.md`