/**
 * 统一的数据集类型定义
 */
export interface Dataset {
  /** 数据集ID */
  id: string;
  /** 数据集名称 */
  name: string;
  /** 存储类型 */
  storageType: 'pfs' | 'bos';
  /** 存储实例 */
  storageInstance: string;
  /** 导入格式 */
  importFormat: 'file' | 'folder';
  /** 描述 */
  description?: string;
  /** 所有者ID */
  owner: string;
  /** 所有者名称 */
  ownerName?: string;
  /** 可见范围 */
  visibilityScope: 'all' | 'owner' | 'group';
  /** 用户权限列表 */
  visibilityUser?: PermissionEntry[];
  /** 用户组权限列表 */
  visibilityGroup?: PermissionEntry[];
  /** 当前用户权限 */
  permission?: 'read' | 'write';
  /** 最新版本ID */
  latestVersionId?: string;
  /** 最新版本号 */
  latestVersion?: string;
  /** 创建时间 */
  createdAt?: string;
  /** 更新时间 */
  updatedAt?: string;
}

/**
 * 权限条目
 */
export interface PermissionEntry {
  id: string;
  name: string;
  permission: 'read' | 'write';
}

/**
 * 数据集版本
 */
export interface DatasetVersion {
  /** 版本ID */
  id: string;
  /** 版本号 */
  version: string;
  /** 描述 */
  description?: string;
  /** 存储路径 */
  storagePath: string;
  /** 挂载路径 */
  mountPath: string;
  /** 创建用户ID */
  createUser?: string;
  /** 创建用户名称 */
  createUserName?: string;
  /** 创建时间 */
  createdAt?: string;
  /** 更新时间 */
  updatedAt?: string;
}

/**
 * 创建数据集请求
 */
export interface CreateDatasetRequest {
  name: string;
  storageType: 'pfs' | 'bos';
  storageInstance: string;
  importFormat: 'file' | 'folder';
  description?: string;
  owner?: string;
  visibilityScope: 'all' | 'owner' | 'group';
  visibilityUser?: PermissionEntry[];
  visibilityGroup?: PermissionEntry[];
  initialVersion: {
    description?: string;
    storagePath: string;
    mountPath: string;
  };
}
