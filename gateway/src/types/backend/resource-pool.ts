/**
 * 资源池模块 - 后端原始类型定义
 */

/**
 * 后端资源池规格
 */
export interface BackendResourcePoolSpec {
  region?: string;
  resourcePoolId: string;
  type: 'common' | 'dedicatedV2';
  name: string;
  description?: string;
  exposedPublic?: boolean;
  forbidDelete?: boolean;
  deschedulerEnabled?: boolean;
  unifiedSchedulerEnabled?: boolean;
  associatedResources?: BackendAssociateResource[];
  network?: BackendNetwork;
  bindingStorages?: BackendProviderInfo[];
  bindingMonitors?: BackendProviderInfo[];
  phase?: string;
  nodeNum?: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  k8sVersion?: string;
  runtimeType?: string;
  runtimeVersion?: string;
  configuration?: {
    exposedPublic?: boolean;
    forbidDelete?: boolean;
    deschedulerEnabled?: boolean;
    unifiedSchedulerEnabled?: boolean;
    datasetPermissionEnabled?: boolean;
    volumePermissionEnabled?: boolean;
    imageNoAuthPullEnabled?: boolean;
    publicNetInferenceServiceEnable?: boolean;
  };
}

/**
 * 后端关联资源
 */
export interface BackendAssociateResource {
  provider: string;
  id: string;
  uuid?: string;
  region?: string;
  zone?: string;
}

/**
 * 后端网络配置
 */
export interface BackendNetwork {
  mode: string;
  master?: BackendNetworkInfo;
  nodes?: BackendNetworkInfo;
  pods?: BackendNetworkInfo;
  clusterIPCidr?: string;
  loadBalanceService?: BackendNetworkInfo;
  maxPodsPerNode?: number;
}

/**
 * 后端网络信息
 */
export interface BackendNetworkInfo {
  region?: string;
  vpcId?: string;
  vpcUuid?: string;
  vpcCidr?: string;
  subnetIds?: string[];
  subnetCidr?: string;
  securityGroups?: Array<{
    type?: string;
    id?: string;
    name?: string;
  }>;
}

/**
 * 后端提供者信息
 */
export interface BackendProviderInfo {
  provider: string;
  type?: string;
  id?: string;
  options?: Record<string, string>;
  region?: string;
  zone?: string;
}

/**
 * 后端队列项
 */
export interface BackendQueueItem {
  resourceQueueId: string;
  resourceQueueName: string;
  description?: string;
  createdAt?: string | number;
  updatedAt?: string | number;
  resourceQueueType?: string;
  resourcePoolId?: string;
  parentQueue?: string;
  children?: BackendQueueItem[];
  opened?: boolean;
  reclaimable?: boolean;
  preemptable?: boolean;
  disableOversell?: boolean;
  queueingStrategy?: string;
  enableVGPU?: boolean;
  capability?: BackendResourceAmount;
  deserved?: BackendResourceAmount;
  guarantee?: BackendResourceAmount;
  allocated?: BackendResourceAmount;
  runningJobs?: number;
  inqueueJobs?: number;
  pendingJobs?: number;
  bindingNodes?: BackendBindingNodeInfo[];
}

/**
 * 后端资源数量
 */
export interface BackendResourceAmount {
  milliCPUcores?: string;
  memoryGi?: string;
  acceleratorCardList?: Array<{
    acceleratorType: string;
    acceleratorCount: string;
    acceleratorDescription?: string;
  }>;
}

/**
 * 后端绑定节点信息
 */
export interface BackendBindingNodeInfo {
  acceleratorType?: string;
  machineSpec?: string;
  count?: number;
  nodeNameList?: string[];
}

/**
 * 后端节点
 */
export interface BackendNode {
  nodeSpec?: {
    region?: string;
    zone?: string;
    flavorName?: string;
    resourcePoolId?: string;
    accountId?: string;
    instanceName?: string;
    nodeName?: string;
    instanceType?: string;
    instanceSpec?: string;
    instanceId?: string;
    resourceChargingOption?: {
      chargingType: 'Prepaid' | 'Postpaid';
      purchaseTime?: number;
      purchaseTimeUnit?: string;
      autoRenew?: boolean;
    };
  };
  nodeStatus?: {
    ehcClusterId?: string;
    statusPhase?: string;
    createdAt?: string;
    billResourceId?: string;
    resourceQueueId?: string;
    nodeIntervention?: {
      cordon?: boolean;
    };
    nodeResource?: {
      isAcclerator?: boolean;
      accleratorType?: string;
      accleratorDescriptor?: string;
      capacity?: {
        milliCPUcores?: number;
        memoryBytes?: number;
        cpuCores?: number;
        memoryGi?: number;
        gpuNum?: number;
      };
    };
  };
}

/**
 * 后端查询资源池列表响应
 */
export interface BackendDescribeResourcePoolsResponse {
  requestId: string;
  totalCount: number;
  pageNumber?: number;
  pageSize?: number;
  keywordType?: string;
  keyword?: string;
  orderBy?: string;
  order?: string;
  resourcePools: BackendResourcePoolSpec[];
}

/**
 * 后端查询队列列表响应
 */
export interface BackendDescribeQueuesResponse {
  requestId: string;
  totalCount: number;
  pageNumber?: number;
  pageSize?: number;
  keywordType?: string;
  keyword?: string;
  queues: BackendQueueItem[];
}

/**
 * 后端查询节点列表响应
 */
export interface BackendDescribeNodesResponse {
  requestId: string;
  nodes: BackendNode[];
}
