---
sidebar_position: 7
---

# 镜像管理 API

所有镜像管理接口都需要认证。

## 接口列表

- `GET /api/images`：查询镜像列表
- `POST /api/images`：创建镜像
- `GET /api/images/:id`：查询镜像详情
- `PUT /api/images/:id`：更新镜像
- `DELETE /api/images/:id`：删除镜像
- `PUT /api/images/:id/status`：更新镜像状态
- `GET /api/images/:id/versions`：查询镜像版本列表
- `POST /api/images/:id/versions`：创建镜像版本

## 接口详情

### GET /api/images

查询镜像列表。

**查询参数：**
- `pageNo`：页码，默认 1
- `pageSize`：每页数量，默认 10
- `name`：镜像名称（模糊搜索）
- `framework`：框架过滤
- `chipType`：芯片类型过滤（GPU/CPU/NPU）
- `applicableScope`：适用范围过滤

**响应示例：**

```json
{
  "success": true,
  "data": {
    "list": [
      {
        "id": "xxx",
        "name": "镜像名称",
        "imageId": "xxx",
        "frameworks": ["PyTorch", "TensorFlow"],
        "chipType": "GPU",
        "status": "online"
      }
    ],
    "total": 100,
    "pageNo": 1,
    "pageSize": 10
  }
}
```

### POST /api/images

创建新的镜像。

**请求示例：**

```json
{
  "name": "镜像名称",
  "imageId": "image-id",
  "frameworks": ["PyTorch"],
  "applicableScopes": ["开发机"],
  "chipType": "GPU",
  "presetCuda": true,
  "description": "镜像描述",
  "imageAddress": "registry/image:tag"
}
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "id": "xxx",
    "name": "镜像名称"
  },
  "message": "创建镜像成功"
}
```

### GET /api/images/:id

根据镜像 ID 查询详情。

**路径参数：**
- `id`：镜像 ID

**响应示例：**

```json
{
  "success": true,
  "data": {
    "id": "xxx",
    "name": "镜像名称",
    "imageId": "xxx",
    "frameworks": ["PyTorch"],
    "chipType": "GPU",
    "status": "online",
    "description": "镜像描述"
  }
}
```

### PUT /api/images/:id

更新镜像信息。

**路径参数：**
- `id`：镜像 ID

**请求示例：**

```json
{
  "name": "更新后的名称",
  "description": "更新后的描述"
}
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "id": "xxx",
    "name": "更新后的名称"
  },
  "message": "更新镜像成功"
}
```

### DELETE /api/images/:id

删除指定的镜像。

**路径参数：**
- `id`：镜像 ID

**响应示例：**

```json
{
  "success": true,
  "message": "删除镜像成功"
}
```

### PUT /api/images/:id/status

更新镜像状态。

**路径参数：**
- `id`：镜像 ID

**请求体：**

```json
{
  "status": "online"
}
```

**状态值：**
- `online`：上架
- `offline`：下架
- `pending`：待上线

**响应示例：**

```json
{
  "success": true,
  "data": {
    "id": "xxx",
    "status": "online"
  },
  "message": "状态更新成功"
}
```

### GET /api/images/:id/versions

查询指定镜像的所有版本。

**路径参数：**
- `id`：镜像 ID

**响应示例：**

```json
{
  "success": true,
  "data": {
    "list": [
      {
        "version": "v1.0.0",
        "imageAddress": "registry/image:v1.0.0",
        "size": "2.5GB",
        "pythonVersion": "3.9.0",
        "cudaVersion": "11.8",
        "description": "版本描述",
        "createTime": "2025-01-15T10:30:00Z"
      }
    ],
    "total": 5
  }
}
```

### POST /api/images/:id/versions

为镜像创建新版本。

**路径参数：**
- `id`：镜像 ID

**请求示例：**

```json
{
  "version": "v1.1.0",
  "imageAddress": "registry/image:v1.1.0",
  "size": "2.6GB",
  "pythonVersion": "3.9.0",
  "cudaVersion": "11.8",
  "description": "新版本描述",
  "createTime": "2025-01-15T10:30:00Z"
}
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "version": "v1.1.0",
    "imageAddress": "registry/image:v1.1.0"
  },
  "message": "创建版本成功"
}
```

