---
sidebar_position: 3
---

# 配置管理 API

所有配置管理接口都需要认证。

## 接口列表

- `GET /api/config`：获取配置
- `POST /api/config/batch`：批量获取配置
- `PUT /api/config`：更新配置
- `POST /api/config/reset`：重置配置
- `GET /api/config/validate`：验证配置
- `GET /api/config/metadata`：获取配置元数据
- `GET /api/config/:key`：获取指定配置项
- `GET /api/environment/info`：获取环境信息

## 接口详情

### GET /api/config

获取所有系统配置。

**响应示例：**

```json
{
  "success": true,
  "data": {
    "ML_PLATFORM_RESOURCE_AK": "xxx",
    "ML_PLATFORM_RESOURCE_SK": "xxx",
    "ML_PLATFORM_RESOURCE_POOL_ID": "xxx"
  }
}
```

### POST /api/config/batch

批量获取指定的配置项。

**请求示例：**

```json
{
  "keys": ["ML_PLATFORM_RESOURCE_AK", "ML_PLATFORM_RESOURCE_SK"]
}
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "ML_PLATFORM_RESOURCE_AK": "xxx",
    "ML_PLATFORM_RESOURCE_SK": "xxx"
  }
}
```

### PUT /api/config

更新系统配置。

**请求示例：**

```json
{
  "ML_PLATFORM_RESOURCE_AK": "new-ak",
  "ML_PLATFORM_RESOURCE_SK": "new-sk"
}
```

**响应示例：**

```json
{
  "success": true,
  "message": "配置更新成功"
}
```

### POST /api/config/reset

重置配置到默认值。

**响应示例：**

```json
{
  "success": true,
  "message": "配置重置成功"
}
```

### GET /api/config/validate

验证配置的有效性。

**响应示例：**

```json
{
  "success": true,
  "data": {
    "valid": true,
    "errors": []
  }
}
```

### GET /api/config/metadata

获取配置项的元数据信息。

**响应示例：**

```json
{
  "success": true,
  "data": [
    {
      "key": "ML_PLATFORM_RESOURCE_AK",
      "type": "string",
      "description": "机器学习平台访问密钥",
      "required": true
    }
  ]
}
```

### GET /api/config/:key

获取指定 key 的配置值。

**路径参数：**
- `key`：配置项的键名

**响应示例：**

```json
{
  "success": true,
  "data": {
    "key": "ML_PLATFORM_RESOURCE_AK",
    "value": "xxx"
  }
}
```

### GET /api/environment/info

获取系统环境信息。

**响应示例：**

```json
{
  "success": true,
  "data": {
    "nodeVersion": "v18.0.0",
    "platform": "darwin",
    "arch": "x64"
  }
}
```

