/**
 * 服务部署模块 - 后端原始类型定义
 * 来自百舸OpenAPI数据结构.md
 */

/**
 * 后端服务配置
 */
export interface BackendServiceConf {
  name: string;
  acceleratorType?: string;
  workloadType?: string;
  instanceCount: number;
  resourcePool: BackendResourcePoolConf;
  storage?: BackendStorageConf;
  containers: BackendContainerConf[];
  access?: BackendAccessConf;
  log?: BackendLogConf;
  deploy?: BackendDeployConf;
  misc?: BackendMisc;
}

/**
 * 后端资源池配置
 */
export interface BackendResourcePoolConf {
  resourcePoolId: string;
  resourcePoolName?: string;
  queueName: string;
  resourcePoolType?: string;
}

/**
 * 后端容器配置
 */
export interface BackendContainerConf {
  name: string;
  cpus: number;
  memory: number;
  acceleratorCount?: number;
  command?: string[];
  runArgs?: string[];
  ports?: BackendPortConf[];
  envs?: Record<string, string>;
  image: BackendImageConf;
  volumeMounts?: BackendVolumeMountConf[];
  readinessProbe?: BackendProbeConf;
  startupsProbe?: BackendProbeConf;
  livenessProbe?: BackendProbeConf;
}

/**
 * 后端端口配置
 */
export interface BackendPortConf {
  name: string;
  port: number;
}

/**
 * 后端镜像配置（服务部署）
 */
export interface BackendImageConf {
  imageType?: number;
  imageUrl: string;
  username?: string;
  password?: string;
}

/**
 * 后端存储卷挂载配置（注意：volumnName是拼写错误，保留原样）
 */
export interface BackendVolumeMountConf {
  volumnName: string;
  mountPath: string;
  readOnly?: boolean;
}

/**
 * 后端存储配置
 */
export interface BackendStorageConf {
  shmSize?: number;
  volumns?: BackendVolumeConf[];
}

/**
 * 后端存储卷配置（注意：volumnName是拼写错误，保留原样）
 */
export interface BackendVolumeConf {
  volumeType: string;
  volumnName: string;
  pfs?: BackendPFSConfig;
  bos?: BackendBOSConfig;
  dataset?: BackendDatasetVolumeConfig;
  hostpath?: { sourcePath: string };
}

/**
 * 后端PFS配置
 */
export interface BackendPFSConfig {
  instanceId: string;
  instanceType?: string;
  hostMountPath?: string;
  mountTargetId?: string[];
  clusterIP?: string;
  clientID?: string;
  clusterPort?: string;
  sourcePath: string;
}

/**
 * 后端BOS配置
 */
export interface BackendBOSConfig {
  secret?: {
    name: string;
    namespace: string;
  };
  sourcePath: string;
  version?: string;
}

/**
 * 后端数据集存储卷配置
 */
export interface BackendDatasetVolumeConfig {
  datasetId: string;
  datasetName?: string;
  pfs?: BackendPFSConfig;
  source?: string;
  storageType?: string;
  versionId?: string;
}

/**
 * 后端访问配置
 */
export interface BackendAccessConf {
  publicAccess?: boolean;
  eip?: string;
  aiGateway?: BackendAIGatewayConf;
  networkType?: string;
  blbId?: string;
}

/**
 * 后端AI网关配置
 */
export interface BackendAIGatewayConf {
  enableAuth?: boolean;
  aigwId?: string;
  aigwName?: string;
  protocol?: string;
  strategy?: string;
  version?: string;
}

/**
 * 后端日志配置
 */
export interface BackendLogConf {
  persistent?: boolean;
}

/**
 * 后端部署配置
 */
export interface BackendDeployConf {
  canaryStrategy?: {
    maxSurge?: number;
    maxUnavailable?: number;
  };
  schedule?: {
    priority?: string;
  };
}

/**
 * 后端杂项配置
 */
export interface BackendMisc {
  podLabels?: Record<string, string>;
  podAnnotations?: Record<string, string>;
  gracePeriodSec?: number;
  fedPodsPerIns?: number;
  enableRDMA?: boolean;
}

/**
 * 后端探针配置
 */
export interface BackendProbeConf {
  initialDelaySeconds: number;
  timeoutSeconds: number;
  periodSeconds: number;
  successThreshold: number;
  failureThreshold: number;
  handler: {
    exec?: { command: string[] };
    httpGet?: { path: string; port: number };
    tcpSocketAction?: { port: number };
  };
}

/**
 * 后端创建服务响应
 */
export interface BackendCreateServiceResponse {
  requestId: string;
  serviceId: string;
}

/**
 * 后端服务简要信息
 */
export interface BackendServiceBriefInfo {
  id: string;
  name: string;
  resourcePoolId: string;
  resourcePoolName?: string;
  queueName?: string;
  region?: string;
  publicAccess?: boolean;
  creator?: string;
  networkType?: string;
  createdAt?: number;
  updatedAt?: number;
  resourcePoolType?: string;
  workloadType?: string;
  resourceSpec?: {
    cpus?: number;
    memory?: number;
    acceleratorCount?: number;
    acceleratorType?: string;
  };
}

/**
 * 后端查询服务列表响应
 */
export interface BackendDescribeServicesResponse {
  requestId: string;
  totalCount: number;
  pageNumber?: number;
  pageSize?: number;
  orderBy?: string;
  order?: string;
  services: BackendServiceBriefInfo[];
}
