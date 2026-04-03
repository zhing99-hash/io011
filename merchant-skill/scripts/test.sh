#!/bin/bash
# AICart Merchant Skill - 测试脚本
echo "🧪 测试脚本"
echo "============"
echo "1. 健康检查..."
curl -f http://localhost:3456/health && echo "✅ 通过" || echo "❌ 失败"
echo ""
echo "2. 商户信息..."
curl -f http://localhost:3456/api/v1/merchant/info && echo "✅ 通过" || echo "❌ 失败"
echo ""
echo "3. 商品列表..."
curl -f http://localhost:3456/api/v1/products && echo "✅ 通过" || echo "❌ 失败"
echo ""
echo "测试完成"