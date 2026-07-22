# 百度云API网关设计方案

## 一、接口清单

通过对百舸OpenAPI文档的全面分析，共识别出 **69个接口**，分布在6个模块中。

### 1.1 分布式训练接口（13个）

| 序号 | 接口名称 | Action | HTTP方法 | 请求头版本 |
|-----|---------|--------|---------|-----------|
| 1 | 创建训练任务 | CreateJob | POST | `X-API-Version` |
| 2 | 查询训练任务列表 | DescribeJobs | POST | `X-API-Version` |
| 3 | 查询训练任务详情 | DescribeJob | POST | `X-API-Version` |
| 4 | 更新训练任务 | ModifyJob | POST | `X-API-Version` |
| 5 | 删除训练任务 | DeleteJob | POST | `X-API-Version` |
| 6 | 停止训练任务 | StopJob | POST | `X-API-Version` |
| 7 | 批量停止训练任务 | StopJobs | POST | `X-API-Version` |
| 8 | 查询训练任务日志 | DescribeJobLogs | GET | `X-API-Version` |
| 9 | 查询训练任务事件 | DescribeJobEvents | GET | `X-API-Version` |
| 10 | 查询训练任务Pod事件 | DescribePodEvents | GET | `X-API-Version` |
| 11 | 查询训练任务监控 | DescribeJobMetrics | GET | `X-API-Version` |
| 12 | 查询训练任务所在节点列表 | DescribeJobNodes | GET | `X-API-Version` |
| 13 | 获取训练任务WebTerminal地址 | DescribeJobWebterminal | GET | `X-API-Version` |

### 1.2 在线服务部署接口（16个）

| 序号 | 接口名称 | Action | HTTP方法 | 请求头版本 |
|-----|---------|--------|---------|-----------|
| 1 | 创建服务 | CreateService | POST | `version` |
| 2 | 拉取服务列表 | DescribeServices | GET | `version` |
| 3 | 查询服务详情 | DescribeService | GET | `version` |
| 4 | 升级服务 | ModifyService | POST | `version` |
| 5 | 删除服务 | DeleteService | POST | `version` |
| 6 | 获取服务状态 | DescribeServiceStatus | GET | `version` |
| 7 | 服务扩缩容 | ModifyServiceReplicas | POST | `version` |
| 8 | 配置公网访问 | ModifyServiceNetConfig | POST | `version` |
| 9 | 拉取服务变更记录 | DescribeServiceChangelogs | GET | `version` |
| 10 | 查询服务变更详情 | DescribeServiceChangelog | GET | `version` |
| 11 | 拉取服务pod列表 | DescribeServicePods | GET | `version` |
| 12 | 获取实例组列表 | DescribeServicePodGroups | GET | `version` |
| 13 | 摘除pod流量 | DisableServicePod | POST | `version` |
| 14 | 删除pod并重建 | DeleteServicePod | POST | `version` |
| 15 | 查询推理服务日志 | DescribeInferenceServiceLogs | GET | `version` |
| 16 | 获取推理服务WebTerminal地址 | DescribeServiceWebterminal | GET | `version` |

### 1.3 开发机接口（11个）

| 序号 | 接口名称 | Action | HTTP方法 | 请求头版本 |
|-----|---------|--------|---------|-----------|
| 1 | 创建开发机 | CreateDevInstance | POST | `version` |
| 2 | 查询开发机列表 | DescribeDevInstances | GET | `version` |
| 3 | 查询开发机详情 | DescribeDevInstance | GET | `version` |
| 4 | 删除开发机 | DeleteDevInstance | POST | `version` |
| 5 | 开启实例 | StartDevInstance | POST | `version` |
| 6 | 停止实例 | StopDevInstance | POST | `version` |
| 7 | 定时停止实例 | TimedStopDevInstance | POST | `version` |
| 8 | 变更配置 | ModifyDevInstance | POST | `version` |
| 9 | 制作开发机镜像 | CreateDevInstanceImage | POST | `version` |
| 10 | 查询镜像任务详情 | DescribeImagePackJob | GET | `version` |
| 11 | 查询开发机事件 | DescribeDevInstanceEvents | GET | `version` |

