---
sidebar_position: 4
---

# API 接口

MLP Cooker 提供完整的 RESTful API 接口,所有接口都以 `/api/` 开头。

## 认证

大部分 API 需要通过认证才能访问。认证方式：

1. 通过登录接口获取 token
2. 在后续请求的 Header 中携带认证信息

## 统一响应格式

所有 API 响应都遵循统一的格式：

### 成功响应

```json
{
  "success": true,
  "data": {...},
  "message": "操作成功"
}
```

### 错误响应

```json
{
  "success": false,
  "message": "错误信息",
  "error": {
    "error": "详细错误"
  }
}
```

## API 分类

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

### 其他接口
- 数据集管理
- 模型管理
- 应用模板
- 计算资源
- 健康检查

详细的 API 文档请参考各子章节。
