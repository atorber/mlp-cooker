# 机器学习平台管理系统 (MLP Cooker)

基于 Node.js + TypeScript + React 的现代化机器学习平台管理系统，提供完整的 AIHC 平台资源管理功能，支持部署、训练、任务、数据集、模型等全生命周期管理。

## 功能特性

### 核心功能模块

- 🚀 **部署管理**：服务部署和管理，支持在线服务的创建、查询、删除和状态监控
- ⚡ **训练管理**：训练任务的创建、查询、停止和管理，支持分布式训练
- 📋 **任务管理**：批量任务管理，自动筛选和管理以 "task-" 开头的任务
- 💾 **数据集管理**：数据集的上传、查询、版本管理，支持 BOS 和 PFS 存储
- 🤖 **模型管理**：模型的创建、查询、版本管理
- 🐳 **镜像管理**：预置镜像的查询和管理
- 📦 **应用模板**：丰富的应用模板库，支持一键部署、训练和任务创建
- 🖥️ **计算资源**：队列和资源池管理，实时查看资源使用情况
- ⚙️ **系统设置**：统一的配置管理，支持 YAML 配置文件

### 技术特性

#### 前端特性
- ✅ **Ant Design Pro**：企业级中后台前端解决方案
- ✅ **React 19 + TypeScript**：类型安全的现代 React 开发
- ✅ **Umi 4**：企业级 React 应用框架
- ✅ **ProComponents**：重度封装的业务组件
- ✅ **响应式设计**：支持移动端和桌面端
- ✅ **热重载**：开发时自动刷新
- ✅ **国际化支持**：中英文切换

#### 后端特性
- ✅ **Node.js + Express**：高性能后端服务
- ✅ **TypeScript**：类型安全的开发体验
- ✅ **RESTful API**：标准化的 API 接口
- ✅ **YAML 配置管理**：统一的配置文件管理
- ✅ **百度云 SDK 集成**：基于 `@atorber/baiducloud-sdk` 的 AIHC 平台集成
- ✅ **认证中间件**：基于 AK/SK 的认证机制
- ✅ **CORS 支持**：跨域请求支持
- ✅ **错误处理**：统一的错误处理机制
- ✅ **日志记录**：完整的日志记录系统

## 架构说明

本项目采用现代化的前后端分离架构：

### 后端架构
- **框架**: Node.js + Express + TypeScript
- **配置**: YAML 配置文件（`config.yaml`）
- **SDK**: 百度云 SDK（`@atorber/baiducloud-sdk`）
- **API**: RESTful API 接口
- **端口**: 默认 8001（可在配置中修改）

### 前端架构
- **框架**: React 19 + TypeScript
- **UI库**: Ant Design 5 + ProComponents
- **构建工具**: Umi 4 (Max)
- **HTTP客户端**: 内置请求库
- **端口**: 默认 8000（开发环境）

## 环境要求

### 后端环境
- Node.js >= 20.0.0
- npm >= 8.0.0
- TypeScript >= 5.0.0

### 前端环境
- Node.js >= 20.0.0
- npm >= 8.0.0

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd mlp-cooker
```

### 2. 安装依赖

#### 安装后端依赖

```bash
cd backend
npm install
```

#### 安装前端依赖

```bash
cd frontend
npm install
```

### 3. 配置系统

在项目根目录创建 `config.yaml` 文件，配置机器学习平台资源信息：

```yaml
ML_PLATFORM_RESOURCE_AK: your_access_key
ML_PLATFORM_RESOURCE_SK: your_secret_key
ML_PLATFORM_RESOURCE_BASE_URL: https://aihc.bj.baidubce.com
ML_PLATFORM_RESOURCE_POOL_ID: your_resource_pool_id
ML_PLATFORM_RESOURCE_QUEUE_ID: your_queue_id
ML_PLATFORM_RESOURCE_PFS_INSTANCE_ID: your_pfs_instance_id
ML_PLATFORM_RESOURCE_BUCKET: your_bucket_name
```

### 4. 启动应用

#### 方式一：分别启动前后端（推荐开发环境）

**终端 1：启动后端服务**

```bash
cd backend
npm run dev
```

后端服务将在 `http://localhost:8001` 启动。

