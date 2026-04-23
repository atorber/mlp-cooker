# 百舸API网关设计方案（详细版）

## 一、问题分析总览

通过对百舸OpenAPI文档的全面分析，共识别出 **69个接口**，分布在6个模块中。本方案保留原有RPC风格（`?action=XXX`），仅对接口进行规范化治理。

---

## 二、接口问题详解

### 2.1 分布式训练相关接口（13个）

| 序号 | 接口名称 | Action | HTTP方法 | 请求头版本 | 问题点 |
|-----|---------|--------|---------|-----------|-------|
| 1 | 创建训练任务 | CreateJob | POST | `X-API-Version` | queueID(Query)和queue(Body)重复传递 |
| 2 | 查询训练任务列表 | DescribeJobs | POST | `X-API-Version` | **查询操作使用POST不合理**；参数位置混乱（Query+Body混用） |
| 3 | 查询训练任务详情 | DescribeJob | POST | `X-API-Version` | **查询操作使用POST不合理** |
| 4 | 更新训练任务 | ModifyJob | POST | `X-API-Version` | 正常 |
| 5 | 删除训练任务 | DeleteJob | POST | `X-API-Version` | 正常 |
| 6 | 停止训练任务 | StopJob | POST | `X-API-Version` | 正常 |
| 7 | 批量停止训练任务 | StopJobs | POST | `X-API-Version` | 正常 |
| 8 | 查询训练任务日志 | DescribeJobLogs | GET | `X-API-Version` | 正常 |
| 9 | 查询训练任务事件 | DescribeJobEvents | GET | `X-API-Version` | 正常 |
| 10 | 查询训练任务Pod事件 | DescribePodEvents | GET | `X-API-Version` | 正常 |
| 11 | 查询训练任务监控 | DescribeJobMetrics | GET | `X-API-Version` | 正常 |
| 12 | 查询训练任务所在节点列表 | DescribeJobNodes | GET | `X-API-Version` | 正常 |
| 13 | 获取训练任务WebTerminal地址 | DescribeJobWebterminal | GET | `X-API-Version` | 正常 |

**模块问题汇总**：
1. **请求头不一致**：使用`X-API-Version`而非其他模块的`version`
2. **HTTP方法语义混乱**：查询操作(DescribeJobs, DescribeJob)使用POST
3. **参数位置混乱**：DescribeJobs的参数同时出现在Query和Body中
4. **参数冗余**：CreateJob需要同时传递`queueID`(Query)和`queue`(Body)

---

### 2.2 在线服务部署相关接口（16个）

| 序号 | 接口名称 | Action | HTTP方法 | 请求头版本 | 问题点 |
|-----|---------|--------|---------|-----------|-------|
| 1 | 创建服务 | CreateService | POST | `version` | 正常 |
| 2 | 拉取服务列表 | DescribeServices | GET | `version` | 正常 |
| 3 | 查询服务详情 | DescribeService | GET | `version` | 正常 |
| 4 | 升级服务 | ModifyService | POST | `version` | 正常 |
| 5 | 删除服务 | DeleteService | POST | `version` | 正常 |
| 6 | 获取服务状态 | DescribeServiceStatus | GET | `version` | 正常 |
| 7 | 服务扩缩容 | ModifyServiceReplicas | POST | `version` | 正常 |
| 8 | 配置公网访问 | ModifyServiceNetConfig | POST | `version` | 正常 |
| 9 | 拉取服务变更记录 | DescribeServiceChangelogs | GET | `version` | 正常 |
| 10 | 查询服务变更详情 | DescribeServiceChangelog | GET | `version` | 正常 |
| 11 | 拉取服务pod列表 | DescribeServicePods | GET | `version` | 正常 |
| 12 | 获取实例组列表 | DescribeServicePodGroups | GET | `version` | 正常 |
| 13 | 摘除pod流量 | DisableServicePod | POST | `version` | 正常 |
| 14 | 删除pod并重建 | DeleteServicePod | POST | `version` | 正常 |
| 15 | 查询推理服务日志 | DescribeInferenceServiceLogs | GET | `version` | 正常 |
| 16 | 获取推理服务WebTerminal地址 | DescribeServiceWebterminal | GET | `version` | 正常 |

**模块问题汇总**：
1. **Action命名风格略有不统一**：`DescribeServiceStatus` vs `DescribeServiceChangelogs`（单数/复数）
2. **结构体定义与其他模块重复**：资源配置、存储挂载等

