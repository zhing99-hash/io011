#!/bin/bash

# IO011 前端 UI 自动化部署脚本
# 使用方法: ./deploy-ui.sh

set -e

echo "🚀 IO011 前端 UI 部署脚本"
echo "=========================="

# 配置
PROJECT_DIR="/opt/io011/github-repo"
HUB_DIR="$PROJECT_DIR/hub"
MERCHANT_DIR="$PROJECT_DIR/merchant-skill"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函数：打印信息
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 1. 检查环境
check_env() {
    step "1/6 检查环境..."
    
    if ! command -v node &> /dev/null; then
        error "Node.js 未安装，请先安装 Node.js >= 18"
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        error "Node.js 版本过低，需要 >= 18"
    fi
    
    if ! command -v pm2 &> /dev/null; then
        warn "PM2 未安装，正在安装..."
        npm install -g pm2
    fi
    
    # 检查项目目录
    if [ ! -d "$PROJECT_DIR" ]; then
        error "项目目录不存在: $PROJECT_DIR"
    fi
    
    info "✅ 环境检查通过"
}

# 2. 部署 Hub
deploy_hub() {
    step "2/6 部署 Hub 前端..."
    
    cd $HUB_DIR
    
    # 安装依赖
    info "安装 Hub 依赖..."
    npm install
    
    # 确保静态文件服务依赖
    if ! npm list @fastify/static &>/dev/null; then
        info "安装 @fastify/static..."
        npm install @fastify/static
    fi
    
    # 检查前端文件
    if [ ! -f "public/index.html" ]; then
        warn "public/index.html 不存在，将创建默认文件"
        mkdir -p public
        # 这里可以插入创建 index.html 的代码
    fi
    
    # 重启或启动服务
    if pm2 list | grep -q "aicart-hub"; then
        info "重启 Hub 服务..."
        pm2 restart aicart-hub
    else
        info "启动 Hub 服务..."
        pm2 start src/index.js --name aicart-hub --restart-delay 3000
    fi
    
    # 等待服务启动
    sleep 3
    
    # 验证
    if curl -s http://localhost:8080/health | grep -q "ok"; then
        info "✅ Hub 服务运行正常"
    else
        warn "⚠️ Hub 服务可能未完全启动，请检查日志"
    fi
}

# 3. 部署商户端
deploy_merchant() {
    step "3/6 部署商户端前端..."
    
    cd $MERCHANT_DIR
    
    # 安装依赖
    info "安装商户端依赖..."
    npm install
    
    # 检查前端文件
    if [ ! -f "public/index.html" ]; then
        warn "public/index.html 不存在，将创建默认文件"
        mkdir -p public
    fi
    
    # 重启或启动服务
    if pm2 list | grep -q "merchant-skill"; then
        info "重启商户端服务..."
        pm2 restart merchant-skill
    else
        info "启动商户端服务..."
        pm2 start src/index.js --name merchant-skill --restart-delay 3000
    fi
    
    # 等待服务启动
    sleep 3
    
    # 验证
    if curl -s http://localhost:3456/health | grep -q "ok"; then
        info "✅ 商户端服务运行正常"
    else
        warn "⚠️ 商户端服务可能未完全启动，请检查日志"
    fi
}

# 4. 配置 Nginx
setup_nginx() {
    step "4/6 检查 Nginx 配置..."
    
    if ! command -v nginx &> /dev/null; then
        warn "Nginx 未安装，跳过反向代理配置"
        return
    fi
    
    # 检查配置文件是否存在
    if [ -f "/etc/nginx/sites-available/www.io011.com" ]; then
        info "Nginx 配置已存在"
    else
        warn "Nginx 配置文件不存在，请手动配置"
        warn "参考: $PROJECT_DIR/DEPLOY_UI.md"
    fi
    
    # 测试配置
    if sudo nginx -t 2>/dev/null; then
        info "✅ Nginx 配置测试通过"
        sudo systemctl reload nginx
    else
        warn "⚠️ Nginx 配置测试失败"
    fi
}

# 5. 保存配置
save_config() {
    step "5/6 保存 PM2 配置..."
    
    pm2 save
    
    # 设置开机自启
    if command -v systemctl &> /dev/null; then
        sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME 2>/dev/null || true
    fi
    
    info "✅ 配置已保存"
}

# 6. 最终检查
final_check() {
    step "6/6 最终检查..."
    
    echo ""
    echo "服务状态:"
    echo "---------"
    
    # Hub 检查
    HUB_STATUS=$(curl -s http://localhost:8080/health 2>/dev/null | grep -o '"status":"ok"' || echo "FAILED")
    if [ "$HUB_STATUS" = '"status":"ok"' ]; then
        echo -e "${GREEN}✅${NC} Hub 服务        http://localhost:8080  -> www.io011.com"
    else
        echo -e "${RED}❌${NC} Hub 服务        未响应"
    fi
    
    # 商户端检查
    MERCHANT_STATUS=$(curl -s http://localhost:3456/health 2>/dev/null | grep -o '"status":"ok"' || echo "FAILED")
    if [ "$MERCHANT_STATUS" = '"status":"ok"' ]; then
        echo -e "${GREEN}✅${NC} 商户端服务      http://localhost:3456  -> shop.io011.com"
    else
        echo -e "${RED}❌${NC} 商户端服务      未响应"
    fi
    
    echo ""
    echo "PM2 进程:"
    pm2 list
    
    echo ""
    echo "访问地址:"
    echo "  Hub 首页:     http://localhost:8080/"
    echo "  商户店铺:     http://localhost:3456/"
    
    if command -v nginx &> /dev/null; then
        echo ""
        echo "Nginx 反向代理:"
        echo "  https://www.io011.com   -> http://localhost:8080"
        echo "  https://shop.io011.com  -> http://localhost:3456"
    fi
}

# 显示帮助
show_help() {
    cat << EOF
IO011 前端 UI 部署脚本

使用方法:
  ./deploy-ui.sh          执行完整部署
  ./deploy-ui.sh --help   显示帮助信息

环境变量:
  PROJECT_DIR    项目目录路径 (默认: /opt/io011/github-repo)

示例:
  PROJECT_DIR=/home/user/io011 ./deploy-ui.sh

EOF
}

# 主流程
main() {
    # 检查参数
    if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        show_help
        exit 0
    fi
    
    # 可以使用环境变量覆盖默认路径
    if [ -n "$PROJECT_DIR" ]; then
        HUB_DIR="$PROJECT_DIR/hub"
        MERCHANT_DIR="$PROJECT_DIR/merchant-skill"
    fi
    
    echo ""
    echo "配置信息:"
    echo "  项目目录: $PROJECT_DIR"
    echo "  Hub 目录: $HUB_DIR"
    echo "  商户目录: $MERCHANT_DIR"
    echo ""
    
    read -p "确认开始部署? [Y/n] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]] && [ -n "$REPLY" ]; then
        echo "已取消"
        exit 0
    fi
    
    check_env
    deploy_hub
    deploy_merchant
    setup_nginx
    save_config
    final_check
    
    echo ""
    echo "=========================="
    info "🎉 部署完成！"
    echo ""
    echo "查看日志:"
    echo "  pm2 logs aicart-hub       # Hub 日志"
    echo "  pm2 logs merchant-skill   # 商户端日志"
    echo ""
    echo "管理命令:"
    echo "  pm2 status                # 查看服务状态"
    echo "  pm2 restart all           # 重启所有服务"
    echo "  pm2 stop all              # 停止所有服务"
}

# 执行
main "$@"
