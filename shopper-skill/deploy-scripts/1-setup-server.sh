#!/bin/bash
# IO011 服务器初始化脚本
# 在服务器上执行: bash 1-setup-server.sh

set -e  # 遇到错误立即退出

echo "=============================================="
echo "  IO011 服务器初始化"
echo "=============================================="
echo ""

# 1. 更新系统
echo "[1/5] 更新系统..."
sudo apt update && sudo apt upgrade -y

# 2. 安装基础工具
echo "[2/5] 安装基础工具..."
sudo apt install -y curl wget git vim htop ufw

# 3. 安装Docker
echo "[3/5] 安装Docker..."
if ! command -v docker &> /dev/null; then
    sudo apt install -y docker.io docker-compose
    sudo systemctl enable docker
    sudo systemctl start docker
    sudo usermod -aG docker $USER
    echo "  ✅ Docker安装完成"
else
    echo "  ✅ Docker已安装"
fi

# 4. 安装Node.js
echo "[4/5] 安装Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
    echo "  ✅ Node.js安装完成: $(node --version)"
else
    echo "  ✅ Node.js已安装: $(node --version)"
fi

# 5. 配置防火墙
echo "[5/5] 配置防火墙..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 8080/tcp  # Hub API
sudo ufw allow 8081/tcp  # 商户1
sudo ufw allow 8082/tcp  # 商户2
sudo ufw --force enable

echo "  ✅ 防火墙配置完成"

# 6. 创建部署目录
echo ""
echo "[6/6] 创建部署目录..."
sudo mkdir -p /opt/io011
sudo chown $USER:$USER /opt/io011
cd /opt/io011
mkdir -p hub merchants data scripts

echo "  ✅ 目录结构创建完成"

echo ""
echo "=============================================="
echo "  服务器初始化完成！"
echo "=============================================="
echo ""
echo "部署目录: /opt/io011"
echo ""
echo "下一步:"
echo "  1. 上传Hub端代码到 /opt/io011/hub"
echo "  2. 上传商户端代码到 /opt/io011/merchants"
echo "  3. 执行部署脚本"
echo ""