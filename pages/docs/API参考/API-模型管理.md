---
sidebar_position: 8
---

# 模型管理

所有模型管理接口都需要认证。

## 接口列表

- <code>GET /api/models</code>：查询模型列表
- <code>GET /api/models/:modelId</code>：查询模型详情
- <code>GET /api/models/:modelId/versions</code>：查询模型版本列表
- <code>POST /api/models</code>：创建模型
- <code>DELETE /api/models/:modelId</code>：删除模型
- <code>POST /api/models/:modelId/versions</code>：创建模型版本
- <code>DELETE /api/models/:modelId/versions/:versionId</code>：删除模型版本

## 接口详情

### GET /api/models

查询模型列表。

**查询参数：**
- `pageNumber`：页码，默认 1
- `pageSize`：每页数量，默认 10
- `keyword`：关键字搜索

**响应示例：**

```json
{
  "success": true,
  "data": {
    "list": [...],
    "total": 100,
    "pageNumber": 1,
    "pageSize": 10
  }
}
```

### GET /api/models/&#58;modelId

根据模型 ID 查询详情。

**路径参数：**
- `modelId`：模型 ID

**响应示例：**

```json
{
  "success": true,
  "data": {
    "modelId": "xxx",
    "name": "模型名称",
    "description": "描述"
  }
}
```

### GET /api/models/&#58;modelId/versions

查询模型版本列表。

**路径参数：**
- `modelId`：模型 ID

**查询参数：**
- `pageNumber`：页码，默认 1
- `pageSize`：每页数量，默认 10

**响应示例：**

```json
{
  "success": true,
  "data": {
    "list": [...],
    "total": 10
  }
}
```

### POST /api/models

创建新的模型。

**请求示例：**

```json
{
  "name": "模型名称",
  "description": "模型描述"
}
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "modelId": "xxx",
    "name": "模型名称"
  },
  "message": "创建模型成功"
}
```

### DELETE /api/models/&#58;modelId

删除指定的模型。

**路径参数：**
- `modelId`：模型 ID

**响应示例：**

```json
{
  "success": true,
  "message": "删除模型成功"
}
```

### POST /api/models/&#58;modelId/versions

为模型创建新版本。

**路径参数：**
- `modelId`：模型 ID

**请求示例：**

```json
{
  "version": "v1.0.0",
  "description": "版本描述"
}
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "versionId": "xxx",
    "version": "v1.0.0"
  },
  "message": "创建版本成功"
}
```

### DELETE /api/models/&#58;modelId/versions/&#58;versionId

删除指定的模型版本。

**路径参数：**
- `modelId`：模型 ID
- `versionId`：版本 ID

**响应示例：**

```json
{
  "success": true,
  "message": "删除版本成功"
}
```

