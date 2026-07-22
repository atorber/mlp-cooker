---
sidebar_position: 7
---

# 模板

模板接口管理预置 / 自定义业务模板。应用配置参数保存在 `template_content` 中，由应用通过 `templateId` 引用。

所有接口需要认证。

## 接口列表

- `GET /api/templates/metadata`：模块、子模块、标签元数据
- `GET /api/templates/doc-preview`：拉取远程文档内容（供 Markdown 预览）
- `GET /api/templates`：模板列表（支持筛选与分页）
- `GET /api/templates/:id`：模板详情
- `POST /api/templates`：创建自定义模板
- `PUT /api/templates/:id`：更新自定义模板
- `DELETE /api/templates/:id`：删除自定义模板

## 数据模型

```json
{
  "id": 104,
  "name": "音频元数据提取",
  "logo_type": "audio",
  "description": "简介",
  "doc_url": "https://example.com/doc.md",
  "source": "preset",
  "module": "工作流",
  "sub_module": "子任务模板",
  "tags": [{ "code": "audio", "level": 1, "name": "音频" }],
  "template_content": "{ \"taskParams\": {}, \"command\": \"\", \"accelerators\": {} }",
  "version": "0.5.1",
  "created_at": "2026-06-15T20:37:18Z",
  "updated_at": "2026-06-15T20:37:18Z"
}
```

## 接口详情

### GET /api/templates/metadata

**响应字段：**

- `modules`：功能模块列表
- `subModulesByModule`：各模块下的子模块选项
- `sources`：`preset` / `custom`
- `tags`：已有标签汇总

### GET /api/templates

**查询参数：**

| 参数 | 说明 |
|------|------|
| `pageNo` | 页码，默认 1 |
| `pageSize` | 每页数量，默认 12 |
| `keyword` | 名称 / 简介 / 标签关键词 |
| `module` | 功能模块 |
| `source` | `preset` 或 `custom` |
| `tag` | 标签 code 或名称 |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "list": [ { "id": 104, "name": "音频元数据提取", "...": "..." } ],
    "total": 17,
    "pageNo": 1,
    "pageSize": 12
  }
}
```

### GET /api/templates/doc-preview

**查询参数：**

- `url`：http(s) 文档地址

**响应：** `{ url, content, contentType, isMarkdown }`

### POST /api/templates

创建自定义模板（`source` 固定为 `custom`）。

**必填：** `name`、`module`  
**可选：** `logo_type`、`description`、`doc_url`、`sub_module`、`tags`、`template_content`、`version`

### PUT /api/templates/:id

仅允许更新自定义模板；预置模板会返回错误。

### DELETE /api/templates/:id

仅允许删除自定义模板。

## 与应用的关系

- 应用 action 使用 `templateId` 指向本模块记录
- 应用执行时解析 `template_content` 得到 `taskParams` / `command` / `accelerators`
- 数据文件：`backend/data/db/templates.json`
