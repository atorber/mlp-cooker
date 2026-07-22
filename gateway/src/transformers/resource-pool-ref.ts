import type { ResourcePoolRef } from '../types/unified/index.js';
import type {
  BackendResourcePoolConf,
  BackendDevResourcePool,
} from '../types/backend/index.js';
import {
  RESOURCE_POOL_TYPE_MAPPING,
  POOL_TYPE_TO_BACKEND,
} from '../types/unified/resource-pool-ref.js';

/**
 * 资源池引用转换器
 */
export class ResourcePoolRefTransformer {
  /**
   * 统一结构 -> 服务部署后端结构
   */
  toService(ref: ResourcePoolRef): BackendResourcePoolConf {
    return {
      resourcePoolId: ref.poolId,
      resourcePoolName: ref.poolName,
      queueName: ref.queue,
      resourcePoolType: ref.poolType ? POOL_TYPE_TO_BACKEND[ref.poolType] : '',
    };
  }

  /**
   * 服务部署后端结构 -> 统一结构
   */
  fromService(conf: BackendResourcePoolConf): ResourcePoolRef {
    return {
      poolId: conf.resourcePoolId,
      poolName: conf.resourcePoolName,
      queue: conf.queueName,
      poolType: conf.resourcePoolType
        ? RESOURCE_POOL_TYPE_MAPPING[conf.resourcePoolType]
        : 'common',
    };
  }

  /**
   * 统一结构 -> 开发机后端结构
   */
  toDevInstance(ref: ResourcePoolRef): BackendDevResourcePool {
    return {
      resourcePoolId: ref.poolId,
      resourcePoolName: ref.poolName,
      queueName: ref.queue,
      resourcePoolType: ref.poolType ? POOL_TYPE_TO_BACKEND[ref.poolType] : '',
    };
  }

  /**
   * 开发机后端结构 -> 统一结构
   */
  fromDevInstance(conf: BackendDevResourcePool): ResourcePoolRef {
    return {
      poolId: conf.resourcePoolId || '',
      poolName: conf.resourcePoolName,
      queue: conf.queueName,
      poolType: conf.resourcePoolType
        ? RESOURCE_POOL_TYPE_MAPPING[conf.resourcePoolType]
        : 'common',
    };
  }

  /**
   * 统一结构 -> 训练任务Query参数
   */
  toTrainingJobQuery(ref: ResourcePoolRef): {
    resourcePoolId: string;
    queueID: string;
  } {
    return {
      resourcePoolId: ref.poolId,
      queueID: ref.queue,
    };
  }
}

export const resourcePoolRefTransformer = new ResourcePoolRefTransformer();
