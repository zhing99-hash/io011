#!/bin/bash
# IO011 Hub端部署脚本
# 在服务器上执行: bash 2-deploy-hub.sh

set -e

HUB_DIR="/opt/io011/hub"

echo "=============================================="
echo "  IO011 Hub端部署"
echo "=============================================="
echo ""

# 检查目录
if [ ! -d "$HUB_DIR" ]; then
    echo "❌ 错误: Hub目录不存在: $HUB_DIR"
    echo "请先上传Hub代码到该目录"
    exit 1
fi

cd $HUB_DIR

# 1. 检查代码
echo "[1/4] 检查代码..."
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 未找到package.json"
    exit 1
fi
echo "  ✅ 代码检查通过"

# 2. 配置环境变量
echo "[2/4] 配置环境变量..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "  ⚠️  已创建.env文件，请编辑配置后重新运行"
        echo "  关键配置:"
        echo "    - DB_PASSWORD (数据库密码)"
        echo "    - JWT_SECRET (JWT密钥)"
        echo "    - REDIS_PASSWORD (Redis密码)"
        exit 1
    else
        echo "❌ 错误: 未找到.env或.env.example"
        exit 1
    fi
fi
echo "  ✅ 环境变量配置完成"

# 3. 启动服务
echo "[3/4] 启动Hub服务..."
docker-compose down 2>/dev/null || true
docker-compose up -d

# 等待服务启动
echo "  等待服务启动..."
sleep 5

# 4. 健康检查
echo "[4/4] 健康检查..."
for i in {1..10}; do
    if curl -f http://localhost:8080/health > /dev/null 2>&1; then
        echo "  ✅ Hub服务运行正常"
        break
    fi
    if [ $i -eq 10 ]; then
        echo "❌ 错误: Hub服务启动失败"
        docker-compose logs
        exit 1
    fi
    echo "  等待中... ($i/10)"
    sleep 2
done

echo ""
echo "=============================================="
echo "  Hub端部署完成！"
echo "=============================================="
echo ""
echo "服务地址:"
echo "  - Health: http://YOUR_SERVER_IP:8080/health"
echo "  - API:    http://YOUR_SERVER_IP:8080/api/v1"
echo ""
echo "查看日志:"
echo "  cd $HUB_DIR && docker-compose logs -f"
echo ""