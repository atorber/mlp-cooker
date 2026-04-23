import type { ComputeResources, ResourcePoolRef } from '../types/unified/index.js';
import type {
  BackendContainerConf,
  BackendServiceBriefInfo,
  BackendServiceConf,
} from '../types/backend/service.js';
import { computeResourcesTransformer } from './compute-resources.js';
import { resourcePoolRefTransformer } from './resource-pool-ref.js';

/**
 * 统一的服务详情
 */
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
        poolType: info.resourcePoolType === 'serverless' ? 'serverless' : 'self-managed',
      },
      instanceCount: 0,
      creator: info.creator,
      createdAt: info.createdAt,
      updatedAt: info.updatedAt,
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
