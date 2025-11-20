# AIHC-MENTOR Web 应用

基于 Flask + React 的现代化 Web 应用，提供RESTful API接口和React前端，实现完全的前后端分离架构。

## 功能特性

- 📊 上周问题统计：统计上周iCafe空间问题卡片，按卡片状态进行分类，生成Markdown格式的报告
- 📚 KU文档创建：将本地 Markdown 文件上传到百度 KU 知识库，创建新的文档
- 📑 KU文档创建器：通过文件上传的方式创建KU知识库文档，具有完整的步骤引导
- 🔍 iCafe调试：用于快速测试和调试 iCafe API 调用，支持多种查询模式和详细输出
- 🔑 AKSK验证：验证百度KU Open API的AppKey和SecretKey配置是否正确
- 📈 2025H2需求统计：统计2025年下半年客户需求卡片，按状态分类并生成报告
- 📋 每日报告：查询当日新增的卡片数量并统计，支持保存为Markdown格式报告文件
- 🔍 主查询：查询icafe卡片，快速检索和筛选所需信息

## 架构说明

本项目采用现代化的前后端分离架构：

### 后端架构
- **框架**: Flask + Python 3.7+
- **API**: RESTful API接口
- **功能**: 提供数据服务和业务逻辑处理
- **端口**: 5002

### 前端架构
- **框架**: React 18 + React Router 6
- **UI库**: Bootstrap 5 + React Bootstrap
- **HTTP客户端**: Axios
- **特性**: 组件化开发、状态管理、热重载
- **端口**: 3000 (开发环境)

## 环境要求

### 后端环境
- Python 3.7+
- Flask
- 其他依赖项在 `requirements.txt` 中列出

### 前端环境
- Node.js 16+
- npm 8+
- React 18

## 安装和启动

### 1. 安装后端依赖

```bash
pip install -r requirements.txt
```

### 2. 安装前端依赖

```bash
cd frontend
npm install
```

### 3. 环境变量配置

在运行应用之前，请确保设置了以下环境变量：

```bash
# iCafe API 配置
export ICAFE_USERNAME=your_username
export ICAFE_PASSWORD=your_password

# KU Open API 配置
export KU_AK=your_app_key
export KU_SK=your_secret_key
```

### 4. 启动应用

#### 方式一：分别启动前后端（推荐开发环境）

**启动后端服务**
```bash
# 仅启动后端API服务
python3 scripts/start_backend.py
```

**启动前端服务**
```bash
# 启动React开发服务器
cd frontend
npm start
```

#### 方式二：一体化启动（推荐开发环境）

**开发环境**
```bash
# 同时启动后端 + 前端开发服务器
python3 scripts/start_react_app.py
```

**生产环境**
```bash
# 构建前端
cd frontend
npm run build

# 启动后端 (自动服务前端静态文件)
python3 scripts/start_backend.py
```

## 访问应用

### 开发环境访问方式

#### 方式一：分别启动前后端
- **前端**: http://localhost:3000 (React开发服务器)
- **后端API**: http://localhost:5002 (Flask API服务)

#### 方式二：一体化启动
- **前端**: http://localhost:3000 (React开发服务器)
- **后端API**: http://localhost:5002 (Flask API服务)

### 生产环境
- **应用**: http://localhost:5002 (Flask服务器，服务静态文件)

## API接口说明

所有API接口都以 `/api/` 开头，支持跨域调用：

### 1. 上周问题统计
- 接口：`GET /api/icafe-lastweek`
- 功能：统计上周iCafe空间问题卡片并生成报告

### 2. KU文档创建
- 接口：`POST /api/ku-create-doc`
- 参数：`mdContent`(Markdown内容)、`repositoryId`(知识库ID)、`creator`(创建者)、`title`(标题)
- 功能：创建KU知识库文档

### 3. iCafe调试
- 接口：`POST /api/icafe-debug`
- 参数：`iql`(查询条件)
- 功能：调试iCafe API调用

### 4. AKSK验证
- 接口：`POST /api/validate-aksk`
- 功能：验证KU Open API的AppKey和SecretKey配置

### 5. 2025H2需求统计
- 接口：`POST /api/icafe-2025h2`
- 功能：统计2025年下半年客户需求卡片

### 6. 每日报告
- 接口：`POST /api/daily-report`
- 参数：`saveToFile`(是否保存为文件)
- 功能：生成每日卡片统计报告

### 7. 主查询
- 接口：`POST /api/main-query`
- 功能：查询icafe卡片

## 目录结构

