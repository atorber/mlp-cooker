/**
 * 开发机模块 - 后端原始类型定义
 * 来自百舸OpenAPI数据结构.md
 */

/**
 * 后端开发机配置
 */
export interface BackendDevInstanceConf {
  resourcePool: BackendDevResourcePool;
  resources: BackendDevResources;
  image: BackendDevImage;
  access?: BackendDevAccess;
  scheduleConf?: BackendDevScheduleConf;
  volumnConfs: BackendDevVolumeConf[];  // 注意：volumnConfs是拼写错误，保留原样
  startCmd?: string;
  workspaceDir?: string;
  envs?: Record<string, string>;
}

/**
 * 后端开发机资源池
 */
export interface BackendDevResourcePool {
  resourcePoolType?: string;
  resourcePoolId?: string;
  resourcePoolName?: string;
  queueName: string;
}

/**
 * 后端开发机资源配置
 */
export interface BackendDevResources {
  acceleratorType?: string;
  acceleratorCount?: number;
  cpus: number;
  memory: number;
  shmSize?: number;
}

/**
 * 后端开发机镜像
 */
export interface BackendDevImage {
  imageType: number;
  imageUrl: string;
  username?: string;
  password?: string;
}

/**
 * 后端开发机访问配置
 */
export interface BackendDevAccess {
  blbId?: string;
  sshEnable?: boolean;
  sshRSAPubKey?: string;
  portInfo?: BackendDevPortInfo[];
}

/**
 * 后端开发机端口信息
 */
export interface BackendDevPortInfo {
  accessPort: number;
  port: number;
  name: string;
}

/**
 * 后端开发机调度配置
 */
export interface BackendDevScheduleConf {
  priority?: string;
  cpuNodeAffinity?: boolean;
}

/**
 * 后端开发机存储卷配置（注意：volumnType是拼写错误，保留原样）
 */
export interface BackendDevVolumeConf {
  volumnType: string;
  mountPath: string;
  readOnly?: boolean;
  pfs?: BackendDevPFS;
  bos?: BackendDevBOS;
  cds?: BackendDevCDS;
  cfs?: BackendDevCFS;
  dataset?: BackendDevDataset;
}

/**
 * 后端开发机PFS配置
 */
export interface BackendDevPFS {
  instanceId: string;
  sourcePath: string;
}

/**
 * 后端开发机BOS配置
 */
export interface BackendDevBOS {
  sourcePath: string;
  version?: string;
  cacheLimitSize?: string;
}

/**
 * 后端开发机CDS配置
 */
export interface BackendDevCDS {
  capacity: number;
}

/**
 * 后端开发机CFS配置
 */
export interface BackendDevCFS {
  instanceId: string;
  sourcePath: string;
  mountPoint?: string;
}

/**
 * 后端开发机数据集配置
 */
export interface BackendDevDataset {
  datasetId: string;
  versionId?: string;
  storageType?: string;
  pfs?: BackendDevDatasetPFS;
  bos?: BackendDevBOS;
}

/**
 * 后端开发机数据集PFS配置
 */
export interface BackendDevDatasetPFS {
  clientID: string;
  clusterPort?: string;
  pfsParentDir?: string;
  pfsPath?: string;
  instanceType: string;
  region?: string;
  instanceId: string;
  clusterIP: string;
  mountTargetId: string[];
  hostMountPath: string;
  srcPath: string;
}

/**
 * 后端可见范围
 */
export interface BackendVisibleScope {
  type: number;
}

/**
 * 后端通知配置
 */
export interface BackendNotifyDetail {
  isOpen?: string;
  notifyRuleId?: string;
}

/**
 * 后端创建开发机请求
 */
export interface BackendCreateDevInstanceRequest {
  name: string;
  conf: BackendDevInstanceConf;
  visibleScope?: BackendVisibleScope;
  notify?: BackendNotifyDetail;
  isPublicMgmt?: boolean;
  creator: string;
  creatorId: string;
}

/**
 * 后端创建开发机响应
 */
export interface BackendCreateDevInstanceResponse {
  requestId: string;
  devInstanceId: string;
}

/**
 * 后端开发机详情
 */
export interface BackendDevInstanceDetail {
  accountId?: string;
  id: string;
  name: string;
  conf: BackendDevInstanceConf;
  serviceInstanceInfo?: {
    internalIP?: string;
    nodeIP?: string;
    podName?: string;
    serviceInstanceId?: string;
    publicIP?: string;
    cdsInstanceId?: string;
  };
  creator?: string;
  creatorId?: string;
  notify?: BackendNotifyDetail;
  region?: string;
  status: number;
  statusReason?: string;
  version?: string;
  visibleScope?: BackendVisibleScope;
  loginInfo?: {
    jupyter?: { url: string };
    vscode?: { url: string };
  };
  timedStopDevInstance?: {
    delaySec?: string;
    startTime?: string;
  };
  isPublicMgmt?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

/**
 * 后端查询开发机列表响应
 */
export interface BackendDescribeDevInstancesResponse {
  requestId: string;
  totalCount: number;
  devInstances: BackendDevInstanceDetail[];
}
