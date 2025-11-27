---
sidebar_position: 4
---

# 健康检查 API

## 接口列表

- `GET /api/health`：健康检查（不需要认证）

## 接口详情

### GET /api/health

健康检查接口，用于检查服务是否正常运行。不需要认证。

**响应示例：**

```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "version": "1.0.0"
}
```

**响应字段说明：**

- `success`：请求是否成功
- `message`：状态消息
- `timestamp`：服务器当前时间戳
- `version`：服务版本号

