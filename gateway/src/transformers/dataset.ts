import type {
  Dataset,
  DatasetVersion,
  PermissionEntry,
  CreateDatasetRequest,
} from '../types/unified/dataset.js';
import type {
  BackendDataset,
  BackendDatasetVersionEntry,
  BackendPermissionEntry,
  BackendCreateDatasetRequest,
} from '../types/backend/dataset.js';

/**
 * 可见范围映射
 */
const VISIBILITY_SCOPE_TO_BACKEND: Record<string, string> = {
  all: 'ALL_PEOPLE',
  owner: 'ONLY_OWNER',
  group: 'USER_GROUP',
};

const VISIBILITY_SCOPE_FROM_BACKEND: Record<string, string> = {
  ALL_PEOPLE: 'all',
  ONLY_OWNER: 'owner',
  USER_GROUP: 'group',
};

/**
 * 权限映射
 */
const PERMISSION_TO_BACKEND: Record<string, string> = {
  read: 'r',
  write: 'rw',
};

const PERMISSION_FROM_BACKEND: Record<string, string> = {
  r: 'read',
  rw: 'write',
};

/**
 * 数据集转换器
 */
export class DatasetTransformer {
  /**
   * 统一请求 -> 后端请求
   */
  toBackendRequest(request: CreateDatasetRequest): BackendCreateDatasetRequest {
    return {
      name: request.name,
      storageType: request.storageType.toUpperCase() as 'PFS' | 'BOS',
      storageInstance: request.storageInstance,
      importFormat: request.importFormat.toUpperCase() as 'FILE' | 'FOLDER',
      description: request.description,
      owner: request.owner,
      visibilityScope: VISIBILITY_SCOPE_TO_BACKEND[request.visibilityScope] as 'ALL_PEOPLE' | 'ONLY_OWNER' | 'USER_GROUP',
      visibilityUser: request.visibilityUser?.map(this.permissionToBackend),
      visibilityGroup: request.visibilityGroup?.map(this.permissionToBackend),
      initVersionEntry: {
        description: request.initialVersion.description,
        storagePath: request.initialVersion.storagePath,
        mountPath: request.initialVersion.mountPath,
      },
    };
  }

  /**
   * 后端响应 -> 统一响应
   */
  fromBackend(dataset: BackendDataset): Dataset {
    return {
      id: dataset.id,
      name: dataset.name,
      storageType: dataset.storageType.toLowerCase() as 'pfs' | 'bos',
      storageInstance: dataset.storageInstance,
      importFormat: dataset.importFormat.toLowerCase() as 'file' | 'folder',
      description: dataset.description,
      owner: dataset.owner,
      ownerName: dataset.ownerName,
      visibilityScope: VISIBILITY_SCOPE_FROM_BACKEND[dataset.visibilityScope] as 'all' | 'owner' | 'group',
      visibilityUser: dataset.visibilityUser?.map(this.permissionFromBackend),
      visibilityGroup: dataset.visibilityGroup?.map(this.permissionFromBackend),
      permission: dataset.permission ? PERMISSION_FROM_BACKEND[dataset.permission] as 'read' | 'write' : undefined,
      latestVersionId: dataset.latestVersionId,
      latestVersion: dataset.latestVersion,
      createdAt: dataset.createdAt,
      updatedAt: dataset.updatedAt,
    };
  }

  /**
   * 后端版本 -> 统一版本
   */
  versionFromBackend(version: BackendDatasetVersionEntry): DatasetVersion {
    return {
      id: version.id || '',
      version: version.version || '',
      description: version.description,
      storagePath: version.storagePath,
      mountPath: version.mountPath,
      createUser: version.createUser,
      createUserName: version.createUserName,
      createdAt: version.createdAt,
      updatedAt: version.updatedAt,
    };
  }

  private permissionToBackend(entry: PermissionEntry): BackendPermissionEntry {
    return {
      id: entry.id,
      name: entry.name,
      permission: PERMISSION_TO_BACKEND[entry.permission] as 'r' | 'rw',
    };
  }

  private permissionFromBackend(entry: BackendPermissionEntry): PermissionEntry {
    return {
      id: entry.id,
      name: entry.name,
      permission: PERMISSION_FROM_BACKEND[entry.permission] as 'read' | 'write',
    };
  }
}

export const datasetTransformer = new DatasetTransformer();
