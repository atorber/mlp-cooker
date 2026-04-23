/**
 * 数据集模块 - 后端原始类型定义
 */

/**
 * 后端数据集
 */
export interface BackendDataset {
  id: string;
  name: string;
  storageType: 'PFS' | 'BOS';
  storageInstance: string;
  importFormat: 'FILE' | 'FOLDER';
  description?: string;
  owner: string;
  ownerName?: string;
  visibilityScope: 'ALL_PEOPLE' | 'ONLY_OWNER' | 'USER_GROUP';
  visibilityUser?: BackendPermissionEntry[];
  visibilityGroup?: BackendPermissionEntry[];
  permission?: 'r' | 'rw';
  latestVersionId?: string;
  latestVersion?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 后端权限条目
 */
export interface BackendPermissionEntry {
  id: string;
  name: string;
  permission: 'r' | 'rw';
}

/**
 * 后端数据集版本条目
 */
export interface BackendDatasetVersionEntry {
  id?: string;
  version?: string;
  description?: string;
  storagePath: string;
  mountPath: string;
  createUser?: string;
  createUserName?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 后端创建数据集请求
 */
export interface BackendCreateDatasetRequest {
  name: string;
  storageType: 'PFS' | 'BOS';
  storageInstance: string;
  importFormat: 'FILE' | 'FOLDER';
  description?: string;
  owner?: string;
  visibilityScope: 'ALL_PEOPLE' | 'ONLY_OWNER' | 'USER_GROUP';
  visibilityUser?: BackendPermissionEntry[];
  visibilityGroup?: BackendPermissionEntry[];
  initVersionEntry: BackendDatasetVersionEntry;
}

/**
 * 后端创建数据集响应
 */
export interface BackendCreateDatasetResponse {
  requestId: string;
  id: string;
}

/**
 * 后端查询数据集列表响应
 */
export interface BackendDescribeDatasetsResponse {
  requestId: string;
  totalCount: number;
  datasets: BackendDataset[];
}

/**
 * 后端创建数据集版本请求
 */
export interface BackendCreateDatasetVersionRequest {
  datasetId: string;
  description?: string;
  storagePath: string;
  mountPath: string;
}

/**
 * 后端数据集版本
 */
export interface BackendDatasetVersion {
  id: string;
  version: string;
  description?: string;
  storagePath: string;
  mountPath: string;
  createUser?: string;
  createUserName?: string;
  createdAt?: string;
  updatedAt?: string;
}