### 1.4 数据集接口（9个）

| 序号 | 接口名称 | Action | HTTP方法 | 请求头版本 |
|-----|---------|--------|---------|-----------|
| 1 | 创建数据集 | CreateDataset | POST | `version` |
| 2 | 获取数据集列表 | DescribeDatasets | GET | `version` |
| 3 | 获取数据集详情 | DescribeDataset | GET | `version` |
| 4 | 修改数据集 | ModifyDataset | POST | `version` |
| 5 | 删除数据集 | DeleteDataset | POST | `version` |
| 6 | 创建数据集版本 | CreateDatasetVersion | POST | `version` |
| 7 | 获取数据集版本列表 | DescribeDatasetVersions | GET | `version` |
| 8 | 获取数据集版本详情 | DescribeDatasetVersion | GET | `version` |
| 9 | 删除数据集版本 | DeleteDatasetVersion | POST | `version` |

### 1.5 模型管理接口（8个）

| 序号 | 接口名称 | Action | HTTP方法 | 请求头版本 |
|-----|---------|--------|---------|-----------|
| 1 | 创建模型 | CreateModel | POST | `version` |
| 2 | 获取模型列表 | DescribeModels | GET | `version` |
| 3 | 获取模型详情 | DescribeModel | GET | `version` |
| 4 | 修改模型 | ModifyModel | POST | `version` |
| 5 | 删除模型 | DeleteModel | POST | `version` |
| 6 | 新建模型版本 | CreateModelVersion | POST | `version` |
| 7 | 获取模型版本列表 | DescribeModelVersions | GET | `version` |
| 8 | 删除模型版本 | DeleteModelVersion | POST | `version` |

### 1.6 资源池接口（11个）

#### 资源池（6个）

| 序号 | 接口名称 | Action | HTTP方法 | 请求头版本 |
|-----|---------|--------|---------|-----------|
| 1 | 创建资源池 | CreateResourcePool | POST | `version` |
| 2 | 查询资源池列表 | DescribeResourcePools | GET | `version` |
| 3 | 查询资源池详情 | DescribeResourcePool | GET | `version` |
| 4 | 查询资源池配置 | DescribeResourcePoolConfiguration | GET | `version` |
| 5 | 查询资源池概览 | DescribeResourcePoolsStatistic | GET | `version` |
| 6 | 删除资源池 | DeleteResourcePool | POST | `version` |

#### 队列（4个）

| 序号 | 接口名称 | Action | HTTP方法 | 请求头版本 |
|-----|---------|--------|---------|-----------|
| 1 | 创建队列 | CreateQueue | POST | `version` |
| 2 | 查询队列列表 | DescribeQueues | GET | `version` |
| 3 | 查询队列详情 | DescribeQueue | GET | `version` |
| 4 | 删除队列 | DeleteQueue | POST | `version` |

#### 节点（3个）

| 序号 | 接口名称 | Action | HTTP方法 | 请求头版本 |
|-----|---------|--------|---------|-----------|
| 1 | 创建节点 | CreateNodes | POST | `version` |
| 2 | 查询节点列表 | DescribeNodes | GET | `version` |
| 3 | 删除节点 | DeleteNodes | POST | `version` |

---

## 二、公共结构体分析

### 2.1 结构体复用矩阵

通过对比各模块的数据结构，识别出以下可复用的公共结构体：

