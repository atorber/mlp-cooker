/**
 * 统一的存储挂载配置
 * 适用于：训练任务、服务部署、开发机
 */
export interface StorageMount {
  /** 挂载名称 */
  name: string;
  /** 容器内挂载路径 */
  mountPath: string;
  /** 是否只读 */
  readOnly?: boolean;
  /** 存储类型 */
  storageType: StorageType;
  /** 存储配置 */
  config: PFSStorage | BOSStorage | CFSStorage | DatasetStorage | HostPathStorage | EmptyDirStorage | CDSStorage;
}

/**
 * 存储类型枚举
 */
export type StorageType = 'pfs' | 'bos' | 'cfs' | 'dataset' | 'hostPath' | 'emptyDir' | 'cds';

/**
 * PFS存储配置
 */
export interface PFSStorage {
  type: 'pfs';
  /** PFS实例ID */
  instanceId: string;
  /** 源路径 */
  sourcePath: string;
}

/**
 * BOS存储配置
 */
export interface BOSStorage {
  type: 'bos';
  /** BOS Bucket名称 */
  bucket: string;
  /** BOS路径 */
  path: string;
  /** BOS版本 */
  version?: 'v1' | 'v2';
  /** 缓存大小限制 */
  cacheLimitSize?: string;
}

/**
 * CFS存储配置
 */
export interface CFSStorage {
  type: 'cfs';
  /** CFS实例ID */
  instanceId: string;
  /** 源路径 */
  sourcePath: string;
  /** 挂载点 */
  mountPoint?: string;
}

/**
 * 数据集存储配置
 */
export interface DatasetStorage {
  type: 'dataset';
  /** 数据集ID */
  datasetId: string;
  /** 数据集版本ID */
  versionId?: string;
  /** 存储类型 */
  storageType?: 'pfs' | 'bos';
  /** PFS配置（当storageType为pfs时） */
  pfs?: DatasetPFSConfig;
  /** BOS配置（当storageType为bos时） */
  bos?: BOSStorage;
}

/**
 * 数据集PFS配置
 */
export interface DatasetPFSConfig {
  clientID: string;
  instanceType: string;
  region: string;
  instanceId: string;
  clusterIP: string;
  mountTargetId: string[];
  hostMountPath: string;
  srcPath: string;
}

/**
 * 主机路径存储配置
 */
export interface HostPathStorage {
  type: 'hostPath';
  /** 主机路径 */
  path: string;
}

/**
 * 空目录存储配置
 */
export interface EmptyDirStorage {
  type: 'emptyDir';
  /** 大小限制(GB) */
  sizeLimit?: number;
  /** 存储介质 */
  medium?: 'Memory' | '';
}

/**
 * CDS存储配置（开发机专用）
 */
export interface CDSStorage {
  type: 'cds';
  /** 容量(GB)，需大于100 */
  capacity: number;
}
