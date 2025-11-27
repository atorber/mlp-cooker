---
sidebar_position: 12
---

# 应用模板 API

所有应用模板接口都需要认证。

## 接口列表

- `GET /api/apps`：查询应用模板列表
- `GET /api/apps/:appId`：查询应用模板详情

## 接口详情

### GET /api/apps

查询应用模板列表。

**查询参数：**
- `pageNumber`：页码（可选）
- `pageSize`：每页数量（可选）
- `keyword`：关键字搜索（可选）

**响应示例：**

```json
{
  "success": true,
  "data": {
    "apps": [
      {
        "appId": "xxx",
        "appName": "应用模板名称",
        "description": "模板描述",
        "category": "训练",
        "createdAt": "2025-01-15T10:30:00Z"
      }
    ],
    "totalCount": 20
  }
}
```

### GET /api/apps/:appId

根据应用模板 ID 查询详情。

**路径参数：**
- `appId`：应用模板 ID

**响应示例：**

```json
{
  "success": true,
  "data": {
    "appId": "xxx",
    "appName": "应用模板名称",
    "description": "模板描述",
    "category": "训练",
    "template": {
      "jobName": "训练任务",
      "image": "registry/image:tag",
      "command": ["python", "train.py"]
    },
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  }
}
```