| 结构体名称                           | 训练任务 | 服务部署 | 开发机 | 数据集 | 模型  | 资源池 | 抽象优先级  |
| ------------------------------- | :--: | :--: | :-: | :-: | :-: | :-: | :----: |
| **ComputeResources** (资源规格)     |  ✓   |  ✓   |  ✓  |  -  |  -  |  ✓  | **P0** |
| **StorageMount** (存储挂载)         |  ✓   |  ✓   |  ✓  |  ✓  |  -  |  -  | **P0** |
| **ImageConfig** (镜像配置)          |  ✓   |  ✓   |  ✓  |  -  |  -  |  -  | **P0** |
| **ResourcePoolRef** (资源池引用)     |  ✓   |  ✓   |  ✓  |  -  |  -  |  ✓  | **P1** |
| **EnvironmentVariables** (环境变量) |  ✓   |  ✓   |  ✓  |  -  |  -  |  -  | **P1** |
| **Labels** (标签)                 |  ✓   |  ✓   |  -  |  -  |  -  |  -  | **P2** |
| **ScheduleConf** (调度配置)         |  ✓   |  ✓   |  ✓  |  -  |  -  |  -  | **P1** |
| **AccessConfig** (访问配置)         |  -   |  ✓   |  ✓  |  -  |  -  |  -  | **P2** |

---

## 三、公共结构体详细定义

### 3.1 ComputeResources（资源规格）- P0

**适用模块**：训练任务、服务部署、开发机、资源池

#### 原始结构对比

| 模块 | 原始结构名 | 字段 |
|-----|----------|------|
| 训练任务 | `Resource[]` | `name: string, quantity: number` (数组形式) |
| 服务部署 | `ContainerConf` | `cpus, memory, acceleratorCount, acceleratorType` |
| 开发机 | `Resources` | `cpus, memory, acceleratorCount, acceleratorType, shmSize` |
| 资源池 | `ResourceAmount` | `milliCPUcores, memoryGi, acceleratorCardList[]` |

#### 统一结构

```typescript
/**
 * 统一的计算资源配置
 * 适用于：训练任务、服务部署、开发机、资源池
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
  /** 共享内存大小(GB)，可选 */
  sharedMemory?: number;
}
```

#### 转换规则

| 原模块 | 原结构示例 | 转换为统一结构 |
|-------|----------|--------------|
| 训练任务 | `[{name: "cpu", quantity: 4}, {name: "memory", quantity: 16}, {name: "baidu.com/a800_80g_cgpu", quantity: 2}]` | `{cpu: 4, memory: 16, accelerator: {type: "baidu.com/a800_80g_cgpu", count: 2}}` |
| 服务部署 | `{cpus: 4, memory: 16, acceleratorCount: 2, acceleratorType: "xxx"}` | `{cpu: 4, memory: 16, accelerator: {type: "xxx", count: 2}}` |
| 开发机 | `{cpus: 4, memory: 16, acceleratorCount: 2, acceleratorType: "xxx", shmSize: 8}` | `{cpu: 4, memory: 16, accelerator: {type: "xxx", count: 2}, sharedMemory: 8}` |

---

### 3.2 StorageMount（存储挂载）- P0

**适用模块**：训练任务、服务部署、开发机、数据集

#### 原始结构对比

| 模块 | 原始结构名 | 存储类型 | 特点 |
|-----|----------|---------|------|
| 训练任务 | `DataSource` | pfs, hostPath, dataset, bos, cfs, rapidfs, emptydir | 单一结构，type+name+sourcePath+mountPath |
| 服务部署 | `VolumnConf + VolumnMountConf` | pfs, hostpath, emptydir, bos, dataset | 分离结构，需要两个结构配合使用 |
| 开发机 | `VolumnConf` | cds, pfs, dataset, bos, cfs | 单一结构，包含mountPath |
| 数据集 | `Dataset` | pfs, bos | 数据集关联存储 |

#### 支持的存储类型

| 存储类型 | 标识符 | 训练任务 | 服务部署 | 开发机 | 数据集 |
|---------|-------|:------:|:------:|:----:|:----:|
| 并行存储PFS | `pfs` | ✓ | ✓ | ✓ | ✓ |
| 对象存储BOS | `bos` | ✓ | ✓ | ✓ | ✓ |
| 云文件系统CFS | `cfs` | ✓ | - | ✓ | - |
| 数据集 | `dataset` | ✓ | ✓ | ✓ | - |
| 宿主机路径 | `hostPath` | ✓ | ✓ | - | - |
| 临时目录 | `emptyDir` | ✓ | ✓ | - | - |
| 云磁盘CDS | `cds` | - | - | ✓ | - |
| RapidFS | `rapidfs` | ✓ | - | - | - |

