# AIHC-MENTOR Backend (Node.js + TypeScript)

这是AIHC-MENTOR项目的Node.js + TypeScript重构后端服务，旨在替代原有的Python Flask后端，同时保持100%的前端兼容性。

## 🚀 快速开始

### 环境要求

- Node.js 18+ (LTS)
- npm 8+
- TypeScript 5+

### 安装依赖

```bash
npm install
```

### 环境配置

1. 复制环境变量配置文件：
```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，填入必要的外部服务配置：
```env
# iCafe API配置
ICAFE_USERNAME=your_username
ICAFE_PASSWORD=your_password

# KU (知识库) API配置
KU_AK=your_access_key
KU_SK=your_secret_key
KU_REPO=your_repo_name
```

### 开发模式

```bash
npm run dev
```

服务器将在 `http://localhost:5002` 启动，并支持热重载。

### 生产模式

```bash
# 构建项目
npm run build

# 启动生产服务器
npm start
```

## 📁 项目结构

```
backend-nodejs/
├── src/
│   ├── controllers/           # 控制器层
│   │   └── auth.controller.ts # 认证控制器
│   ├── middleware/            # 中间件
│   │   ├── auth.middleware.ts # 认证中间件
│   │   ├── cors.middleware.ts # CORS中间件
│   │   └── error.middleware.ts # 错误处理中间件
│   ├── routes/               # 路由定义
│   │   └── index.ts          # 主路由
│   ├── utils/                # 工具函数
│   │   ├── logger.ts         # 日志工具
│   │   └── response.utils.ts # 响应工具
│   ├── config/               # 配置管理
│   │   └── environment.ts    # 环境配置
│   ├── types/                # TypeScript类型定义
│   │   └── api.ts           # API相关类型
│   └── app.ts                # Express应用入口
├── data/                     # 数据存储
│   ├── db/                   # 数据库文件
│   ├── cache/                # 缓存文件
│   ├── reports/              # 报告文件
│   └── uploads/              # 上传文件
├── tests/                    # 测试文件
├── logs/                     # 日志文件
├── package.json
├── tsconfig.json
├── .eslintrc.js
├── .prettierrc
└── README.md
```

## 🛠️ 开发命令

```bash
# 开发模式（带热重载）
npm run dev

# 构建项目
npm run build

# 生产模式启动
npm start

# 代码检查
npm run lint

# 自动修复代码格式
npm run lint:fix

# 代码格式化
npm run format

# 运行测试
npm test

# 测试覆盖率
npm run test:coverage

# 清理构建文件
npm run clean
```

## 🔧 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `FLASK_HOST` | 服务器监听地址 | `0.0.0.0` |
| `FLASK_PORT` | 服务器端口 | `5002` |
| `FLASK_DEBUG` | 调试模式 | `false` |
| `NODE_ENV` | 运行环境 | `development` |
| `LOG_LEVEL` | 日志级别 | `info` |

### 外部服务配置

项目需要配置以下外部服务：

1. **iCafe API**: 内部问题跟踪系统
2. **KU API**: 知识管理系统
3. **AIHC 数据集服务**: 公共数据集管理
4. **IM API**: 即时消息服务
5. **FastApp API**: 快速应用管理

详细配置请参考 `.env.example` 文件。

## 🧪 API测试

项目提供了简单的API测试脚本：

```bash
# 确保服务器正在运行
npm run dev

# 在另一个终端运行测试
node test-server.js
```

## 🔐 认证系统

当前认证系统与Python版本保持完全一致：

- **Token认证**: 使用token `123` 获得管理员权限
- **用户名密码认证**:
  - 管理员: `admin` / `ant.design`
  - 普通用户: `user` / `ant.design`

## 📊 日志系统

- **开发环境**: 控制台输出彩色日志
- **生产环境**: 文件日志存储在 `logs/` 目录
- **日志级别**: `error`, `warn`, `info`, `debug`

## 🚨 错误处理

- 统一错误响应格式
- 全局错误捕获和处理
- 开发环境详细错误堆栈
- 生产环境安全错误信息

## 🔄 兼容性保证

- ✅ 所有API路由与Python版本完全一致
- ✅ 响应格式与Python版本完全一致
- ✅ 认证逻辑与Python版本完全一致
- ✅ 数据存储格式与Python版本兼容
- ✅ 前端代码无需任何修改

## 🎯 下一步计划

1. **完善业务模块**
   - [ ] iCafe集成模块
   - [ ] 数据集管理模块
   - [ ] 快速应用管理模块
   - [ ] 合规管理模块

2. **增强功能**
   - [ ] JWT认证替代简单token
   - [ ] 数据库迁移（JSON → MongoDB）
   - [ ] API文档自动生成
   - [ ] 单元测试覆盖

3. **部署优化**
   - [ ] Docker容器化
   - [ ] PM2进程管理
   - [ ] 监控和告警
   - [ ] 性能优化

## 📝 开发规范

- 使用TypeScript进行类型安全开发
- 遵循ESLint和Prettier代码规范
- 采用分层架构（Controller → Service → SDK）
- 统一错误处理和响应格式
- 完整的日志记录

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 ISC 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 联系方式

如有问题或建议，请联系 AIHC-MENTOR 开发团队。