```
.
├── app/                    # 后端主应用目录
│   ├── api/               # API接口
│   │   └── v1/            # API v1版本
│   │       ├── routes/    # 路由处理
│   │       └── schemas/   # 数据模型
│   ├── core/              # 核心配置
│   ├── models/            # 数据模型
│   ├── schemas/           # 数据验证模型
│   ├── services/          # 业务逻辑
│   ├── utils/             # 工具函数
│   └── web/               # Web应用
│       └── web_app.py     # Web应用主文件
├── frontend-antd/        # 前端应用目录（Ant Design Pro）
│       ├── public/        # 静态资源
│       ├── src/           # React + TypeScript 源代码
│       │   ├── components/    # React 组件
│       │   ├── pages/         # 页面组件
│       │   ├── services/      # API 服务
│       │   └── app.tsx        # 主应用组件
│       ├── config/        # 前端配置
│       └── package.json   # 前端依赖配置
├── scripts/               # 独立脚本
│   ├── icafe_lastweek.py   # 上周问题统计脚本
│   ├── ku_create_doc_from_md.py  # KU文档创建脚本
│   ├── icafe_debug.py      # iCafe调试脚本
│   ├── validate_aksk.py    # AKSK验证脚本
│   ├── icafe_2025h2.py     # 2025H2需求统计脚本
│   ├── daily_report.py     # 每日报告脚本
│   ├── main.py             # 主查询脚本
│   ├── start_react_app.py  # React应用启动器
│   ├── usage_example.md    # 使用示例文档
│   └── examples/           # 示例脚本
├── docs/                  # 文档
├── config/                # 配置文件
├── data/                  # 数据文件
├── requirements.txt       # 后端依赖
└── setup.py              # 项目安装配置
```

## 技术特性

### 前端特性
- ✅ **Ant Design Pro**: 企业级中后台前端解决方案
- ✅ **React 18 + TypeScript**: 类型安全的现代React开发
- ✅ **Umi**: 企业级React应用框架
- ✅ **ProComponents**: 重度封装的业务组件
- ✅ **响应式设计**: 支持移动端和桌面端
- ✅ **热重载**: 开发时自动刷新
- ✅ **现代工具链**: Umi + npm

### 后端特性
- ✅ **Flask**: 轻量级Python Web框架
- ✅ **RESTful API**: 标准化的API接口
- ✅ **CORS支持**: 跨域请求支持
- ✅ **统一配置**: 环境变量配置管理
- ✅ **错误处理**: 统一的错误处理机制
- ✅ **日志记录**: 完整的日志记录系统

## 开发指南

### 开发环境设置

#### 推荐开发方式：分别启动前后端
```bash
# 终端1: 启动后端API服务
python3 scripts/start_backend.py

# 终端2: 启动前端开发服务器
cd frontend-antd
npm start
```

**优势**:
- 前端热重载，代码修改后自动刷新
- 后端API独立运行，便于调试
- 前后端分离，开发效率更高

#### 一体化开发方式
```bash
# 同时启动后端 + 前端开发服务器
python3 scripts/start_antd_app.py
```

**优势**:
- 单命令启动，操作简单
- 自动管理前后端进程
- 适合快速测试和演示
- 按Ctrl+C可同时停止所有服务

### 添加新页面
1. 在 `frontend-antd/src/pages/` 中创建新的React组件
2. 在 `frontend-antd/config/routes.ts` 中添加路由配置
3. 在 `frontend-antd/src/locales/zh-CN/menu.ts` 中添加菜单项

### 添加新API
1. 在 `app/api/v1/routes/` 中创建新的API路由
2. 在 `frontend-antd/src/services/` 中添加API调用函数
3. 在相应的React组件中调用API

### 样式开发
- 全局样式: `frontend-antd/src/global.less`
- 组件样式: 每个组件对应的 `.less` 文件
- UI框架: Ant Design + ProComponents

## 注意事项

1. 确保所有环境变量已正确配置
2. 确保网络连接正常，能够访问iCafe和KU API
3. 开发环境需要同时运行前端和后端服务
4. 生产环境前端构建后由后端服务静态文件
5. 确保Node.js和Python版本符合要求

## 故障排除

### 前端问题
- 检查Node.js版本是否 >= 16
- 检查npm依赖是否正确安装
- 检查React开发服务器是否正常启动

### 后端问题
- 检查Python版本是否 >= 3.7
- 检查环境变量是否正确设置
- 检查Flask服务器是否正常启动

### API调用问题
- 检查CORS配置是否正确
- 检查API接口路径是否正确
- 检查网络连接是否正常