#### 统一结构

```typescript
/**
 * 统一的存储挂载配置
 * 适用于：训练任务、服务部署、开发机、数据集
 */
interface StorageMount {
  /** 挂载名称 */
  name: string;
  /** 容器内挂载路径 */
  mountPath: string;
  /** 是否只读 */
  readOnly?: boolean;
  /** 存储类型 */
  storageType: 'pfs' | 'bos' | 'cfs' | 'dataset' | 'hostPath' | 'emptyDir' | 'cds' | 'rapidfs';
  /** 存储配置（根据storageType选择对应类型） */
  config: PFSStorage | BOSStorage | CFSStorage | DatasetStorage | HostPathStorage | EmptyDirStorage | CDSStorage | RapidFSStorage;
}

/** PFS存储配置 */
interface PFSStorage {
  type: 'pfs';
  /** PFS实例ID */
  instanceId: string;
  /** 源路径 */
  sourcePath: string;
  /** 挂载点ID列表（可选） */
  mountTargetId?: string[];
}

/** BOS存储配置 */
interface BOSStorage {
  type: 'bos';
  /** BOS桶名 */
  bucket: string;
  /** 源路径 */
  path: string;
  /** BOS版本：v1 或 v2 */
  version?: 'v1' | 'v2';
  /** 缓存大小限制 */
  cacheLimitSize?: string;
}

/** CFS存储配置 */
interface CFSStorage {
  type: 'cfs';
  /** CFS实例ID */
  instanceId: string;
  /** 源路径 */
  sourcePath: string;
  /** 挂载点 */
  mountPoint?: string;
}

/** 数据集存储配置 */
interface DatasetStorage {
  type: 'dataset';
  /** 数据集ID */
  datasetId: string;
  /** 数据集版本ID */
  versionId?: string;
  /** 存储介质类型 */
  storageType?: 'pfs' | 'bos';
  /** 底层存储配置（当需要直接访问底层存储时） */
  underlyingStorage?: PFSStorage | BOSStorage;
}

/** HostPath存储配置 */
interface HostPathStorage {
  type: 'hostPath';
  /** 宿主机路径 */
  path: string;
}

/** EmptyDir存储配置 */
interface EmptyDirStorage {
  type: 'emptyDir';
  /** 大小限制(GB) */
  sizeLimit?: number;
  /** 存储介质 */
  medium?: string;
}

/** CDS存储配置 */
interface CDSStorage {
  type: 'cds';
  /** 容量(GB)，需大于100 */
  capacity: number;
}

/** RapidFS存储配置 */
interface RapidFSStorage {
  type: 'rapidfs';
  instanceId?: string;
  sourcePath?: string;
}
```

#### 转换规则

| 原模块 | 原结构示例 | 转换为统一结构 |
|-------|----------|--------------|
| 训练任务 | `{type: "pfs", name: "pfs-xxx", sourcePath: "/data", mountPath: "/mnt/data", options: {readOnly: true}}` | `{name: "pfs-xxx", mountPath: "/mnt/data", readOnly: true, storageType: "pfs", config: {type: "pfs", instanceId: "pfs-xxx", sourcePath: "/data"}}` |
| 服务部署 | `VolumnConf: {volumeType: "pfs", volumnName: "pfs-xxx", pfs: {InstanceId: "pfs-xxx", sourcePath: "/data"}} + VolumnMountConf: {volumnName: "pfs-xxx", mountPath: "/mnt/data", readOnly: true}` | `{name: "pfs-xxx", mountPath: "/mnt/data", readOnly: true, storageType: "pfs", config: {type: "pfs", instanceId: "pfs-xxx", sourcePath: "/data"}}` |
| 开发机 | `{volumnType: "cds", mountPath: "/.rootfs", readOnly: true, cds: {capacity: 100}}` | `{name: "cds-xxx", mountPath: "/.rootfs", readOnly: true, storageType: "cds", config: {type: "cds", capacity: 100}}` |

---

### 3.3 ImageConfig（镜像配置）- P0

**适用模块**：训练任务、服务部署、开发机

