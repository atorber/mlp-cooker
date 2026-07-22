/**
 * 训练任务模块 - 后端原始类型定义
 * 来自百舸OpenAPI数据结构.md
 */

/**
 * 后端资源定义
 */
export interface BackendResource {
  name: string;
  quantity: number;
}

/**
 * 后端镜像配置
 */
export interface BackendImageConfig {
  username?: string;
  password?: string;
}

/**
 * 后端环境变量
 */
export interface BackendEnv {
  name: string;
  value: string;
}

/**
 * 后端标签
 */
export interface BackendLabel {
  key: string;
  value: string;
}

/**
 * 后端数据源
 */
export interface BackendDataSource {
  type: string;
  name: string;
  sourcePath: string;
  mountPath: string;
  options?: {
    readOnly?: boolean;
    sizeLimit?: number;
    medium?: string;
    cfsInstanceId?: string;
    cfsMountPoint?: string;
  };
}

/**
 * 后端JobSpec - 训练任务配置
 */
export interface BackendJobSpec {
  /** 镜像地址 */
  image: string;
  /** 镜像配置 */
  imageConfig?: BackendImageConfig;
  /** worker副本数 */
  replicas: number;
  /** 资源配置 */
  resources?: BackendResource[];
  /** 环境变量 */
  envs?: BackendEnv[];
  /** 是否开启RDMA */
  enableRDMA?: boolean;
  /** 是否使用宿主机网络 */
  hostNetwork?: boolean;
}

/**
 * 后端创建训练任务请求
 */
export interface BackendCreateJobRequest {
  name: string;
  queue: string;
  jobType?: 'PyTorchJob' | 'TFJob' | 'MPIJob';
  jobSpec: BackendJobSpec | Record<string, BackendJobSpec>;
  command: string;
  labels?: BackendLabel[];
  priority?: 'high' | 'normal' | 'low';
  datasources?: BackendDataSource[];
  enableBccl?: boolean;
  faultTolerance?: boolean;
  faultToleranceArgs?: string;
  tensorboardConfig?: {
    enable?: boolean;
    logPath?: string;
  };
  alertConfig?: {
    instanceId: string;
    alertItems: string[];
    for?: string;
    notifyRuleId: string;
  };
  retentionPeriod?: string;
}

/**
 * 后端创建训练任务响应
 */
export interface BackendCreateJobResponse {
  requestId: string;
  jobId: string;
  jobName: string;
}

/**
 * 后端查询训练任务列表请求
 */
export interface BackendDescribeJobsRequest {
  queue?: string;
  status?: string;
  keywordType?: string;
  keyword?: string;
  orderBy?: string;
  order?: string;
  pageNumber?: number;
  pageSize?: number;
}

/**
 * 后端训练任务项
 */
export interface BackendJobItem {
  jobId: string;
  userId: string;
  name: string;
  status: string;
  createdAt: string;
  finishedAt: string;
  jobType: string;
  resourcePoolId: string;
  queueId: string;
  queue?: string;
  jobSpec?: BackendJobSpec;
  command?: string;
  labels?: BackendLabel[];
  priority?: string;
  dataSources?: BackendDataSource[];
  enableBccl?: boolean;
  enableBcclStatus?: string;
  enableBcclErrorReason?: string;
  enableFaultTolerant?: boolean;
  faultTolerantArgs?: string;
  pods?: BackendPod[];
  historyPods?: BackendPod[];
  jobTimeLine?: BackendJobTimeLine[];
}

/**
 * 后端Pod信息
 */
export interface BackendPod {
  PodIP: string;
  nodeName: string;
  creationTimestamp?: string;
  uid: string;
  name: string;
  podPhase?: string;
  status: string;
  replicaType?: string;
  restartCount?: number;
  envs?: BackendEnv[];
  finishedAt?: string;
  reason?: string;
}

/**
 * 后端任务时间线
 */
export interface BackendJobTimeLine {
  conditionType: string;
  conditionMessage: string;
  time: string;
}

/**
 * 后端查询训练任务列表响应
 */
export interface BackendDescribeJobsResponse {
  requestId: string;
  totalCount: number;
  jobs: BackendJobItem[];
}

/**
 * 后端查询训练任务详情响应
 */
export interface BackendDescribeJobResponse {
  requestId: string;
  job?: BackendJobItem;
}

/**
 * 后端删除训练任务响应
 */
export interface BackendDeleteJobResponse {
  requestId: string;
  jobId?: string;
  jobName?: string;
}