**终端 2：启动前端服务**

```bash
cd frontend
npm run start:dev
```

前端应用将在 `http://localhost:8000` 启动。

#### 方式二：生产环境构建

**构建前端**

```bash
cd frontend
npm run build
```

**启动后端（生产模式）**

```bash
cd backend
npm run build
npm run start:prod
```

## 访问应用

### 开发环境
- **前端应用**: http://localhost:8000
- **后端API**: http://localhost:8001

### 登录方式
系统使用 Access Key (AK) 和 Secret Key (SK) 进行登录认证。首次登录后，AK/SK 会自动保存到配置文件中。

## 功能模块说明

### 1. 概览 (Welcome)
平台统计概览，包括：
- 部署服务数量
- 训练任务数量
- 任务数量
- 数据集数量
- 模型数量
- 计算资源使用情况

### 2. 应用 (Application)
应用模板库，提供预定义的应用模板：
- **部署模板**：一键部署推理服务
- **训练模板**：快速创建训练任务
- **任务模板**：批量任务模板
- **工具模板**：工具部署模板

应用模板采用目录结构组织，每个应用包含：
- `app.json`：应用元数据
- `deploy.json`、`train.json`、`create-job.json`、`deploy-tool.json`：操作模板
- `{action-type}.command.sh`：命令脚本

详细文档请参考：[`backend/data/app/README.md`](backend/data/app/README.md)

### 3. 部署 (Deployment)
服务部署管理：
- 查询服务列表（支持按队列过滤、模糊搜索）
- 查看服务详情和状态
- 创建新服务（支持模板化配置）
- 删除服务

### 4. 训练 (Training)
训练任务管理：
- 查询训练任务列表
- 查看训练任务详情
- 创建训练任务
- 停止训练任务
- 删除训练任务

### 5. 任务 (Task)
批量任务管理：
- 查询任务列表（自动过滤包含 "task-" 关键字的任务）
- 查看任务详情

### 6. 数据集 (Dataset)
数据集管理：
- 查询数据集列表（支持 BOS 和 PFS 存储类型筛选）
- 查看数据集详情
- 创建数据集和版本
- 删除数据集和版本

### 7. 模型 (Model)
模型管理：
- 查询模型列表
- 查看模型详情
- 创建模型和版本
- 删除模型和版本

### 8. 镜像 (Preset Image)
预置镜像管理：
- 查询镜像列表
- 查看镜像详情

### 9. 计算资源 (Resource)
计算资源监控：
- 队列信息查询（显示配置的队列）
- 资源池信息查询
- 加速卡使用情况
- CPU 和内存使用情况

### 10. 系统设置 (Settings)
系统配置管理：
- 查看和编辑机器学习平台资源配置
- AK/SK 配置（支持显示/隐藏）
- 资源池、队列等资源配置

## API 接口说明

所有 API 接口都以 `/api/` 开头，大部分接口需要认证（通过 `authMiddleware`）。

### 认证相关
- `POST /api/login/account`：用户登录（AK/SK）
- `POST /api/login/outLogin`：用户登出
- `GET /api/login/captcha`：获取验证码
- `GET /api/currentUser`：获取当前用户信息

### 配置管理
- `GET /api/config`：获取配置
- `PUT /api/config`：更新配置
- `POST /api/config/batch`：批量获取配置
- `GET /api/config/:key`：获取指定配置项

### 部署服务
- `GET /api/services`：查询服务列表
- `GET /api/services/:serviceId`：查询服务详情
- `GET /api/services/:serviceId/status`：查询服务状态
- `POST /api/services`：创建服务
- `DELETE /api/services/:serviceId`：删除服务

### 训练任务
- `POST /api/jobs`：查询训练任务列表
- `GET /api/jobs/:jobId`：查询训练任务详情
- `POST /api/jobs/create`：创建训练任务
- `POST /api/jobs/:jobId/stop`：停止训练任务
- `DELETE /api/jobs/:jobId`：删除训练任务

