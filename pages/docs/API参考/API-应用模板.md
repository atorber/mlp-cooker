---
sidebar_position: 6
---

# 应用模板

所有应用模板接口都需要认证。

## 接口列表

- <code>GET /api/apps</code>：查询应用模板列表
- <code>GET /api/apps/:appId</code>：查询应用模板详情

## 接口详情

### GET /api/apps

查询应用模板列表。

**查询参数：**
- `pageNumber`：页码（可选，底层暂不支持全量返回，仅限前端分页）
- `pageSize`：每页数量（可选）
- `keyword`：按名称或描述搜索（可选）
- `categoryType`：业务分类过滤（可选，如 `model`, `task`）
- `activeTab`：环境分类（可选，`production` 或 `grey`）

**响应示例：**

```json
{
  "success": true,
  "data": [
    {
      "id": "my-app",
      "name": "我的应用",
      "description": "应用描述",
      "categoryType": "model",
      "tags": ["LLM", "VLM"],
      "actions": [
        {
          "type": "train",
          "label": "创建训练任务",
          "templateKey": "train"
        }
      ],
      "templates": {
        "train": {
           "taskParams": { ... }
        }
      }
    }
  ],
  "message": "获取应用模板列表成功"
}
```

### GET /api/apps/&#58;appId

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