---

### 2.3 开发机相关接口（12个）

| 序号 | 接口名称 | Action | HTTP方法 | 请求头版本 | 问题点 |
|-----|---------|--------|---------|-----------|-------|
| 1 | 创建开发机 | CreateDevInstance | POST | `version` | 正常 |
| 2 | 查询开发机列表 | DescribeDevInstances | GET | `version` | Action使用复数形式 |
| 3 | 查询开发机详情 | DescribeDevInstance | GET | `version` | 正常 |
| 4 | 删除开发机 | DeleteDevInstance | POST | `version` | 正常 |
| 5 | 开启实例 | StartDevInstance | POST | `version` | 正常 |
| 6 | 停止实例 | StopDevInstance | POST | `version` | 正常 |
| 7 | 定时停止实例 | TimedStopDevInstance | POST | `version` | 正常 |
| 8 | 变更配置 | ModifyDevInstance | POST | `version` | 正常 |
| 9 | 制作开发机镜像 | CreateDevInstanceImage | POST | `version` | Action命名风格与其他接口不一致 |
| 10 | 查询镜像任务详情 | DescribeImagePackJob | GET | `version` | 正常 |
| 11 | 查询开发机事件 | DescribeDevInstanceEvents | GET | `version` | 正常 |

**模块问题汇总**：
1. **Action命名不一致**：
   - `CreateDevInstanceImage` vs `CreateService`（命名结构不同）
   - `DescribeDevInstances`使用复数，其他模块有单数有复数
2. **结构体命名拼写错误**：`volumnConfs`应为`volumeConfs`

---

### 2.4 数据集相关接口（9个）

| 序号 | 接口名称 | Action | HTTP方法 | 请求头版本 | 问题点 |
|-----|---------|--------|---------|-----------|-------|
| 1 | 创建数据集 | CreateDataset | POST | `version` | 正常 |
| 2 | 获取数据集列表 | DescribeDatasets | GET | `version` | Action使用复数形式 |
| 3 | 获取数据集详情 | DescribeDataset | GET | `version` | 正常 |
| 4 | 修改数据集 | ModifyDataset | POST | `version` | 正常 |
| 5 | 删除数据集 | DeleteDataset | POST | `version` | 正常 |
| 6 | 创建数据集版本 | CreateDatasetVersion | POST | `version` | 正常 |
| 7 | 获取数据集版本列表 | DescribeDatasetVersions | GET | `version` | 正常 |
| 8 | 获取数据集版本详情 | DescribeDatasetVersion | GET | `version` | 正常 |
| 9 | 删除数据集版本 | DeleteDatasetVersion | POST | `version` | 正常 |

**模块问题汇总**：
1. **接口描述风格不一致**：使用"获取"而非其他模块的"查询"/"拉取"

---

### 2.5 模型管理相关接口（8个）

| 序号 | 接口名称 | Action | HTTP方法 | 请求头版本 | 问题点 |
|-----|---------|--------|---------|-----------|-------|
| 1 | 创建模型 | CreateModel | POST | `version` | 正常 |
| 2 | 获取模型列表 | DescribeModels | GET | `version` | Action使用复数形式 |
| 3 | 获取模型详情 | DescribeModel | GET | `version` | 正常 |
| 4 | 修改模型 | ModifyModel | POST | `version` | 正常 |
| 5 | 删除模型 | DeleteModel | POST | `version` | 正常 |
| 6 | 新建模型版本 | CreateModelVersion | POST | `version` | 正常 |
| 7 | 获取模型版本列表 | DescribeModelVersions | GET | `version` | 正常 |
| 8 | 删除模型版本 | DeleteModelVersion | POST | `version` | 正常 |

**模块问题汇总**：
1. **接口描述风格不一致**：使用"获取"而非其他模块的"查询"/"拉取"

---

### 2.6 资源池相关接口（11个）

#### 2.6.1 资源池接口（6个）

| 序号 | 接口名称 | Action | HTTP方法 | 请求头版本 | 问题点 |
|-----|---------|--------|---------|-----------|-------|
| 1 | 创建资源池 | CreateResourcePool | POST | `version` | 正常 |
| 2 | 查询资源池列表 | DescribeResourcePools | GET | `version` | 正常 |
| 3 | 查询资源池详情 | DescribeResourcePool | GET | `version` | 正常 |
| 4 | 查询资源池配置 | DescribeResourcePoolConfiguration | GET | `version` | Action过长 |
| 5 | 查询资源池概览 | DescribeResourcePoolsStatistic | GET | `version` | Action命名风格不一致 |
| 6 | 删除资源池 | DeleteResourcePool | POST | `version` | 正常 |

