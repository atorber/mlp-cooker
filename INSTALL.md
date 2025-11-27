# Mac 安装指南

本指南将帮助您在 macOS 系统上快速安装和运行 MLP Cooker 项目。

## 🚀 一键安装（推荐）

我们提供了一个自动化安装脚本，可以帮您完成所有安装步骤：

```bash
# 下载并运行安装脚本
curl -fsSL https://raw.githubusercontent.com/atorber/mlp-cooker/main/install-mac.sh | bash
```

或者，如果您已经克隆了项目：

```bash
# 进入项目目录
cd mlp-cooker

# 运行安装脚本
./install-mac.sh
```

## 📋 安装脚本功能

安装脚本会自动完成以下操作：

1. ✅ **检查系统环境** - 确认是否为 macOS 系统
2. ✅ **安装 Homebrew** - Mac 的包管理器（如果未安装）
3. ✅ **安装 Git** - 版本控制工具（如果未安装）
4. ✅ **安装 Node.js** - JavaScript 运行环境（版本 >= 20.0.0）
5. ✅ **克隆项目代码** - 从 GitHub 获取最新代码
6. ✅ **安装项目依赖** - 自动安装所有必需的 npm 包
7. ✅ **启动后端服务** - 自动启动开发服务器

## 🔧 手动安装（可选）

如果您想手动控制每个步骤，可以按照以下步骤操作：

### 1. 安装 Homebrew

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. 安装 Git

```bash
brew install git
```

### 3. 安装 Node.js

```bash
brew install node
```

验证安装：
```bash
node -v  # 应该显示 v20.x.x 或更高版本
npm -v   # 应该显示 8.x.x 或更高版本
```

### 4. 克隆项目

```bash
git clone https://github.com/atorber/mlp-cooker.git
cd mlp-cooker
```

### 5. 安装依赖

```bash
cd backend
npm install
```

### 6. 创建必要目录

```bash
mkdir -p data/{db,cache,reports,uploads}
mkdir -p logs
```

### 7. 启动服务

```bash
# 构建项目
npm run build

# 启动开发服务器
npm run dev
```

## ⚙️ 配置说明

在启动服务前，您可能需要在项目根目录创建 `config.yaml` 配置文件：

```yaml
ML_PLATFORM_RESOURCE_AK: your_access_key
ML_PLATFORM_RESOURCE_SK: your_secret_key
ML_PLATFORM_RESOURCE_BASE_URL: https://aihc.bj.baidubce.com
ML_PLATFORM_RESOURCE_POOL_ID: your_resource_pool_id
ML_PLATFORM_RESOURCE_QUEUE_ID: your_queue_id
ML_PLATFORM_RESOURCE_PFS_INSTANCE_ID: your_pfs_instance_id
ML_PLATFORM_RESOURCE_BUCKET: your_bucket_name
```

如果不创建配置文件，服务会在默认配置下运行（某些功能可能不可用）。

## 🌐 访问服务

安装完成后，服务将运行在：

- **后端 API**: http://localhost:5002 (或 http://0.0.0.0:5002)
- **前端应用**: http://localhost:8000

## 🚀 启动服务

安装完成后，使用以下方式启动服务：

### 方式一：使用启动脚本（推荐）

```bash
./start.sh
```

这个脚本会同时启动前端和后端服务。

### 方式二：手动启动

**终端 1：启动后端**
```bash
cd backend
npm run dev
```

**终端 2：启动前端**
```bash
cd frontend
npm run start:dev
```

## 🛠️ 常见问题

### Q: 安装脚本提示权限错误？

A: 确保脚本有执行权限：
```bash
chmod +x install-mac.sh
```

### Q: Homebrew 安装失败？

A: 请检查网络连接，或访问 [Homebrew 官网](https://brew.sh) 查看最新安装方法。

### Q: Node.js 版本不满足要求？

A: 脚本会自动升级 Node.js，或手动执行：
```bash
brew upgrade node
```

### Q: npm install 失败？

A: 可能是网络问题，可以尝试：
```bash
npm install --registry=https://registry.npmmirror.com
```

### Q: 如何停止服务？

A: 在运行服务的终端中按 `Ctrl + C`

### Q: 如何重新启动服务？

A: 进入 backend 目录，运行：
```bash
cd backend
npm run dev
```

## 📚 下一步

安装完成后，您可以：

1. 查看 [README.md](./README.md) 了解项目功能
2. 查看 [开发指南](./pages/docs/开发指南.md) 开始二次开发
3. 查看 [API 参考](./pages/docs/API参考/) 了解 API 接口

## 💡 提示

- 首次安装可能需要 10-20 分钟（取决于网络速度）
- 安装过程中可能需要输入管理员密码（用于安装 Homebrew）
- 如果遇到问题，请查看 [故障排除](./pages/docs/故障排除.md)

## 🤝 需要帮助？

如果遇到问题，可以：

1. 查看项目的 [Issues](https://github.com/atorber/mlp-cooker/issues)
2. 提交新的 Issue 描述您的问题
3. 查看项目文档了解更多信息

