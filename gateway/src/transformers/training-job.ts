import type { ComputeResources, StorageMount, ImageConfig, ResourcePoolRef, EnvironmentVariables, KeyValue } from '../types/unified/index.js';
import type { BackendCreateJobRequest, BackendJobSpec, BackendJobItem, BackendLabel } from '../types/backend/index.js';
import { computeResourcesTransformer } from './compute-resources.js';
import { storageMountTransformer } from './storage-mount.js';
import { imageConfigTransformer } from './image-config.js';

/**
 * 统一的创建训练任务请求
 */
export interface CreateTrainingJobRequest {
  name: string;
  resourcePool: ResourcePoolRef;
  framework?: 'PyTorchJob' | 'TFJob' | 'MPIJob';
  command: string;
  resources: ComputeResources;
  replicas: number;
  image: ImageConfig;
  storageMounts?: StorageMount[];
  envs?: EnvironmentVariables;
  labels?: Record<string, string>;
  priority?: 'high' | 'normal' | 'low';
  enableRDMA?: boolean;
  enableBccl?: boolean;
  faultTolerance?: boolean;
  faultToleranceArgs?: string;
  tensorboardConfig?: {
    enable?: boolean;
    logPath?: string;
  };
  retentionPeriod?: string;
}

/**
 * 统一的训练任务详情
 */
export interface TrainingJobDetail {
  id: string;
  name: string;
  status: string;
  framework: string;
  resourcePool: ResourcePoolRef;
  command?: string;
  resources?: ComputeResources;
  replicas?: number;
  image?: ImageConfig;
  storageMounts?: StorageMount[];
  envs?: EnvironmentVariables;
  labels?: Record<string, string>;
  priority?: string;
  enableRDMA?: boolean;
  enableBccl?: boolean;
  createdAt?: string;
  updatedAt?: string;
  finishedAt?: string;
  pods?: unknown[];
}

/**
 * 环境变量转换辅助函数
 */
function envsToArray(envs: EnvironmentVariables): KeyValue[] {
  return Object.entries(envs).map(([name, value]) => ({ name, value }));
}

function envsFromArray(envs: KeyValue[]): EnvironmentVariables {
  const result: EnvironmentVariables = {};
  for (const { name, value } of envs) {
    result[name] = value;
  }
  return result;
}

/**
 * 标签转换辅助函数
 */
function labelsToArray(labels: Record<string, string>): BackendLabel[] {
  return Object.entries(labels).map(([key, value]) => ({ key, value }));
}

function labelsFromArray(labels: BackendLabel[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const { key, value } of labels) {
    result[key] = value;
  }
  return result;
}

/**
 * 训练任务请求转换器
 */
export class TrainingJobTransformer {
  /**
   * 统一请求 -> 后端请求
   */
  toBackendRequest(request: CreateTrainingJobRequest): BackendCreateJobRequest {
    const jobSpec: BackendJobSpec = {
      image: request.image.url,
      replicas: request.replicas,
      resources: computeResourcesTransformer.toTrainingJob(request.resources),
      enableRDMA: request.enableRDMA,
    };

    // 镜像认证
    if (request.image.auth) {
      jobSpec.imageConfig = {
        username: request.image.auth.username,
        password: request.image.auth.password,
      };
    }

    // 环境变量
    if (request.envs) {
      jobSpec.envs = envsToArray(request.envs);
    }

    const backendRequest: BackendCreateJobRequest = {
      name: request.name,
      queue: request.resourcePool.queue,
      jobType: request.framework || 'PyTorchJob',
      jobSpec,
      command: request.command,
    };

    // 标签
    if (request.labels) {
      backendRequest.labels = labelsToArray(request.labels);
    }

    // 优先级
    if (request.priority) {
      backendRequest.priority = request.priority;
    }

    // 存储挂载
    if (request.storageMounts && request.storageMounts.length > 0) {
      backendRequest.datasources = storageMountTransformer.toTrainingJob(request.storageMounts);
    }

    // BCCL
    if (request.enableBccl !== undefined) {
      backendRequest.enableBccl = request.enableBccl;
    }

    // 容错
    if (request.faultTolerance !== undefined) {
      backendRequest.faultTolerance = request.faultTolerance;
    }
    if (request.faultToleranceArgs) {
      backendRequest.faultToleranceArgs = request.faultToleranceArgs;
    }

    // Tensorboard
    if (request.tensorboardConfig) {
      backendRequest.tensorboardConfig = request.tensorboardConfig;
    }

    // 保留时间
    if (request.retentionPeriod) {
      backendRequest.retentionPeriod = request.retentionPeriod;
    }

    return backendRequest;
  }

  /**
   * 后端响应 -> 统一响应
   */
  fromBackendResponse(item: BackendJobItem): TrainingJobDetail {
    const detail: TrainingJobDetail = {
      id: item.jobId,
      name: item.name,
      status: item.status,
      framework: item.jobType,
      resourcePool: {
        poolId: item.resourcePoolId,
        queue: item.queue || item.queueId,
      },
      createdAt: item.createdAt || (item as any).createTime || (item as any).creationTimestamp,
      updatedAt: (item as any).updatedAt || (item as any).updateTime,
      finishedAt: item.finishedAt,
    };

    // 解析 JobSpec
    if (item.jobSpec) {
      detail.replicas = item.jobSpec.replicas;
      detail.resources = computeResourcesTransformer.fromTrainingJob(item.jobSpec.resources || []);
      detail.image = imageConfigTransformer.fromTrainingJob(
        item.jobSpec.image,
        item.jobSpec.imageConfig
      );
      detail.enableRDMA = item.jobSpec.enableRDMA;

      if (item.jobSpec.envs) {
        detail.envs = envsFromArray(item.jobSpec.envs);
      }
    }

    // 命令
    if (item.command) {
      detail.command = item.command;
    }

    // 标签
    if (item.labels) {
      detail.labels = labelsFromArray(item.labels);
    }

    // 优先级
    if (item.priority) {
      detail.priority = item.priority;
    }

    // BCCL
    detail.enableBccl = item.enableBccl;

    // 存储挂载
    if (item.dataSources && item.dataSources.length > 0) {
      detail.storageMounts = storageMountTransformer.fromTrainingJob(item.dataSources);
    }

    // Pods
    if (item.pods) {
      detail.pods = item.pods;
    }

    return detail;
  }
}

export const trainingJobTransformer = new TrainingJobTransformer();
