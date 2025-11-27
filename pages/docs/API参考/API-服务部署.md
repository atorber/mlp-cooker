---
sidebar_position: 11
---

# 服务部署

所有服务部署接口都需要认证。

## 接口列表

- <code>GET /api/services</code>：查询服务列表
- <code>GET /api/services/:serviceId</code>：查询服务详情
- <code>GET /api/services/:serviceId/status</code>：查询服务状态
- <code>POST /api/services</code>：创建服务
- <code>DELETE /api/services/:serviceId</code>：删除服务

## 接口详情

### GET /api/services

查询服务列表。

**查询参数：**
- `pageNumber`：页码（可选，默认 1）
- `pageSize`：每页数量（可选，默认 10）
- `keyword`：关键字搜索（可选）

**响应示例：**

```json
{
  "success": true,
  "data": {
    "services": [
      {
        "serviceId": "xxx",
        "serviceName": "服务名称",
        "status": "Running",
        "createdAt": "2025-01-15T10:30:00Z"
      }
    ],
    "totalCount": 50
  }
}
```

### GET /api/services/&#58;serviceId

根据服务 ID 查询详情。

**路径参数：**
- `serviceId`：服务 ID

**响应示例：**

```json
{
  "success": true,
  "data": {
    "serviceId": "xxx",
    "serviceName": "服务名称",
    "status": "Running",
    "config": {
      "image": "registry/image:tag",
      "replicas": 3
    },
    "endpoints": [
      {
        "url": "http://service.example.com"
      }
    ],
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

### GET /api/services/&#58;serviceId/status

查询服务的运行状态。

**路径参数：**
- `serviceId`：服务 ID

**响应示例：**

```json
{
  "success": true,
  "data": {
    "serviceId": "xxx",
    "status": "Running",
    "replicas": {
      "desired": 3,
      "available": 3,
      "unavailable": 0
    },
    "conditions": [
      {
        "type": "Ready",
        "status": "True"
      }
    ]
  }
}
```

### POST /api/services

创建新的服务。

**请求示例：**

```json
{
  "serviceName": "服务名称",
  "image": "registry/image:tag",
  "replicas": 3,
  "ports": [
    {
      "port": 8080,
      "targetPort": 8080
    }
  ],
  "resourcePoolId": "xxx",
  "queue": "xxx"
}
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "serviceId": "xxx",
    "serviceName": "服务名称"
  },
  "message": "服务创建成功"
}
```

### DELETE /api/services/&#58;serviceId

删除指定的服务。

**路径参数：**
- `serviceId`：服务 ID

**响应示例：**

```json
{
  "success": true,
  "message": "服务已删除"
}
```

