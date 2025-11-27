#!/bin/bash

# MLP Cooker 启动脚本
# 同时启动前端和后端服务

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查项目目录
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    print_error "请在项目根目录运行此脚本"
    exit 1
fi

# 检查依赖是否安装
if [ ! -d "backend/node_modules" ]; then
    print_warning "后端依赖未安装，正在安装..."
    cd backend
    npm install
    cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    print_warning "前端依赖未安装，正在安装..."
    cd frontend
    npm install
    cd ..
fi

# 检查后端是否已构建
if [ ! -d "backend/dist" ]; then
    print_info "正在构建后端项目..."
    cd backend
    npm run build
    cd ..
fi

clear
echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════╗"
echo "║                                                ║"
echo "║        MLP Cooker 服务启动                    ║"
echo "║                                                ║"
echo "╚════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# 检查配置文件
if [ ! -f "config.yaml" ]; then
    print_warning "未找到 config.yaml 配置文件"
    print_info "服务将在默认配置下启动"
    echo ""
fi

print_info "正在启动服务..."
print_info "后端服务: http://localhost:5002 (或 http://0.0.0.0:5002)"
print_info "前端应用: http://localhost:8000"
print_info "按 Ctrl+C 可以停止所有服务"
echo ""

# 创建日志目录
mkdir -p logs

# 清理函数
cleanup() {
    echo ""
    print_info "正在停止服务..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    print_success "服务已停止"
    exit 0
}

# 捕获退出信号
trap cleanup SIGINT SIGTERM

# 启动后端服务（后台运行）
print_info "启动后端服务..."
cd backend
npm run dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# 等待后端启动
sleep 3

# 检查后端是否启动成功
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    print_error "后端服务启动失败，请查看 logs/backend.log"
    exit 1
fi

print_success "后端服务已启动 (PID: $BACKEND_PID)"

# 启动前端服务（后台运行）
print_info "启动前端服务..."
cd frontend
npm run start:dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# 等待前端启动
sleep 5

# 检查前端是否启动成功
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    print_error "前端服务启动失败，请查看 logs/frontend.log"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

print_success "前端服务已启动 (PID: $FRONTEND_PID)"
echo ""

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  🎉 所有服务已启动！${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
print_info "服务地址："
echo -e "  - 后端 API: ${GREEN}http://localhost:5002${NC} (或 http://0.0.0.0:5002)"
echo -e "  - 前端应用: ${GREEN}http://localhost:8000${NC}"
echo ""
print_info "日志文件："
echo -e "  - 后端日志: ${BLUE}logs/backend.log${NC}"
echo -e "  - 前端日志: ${BLUE}logs/frontend.log${NC}"
echo ""
print_info "查看实时日志："
echo -e "  ${BLUE}tail -f logs/backend.log${NC}  # 后端日志"
echo -e "  ${BLUE}tail -f logs/frontend.log${NC}  # 前端日志"
echo ""
print_warning "按 Ctrl+C 停止所有服务"
echo ""

# 等待用户中断
wait

