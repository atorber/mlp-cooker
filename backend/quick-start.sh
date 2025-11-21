#!/bin/bash

# AIHC-MENTOR Backend 快速启动脚本

echo "🚀 AIHC-MENTOR Backend 快速启动"
echo "================================"

# 检查Node.js版本
echo "📋 检查环境..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 18+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -c2-)
echo "✅ Node.js 版本: $NODE_VERSION"

# 检查npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装"
    exit 1
fi

echo "✅ npm 版本: $(npm -v)"

# 安装依赖
echo ""
echo "📦 安装依赖包..."
if [ ! -d "node_modules" ]; then
    npm install
    echo "✅ 依赖安装完成"
else
    echo "✅ 依赖已存在，跳过安装"
fi

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo ""
    echo "⚙️  创建环境变量文件..."
    cp .env.example .env
    echo "✅ 已创建 .env 文件，请根据需要修改配置"
else
    echo "✅ 环境变量文件已存在"
fi

# 创建必要目录
echo ""
echo "📁 创建必要目录..."
mkdir -p data/{db,cache,reports,uploads}
mkdir -p logs
echo "✅ 目录创建完成"

# 构建项目
echo ""
echo "🔨 构建项目..."
npm run build
if [ $? -eq 0 ]; then
    echo "✅ 项目构建成功"
else
    echo "❌ 项目构建失败"
    exit 1
fi

# 启动选项
echo ""
echo "🎯 选择启动模式:"
echo "1) 开发模式 (热重载)"
echo "2) 生产模式"
echo "3) 仅测试API"
echo "4) 退出"

read -p "请选择 (1-4): " choice

case $choice in
    1)
        echo ""
        echo "🔧 启动开发服务器..."
        echo "📍 服务器地址: http://localhost:5002"
        echo "📖 API文档: http://localhost:5002/api/docs"
        echo "🛑 按 Ctrl+C 停止服务器"
        echo ""
        npm run dev
        ;;
    2)
        echo ""
        echo "🚀 启动生产服务器..."
        echo "📍 服务器地址: http://localhost:5002"
        echo "🛑 按 Ctrl+C 停止服务器"
        echo ""
        npm start
        ;;
    3)
        echo ""
        echo "🧪 启动开发服务器并进行API测试..."
        echo "正在后台启动服务器..."
        npm run dev &
        DEV_PID=$!

        echo "等待服务器启动..."
        sleep 5

        echo "执行API测试..."
        node test-server.js

        echo ""
        echo "🛑 停止开发服务器..."
        kill $DEV_PID
        ;;
    4)
        echo "👋 再见！"
        exit 0
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac