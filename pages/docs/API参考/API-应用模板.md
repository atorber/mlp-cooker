---
sidebar_position: 6
---

# 应用

应用接口用于查询与创建「可执行应用」。应用通过 `actions[].templateId` 引用模板库中的配置。

所有接口需要认证。

## 接口列表

- `GET /api/apps`：查询应用列表
- `GET /api/apps/:appId`：查询应用详情
- `POST /api/apps/create`：创建应用（如从训练任务导入）

## 接口详情

### GET /api/apps

查询应用列表。后端会解析每个 action 关联的模板，填充运行时 `templates` 字段。

**响应示例：**

```json
{
  "success": true,
  "message": "获取应用列表成功",
  "data": [
    {
      "id": "aihc-test-job-import",
      "name": "aihc-test-job-import",
      "description": "测试从任务中导入模板",
      "type": "training",
      "categoryType": "model",
      "tags": ["部署", "训练", "示例"],
      "actions": [
        {
          "type": "train",
          "label": "创建训练任务",
          "templateKey": "train",
          "templateId": 106
        }
      ],
      "templates": {
        "train": {
          "taskParams": { "jobSpec": { "...": "..." } },
          "command": "#! /bin/bash\n...",
          "accelerators": {},
          "templateId": 106,
          "templateName": "aihc-test-job-import - 创建训练任务"
        }
      }
    }
  ]
}
```

### GET /api/apps/:appId

根据应用 ID 查询详情（结构与列表单项一致）。

**路径参数：**

- `appId`：应用目录名 / ID

### POST /api/apps/create

创建应用。若传入 `taskParams` / `command`，会先写入模板库，再在 `app.json` 中关联 `templateId`。

**请求体示例：**

```json
{
  "name": "我的导入应用",
  "description": "从训练任务导入",
  "type": "training",
  "categoryType": "model",
  "tags": ["训练"],
  "taskParams": "{\"jobSpec\":{}}",
  "command": "python train.py"
}
```

**说明：**

- `type`：`training` | `deployment` | `batch-job`
- 成功后返回应用元数据（含 `actions[].templateId`）