#### 2.6.2 队列接口（4个）

| 序号 | 接口名称 | Action | HTTP方法 | 请求头版本 | 问题点 |
|-----|---------|--------|---------|-----------|-------|
| 1 | 创建队列 | CreateQueue | POST | `version` | 正常 |
| 2 | 查询队列列表 | DescribeQueues | GET | `version` | 正常 |
| 3 | 查询队列详情 | DescribeQueue | GET | `version` | 正常 |
| 4 | 删除队列 | DeleteQueue | POST | `version` | 正常 |

#### 2.6.3 节点接口（3个）

| 序号 | 接口名称 | Action | HTTP方法 | 请求头版本 | 问题点 |
|-----|---------|--------|---------|-----------|-------|
| 1 | 创建节点 | CreateNodes | POST | `version` | Action使用复数形式 |
| 2 | 查询节点列表 | DescribeNodes | GET | `version` | 参数名不一致：pageNo vs pageNumber |
| 3 | 删除节点 | DeleteNodes | POST | `version` | Action使用复数形式 |

**模块问题汇总**：
1. **分页参数命名不一致**：节点接口使用`pageNo`，其他接口使用`pageNumber`
2. **Action命名不一致**：`CreateNodes`/`DeleteNodes`使用复数

---

## 三、结构体问题详解

### 3.1 资源规格定义（3种不同结构）

#### 原始定义

```typescript
// ============ 训练任务模块 ============
// 数据结构.md - Resource
interface Resource {
  name: string;      // "cpu" | "memory" | "baidu.com/a800_80g_cgpu" | "sharedMemory"
  quantity: number;
}

// ============ 服务部署模块 ============
// 数据结构.md - ContainerConf
interface ContainerConf {
  name: string;
  cpus: number;                    // CPU核数
  memory: number;                  // 内存大小(GiB)
  acceleratorCount: number;        // 加速卡数量
  acceleratorType?: string;        // 加速卡类型
  command?: string[];
  ports?: PortConf[];
  envs?: Record<string, string>;
  image: ImageConf;
  volumeMounts?: VolumnMountConf[];
  // ...
}

// ============ 开发机模块 ============
// 数据结构.md - Resources
interface Resources {
  cpus: number;                    // CPU核数
  memory: number;                  // 内存大小(GiB)
  acceleratorType?: string;        // 加速卡类型
  acceleratorCount: number;        // 加速卡数量
  shmSize?: number;                // 共享内存大小(GiB)
}
```

#### 统一后的结构

```typescript
/**
 * 统一的计算资源配置
 * 适用于：训练任务、服务部署、开发机
 */
interface ComputeResources {
  /** CPU核数 */
  cpu: number;
  /** 内存大小(GB) */
  memory: number;
  /** 加速卡配置 */
  accelerator?: {
    /** 加速卡类型，如 baidu.com/a800_80g_cgpu */
    type: string;
    /** 加速卡数量 */
    count: number;
  };
  /** 共享内存大小(GB) */
  sharedMemory?: number;
}
```

#### 转换规则

| 原模块 | 原结构 | 转换为统一结构 |
|-------|-------|--------------|
| 训练任务 | `resources: [{name: "cpu", quantity: 4}, {name: "memory", quantity: 16}]` | `{cpu: 4, memory: 16}` |
| 服务部署 | `ContainerConf.cpus=4, memory=16, acceleratorCount=1, acceleratorType="xxx"` | `{cpu: 4, memory: 16, accelerator: {type: "xxx", count: 1}}` |
| 开发机 | `Resources.cpus=4, memory=16, acceleratorCount=1, acceleratorType="xxx"` | `{cpu: 4, memory: 16, accelerator: {type: "xxx", count: 1}}` |

---

### 3.2 存储挂载定义（3种不同结构）

#### 原始定义

