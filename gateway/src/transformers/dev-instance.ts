import type { ComputeResources, ResourcePoolRef } from '../types/unified/index.js';
import type { BackendDevInstanceDetail, BackendDevResources } from '../types/backend/dev-instance.js';
import { computeResourcesTransformer } from './compute-resources.js';
import { resourcePoolRefTransformer } from './resource-pool-ref.js';

/**
 * 统一的开发机详情
 */
export interface DevInstanceDetail {
  /** 开发机ID */
  id: string;
  /** 开发机名称 */
  name: string;
  /** 资源池引用 */
  resourcePool: ResourcePoolRef;
  /** 资源配置 */
  resources: ComputeResources;
  /** 镜像地址 */
  imageUrl?: string;
  /** 状态 */
  status: number;
  /** 状态原因 */
  statusReason?: string;
  /** 创建者 */
  creator?: string;
  /** 创建者ID */
  creatorId?: string;
  /** 区域 */
  region?: string;
  /** 创建时间 */
  createdAt?: number;
  /** 更新时间 */
  updatedAt?: number;
  /** 登录信息 */
  loginInfo?: {
    jupyter?: string;
    vscode?: string;
  };
  /** SSH配置 */
  ssh?: {
    enabled?: boolean;
    publicKey?: string;
  };
  /** 环境变量 */
  envs?: Record<string, string>;
  /** 启动命令 */
  startCmd?: string;
  /** 工作目录 */
  workspaceDir?: string;
}

/**
 * 开发机状态映射
 */
export const DEV_INSTANCE_STATUS: Record<number, string> = {
  0: 'creating',
  1: 'pending',
  2: 'deploying',
  3: 'running',
  4: 'stopping',
  5: 'stopped',
  6: 'starting',
  7: 'started',
  10: 'imageBuilding',
  11: 'deleting',
  18: 'failed',
  19: 'error',
  20: 'deleted',
};

/**
 * 开发机转换器
 */
export class DevInstanceTransformer {
  /**
   * 后端详情 -> 统一详情
   */
  fromBackend(detail: BackendDevInstanceDetail): DevInstanceDetail {
    return {
      id: detail.id,
      name: detail.name,
      resourcePool: detail.conf?.resourcePool
        ? resourcePoolRefTransformer.fromDevInstance(detail.conf.resourcePool)
        : { poolId: '', queue: '' },
      resources: detail.conf?.resources
        ? computeResourcesTransformer.fromDevInstance(detail.conf.resources)
        : { cpu: 0, memory: 0 },
      imageUrl: detail.conf?.image?.imageUrl,
      status: detail.status,
      statusReason: detail.statusReason,
      creator: detail.creator,
      creatorId: detail.creatorId,
      region: detail.region,
      createdAt: detail.createdAt || (detail as any).createTime,
      updatedAt: detail.updatedAt || (detail as any).updateTime,
      loginInfo: detail.loginInfo ? {
        jupyter: detail.loginInfo.jupyter?.url,
        vscode: detail.loginInfo.vscode?.url,
      } : undefined,
      ssh: detail.conf?.access ? {
        enabled: detail.conf.access.sshEnable,
        publicKey: detail.conf.access.sshRSAPubKey,
      } : undefined,
      envs: detail.conf?.envs,
      startCmd: detail.conf?.startCmd,
      workspaceDir: detail.conf?.workspaceDir,
    };
  }

  /**
   * 从后端资源获取简要信息
   */
  fromBackendBrief(resources: BackendDevResources): ComputeResources {
    return computeResourcesTransformer.fromDevInstance(resources);
  }
}

export const devInstanceTransformer = new DevInstanceTransformer();
