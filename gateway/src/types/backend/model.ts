/**
 * 模型管理模块 - 后端原始类型定义
 */

/**
 * 后端模型
 */
export interface BackendModel {
  id?: string;
  name: string;
  initSource?: 'UserUpload';
  latestVersion?: string;
  latestVersionId?: string;
  modelFormat?: string;
  description?: string;
  updatedAt?: string | number;
  createdAt?: string | number;
  owner?: string;
  ownerName?: string;
  visibilityScope?: string;
  tags?: Record<string, string>;
}

/**
 * 后端模型版本条目
 */
export interface BackendModelVersionEntry {
  id?: string;
  version?: string;
  source?: 'UserUpload';
  storageBucket?: string;
  storagePath?: string;
  modelMetrics?: string | Record<string, unknown>;
  description?: string;
  taskId?: string;
  createUser?: string;
  createUserName?: string;
  createdAt?: string | number;
}

/**
 * 后端创建模型请求
 */
export interface BackendCreateModelRequest {
  name: string;
  initSource: 'UserUpload';
  modelFormat: string;
  description?: string;
  owner?: string;
  visibilityScope: string;
}

/**
 * 后端创建模型响应
 */
export interface BackendCreateModelResponse {
  requestId: string;
  id: string;
}

/**
 * 后端查询模型列表响应
 */
export interface BackendDescribeModelsResponse {
  requestId: string;
  totalCount: number;
  models: BackendModel[];
}

/**
 * 后端创建模型版本请求
 */
export interface BackendCreateModelVersionRequest {
  modelId: string;
  source: 'UserUpload';
  storageBucket: string;
  storagePath: string;
  modelMetrics?: string;
  description?: string;
}
