#!/bin/bash

# MLP Cooker Mac 安装脚本
# 适用于小白用户，自动安装所有必要的工具和依赖

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
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

print_step() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# 检查是否为Mac系统
check_mac() {
    if [[ "$(uname)" != "Darwin" ]]; then
        print_error "此脚本仅支持 macOS 系统"
        exit 1
    fi
    print_success "检测到 macOS 系统"
}

# 检查并安装 Homebrew
install_homebrew() {
    print_step "步骤 1/6: 检查 Homebrew"
    
    if command -v brew &> /dev/null; then
        print_success "Homebrew 已安装: $(brew --version | head -n1)"
    else
        print_info "正在安装 Homebrew（可能需要几分钟）..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        
        # 添加 Homebrew 到 PATH（针对 Apple Silicon Mac）
        if [[ -f "/opt/homebrew/bin/brew" ]]; then
            echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
            eval "$(/opt/homebrew/bin/brew shellenv)"
        fi
        
        print_success "Homebrew 安装完成"
    fi
}

# 检查并安装 Git
install_git() {
    print_step "步骤 2/6: 检查 Git"
    
    if command -v git &> /dev/null; then
        print_success "Git 已安装: $(git --version)"
    else
        print_info "正在安装 Git..."
        brew install git
        print_success "Git 安装完成"
    fi
}

# 检查并安装 Node.js
install_nodejs() {
    print_step "步骤 3/6: 检查 Node.js"
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v | cut -c2-)
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)
        
        if [ "$NODE_MAJOR" -ge 20 ]; then
            print_success "Node.js 已安装: v$NODE_VERSION"
        else
            print_warning "Node.js 版本过低 (v$NODE_VERSION)，需要 >= 20.0.0"
            print_info "正在升级 Node.js..."
            brew upgrade node
            print_success "Node.js 升级完成: $(node -v)"
        fi
    else
        print_info "正在安装 Node.js..."
        brew install node
        print_success "Node.js 安装完成: $(node -v)"
    fi
    
    # 检查 npm
    if command -v npm &> /dev/null; then
        print_success "npm 已安装: v$(npm -v)"
    else
        print_error "npm 未找到，请检查 Node.js 安装"
        exit 1
    fi
}

# 克隆或更新项目代码
clone_project() {
    print_step "步骤 4/6: 获取项目代码"
    
    REPO_URL="https://github.com/atorber/mlp-cooker.git"
    PROJECT_DIR="mlp-cooker"
    
    if [ -d "$PROJECT_DIR" ]; then
        print_warning "项目目录已存在: $PROJECT_DIR"
        read -p "是否更新代码？(y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_info "正在更新代码..."
            cd "$PROJECT_DIR"
            if git rev-parse --git-dir > /dev/null 2>&1; then
                git pull
                print_success "代码更新完成"
            else
                print_warning "目录存在但不是 git 仓库，跳过更新"
            fi
            cd ..
        else
            print_info "跳过代码更新，使用现有代码"
        fi
    else
        print_info "正在从 GitHub 克隆项目..."
        git clone "$REPO_URL" "$PROJECT_DIR"
        if [ $? -eq 0 ]; then
            print_success "项目克隆完成"
        else
            print_error "项目克隆失败，请检查网络连接"
            exit 1
        fi
    fi
    
    # 进入项目目录
    if [ ! -d "$PROJECT_DIR" ]; then
        print_error "项目目录不存在"
        exit 1
    fi
    cd "$PROJECT_DIR"
}

# 安装项目依赖
install_dependencies() {
    print_step "步骤 5/6: 安装项目依赖"
    
    # 安装后端依赖
    if [ -d "backend" ]; then
        print_info "正在安装后端依赖（这可能需要几分钟）..."
        cd backend
        
        if [ ! -d "node_modules" ]; then
            npm install
            if [ $? -eq 0 ]; then
                print_success "后端依赖安装完成"
            else
                print_error "依赖安装失败，请检查网络连接或 npm 配置"
                exit 1
            fi
        else
            print_info "后端依赖已存在，跳过安装"
        fi
        
        # 创建必要的目录
        print_info "创建必要的目录..."
        mkdir -p data/{db,cache,reports,uploads}
        mkdir -p logs
        print_success "目录创建完成"
        
        cd ..
    else
        print_error "未找到 backend 目录"
        exit 1
    fi
}

# 启动后端服务
start_backend() {
    print_step "步骤 6/6: 启动后端服务"
    
    cd backend
    
    # 检查配置文件
    if [ ! -f "../config.yaml" ]; then
        print_warning "未找到 config.yaml 配置文件"
        print_info "请参考 README.md 创建配置文件"
        print_info "服务将在默认配置下启动"
    fi
    
    # 构建项目
    print_info "正在构建项目..."
    npm run build
    
    if [ $? -eq 0 ]; then
        print_success "项目构建成功"
    else
        print_error "项目构建失败"
        exit 1
    fi
    
    print_success "所有准备工作完成！"
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  🎉 安装完成！${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    print_info "后端服务将启动在: http://localhost:8001"
    print_info "按 Ctrl+C 可以停止服务"
    echo ""
    
    # 启动服务
    print_info "正在启动后端服务..."
    npm run dev
}

# 主函数
main() {
    clear
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════╗"
    echo "║                                                ║"
    echo "║        MLP Cooker Mac 安装脚本                ║"
    echo "║        适用于小白用户的自动化安装工具         ║"
    echo "║                                                ║"
    echo "╚════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # 检查系统
    check_mac
    
    # 执行安装步骤
    install_homebrew
    install_git
    install_nodejs
    clone_project
    install_dependencies
    start_backend
}

# 运行主函数
main