### 任务
- `POST /api/tasks`：查询任务列表

### 数据集
- `GET /api/datasets`：查询数据集列表
- `GET /api/datasets/:datasetId`：查询数据集详情
- `POST /api/datasets`：创建数据集
- `DELETE /api/datasets/:datasetId`：删除数据集

### 模型
- `GET /api/models`：查询模型列表
- `GET /api/models/:modelId`：查询模型详情
- `POST /api/models`：创建模型
- `DELETE /api/models/:modelId`：删除模型

### 应用模板
- `GET /api/apps`：查询应用模板列表
- `GET /api/apps/:appId`：查询应用模板详情

### 计算资源
- `GET /api/resources/queues`：查询队列列表
- `GET /api/resources/queues/:queueId`：查询队列详情
- `GET /api/resources/pools`：查询资源池列表
- `GET /api/resources/pools/:resourcePoolId`：查询资源池详情

### 健康检查
- `GET /api/health`：健康检查

## 目录结构

```
.
├── backend/                  # 后端应用
│   ├── src/                  # TypeScript 源代码
│   │   ├── app.ts           # Express 应用入口
│   │   ├── index.ts         # 服务器启动文件
│   │   ├── config/          # 配置管理
│   │   │   ├── environment.ts
│   │   │   └── yaml-config.ts
│   │   ├── controllers/     # 控制器
│   │   │   ├── app.controller.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── config.controller.ts
│   │   │   ├── dataset.controller.ts
│   │   │   ├── job.controller.ts
│   │   │   ├── model.controller.ts
│   │   │   ├── resource.controller.ts
│   │   │   ├── service.controller.ts
│   │   │   └── task.controller.ts
│   │   ├── middleware/      # 中间件
│   │   │   ├── auth.middleware.ts
│   │   │   ├── cors.middleware.ts
│   │   │   └── error.middleware.ts
│   │   ├── routes/          # 路由定义
│   │   │   └── index.ts
│   │   ├── types/           # TypeScript 类型定义
│   │   │   └── api.ts
│   │   └── utils/           # 工具函数
│   │       ├── logger.ts
│   │       ├── response.utils.ts
│   │       └── sdk/         # SDK 封装
│   │           ├── aihc.sdk.ts
│   │           └── base.service.ts
│   ├── data/                # 数据文件
│   │   └── app/             # 应用模板
│   │       ├── README.md    # 应用模板开发文档
│   │       └── */           # 各个应用模板目录
│   ├── dist/                # TypeScript 编译输出
│   ├── logs/                # 日志文件
│   ├── package.json         # 后端依赖配置
│   └── tsconfig.json        # TypeScript 配置
├── frontend/                # 前端应用
│   ├── src/                 # React 源代码
│   │   ├── pages/           # 页面组件
│   │   │   ├── Welcome.tsx
│   │   │   ├── Application.tsx
│   │   │   ├── Deployment.tsx
│   │   │   ├── Training.tsx
│   │   │   ├── Task.tsx
│   │   │   ├── Dataset.tsx
│   │   │   ├── Model.tsx
│   │   │   ├── PresetImage.tsx
│   │   │   ├── Resource.tsx
│   │   │   └── Settings.tsx
│   │   ├── components/      # React 组件
│   │   ├── services/        # API 服务
│   │   │   └── aihc-mentor/
│   │   │       └── api.ts
│   │   ├── locales/         # 国际化文件
│   │   │   ├── zh-CN/
│   │   │   └── en-US/
│   │   └── app.tsx          # 主应用组件
│   ├── config/              # 前端配置
│   │   ├── config.ts
│   │   ├── routes.ts        # 路由配置
│   │   └── proxy.ts         # 代理配置
│   ├── dist/                # 前端构建输出
│   ├── package.json         # 前端依赖配置
│   └── tsconfig.json        # TypeScript 配置
├── config.yaml              # 系统配置文件
└── README.md                # 项目说明文档
```

## 开发指南

### 添加新页面

1. 在 `frontend/src/pages/` 中创建新的 React 组件
2. 在 `frontend/config/routes.ts` 中添加路由配置
3. 在 `frontend/src/locales/zh-CN/menu.ts` 和 `frontend/src/locales/en-US/menu.ts` 中添加菜单项

