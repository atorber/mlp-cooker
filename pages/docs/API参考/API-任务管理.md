---
sidebar_position: 12
---

# 任务管理

所有任务管理接口都需要认证。

## 接口列表

- `POST /api/tasks`：查询任务列表（自动过滤包含 task- 关键字的 job）

## 接口详情

### POST /api/tasks

查询任务列表。该接口会自动过滤包含 `task-` 关键字的 job。

**请求体示例：**

```json
{
  "keyword": "任务关键字",
  "status": "Running",
  "owner": "用户名"
}
```

**请求参数说明：**
- `keyword`：关键字搜索（可选）。如果提供，会自动添加 `task-` 前缀；如果不提供，默认使用 `task-` 作为关键字
- `status`：任务状态过滤（可选）
- `owner`：任务所有者过滤（可选）

**注意事项：**
- 如果关键字已经包含 `task-`，则直接使用；否则会自动添加前缀
- 如果关键字为空，则默认只查询包含 `task-` 的任务

**响应示例：**

```json
{
  "success": true,
  "data": [
    {
      "jobId": "task-xxx",
      "jobName": "task-任务名称",
      "status": "Running",
      "owner": "user1",
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ]
}
```