```typescript
// ============ 训练任务模块 ============
// 数据结构.md - DataSource
interface DataSource {
  type: 'pfs' | 'hostPath' | 'dataset' | 'bos' | 'cfs' | 'rapidfs' | 'emptydir' | 'pfsl1';
  name: string;              // pfs实例id 或其他标识
  sourcePath: string;        // 源路径
  mountPath: string;         // 容器内挂载路径
  options?: {
    readOnly?: boolean;
    sizeLimit?: number;
    medium?: string;
  };
}

// ============ 服务部署模块 ============
// 数据结构.md - VolumnConf + VolumnMountConf（拼写错误：Volumn应为Volume）
interface VolumnConf {
  volumeType: 'pfs' | 'hostpath' | 'emptydir' | 'bos' | 'dataset';
  volumnName: string;        // 拼写错误：volumnName应为volumeName
  pfs?: PFSConfig;
  bos?: BOSConfig;
  dataset?: DatasetStorageConfig;
  hostpath?: HostPathConfig;
}

interface VolumnMountConf {
  volumnName: string;        // 拼写错误
  mountPath: string;
  readOnly?: boolean;
}

// ============ 开发机模块 ============
// 数据结构.md - VolumnConf（另一个版本）
interface DevVolumnConf {
  volumnType: 'cds' | 'pfs' | 'dataset' | 'bos' | 'cfs';  // 拼写错误：volumnType
  mountPath: string;
  readOnly?: boolean;
  pfs?: PfsStorage;
  bos?: BosStorage;
  cds?: CdsStorage;
  cfs?: CfsStorage;
  dataset?: DatasetStorage;
}
```

#### 统一后的结构

```typescript
/**
 * 统一的存储挂载配置
 * 适用于：训练任务、服务部署、开发机
 */
interface StorageMount {
  /** 挂载名称 */
  name: string;
  /** 容器内挂载路径 */
  mountPath: string;
  /** 是否只读 */
  readOnly?: boolean;
  /** 存储类型 */
  storageType: 'pfs' | 'bos' | 'cfs' | 'dataset' | 'hostPath' | 'emptyDir' | 'cds';
  /** 存储配置 */
  config: PFSStorage | BOSStorage | CFSStorage | DatasetStorage | HostPathStorage | CDSStorage;
}

// 各类型存储配置
interface PFSStorage {
  type: 'pfs';
  instanceId: string;
  sourcePath: string;
}

interface BOSStorage {
  type: 'bos';
  bucket: string;
  path: string;
  version?: 'v1' | 'v2';
}

interface CFSStorage {
  type: 'cfs';
  instanceId: string;
  sourcePath: string;
  mountPoint?: string;
}

interface DatasetStorage {
  type: 'dataset';
  datasetId: string;
  versionId?: string;
}

interface HostPathStorage {
  type: 'hostPath';
  path: string;
}

interface CDSStorage {
  type: 'cds';
  capacity: number;  // 容量(GB)
}
```

#### 转换规则

| 原模块 | 原结构 | 转换为统一结构 |
|-------|-------|--------------|
| 训练任务 | `DataSource: {type, name, sourcePath, mountPath, options}` | `StorageMount: {name, mountPath, readOnly, storageType, config}` |
| 服务部署 | `VolumnConf + VolumnMountConf` | `StorageMount`（合并两个结构） |
| 开发机 | `DevVolumnConf` | `StorageMount` |

---

### 3.3 镜像配置定义（3种不同结构）

#### 原始定义

```typescript
// ============ 训练任务模块 ============
// 创建训练任务 - 镜像配置
image: string;                          // 镜像地址字符串
imageConfig?: {
  username: string;
  password: string;
};

// ============ 服务部署模块 ============
// 数据结构.md - ImageConf
interface ImageConf {
  imageType: number;          // 0:预置镜像 1:ccr 2:其他
  imageUrl: string;
  username?: string;
  password?: string;
}

// ============ 开发机模块 ============
// 数据结构.md - Image
interface Image {
  imageType: number;          // 0:预置镜像 1:自定义镜像 2:其他
  imageUrl: string;
  username?: string;
  password?: string;
}
```

#### 统一后的结构

```typescript
/**
 * 统一的镜像配置
 * 适用于：训练任务、服务部署、开发机
 */
interface ImageConfig {
  /** 镜像地址 */
  url: string;
  /** 镜像来源 */
  source?: 'preset' | 'custom' | 'ccr';
  /** 私有镜像认证 */
  auth?: {
    username: string;
    password: string;
  };
}
```

#### 转换规则