### 添加新 API

1. 在 `backend/src/controllers/` 中创建新的控制器
2. 在 `backend/src/routes/index.ts` 中添加路由
3. 在 `frontend/src/services/aihc-mentor/api.ts` 中添加 API 调用函数
4. 在相应的 React 组件中调用 API

### 添加应用模板

1. 在 `backend/data/app/` 目录下创建应用目录
2. 创建 `app.json` 定义应用元数据
3. 创建操作模板文件（`deploy.json`、`train.json` 等）
4. 创建命令脚本文件（`{action-type}.command.sh`）

详细步骤请参考：[`backend/data/app/README.md`](backend/data/app/README.md)

### 样式开发

- 全局样式: `frontend/src/global.less`
- 组件样式: 每个组件对应的 `.less` 文件
- UI框架: Ant Design + ProComponents

## 配置说明

### 系统配置

系统配置文件位于项目根目录的 `config.yaml`，包含以下配置项：

- `ML_PLATFORM_RESOURCE_AK`：Access Key
- `ML_PLATFORM_RESOURCE_SK`：Secret Key
- `ML_PLATFORM_RESOURCE_BASE_URL`：AIHC 平台基础 URL（支持 `https://` 前缀）
- `ML_PLATFORM_RESOURCE_POOL_ID`：资源池 ID
- `ML_PLATFORM_RESOURCE_QUEUE_ID`：队列 ID
- `ML_PLATFORM_RESOURCE_PFS_INSTANCE_ID`：PFS 实例 ID
- `ML_PLATFORM_RESOURCE_BUCKET`：对象存储桶名称

配置可以通过前端系统设置页面进行修改，修改后会自动保存到 `config.yaml` 文件。

## 注意事项

1. **首次使用**：首次登录需要使用有效的 AK/SK，登录成功后会自动保存到配置文件
2. **配置文件**：确保 `config.yaml` 文件存在且配置正确
3. **网络连接**：确保网络连接正常，能够访问 AIHC 平台 API
4. **Node.js 版本**：确保 Node.js 版本 >= 20.0.0
5. **端口占用**：确保后端端口（8001）和前端端口（8000）未被占用

## 故障排除

### 前端问题

- **检查 Node.js 版本**：确保 Node.js >= 20.0.0
- **检查依赖安装**：运行 `npm install` 确保所有依赖已正确安装
- **检查端口占用**：确保端口 8000 未被占用
- **清除缓存**：删除 `node_modules` 和 `package-lock.json`，重新安装依赖

### 后端问题

- **检查 Node.js 版本**：确保 Node.js >= 20.0.0
- **检查配置文件**：确保 `config.yaml` 存在且配置正确
- **检查端口占用**：确保端口 8001 未被占用
- **检查编译**：运行 `npm run build` 确保 TypeScript 编译成功

### API 调用问题

- **检查 CORS 配置**：确保后端 CORS 配置正确
- **检查认证**：确保已正确登录，AK/SK 有效
- **检查网络连接**：确保能够访问 AIHC 平台 API
- **查看日志**：检查后端日志文件 `backend/logs/access.log`

### 登录问题

- **检查 AK/SK**：确保输入的 AK/SK 正确
- **检查配置保存**：登录成功后检查 `config.yaml` 是否已更新
- **检查 API 连接**：确保能够访问 AIHC 平台数据集接口（用于验证 AK/SK）

## 技术栈

### 后端
- Node.js 20+
- Express 5
- TypeScript 5
- js-yaml (YAML 配置管理)
- @atorber/baiducloud-sdk (百度云 SDK)

### 前端
- React 19
- TypeScript 5
- Ant Design 5
- ProComponents
- Umi 4 (Max)
- @biomejs/biome (代码格式化)

## 许可证

ISC

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 更新日志

### v1.0.0
- 初始版本发布
- 支持部署、训练、任务、数据集、模型管理
- 支持应用模板系统
- 支持计算资源监控
- 基于 AK/SK 的认证机制
