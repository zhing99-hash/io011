#!/bin/bash
# IO011 用户端前端部署脚本
# 端口: 5174 (开发) / 生产环境可自定义

echo "=== IO011 用户端前端部署 ==="
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"
echo "✅ npm 版本: $(npm --version)"

# 安装依赖
echo ""
echo "📦 安装依赖..."
npm install

# 构建生产版本
echo ""
echo "🔨 构建生产版本..."
npm run build

echo ""
echo "=== 部署完成 ==="
echo "📁 构建产物: dist/"
echo "🌐 启动服务: npm run preview -- --port 5174"
echo ""
echo "或使用 serve:"
echo "  npx serve dist -l 5174"