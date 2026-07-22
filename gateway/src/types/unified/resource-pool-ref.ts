/**
 * 统一的资源池引用
 * 适用于：训练任务、服务部署、开发机
 */
export interface ResourcePoolRef {
  /** 资源池ID */
  poolId: string;
  /** 资源池名称（只读，查询时返回） */
  poolName?: string;
  /** 资源池类型 */
  poolType?: ResourcePoolType;
  /** 队列名称 */
  queue: string;
}

/**
 * 资源池类型
 */
export type ResourcePoolType = 'common' | 'dedicatedV2' | 'serverless';

/**
 * 资源池类型映射
 */
export const RESOURCE_POOL_TYPE_MAPPING: Record<string, ResourcePoolType> = {
  '': 'common',
  'common': 'common',
  'dedicatedV2': 'dedicatedV2',
  'serverless': 'serverless',
};

/**
 * 统一枚举 -> 后端值映射
 */
export const POOL_TYPE_TO_BACKEND: Record<ResourcePoolType, string> = {
  'common': 'common',
  'dedicatedV2': 'dedicatedV2',
  'serverless': 'serverless',
};
