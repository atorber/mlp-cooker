---
sidebar_position: 5
---

# 计算资源

所有计算资源接口都需要认证。

## 接口列表

- <code>GET /api/resources/queues</code>：查询队列列表
- <code>GET /api/resources/queues/:queueId</code>：查询队列详情
- <code>GET /api/resources/pools</code>：查询资源池列表
- <code>GET /api/resources/pools/:resourcePoolId</code>：查询资源池详情

## 接口详情

### GET /api/resources/queues

查询队列列表。

**查询参数：**
- `resourcePoolId`：资源池 ID（可选）
- `pageNumber`：页码（可选）
- `pageSize`：每页数量（可选）
- `keywordType`：关键字类型（可选）
- `keyword`：关键字（可选）
- `includeDetails`：是否包含详情信息（true/false，可选）

**响应示例：**

```json
{
  "success": true,
  "data": {
    "queues": [
      {
        "queueId": "xxx",
        "queueName": "队列名称",
        "queueType": "Elastic",
        "resourcePoolId": "xxx"
      }
    ],
    "totalCount": 10
  }
}
```

### GET /api/resources/queues/&#58;queueId

根据队列 ID 查询详情。

**路径参数：**
- `queueId`：队列 ID

**响应示例：**

```json
{
  "success": true,
  "data": {
    "queue": {
      "queueId": "xxx",
      "queueName": "队列名称",
      "queueType": "Elastic",
      "capability": {
        "cpuCores": "256",
        "memoryGi": "1024"
      },
      "children": [...]
    }
  }
}
```

### GET /api/resources/pools

查询资源池列表。

**查询参数：**
- `resourcePoolType`：资源池类型（可选，如 'dedicatedV2'）
- `pageNumber`：页码（可选，默认 1）
- `pageSize`：每页数量（可选，默认 100）

**响应示例：**

```json
{
  "success": true,
  "data": {
    "resourcePools": [
      {
        "resourcePoolId": "xxx",
        "resourcePoolName": "资源池名称",
        "resourcePoolType": "dedicatedV2"
      }
    ],
    "totalCount": 5
  }
}
```

### GET /api/resources/pools/&#58;resourcePoolId

根据资源池 ID 查询详情。

**路径参数：**
- `resourcePoolId`：资源池 ID

**响应示例：**

```json
{
  "success": true,
  "data": {
    "resourcePoolId": "xxx",
    "resourcePoolName": "资源池名称",
    "bindingStorages": [
      {
        "storageId": "xxx",
        "storageName": "存储名称"
      }
    ]
  }
}
```