#### 原始结构对比

| 模块 | 原始结构名 | 字段 |
|-----|----------|------|
| 训练任务 | `image: string + imageConfig` | `image` (字符串) + `imageConfig: {username, password}` |
| 服务部署 | `ImageConf` | `imageType, imageUrl, username?, password?` |
| 开发机 | `Image` | `imageType, imageUrl, username?, password?` |

#### imageType 映射关系

| imageType | 含义 | 统一枚举值 |
|-----------|------|----------|
| 0 | 预置镜像 | `preset` |
| 1 | CCR镜像 / 自定义镜像 | `custom` |
| 2 | 其他 | `other` |

#### 统一结构

```typescript
/**
 * 统一的镜像配置
 * 适用于：训练任务、服务部署、开发机
 */
interface ImageConfig {
  /** 镜像地址 */
  url: string;
  /** 镜像来源 */
  source?: 'preset' | 'custom' | 'other';
  /** 私有镜像认证 */
  auth?: {
    username: string;
    password: string;
  };
}
```

#### 转换规则

| 原模块 | 原结构示例 | 转换为统一结构 |
|-------|----------|--------------|
| 训练任务 | `image: "xxx", imageConfig: {username: "user", password: "pass"}` | `{url: "xxx", auth: {username: "user", password: "pass"}}` |
| 服务部署 | `{imageType: 0, imageUrl: "xxx", username: "user", password: "pass"}` | `{url: "xxx", source: "preset", auth: {username: "user", password: "pass"}}` |
| 开发机 | `{imageType: 1, imageUrl: "xxx", username: "user", password: "pass"}` | `{url: "xxx", source: "custom", auth: {username: "user", password: "pass"}}` |

---

### 3.4 ResourcePoolRef（资源池引用）- P1

**适用模块**：训练任务、服务部署、开发机、资源池

#### 原始结构对比

| 模块 | 传递方式 | 字段 |
|-----|---------|------|
| 训练任务 | Query + Body | `resourcePoolId`(Query), `queueID`(Query), `queue`(Body) |
| 服务部署 | `ResourcePoolConf` | `resourcePoolId, resourcePoolName, queueName, resourcePoolType` |
| 开发机 | `ResourcePool` | `resourcePoolType?, resourcePoolId?, resourcePoolName?, queueName` |
| 资源池 | 直接ID | `resourcePoolId` |

#### 统一结构

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
  poolType?: 'common' | 'dedicatedV2' | 'serverless';
  /** 队列名称 */
  queue: string;
}
```

#### 转换规则

| 原模块 | 原结构示例 | 转换为统一结构 |
|-------|----------|--------------|
| 训练任务 | Query: `resourcePoolId=xxx&queueID=default` | `{poolId: "xxx", queue: "default"}` |
| 服务部署 | `{resourcePoolId: "xxx", resourcePoolName: "pool-name", queueName: "default", resourcePoolType: ""}` | `{poolId: "xxx", poolName: "pool-name", queue: "default", poolType: "common"}` |
| 开发机 | `{resourcePoolType: "serverless", queueName: "queue-id"}` | `{poolType: "managed", queue: "queue-id"}` |

---

### 3.5 EnvironmentVariables（环境变量）- P1

**适用模块**：训练任务、服务部署、开发机

#### 原始结构对比

| 模块 | 原始结构 | 格式 |
|-----|---------|------|
| 训练任务 | `envs: Env[]` | 数组形式 `[{name: "KEY", value: "VALUE"}]` |
| 服务部署 | `envs: Map<String, String>` | 对象形式 `{KEY: "VALUE"}` |
| 开发机 | `envs: Map<String, String>` | 对象形式 `{KEY: "VALUE"}` |

#### 统一结构

```typescript
/**
 * 统一的环境变量配置
 * 使用对象形式，更简洁
 */
