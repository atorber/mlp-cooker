import type { ComputeResources, ResourcePoolRef, StorageMount, ImageConfig } from '../types/unified/index.js';
import type {
  BackendContainerConf,
  BackendServiceBriefInfo,
  BackendServiceConf,
} from '../types/backend/service.js';
import { computeResourcesTransformer } from './compute-resources.js';
import { storageMountTransformer } from './storage-mount.js';
import { resourcePoolRefTransformer } from './resource-pool-ref.js';

/**
 * 统一的服务详情
 */
export interface CreateServiceRequest {
  name: string;
  resourcePool: ResourcePoolRef;
  instanceCount: number;
  workloadType?: string;
  acceleratorType?: string;
  containers: {
    name: string;
    resources: ComputeResources;
    image: ImageConfig;
    command?: string[];
    ports?: { name: string; port: number }[];
    envs?: Record<string, string>;
  }[];
  storageMounts?: StorageMount[];
  access?: {
    publicAccess?: boolean;
    networkType?: string;
    aiGateway?: any;
  };
  deploy?: any;
  misc?: any;
  log?: any;
}

export interface ServiceDetail {
  /** 服务ID */
  id: string;
  /** 服务名称 */
  name: string;
  /** 资源池引用 */
  resourcePool: ResourcePoolRef;
  /** 实例数 */
  instanceCount: number;
  /** 容器配置 */
  containers: ContainerDetail[];
  /** 访问配置 */
  access?: {
    publicAccess?: boolean;
    networkType?: string;
    internalIP?: string;
    externalIP?: string;
  };
  /** 创建者 */
  creator?: string;
  /** 创建时间 */
  createdAt?: number;
  /** 更新时间 */
  updatedAt?: number;
  /** 状态 */
  status?: {
    availableInstances: number;
    totalInstances: number;
    status: number;
  };
}

/**
 * 容器详情
 */
export interface ContainerDetail {
  /** 容器名称 */
  name: string;
  /** 资源配置 */
  resources: ComputeResources;
  /** 镜像地址 */
  imageUrl: string;
  /** 端口列表 */
  ports?: Array<{ name: string; port: number }>;
  /** 命令 */
  command?: string[];
  /** 环境变量 */
  envs?: Record<string, string>;
}

/**
 * 服务转换器
 */
export class ServiceTransformer {
  /**
   * 统一结构 -> 后端创建请求 (Backend Create Service Request)
   */
  toBackendCreateRequest(request: CreateServiceRequest): any {
    const backendRequest: any = {
      name: request.name,
      instanceCount: request.instanceCount,
      resourcePool: {
        resourcePoolId: request.resourcePool.poolId,
        resourcePoolName: request.resourcePool.poolName || '',
        queueName: request.resourcePool.queue,
        resourcePoolType: request.resourcePool.poolType === 'serverless' ? 'serverless' : 'common',
      },
    };

    if (request.workloadType) backendRequest.workloadType = request.workloadType;
    if (request.acceleratorType) backendRequest.acceleratorType = request.acceleratorType;
    if (request.access) backendRequest.access = request.access;
    if (request.deploy) backendRequest.deploy = request.deploy;
    if (request.misc) backendRequest.misc = request.misc;
    if (request.log) backendRequest.log = request.log;

    // 存储挂载
    let volumes: any[] = [];
    let volumeMounts: any[] = [];
    if (request.storageMounts && request.storageMounts.length > 0) {
      const storageTranslation = storageMountTransformer.toService(request.storageMounts);
      volumes = storageTranslation.volumes;
      volumeMounts = storageTranslation.volumeMounts;
      backendRequest.storage = { volumns: volumes }; // Note: Baige API typo 'volumns'
    }

    // 容器配置
    backendRequest.containers = request.containers.map(c => {
      const containerConf: any = {
        name: c.name,
        ...computeResourcesTransformer.toService(c.resources),
        image: { imageUrl: c.image.url },
      };
      
      if (c.image.auth) {
        containerConf.image.repoUsername = c.image.auth.username;
        containerConf.image.repoPassword = c.image.auth.password;
      }
      
      if (c.command) containerConf.command = c.command;
      if (c.ports) containerConf.ports = c.ports;
      if (c.envs) containerConf.envs = c.envs;
      if (volumeMounts.length > 0) containerConf.volumeMounts = volumeMounts;
      
      return containerConf;
    });

    return backendRequest;
  }

  /**
   * 后端简要信息 -> 统一简要信息
   */
  fromBackendBrief(info: BackendServiceBriefInfo): ServiceDetail {
    return {
      id: info.id,
      name: info.name,
      resourcePool: {
        poolId: info.resourcePoolId,
        poolName: info.resourcePoolName,
        queue: info.queueName || '',
        poolType: info.resourcePoolType === 'serverless' ? 'serverless' : 'common',
      },
      instanceCount: 0,
      creator: info.creator,
      createdAt: info.createdAt || (info as any).createTime,
      updatedAt: info.updatedAt || (info as any).updateTime,
      access: {
        publicAccess: info.publicAccess,
        networkType: info.networkType,
      },
      containers: info.resourceSpec ? [{
        name: 'main',
        resources: {
          cpu: info.resourceSpec.cpus || 0,
          memory: info.resourceSpec.memory || 0,
          accelerator: info.resourceSpec.acceleratorCount ? {
            type: info.resourceSpec.acceleratorType || '',
            count: info.resourceSpec.acceleratorCount,
          } : undefined,
        },
        imageUrl: '',
      }] : [],
    };
  }

  /**
   * 后端详细配置 -> 统一详情
   */
  fromBackendDetail(conf: BackendServiceConf, status?: {
    accessIPs?: { internal?: string; external?: string };
    briefStat?: { availableIns: number; totalIns: number; status: number };
  }): ServiceDetail {
    return {
      id: '', // 需要外部传入
      name: conf.name,
      resourcePool: conf.resourcePool ? resourcePoolRefTransformer.fromService(conf.resourcePool) : { poolId: '', queue: '' },
      instanceCount: conf.instanceCount,
      containers: conf.containers?.map(c => this.containerFromBackend(c, conf.acceleratorType)) || [],
      access: {
        publicAccess: conf.access?.publicAccess,
        networkType: conf.access?.networkType,
        internalIP: status?.accessIPs?.internal,
        externalIP: status?.accessIPs?.external,
      },
      status: status?.briefStat ? {
        availableInstances: status.briefStat.availableIns,
        totalInstances: status.briefStat.totalIns,
        status: status.briefStat.status,
      } : undefined,
    };
  }

  /**
   * 后端容器配置 -> 统一容器详情
   */
  containerFromBackend(container: BackendContainerConf, acceleratorType?: string): ContainerDetail {
    return {
      name: container.name,
      resources: computeResourcesTransformer.fromService(container, acceleratorType),
      imageUrl: container.image?.imageUrl || '',
      ports: container.ports?.map(p => ({ name: p.name, port: p.port })),
      command: container.command,
      envs: container.envs,
    };
  }
}

export const serviceTransformer = new ServiceTransformer();
