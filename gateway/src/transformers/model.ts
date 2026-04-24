import type { Model, ModelVersion, CreateModelRequest } from '../types/unified/model.js';
import type { BackendModel, BackendModelVersionEntry, BackendCreateModelRequest } from '../types/backend/model.js';

/**
 * 模型转换器
 */
export class ModelTransformer {
  /**
   * 统一请求 -> 后端请求
   */
  toBackendRequest(request: CreateModelRequest): BackendCreateModelRequest {
    return {
      name: request.name,
      initSource: 'UserUpload',
      modelFormat: request.modelFormat,
      description: request.description,
      owner: request.owner,
      visibilityScope: request.visibilityScope || 'ONLY_OWNER',
    };
  }

  /**
   * 后端响应 -> 统一响应
   */
  fromBackend(model: BackendModel): Model {
    return {
      id: model.id || '',
      name: model.name,
      source: 'userUpload',
      latestVersion: model.latestVersion,
      latestVersionId: model.latestVersionId,
      modelFormat: model.modelFormat || '',
      description: model.description,
      owner: model.owner || '',
      ownerName: model.ownerName,
      visibilityScope: model.visibilityScope || '',
      tags: model.tags,
      createdAt: model.createdAt ? String(model.createdAt) : ((model as any).createTime ? String((model as any).createTime) : undefined),
      updatedAt: model.updatedAt ? String(model.updatedAt) : ((model as any).updateTime ? String((model as any).updateTime) : undefined),
    };
  }

  /**
   * 后端版本 -> 统一版本
   */
  versionFromBackend(version: BackendModelVersionEntry): ModelVersion {
    return {
      id: version.id || '',
      version: version.version || '',
      source: 'userUpload',
      storageBucket: version.storageBucket || '',
      storagePath: version.storagePath || '',
      modelMetrics: version.modelMetrics ? (typeof version.modelMetrics === 'string' ? version.modelMetrics : JSON.stringify(version.modelMetrics)) : undefined,
      description: version.description,
      taskId: version.taskId,
      createUser: version.createUser,
      createUserName: version.createUserName,
      createdAt: version.createdAt ? String(version.createdAt) : ((version as any).createTime ? String((version as any).createTime) : undefined),
    };
  }
}

export const modelTransformer = new ModelTransformer();