| 原模块 | 原结构 | 转换为统一结构 |
|-------|-------|--------------|
| 训练任务 | `image: "xxx", imageConfig: {username, password}` | `{url: "xxx", auth: {username, password}}` |
| 服务部署 | `ImageConf: {imageType, imageUrl, username, password}` | `{url: imageUrl, source: 映射imageType, auth: {username, password}}` |
| 开发机 | `Image: {imageType, imageUrl, username, password}` | `{url: imageUrl, source: 映射imageType, auth: {username, password}}` |

---

### 3.4 环境变量定义（2种不同结构）

#### 原始定义

```typescript
// ============ 训练任务模块 ============
// 使用数组形式
envs: Array<{name: string; value: string}>;

// ============ 服务部署模块 & 开发机模块 ============
// 使用对象形式
envs: Record<string, string>;
```

#### 统一后的结构

```typescript
/**
 * 统一的环境变量配置
 * 使用对象形式，更简洁
 */
interface EnvironmentVariables {
  [key: string]: string;
}

// 网关内部转换时，对象形式可转换为数组形式以兼容训练任务API
```

---

### 3.5 资源池引用定义（3种不同结构）

#### 原始定义

```typescript
// ============ 训练任务模块 ============
// Query参数传递
?resourcePoolId=xxx&queueID=xxx

// Body中也传递
{
  queue: string;  // 与queueID重复
}

// ============ 服务部署模块 ============
interface ResourcePoolConf {
  resourcePoolId: string;
  resourcePoolName: string;
  queueName: string;
  resourcePoolType: string;
}

// ============ 开发机模块 ============
interface ResourcePool {
  resourcePoolType?: string;
  resourcePoolId?: string;
  resourcePoolName?: string;
  queueName: string;
}
```

#### 统一后的结构

```typescript
/**
 * 统一的资源池引用
 * 适用于：训练任务、服务部署、开发机
 */
interface ResourcePoolRef {
  /** 资源池ID */
  poolId: string;
  /** 资源池名称（只读，查询时返回） */
  poolName?: string;
  /** 资源池类型 */
  poolType?: 'self-managed' | 'managed';
  /** 队列名称 */
  queue: string;
}
```

---

### 3.6 其他需要统一的结构体

#### 3.6.1 标签定义

```typescript
// 原始定义（训练任务）
interface Label {
  key: string;
  value: string;
}

// 统一后（建议使用对象形式）
type Labels = Record<string, string>;
```

#### 3.6.2 探针配置（服务部署独有）

```typescript
// 保持原有结构，无需跨模块统一
interface ProbeConf {
  initialDelaySeconds: number;
  timeoutSeconds: number;
  periodSeconds: number;
  successThreshold: number;
  failureThreshold: number;
  handler: ProbeHandlerConf;
}
```

---

## 四、规范化方案

### 4.1 请求头规范化

| 规范项 | 当前状态 | 规范后 |
|-------|---------|-------|
| 版本头 | 训练任务用`X-API-Version`，其他用`version` | 统一使用`version: v2` |

### 4.2 HTTP方法规范化

| 操作类型 | 当前状态 | 规范后 |
|---------|---------|-------|
| 查询操作 | 训练任务DescribeJobs/DescribeJob使用POST | 改为GET |
| 创建操作 | 统一使用POST | 保持POST |
| 更新操作 | 统一使用POST | 保持POST |
| 删除操作 | 统一使用POST | 保持POST |

### 4.3 Action命名规范化

| 当前Action | 问题 | 规范后 |
|-----------|------|-------|
| DescribeJobs | 无问题 | 保持 |
| DescribeServices | 无问题 | 保持 |
| DescribeDevInstances | 无问题 | 保持 |
| DescribeDatasets | 无问题 | 保持 |
| DescribeModels | 无问题 | 保持 |
| DescribeResourcePools | 无问题 | 保持 |
| DescribeResourcePoolConfiguration | 过长 | DescribeResourcePoolConfig |
| CreateDevInstanceImage | 风格不一致 | CreateDevInstanceImagePackJob |
| CreateNodes | 使用复数 | CreateNode |
| DeleteNodes | 使用复数 | DeleteNode |

### 4.4 参数位置规范化

| 接口 | 当前状态 | 规范后 |
|-----|---------|-------|
| CreateJob | `queueID`(Query) + `queue`(Body)重复 | 仅保留`queue`(Body) |
| DescribeJobs | 参数在Query和Body混用 | 统一在Query |
| DescribeNodes | `pageNo` | `pageNumber`（与其他接口统一） |

