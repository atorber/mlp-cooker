---
sidebar_position: 9
---

# 训练任务 API

所有训练任务接口都需要认证。

## 接口列表

- `POST /api/jobs`：查询训练任务列表
- `GET /api/jobs/:jobId`：查询训练任务详情
- `POST /api/jobs/create`：创建训练任务
- `POST /api/jobs/:jobId/stop`：停止训练任务
- `DELETE /api/jobs/:jobId`：删除训练任务
- `GET /api/jobs/:jobId/events`：查询训练任务事件
- `GET /api/jobs/:jobId/pods/:podName/logs`：查询训练任务日志
- `GET /api/jobs/:jobId/pods/:podName/webterminal`：获取训练任务 Web Terminal 地址

## 接口详情

### POST /api/jobs

查询训练任务列表。使用 POST 方法，支持复杂查询条件。

**请求体示例：**

```json
{
  "keyword": "任务关键字",
  "status": "Running",
  "pageNumber": 1,
  "pageSize": 10
}
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "jobId": "xxx",
        "jobName": "训练任务名称",
        "status": "Running",
        "createdAt": "2025-01-15T10:30:00Z"
      }
    ],
    "totalCount": 100
  }
}
```

### GET /api/jobs/:jobId

根据任务 ID 查询详情。

**路径参数：**
- `jobId`：任务 ID

**响应示例：**

```json
{
  "success": true,
  "data": {
    "jobId": "xxx",
    "jobName": "训练任务名称",
    "status": "Running",
    "config": {...},
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

### POST /api/jobs/create

创建新的训练任务。

**请求示例：**

```json
{
  "jobName": "训练任务名称",
  "image": "registry/image:tag",
  "command": ["python", "train.py"],
  "resourcePoolId": "xxx",
  "queue": "xxx"
}
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "jobId": "xxx",
    "jobName": "训练任务名称"
  },
  "message": "训练任务创建成功"
}
```

### POST /api/jobs/:jobId/stop

停止正在运行的训练任务。

**路径参数：**
- `jobId`：任务 ID

**响应示例：**

```json
{
  "success": true,
  "message": "任务已停止"
}
```

### DELETE /api/jobs/:jobId

删除指定的训练任务。

**路径参数：**
- `jobId`：任务 ID

**响应示例：**

```json
{
  "success": true,
  "message": "任务已删除"
}
```

### GET /api/jobs/:jobId/events

查询训练任务的事件日志。

**路径参数：**
- `jobId`：任务 ID

**响应示例：**

```json
{
  "success": true,
  "data": {
    "events": [
      {
        "type": "Normal",
        "reason": "Started",
        "message": "Container started",
        "timestamp": "2025-01-15T10:30:00Z"
      }
    ]
  }
}
```

### GET /api/jobs/:jobId/pods/:podName/logs

查询指定 Pod 的日志。

**路径参数：**
- `jobId`：任务 ID
- `podName`：Pod 名称

**查询参数：**
- `tailLines`：返回最后 N 行日志（可选）
- `follow`：是否实时跟踪（可选）

**响应示例：**

```json
{
  "success": true,
  "data": {
    "logs": "日志内容..."
  }
}
```

### GET /api/jobs/:jobId/pods/:podName/webterminal

获取训练任务的 Web Terminal 访问地址。

**路径参数：**
- `jobId`：任务 ID
- `podName`：Pod 名称

**响应示例：**

```json
{
  "success": true,
  "data": {
    "webTerminalUrl": "ws://localhost:8080/webterminal/xxx"
  }
}
```

