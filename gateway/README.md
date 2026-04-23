# 百舸API网关

统一百舸各模块API规范和数据结构的中间层网关服务。

## 功能特性

- **统一API规范**：保留原有RPC风格（`?action=XXX`），规范化HTTP方法、请求头、参数位置
- **统一数据结构**：抽象通用的业务对象（资源规格、存储挂载、镜像配置等）
- **签名认证**：自动处理百度云API签名
- **请求转换**：自动转换统一结构到各模块后端结构
- **响应转换**：自动转换后端响应到统一结构

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装依赖

```bash
cd gateway
npm install
```

### 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入百度云 AK/SK
```

### 开发模式

```bash
npm run dev
```

### 生产构建

```bash
npm run build
npm start
```

## API 接口

所有接口采用RPC风格，通过 `?action=XXX` 参数区分操作。网关现已支持多云产品路由：

### 统一URL格式

```http
GET|POST /v1/{product}?action={Action}
```
其中 `{product}` 目前支持 `aihc` 和 `bos`。

### 全局认证与参数头 (Headers)

必须在 HTTP 请求头中提供以下参数：

| Header字段 | 说明 |
|-----|-----|
| `region` | **必填**。云产品区域代码，如 `bj` (北京), `bd` (保定), `su` (苏州), `gz` (广州) |
| `ak` | **必填**。百度云 Access Key |
| `sk` | **必填**。百度云 Secret Key |

> **注：** 将按 Header 中的 `ak` 和 `sk` 为每个请求独占进行验签，支持多租户高并发访问。

### AIHC: 训练任务接口 `action=DescribeJobs`

| HTTP方法 | Action | 说明 |
|---------|--------|------|
| GET | `DescribeJobs` | 查询训练任务列表 |
| GET | `DescribeJob` | 查询训练任务详情 |
| POST | `CreateJob` | 创建训练任务 |
| POST | `DeleteJob` | 删除训练任务 |

**示例：**

```bash
# 查询训练任务列表
curl -X GET "http://localhost:3000/v1/aihc?action=DescribeJobs&resourcePoolId=xxx&queue=xxx" \
  -H "region: bd" \
  -H "ak: YOUR_AK" \
  -H "sk: YOUR_SK"

# 创建训练任务
curl -X POST "http://localhost:3000/v1/aihc?action=CreateJob" \
  -H "region: bd" \
  -H "ak: YOUR_AK" \
  -H "sk: YOUR_SK" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-training-job",
    "resourcePool": { "poolId": "xxx", "queue": "xxx" },
    "command": "python train.py",
    "resources": { "cpu": 4, "memory": 16 },
    "replicas": 1,
    "image": { "url": "registry.xxx/train:latest" }
  }'
