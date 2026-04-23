/**
 * 统一的资源池类型定义
 */
export interface ResourcePool {
  /** 资源池ID */
  id: string;
  /** 资源池名称 */
  name: string;
  /** 区域 */
  region?: string;
  /** 资源池类型 */
  type: 'selfManaged' | 'managed';
  /** 描述 */
  description?: string;
  /** 状态 */
  status?: string;
  /** 节点数 */
  nodeCount?: number;
  /** 是否暴露公网 */
  exposedPublic?: boolean;
  /** 是否开启删除保护 */
  forbidDelete?: boolean;
  /** 是否开启碎片治理 */
  deschedulerEnabled?: boolean;
  /** K8s版本 */
  k8sVersion?: string;
  /** 创建时间 */
  createdAt?: string;
  /** 更新时间 */
  updatedAt?: string;
  /** 创建者 */
  createdBy?: string;
}

/**
 * 队列
 */
export interface Queue {
  /** 队列ID */
  id: string;
  /** 队列名称 */
  name: string;
  /** 队列类型 */
  type?: 'regular' | 'elastic' | 'physical';
  /** 资源池ID */
  resourcePoolId?: string;
  /** 描述 */
  description?: string;
  /** 是否开启 */
  opened?: boolean;
  /** 是否可回收 */
  reclaimable?: boolean;
  /** 调度策略 */
  queueingStrategy?: 'bestEffortFIFO' | 'strictFIFO';
  /** 是否开启vGPU */
  enableVGPU?: boolean;
  /** 资源容量 */
  capability?: ResourceAmount;
  /** 已分配资源 */
  allocated?: ResourceAmount;
  /** 运行中任务数 */
  runningJobs?: number;
  /** 排队中任务数 */
  pendingJobs?: number;
  /** 创建时间 */
  createdAt?: string;
  /** 更新时间 */
  updatedAt?: string;
}

/**
 * 资源数量
 */
export interface ResourceAmount {
  /** CPU（毫核） */
  cpuMilliCores?: string;
  /** 内存（Gi） */
  memoryGi?: string;
  /** 加速卡列表 */
  acceleratorCards?: Array<{
    type: string;
    count: string;
    description?: string;
  }>;
}

/**
 * 节点
 */
export interface Node {
  /** 节点名称 */
  name?: string;
  /** 实例ID */
  instanceId?: string;
  /** 区域 */
  region?: string;
  /** 可用区 */
  zone?: string;
  /** 规格 */
  flavorName?: string;
  /** 状态 */
  status?: string;
  /** 付费类型 */
  chargingType?: 'prepaid' | 'postpaid';
  /** 创建时间 */
  createdAt?: string;
  /** 资源配置 */
  resources?: {
    cpuCores?: number;
    memoryGi?: number;
    gpuCount?: number;
  };
}

/**
 * 查询资源池列表参数
 */
export interface ListResourcePoolsParams {
  /** 资源池类型 */
  type: 'selfManaged' | 'managed';
  /** 关键字类型 */
  keywordType?: 'name' | 'id';
  /** 关键字 */
  keyword?: string;
  /** 排序字段 */
  orderBy?: 'name' | 'id' | 'createdAt';
  /** 排序方向 */
  order?: 'asc' | 'desc';
  /** 页码 */
  pageNumber?: number;
  /** 每页数量 */
  pageSize?: number;
}
