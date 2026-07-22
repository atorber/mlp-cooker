/**
 * 统一的模型类型定义
 */
export interface Model {
  /** 模型ID */
  id: string;
  /** 模型名称 */
  name: string;
  /** 创建来源 */
  source: 'userUpload';
  /** 最新版本 */
  latestVersion?: string;
  /** 最新版本ID */
  latestVersionId?: string;
  /** 模型格式 */
  modelFormat: string;
  /** 描述 */
  description?: string;
  /** 所有者ID */
  owner: string;
  /** 所有者名称 */
  ownerName?: string;
  /** 可见范围 */
  visibilityScope: string;
  /** 标签 */
  tags?: Record<string, string>;
  /** 创建时间 */
  createdAt?: string;
  /** 更新时间 */
  updatedAt?: string;
}

/**
 * 模型版本
 */
export interface ModelVersion {
  /** 版本ID */
  id: string;
  /** 版本号 */
  version: string;
  /** 来源 */
  source: 'userUpload';
  /** 存储桶 */
  storageBucket: string;
  /** 存储路径 */
  storagePath: string;
  /** 模型指标 */
  modelMetrics?: string;
  /** 描述 */
  description?: string;
  /** 任务ID */
  taskId?: string;
  /** 创建用户ID */
  createUser?: string;
  /** 创建用户名称 */
  createUserName?: string;
  /** 创建时间 */
  createdAt?: string;
}

/**
 * 创建模型请求
 */
export interface CreateModelRequest {
  name: string;
  modelFormat: string;
  description?: string;
  owner?: string;
  visibilityScope?: string;
}