```

### AIHC: 服务部署接口

| HTTP方法 | Action | 说明 |
|---------|--------|------|
| GET | `DescribeServices` | 查询服务列表 |
| GET | `DescribeService` | 查询服务详情 |
| POST | `CreateService` | 创建服务 |
| POST | `DeleteService` | 删除服务 |

### AIHC: 开发机接口

| HTTP方法 | Action | 说明 |
|---------|--------|------|
| GET | `DescribeDevInstances` | 查询开发机列表 |
| GET | `DescribeDevInstance` | 查询开发机详情 |
| POST | `CreateDevInstance` | 创建开发机 |
| POST | `DeleteDevInstance` | 删除开发机 |

### AIHC: 数据集接口

| HTTP方法 | Action | 说明 |
|---------|--------|------|
| GET | `DescribeDatasets` | 查询数据集列表 |
| GET | `DescribeDataset` | 查询数据集详情 |
| GET | `DescribeDatasetVersions` | 查询数据集版本列表 |
| POST | `CreateDataset` | 创建数据集 |
| POST | `CreateDatasetVersion` | 创建数据集版本 |
| POST | `DeleteDataset` | 删除数据集 |
| POST | `DeleteDatasetVersion` | 删除数据集版本 |

### AIHC: 模型管理接口

| HTTP方法 | Action | 说明 |
|---------|--------|------|
| GET | `DescribeModels` | 查询模型列表 |
| GET | `DescribeModel` | 查询模型详情 |
| GET | `DescribeModelVersions` | 查询模型版本列表 |
| POST | `CreateModel` | 创建模型 |
| POST | `CreateModelVersion` | 创建模型版本 |
| POST | `DeleteModel` | 删除模型 |
| POST | `DeleteModelVersion` | 删除模型版本 |

### AIHC: 资源池接口

| HTTP方法 | Action | 说明 |
|---------|--------|------|
| GET | `DescribeResourcePools` | 查询资源池列表 |
| GET | `DescribeResourcePool` | 查询资源池详情 |
| GET | `DescribeQueues` | 查询队列列表 |
| GET | `DescribeQueue` | 查询队列详情 |
| GET | `DescribeNodes` | 查询节点列表 |
| GET | `DescribeNode` | 查询节点详情 |
| GET | `DescribeResourcePoolUsage` | 查询资源池使用情况 |

### BOS 对象存储接口

| HTTP方法 | Action | 说明 |
|---------|--------|------|
| GET | `DescribeBuckets` | 透传查询存储桶列表 |
| POST | *各种Action* | 支持基础 BOS RPC 透传代理 |

## 统一数据结构

### 资源规格 (ComputeResources)

```typescript
interface ComputeResources {
  cpu: number;                    // CPU核数
  memory: number;                 // 内存(GB)
  accelerator?: {                 // 加速卡配置
    type: string;                 // 加速卡类型
    count: number;                // 加速卡数量
  };
  sharedMemory?: number;          // 共享内存(GB)
}
```

### 存储挂载 (StorageMount)

```typescript
interface StorageMount {
  name: string;                   // 挂载名称
  mountPath: string;              // 容器内挂载路径
  readOnly?: boolean;             // 是否只读
  storageType: 'pfs' | 'bos' | 'cfs' | 'dataset' | 'hostPath' | 'emptyDir' | 'cds';
  config: PFSStorage | BOSStorage | ...;  // 存储配置
}
```

### 镜像配置 (ImageConfig)

```typescript
interface ImageConfig {
  url: string;                    // 镜像地址
  source?: 'preset' | 'custom' | 'ccr';  // 镜像来源
  auth?: {                        // 私有镜像认证
    username: string;
    password: string;
  };
}
```

### 资源池引用 (ResourcePoolRef)

```typescript
interface ResourcePoolRef {
  poolId: string;                 // 资源池ID
  poolName?: string;              // 资源池名称（只读）
  poolType?: 'self-managed' | 'managed';  // 资源池类型
  queue: string;                  // 队列名称
}
```

## 项目结构

```
gateway/
├── src/
│   ├── index.ts              # 入口文件
│   ├── app.ts                # 应用配置
│   ├── config/               # 配置管理
│   ├── types/                # 类型定义
│   │   ├── unified/          # 统一类型
│   │   └── backend/          # 后端原始类型
│   ├── transformers/         # 结构转换器
│   ├── backend/              # 后端API客户端
│   ├── middlewares/          # 中间件
│   └── routes/               # 路由
├── tests/                    # 测试
├── docs/
│   └── openapi.yaml          # OpenAPI 规范
├── package.json
├── tsconfig.json
└── README.md
```

## API 文档

详细的 API 规范请参考 [OpenAPI 文档](docs/openapi.yaml)。

### Swagger UI

启动服务后，访问以下地址查看交互式 API 文档：

- **Swagger UI**: http://localhost:3000/docs
- **OpenAPI JSON**: http://localhost:3000/docs/json

访问 http://localhost:3000/api/v1 可获取 API 元信息，包含文档链接。

## 开发指南

### 添加新接口

1. 在 `src/types/unified/` 中定义统一类型
2. 在 `src/types/backend/` 中定义后端原始类型
3. 在 `src/transformers/` 中实现转换器
4. 在 `src/routes/` 中添加路由

### 测试

```bash
npm test
```

## 错误码

网关使用统一的错误码格式：`HTTP状态码 + 3位业务码`

| 错误码范围 | 说明 |
|-----------|------|
| 400xxx | 请求参数错误 |
| 401xxx | 认证错误 |
| 403xxx | 权限错误 |
| 404xxx | 资源不存在 |
| 409xxx | 资源冲突 |
| 412xxx | 前置条件失败 |
| 429xxx | 请求频率限制 |
| 500xxx | 服务端错误 |
| 503xxx | 服务不可用 |

## License

MIT
