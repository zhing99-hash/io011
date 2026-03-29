# AICart Hub 部署指南

## 系统要求

- Node.js >= 18.0.0
- PostgreSQL >= 14.0
- Redis >= 6.0

## 快速部署

### 1. 安装依赖

```bash
cd hub
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入数据库和Redis配置
```

### 3. 初始化数据库

```bash
# 创建数据库
psql -U postgres -c "CREATE DATABASE aicart_hub;"
psql -U postgres -c "CREATE USER aicart WITH PASSWORD 'your_password';"
psql -U postgres -c "GRANT ALL PRiIVILEGES ON DATABASE aicart_hub TO aicart;"

# 执行 schema
psql -U aicart -d aicart_hub -f database/schema.sql
```

### 4. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

## Docker 部署

```bash
# 构建镜像
docker build -t aicart-hub .

# 运行容器
docker run -d \
  --name aicart-hub \
  -p 8080:8080 \
  --env-file .env \
  aicart-hub
```

## API 测试

```bash
# 注册商户
curl -X POST http://localhost:8080/api/v1/merchants/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试商户",
    "endpoint": "wss://example.com/a2a",
    "tags": {
      "categories": ["茶具", "陶瓷"],
      "capabilities": ["支持定制"],
      "location": "景德镇",
      "price_range": {"min": 50, "max": 500}
    }
  }'

# 搜索商户
curl "http://localhost:8080/api/v1/search?tags=茶具,手工"
```