type EnvironmentVariables = Record<string, string>;
```

#### 转换规则

| 原模块 | 原结构示例 | 转换为统一结构 |
|-------|----------|--------------|
| 训练任务 | `[{name: "KEY1", value: "VALUE1"}, {name: "KEY2", value: "VALUE2"}]` | `{KEY1: "VALUE1", KEY2: "VALUE2"}` |
| 服务部署/开发机 | `{KEY1: "VALUE1", KEY2: "VALUE2"}` | `{KEY1: "VALUE1", KEY2: "VALUE2"}` (无需转换) |

---

### 3.6 ScheduleConf（调度配置）- P1

**适用模块**：训练任务、服务部署、开发机

#### 原始结构对比

| 模块 | 原始结构名 | 字段 |
|-----|----------|------|
| 训练任务 | 顶层字段 | `priority: "high" \| "normal" \| "low"` |
| 服务部署 | `ScheduleConf` | `priority: "high" \| "normal" \| "low"` |
| 开发机 | `ScheduleConf` | `priority, cpuNodeAffinity` |

#### 统一结构

```typescript
/**
 * 统一的调度配置
 * 适用于：训练任务、服务部署、开发机
 */
interface ScheduleConfig {
  /** 调度优先级 */
  priority?: 'high' | 'normal' | 'low';
  /** 是否优先调度到CPU节点（开发机专用） */
  cpuNodeAffinity?: boolean;
}
```

---

## 四、问题分析

### 4.1 接口问题汇总

| 问题类型 | 涉及接口 | 问题描述 | 优化方案 |
|---------|---------|---------|---------|
| **请求头不一致** | 训练任务模块全部接口 | 使用`X-API-Version`，其他模块用`version` | 统一使用`version: v2` |
| **HTTP方法语义混乱** | DescribeJobs, DescribeJob | 查询操作使用POST | 改为GET |
| **参数位置混乱** | DescribeJobs | 参数同时出现在Query和Body中 | 统一在Query |
| **参数冗余** | CreateJob | `queueID`(Query) + `queue`(Body)重复 | 仅保留`queue`(Body) |
| **分页参数不一致** | DescribeNodes | 使用`pageNo`，其他接口用`pageNumber` | 统一使用`pageNumber` |
| **字段拼写错误** | 服务部署/开发机存储配置 | `volumnConfs`应为`volumeConfs` | 网关层修正 |

### 4.2 字段命名修正清单

| 原字段名 | 正确字段名 | 涉及模块 |
|---------|-----------|---------|
| `volumnConfs` | `volumeConfs` | 开发机 |
| `volumnName` | `volumeName` | 服务部署 |
| `volumnType` | `volumeType` | 开发机 |
| `pageNo` | `pageNumber` | 资源池-节点 |

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

#### 5.2.1 Transformer 转换器

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
  toService(resources: ComputeResources): { cpus: number; memory: number; acceleratorCount: number; acceleratorType?: string } {
    return {
      cpus: resources.cpu,
      memory: resources.memory,
      acceleratorCount: resources.accelerator?.count ?? 0,
      acceleratorType: resources.accelerator?.type,
    };
  }

  // 统一结构 -> 开发机结构
  toDevInstance(resources: ComputeResources): { cpus: number; memory: number; acceleratorCount: number; acceleratorType?: string; shmSize?: number } {
    return {
      cpus: resources.cpu,
      memory: resources.memory,
      acceleratorCount: resources.accelerator?.count ?? 0,
      acceleratorType: resources.accelerator?.type,
      shmSize: resources.sharedMemory,
    };
  }
}

// 存储挂载转换器
class StorageMountTransformer {
  // 统一结构 -> 训练任务结构
  toTrainingJob(mounts: StorageMount[]): DataSource[] {
    return mounts.map(mount => ({
      type: mount.storageType,
      name: this.extractName(mount),
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
        volumnName: mount.name, // 注意：保持原字段名以兼容后端
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

  // 统一结构 -> 开发机结构
  toDevInstance(mounts: StorageMount[]): VolumnConf[] {
    return mounts.map(mount => ({
      volumnType: mount.storageType,
      mountPath: mount.mountPath,
      readOnly: mount.readOnly,
      [mount.storageType]: this.extractConfig(mount.config)
    }));
  }
}
```

### 5.3 目录结构

