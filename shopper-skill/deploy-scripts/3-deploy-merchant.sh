#!/bin/bash
# IO011 商户端部署脚本
# 用法: bash 3-deploy-merchant.sh <merchant_id> <merchant_name> <port>
# 示例: bash 3-deploy-merchant.sh mer_001 茶韵轩 8081

set -e

MERCHANT_ID=${1:-""}
MERCHANT_NAME=${2:-""}
PORT=${3:-"8081"}

if [ -z "$MERCHANT_ID" ] || [ -z "$MERCHANT_NAME" ]; then
    echo "用法: bash 3-deploy-merchant.sh <merchant_id> <merchant_name> <port>"
    echo "示例: bash 3-deploy-merchant.sh mer_001 茶韵轩 8081"
    exit 1
fi

MERCHANT_DIR="/opt/io011/merchants/$MERCHANT_ID"
HUB_URL="http://localhost:8080"

echo "=============================================="
echo "  IO011 商户端部署"
echo "=============================================="
echo ""
echo "商户ID:   $MERCHANT_ID"
echo "商户名称: $MERCHANT_NAME"
echo "端口:     $PORT"
echo ""

# 1. 创建商户目录
echo "[1/4] 创建商户目录..."
mkdir -p $MERCHANT_DIR
cd $MERCHANT_DIR

# 2. 创建Docker Compose配置
echo "[2/4] 创建Docker配置..."
cat > docker-compose.yml <<EOF
version: '3.8'

services:
  merchant:
    image: node:20-alpine
    container_name: $MERCHANT_ID
    ports:
      - "$PORT:8080"
    environment:
      - NODE_ENV=production
      - MERCHANT_ID=$MERCHANT_ID
      - MERCHANT_NAME=$MERCHANT_NAME
      - PORT=8080
      - HUB_URL=$HUB_URL
    volumes:
      - ./src:/app/src
      - ./package.json:/app/package.json
    working_dir: /app
    command: sh -c "npm install && npm start"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
EOF

# 3. 创建基础代码
echo "[3/4] 创建商户代码..."

# package.json
cat > package.json <<EOF
{
  "name": "io011-merchant",
  "version": "0.1.0",
  "description": "IO011 Merchant A2A Service",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js"
  },
  "dependencies": {
    "fastify": "^4.24.0",
    "@fastify/websocket": "^8.2.0"
  }
}
EOF

# 创建src目录
mkdir -p src

# 商户服务代码
cat > src/index.js <<'EOF'
const fastify = require('fastify')({ logger: true });

const MERCHANT_ID = process.env.MERCHANT_ID || 'unknown';
const MERCHANT_NAME = process.env.MERCHANT_NAME || 'Unknown Merchant';
const PORT = process.env.PORT || 8080;
const HUB_URL = process.env.HUB_URL || 'http://localhost:8080';

// 模拟商品数据
const products = [
  { id: 'p001', name: '紫砂茶杯', price: 128, stock: 50, category: '茶具' },
  { id: 'p002', name: '陶瓷茶壶', price: 258, stock: 30, category: '茶具' },
  { id: 'p003', name: '茶道六君子', price: 88, stock: 100, category: '茶具' },
];

// Health check
fastify.get('/health', async () => ({
  status: 'ok',
  merchant: MERCHANT_NAME,
  merchantId: MERCHANT_ID,
  timestamp: new Date().toISOString()
}));

// A2A Search endpoint
fastify.post('/a2a/search', async (request, reply) => {
  const { query, filters } = request.body;
  
  // 过滤商品
  let results = products;
  
  if (filters?.minPrice) {
    results = results.filter(p => p.price >= filters.minPrice);
  }
  if (filters?.maxPrice) {
    results = results.filter(p => p.price <= filters.maxPrice);
  }
  if (query) {
    results = results.filter(p => 
      p.name.includes(query) || p.category.includes(query)
    );
  }
  
  return {
    merchantId: MERCHANT_ID,
    merchantName: MERCHANT_NAME,
    products: results,
    total: results.length
  };
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    fastify.log.info(`${MERCHANT_NAME} (${MERCHANT_ID}) running on port ${PORT}`);
    
    // Register to Hub
    registerToHub();
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Register merchant to Hub
const registerToHub = async () => {
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`${HUB_URL}/api/v1/merchants/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: MERCHANT_NAME,
        endpoint: `http://localhost:${PORT}`,
        tags: {
          categories: ['茶具'],
          capabilities: ['零售']
        }
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      fastify.log.info(`Registered to Hub: ${data.merchant_id}`);
    }
  } catch (err) {
    fastify.log.warn(`Failed to register to Hub: ${err.message}`);
  }
};

start();
EOF

echo "  ✅ 商户代码创建完成"

# 4. 启动服务
echo "[4/4] 启动商户服务..."
docker-compose down 2>/dev/null || true
docker-compose up -d

# 等待启动
sleep 3

# 健康检查
if curl -f http://localhost:$PORT/health > /dev/null 2>&1; then
    echo "  ✅ 商户服务运行正常"
else
    echo "⚠️  商户服务启动中，请稍后检查"
fi

echo ""
echo "=============================================="
echo "  商户端部署完成！"
echo "=============================================="
echo ""
echo "商户信息:"
echo "  - ID:   $MERCHANT_ID"
echo "  - 名称: $MERCHANT_NAME"
echo "  - 端口: $PORT"
echo ""
echo "服务地址:"
echo "  - Health: http://YOUR_SERVER_IP:$PORT/health"
echo "  - A2A:    http://YOUR_SERVER_IP:$PORT/a2a/search"
echo ""
echo "查看日志:"
echo "  cd $MERCHANT_DIR && docker-compose logs -f"
echo ""