### 4.5 字段命名规范化

| 当前字段名 | 问题 | 规范后 |
|-----------|------|-------|
| `volumnConfs` | 拼写错误 | `volumeConfs` |
| `volumnName` | 拼写错误 | `volumeName` |
| `volumnType` | 拼写错误 | `volumeType` |
| `pageNo` | 与其他接口不一致 | `pageNumber` |

---

## 五、网关架构设计

### 5.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Application                       │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway (本网关)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Router      │  │  Normalizer  │  │  Transformer │          │
│  │  路由分发    │  │  规范化处理  │  │  结构转换    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Validator   │  │  Backend     │  │  Cache       │          │
│  │  参数校验    │  │  Client      │  │  响应缓存    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    百舸后端服务 (原API)                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ 训练任务 │  │ 服务部署 │  │ 开发机   │  │ 数据集   │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 核心模块设计

#### 5.2.1 规范化器（Normalizer）

```typescript
interface NormalizerConfig {
  // 请求头规范化
  headers: {
    versionHeader: 'version' | 'X-API-Version';
  };
  // HTTP方法规范化
  methods: {
    describe: 'GET' | 'POST';
  };
  // 参数位置规范化
  params: {
    paginationInQuery: boolean;
    resourcePoolInBody: boolean;
  };
}

class RequestNormalizer {
  normalize(request: RawRequest): NormalizedRequest {
    return {
      // 统一请求头
      headers: this.normalizeHeaders(request.headers),
      // 统一HTTP方法
      method: this.normalizeMethod(request.method, request.action),
      // 统一参数位置
      params: this.normalizeParams(request.params, request.action),
    };
  }
}
```

#### 5.2.2 结构转换器（Transformer）

```typescript
// 资源规格转换器
class ComputeResourcesTransformer {
  // 统一结构 -> 训练任务结构
  toTrainingJob(resources: ComputeResources): Resource[] {
    const result: Resource[] = [];
    result.push({ name: 'cpu', quantity: resources.cpu });
    result.push({ name: 'memory', quantity: resources.memory });
    if (resources.accelerator) {
      result.push({
        name: resources.accelerator.type,
        quantity: resources.accelerator.count
      });
    }
    if (resources.sharedMemory) {
      result.push({ name: 'sharedMemory', quantity: resources.sharedMemory });
    }
    return result;
  }

  // 统一结构 -> 服务部署结构
  toService(resources: ComputeResources): ContainerResources {
    return {
      cpus: resources.cpu,
      memory: resources.memory,
      acceleratorCount: resources.accelerator?.count ?? 0,
      acceleratorType: resources.accelerator?.type ?? '',
    };
  }

  // 统一结构 -> 开发机结构
  toDevInstance(resources: ComputeResources): DevResources {
    return {
      cpus: resources.cpu,
      memory: resources.memory,
      acceleratorCount: resources.accelerator?.count ?? 0,
      acceleratorType: resources.accelerator?.type ?? '',
      shmSize: resources.sharedMemory ?? 0,
    };
  }
}

// 存储挂载转换器
class StorageMountTransformer {
  // 统一结构 -> 训练任务结构
  toTrainingJob(mounts: StorageMount[]): DataSource[] {
    return mounts.map(mount => ({
      type: mount.storageType,
      name: this.extractName(mount.config),
      sourcePath: this.extractSourcePath(mount.config),
      mountPath: mount.mountPath,
      options: { readOnly: mount.readOnly }
    }));
  }

  // 统一结构 -> 服务部署结构（需要同时转换VolumnConf和VolumnMountConf）
  toService(mounts: StorageMount[]): { volumns: VolumnConf[]; volumeMounts: VolumnMountConf[] } {
    const volumns: VolumnConf[] = [];
    const volumeMounts: VolumnMountConf[] = [];
    
    mounts.forEach(mount => {
      volumns.push({
        volumeType: mount.storageType,
        volumnName: mount.name,
        [mount.storageType]: this.extractConfig(mount.config)
      });
      volumeMounts.push({
        volumnName: mount.name,
        mountPath: mount.mountPath,
        readOnly: mount.readOnly
      });
    });
    
    return { volumns, volumeMounts };
  }
}
```

### 5.3 目录结构

