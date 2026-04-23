/**
 * 后端通用类型定义
 */

/**
 * 后端API请求头
 */
export interface BackendHeaders {
  'Content-Type': 'application/json';
  'version': 'v2';
  'Authorization': string;
  'Host': string;
  'x-bce-date'?: string;
}

/**
 * 后端API响应基础结构
 */
export interface BackendBaseResponse {
  requestId: string;
}

/**
 * 后端错误响应
 */
export interface BackendErrorResponse {
  requestId: string;
  code: string;
  message: string;
}

/**
 * 后端分页响应
 */
export interface BackendPaginatedResponse extends BackendBaseResponse {
  totalCount: number;
  pageNumber?: number;
  pageSize?: number;
}

/**
 * 后端Action枚举
 */
export const BackendAction = {
  // 训练任务
  CreateJob: 'CreateJob',
  DescribeJobs: 'DescribeJobs',
  DescribeJob: 'DescribeJob',
  DeleteJob: 'DeleteJob',
  ModifyJob: 'ModifyJob',
  StopJob: 'StopJob',
  StopJobs: 'StopJobs',
  DescribeJobLogs: 'DescribeJobLogs',
  DescribeJobEvents: 'DescribeJobEvents',
  DescribePodEvents: 'DescribePodEvents',
  DescribeJobMetrics: 'DescribeJobMetrics',
  DescribeJobNodes: 'DescribeJobNodes',
  DescribeJobWebterminal: 'DescribeJobWebterminal',

  // 服务部署
  CreateService: 'CreateService',
  DescribeServices: 'DescribeServices',
  DescribeService: 'DescribeService',
  ModifyService: 'ModifyService',
  DeleteService: 'DeleteService',
  DescribeServiceStatus: 'DescribeServiceStatus',
  ModifyServiceReplicas: 'ModifyServiceReplicas',
  ModifyServiceNetConfig: 'ModifyServiceNetConfig',
  DescribeServiceChangelogs: 'DescribeServiceChangelogs',
  DescribeServiceChangelog: 'DescribeServiceChangelog',
  DescribeServicePods: 'DescribeServicePods',
  DescribeServicePodGroups: 'DescribeServicePodGroups',
  DisableServicePod: 'DisableServicePod',
  DeleteServicePod: 'DeleteServicePod',
  DescribeInferenceServiceLogs: 'DescribeInferenceServiceLogs',
  DescribeServiceWebterminal: 'DescribeServiceWebterminal',

  // 开发机
  CreateDevInstance: 'CreateDevInstance',
  DescribeDevInstances: 'DescribeDevInstances',
  DescribeDevInstance: 'DescribeDevInstance',
  DeleteDevInstance: 'DeleteDevInstance',
  StartDevInstance: 'StartDevInstance',
  StopDevInstance: 'StopDevInstance',
  TimedStopDevInstance: 'TimedStopDevInstance',
  ModifyDevInstance: 'ModifyDevInstance',
  CreateDevInstanceImage: 'CreateDevInstanceImage',
  DescribeImagePackJob: 'DescribeImagePackJob',
  DescribeDevInstanceEvents: 'DescribeDevInstanceEvents',

  // 数据集
  CreateDataset: 'CreateDataset',
  DescribeDatasets: 'DescribeDatasets',
  DescribeDataset: 'DescribeDataset',
  ModifyDataset: 'ModifyDataset',
  DeleteDataset: 'DeleteDataset',
  CreateDatasetVersion: 'CreateDatasetVersion',
  DescribeDatasetVersions: 'DescribeDatasetVersions',
  DescribeDatasetVersion: 'DescribeDatasetVersion',
  DeleteDatasetVersion: 'DeleteDatasetVersion',

  // 模型管理
  CreateModel: 'CreateModel',
  DescribeModels: 'DescribeModels',
  DescribeModel: 'DescribeModel',
  ModifyModel: 'ModifyModel',
  DeleteModel: 'DeleteModel',
  CreateModelVersion: 'CreateModelVersion',
  DescribeModelVersions: 'DescribeModelVersions',
  DeleteModelVersion: 'DeleteModelVersion',

  // 资源池
  CreateResourcePool: 'CreateResourcePool',
  DescribeResourcePools: 'DescribeResourcePools',
  DescribeResourcePool: 'DescribeResourcePool',
  DescribeResourcePoolConfiguration: 'DescribeResourcePoolConfiguration',
  DescribeResourcePoolsStatistic: 'DescribeResourcePoolsStatistic',
  DeleteResourcePool: 'DeleteResourcePool',
  CreateQueue: 'CreateQueue',
  DescribeQueues: 'DescribeQueues',
  DescribeQueue: 'DescribeQueue',
  DeleteQueue: 'DeleteQueue',
  CreateNodes: 'CreateNodes',
  DescribeNodes: 'DescribeNodes',
  DeleteNodes: 'DeleteNodes',
} as const;

export type BackendActionType = typeof BackendAction[keyof typeof BackendAction];
