---
sidebar_position: 5
---

# 数据集管理 API

所有数据集管理接口都需要认证。

## 接口列表

- `GET /api/datasets`：查询数据集列表
- `GET /api/datasets/:datasetId`：查询数据集详情
- `GET /api/datasets/:datasetId/versions`：查询数据集版本列表
- `POST /api/datasets`：创建数据集
- `DELETE /api/datasets/:datasetId`：删除数据集
- `POST /api/datasets/:datasetId/versions`：创建数据集版本
- `DELETE /api/datasets/:datasetId/versions/:versionId`：删除数据集版本

## 接口详情

### GET /api/datasets

查询数据集列表。

**查询参数：**
- `pageNumber`：页码，默认 1
- `pageSize`：每页数量，默认 10
- `keyword`：关键字搜索
- `storageType`：存储类型过滤
- `importFormat`：导入格式过滤

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

### GET /api/datasets/:datasetId

根据数据集 ID 查询详情。

**路径参数：**
- `datasetId`：数据集 ID

**响应示例：**

```json
{
  "success": true,
  "data": {
    "datasetId": "xxx",
    "name": "数据集名称",
    "description": "描述"
  }
}
```

### GET /api/datasets/:datasetId/versions

查询数据集版本列表。

**路径参数：**
- `datasetId`：数据集 ID

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

### POST /api/datasets

创建新的数据集。

**请求示例：**

```json
{
  "name": "数据集名称",
  "description": "数据集描述"
}
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "datasetId": "xxx",
    "name": "数据集名称"
  },
  "message": "创建数据集成功"
}
```

### DELETE /api/datasets/:datasetId

删除指定的数据集。

**路径参数：**
- `datasetId`：数据集 ID

**响应示例：**

```json
{
  "success": true,
  "message": "删除数据集成功"
}
```

### POST /api/datasets/:datasetId/versions

为数据集创建新版本。

**路径参数：**
- `datasetId`：数据集 ID

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

### DELETE /api/datasets/:datasetId/versions/:versionId

删除指定的数据集版本。

**路径参数：**
- `datasetId`：数据集 ID
- `versionId`：版本 ID

**响应示例：**

```json
{
  "success": true,
  "message": "删除版本成功"
}
```