```
gateway/
├── src/
│   ├── index.ts                 # 入口文件
│   ├── config/
│   │   └── index.ts             # 配置管理
│   ├── routes/
│   │   ├── index.ts             # 路由注册
│   │   ├── training-jobs.ts     # 训练任务路由
│   │   ├── services.ts          # 服务部署路由
│   │   ├── dev-instances.ts     # 开发机路由
│   │   ├── datasets.ts          # 数据集路由
│   │   ├── models.ts            # 模型管理路由
│   │   └── resource-pools.ts    # 资源池路由
│   ├── normalizers/
│   │   ├── index.ts             # 规范化器入口
│   │   ├── headers.ts           # 请求头规范化
│   │   ├── method.ts            # HTTP方法规范化
│   │   └── params.ts            # 参数位置规范化
│   ├── transformers/
│   │   ├── index.ts             # 转换器入口
│   │   ├── compute-resources.ts # 资源规格转换
│   │   ├── storage-mount.ts     # 存储挂载转换
│   │   ├── image-config.ts      # 镜像配置转换
│   │   ├── env-vars.ts          # 环境变量转换
│   │   └── resource-pool-ref.ts # 资源池引用转换
│   ├── backend/
│   │   ├── client.ts            # 后端API客户端
│   │   └── endpoints.ts         # 端点配置
│   ├── schemas/
│   │   ├── common.ts            # 公共schema
│   │   ├── compute-resources.ts # 资源规格schema
│   │   ├── storage-mount.ts     # 存储挂载schema
│   │   └── ...
│   ├── middlewares/
│   │   ├── auth.ts              # 认证中间件
│   │   ├── error-handler.ts     # 错误处理
│   │   ├── request-logger.ts    # 请求日志
│   │   └── response-cache.ts    # 响应缓存
│   ├── types/
│   │   ├── unified/             # 统一类型定义
│   │   │   ├── compute-resources.ts
│   │   │   ├── storage-mount.ts
│   │   │   ├── image-config.ts
│   │   │   └── ...
│   │   ├── backend/             # 后端原始类型定义
│   │   │   ├── training-job.ts
│   │   │   ├── service.ts
│   │   │   ├── dev-instance.ts
│   │   │   └── ...
│   │   └── index.ts
│   └── utils/
│       ├── logger.ts
│       └── http.ts
├── tests/
├── docs/
│   └── openapi.yaml
├── package.json
├── tsconfig.json
└── .env.example
```

---

## 六、实施计划

### 6.1 阶段划分

| 阶段 | 内容 | 预计时间 |
|-----|------|---------|
| 第一阶段 | 基础框架搭建、配置管理、日志系统 | 3天 |
| 第二阶段 | 规范化器实现（请求头、HTTP方法、参数位置） | 2天 |
| 第三阶段 | 结构转换器实现（资源规格、存储挂载、镜像配置等） | 5天 |
| 第四阶段 | 路由和控制器实现 | 5天 |
| 第五阶段 | 测试和文档 | 3天 |

### 6.2 优先级

1. **P0（必须）**：请求头规范化、HTTP方法规范化
2. **P1（重要）**：结构转换器（资源规格、存储挂载、镜像配置）
3. **P2（一般）**：参数位置规范化、字段命名规范化

---

## 七、附录

### 7.1 完整接口清单（69个）

| 模块 | 接口数量 |
|-----|---------|
| 分布式训练 | 13 |
| 在线服务部署 | 16 |
| 开发机 | 12 |
| 数据集 | 9 |
| 模型管理 | 8 |
| 资源池 | 11 |
| **总计** | **69** |

### 7.2 需要统一的结构体清单

| 结构体名称 | 涉及模块 | 优先级 |
|-----------|---------|-------|
| ComputeResources（资源规格） | 训练任务、服务部署、开发机 | P0 |
| StorageMount（存储挂载） | 训练任务、服务部署、开发机 | P0 |
| ImageConfig（镜像配置） | 训练任务、服务部署、开发机 | P0 |
| EnvironmentVariables（环境变量） | 训练任务、服务部署、开发机 | P1 |
| ResourcePoolRef（资源池引用） | 训练任务、服务部署、开发机 | P1 |

### 7.3 字段命名修正清单

| 原字段名 | 正确字段名 | 涉及模块 |
|---------|-----------|---------|
| `volumnConfs` | `volumeConfs` | 开发机 |
| `volumnName` | `volumeName` | 服务部署 |
| `volumnType` | `volumeType` | 开发机 |
| `pageNo` | `pageNumber` | 资源池-节点 |
