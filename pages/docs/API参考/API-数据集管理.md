---
sidebar_position: 7
---

# 数据集管理

所有数据集管理接口都需要认证。

## 接口列表

- <code>GET /api/datasets</code>：查询数据集列表
- <code>GET /api/datasets/:datasetId</code>：查询数据集详情
- <code>GET /api/datasets/:datasetId/versions</code>：查询数据集版本列表
- <code>POST /api/datasets</code>：创建数据集
- <code>DELETE /api/datasets/:datasetId</code>：删除数据集
- <code>POST /api/datasets/:datasetId/versions</code>：创建数据集版本
- <code>DELETE /api/datasets/:datasetId/versions/:versionId</code>：删除数据集版本
- <code>POST /api/lakefs/repositories</code>：为 BOS 数据集创建 lakeFS 仓库

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

### GET /api/datasets/&#58;datasetId

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

### GET /api/datasets/&#58;datasetId/versions

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

### DELETE /api/datasets/&#58;datasetId

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

### POST /api/datasets/&#58;datasetId/versions

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

### DELETE /api/datasets/&#58;datasetId/versions/&#58;versionId

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

### POST /api/lakefs/repositories

为指定存储路径创建 lakeFS 仓库。通常用于 BOS 数据集的版本化管理。

**请求参数：**
- `id`：仓库名称（必填，建议全小写且只包含字母数字和短横线）
- `storageNamespace`：存储命名空间（必填，例如 `s3://bucket/path/`）
- `defaultBranch`：默认分支名称（可选，默认为 `main`）

**请求示例：**

```json
{
  "id": "my-dataset-repo",
  "storageNamespace": "s3://my-bucket/datasets/my-data/",
  "defaultBranch": "main"
}
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "id": "my-dataset-repo",
    "storageNamespace": "s3://my-bucket/datasets/my-data/",
    "defaultBranch": "main"
  },
  "message": "创建仓库成功"
}
```