```
gateway/
├── src/
│   ├── index.ts                 # 入口文件
│   ├── app.ts                   # 应用配置
│   ├── config/
│   │   └── index.ts             # 配置管理
│   ├── types/
│   │   ├── unified/             # 统一类型定义
│   │   │   ├── compute-resources.ts  # 资源规格
│   │   │   ├── storage-mount.ts      # 存储挂载
│   │   │   ├── image-config.ts       # 镜像配置
│   │   │   ├── resource-pool-ref.ts  # 资源池引用
│   │   │   ├── env-vars.ts           # 环境变量
│   │   │   ├── schedule-config.ts    # 调度配置
│   │   │   └── index.ts
│   │   ├── backend/             # 后端原始类型定义
│   │   │   ├── training-job.ts
│   │   │   ├── service.ts
│   │   │   ├── dev-instance.ts
│   │   │   ├── dataset.ts
│   │   │   ├── model.ts
│   │   │   ├── resource-pool.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── transformers/            # 结构转换器
│   │   ├── index.ts
│   │   ├── compute-resources.ts # 资源规格转换
│   │   ├── storage-mount.ts     # 存储挂载转换
│   │   ├── image-config.ts      # 镜像配置转换
│   │   ├── resource-pool-ref.ts # 资源池引用转换
│   │   └── env-vars.ts          # 环境变量转换
│   ├── backend/
│   │   ├── client.ts            # 后端API客户端
│   │   └── endpoints.ts         # 端点配置
│   ├── routes/
│   │   ├── index.ts             # 路由注册
│   │   ├── training-jobs.ts
│   │   ├── services.ts
│   │   ├── dev-instances.ts
│   │   ├── datasets.ts
│   │   ├── models.ts
│   │   └── resource-pools.ts
│   ├── middlewares/
│   │   ├── auth.ts              # 认证中间件
│   │   ├── error-handler.ts     # 错误处理
│   │   └── request-logger.ts    # 请求日志
│   └── utils/
│       ├── logger.ts
│       └── http.ts
├── tests/
├── docs/
│   └── openapi.yaml
├── package.json
├── tsconfig.json
└── README.md
```

---

## 六、实施优先级

### 6.1 阶段划分

| 阶段 | 内容 | 优先级 | 预计时间 |
|-----|------|-------|---------|
| **第一阶段** | 基础框架搭建、P0结构体定义与转换器 | P0 | 3天 |
| **第二阶段** | P1结构体定义与转换器、路由实现 | P1 | 4天 |
| **第三阶段** | 请求规范化处理、参数校验 | P1 | 2天 |
| **第四阶段** | 测试和文档完善 | P2 | 2天 |

### 6.2 结构体优先级

| 优先级 | 结构体 | 说明 |
|-------|-------|------|
| **P0** | ComputeResources, StorageMount, ImageConfig | 核心结构，跨模块复用度高 |
| **P1** | ResourcePoolRef, EnvironmentVariables, ScheduleConfig | 重要结构，跨模块复用 |
| **P2** | Labels, AccessConfig, ProbeConf | 模块特定结构，复用度较低 |

---

## 七、附录

### 7.1 GPU芯片资源名称映射表

| 芯片 | 资源名 |
|-----|-------|
| A800-SXM4-80GB | `baidu.com/a800_80g_cgpu` |
| A100-SXM4-40GB | `baidu.com/a100_40g_cgpu` |
| A100-SXM-80GB | `baidu.com/a100_80g_cgpu` |
| A10 | `baidu.com/a10_24g_cgpu` |
| H800 | `baidu.com/h800_80g_cgpu` |
| Tesla V100-SXM2-16GB | `baidu.com/v100_16g_cgpu` |
| Tesla V100-SXM2-32GB | `baidu.com/v100_32g_cgpu` |
| L20 | `baidu.com/l20_cgpu` |
| L40 | `baidu.com/l40_cgpu` |
| H20 | `baidu.com/h20_96g_cgpu` |
| H20Z | `baidu.com/h20z_141g_cgpu` |
| H20-3e | `baidu.com/h20_141g_cgpu` |
