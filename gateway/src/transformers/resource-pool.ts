import type {
  ResourcePool,
  Queue,
  Node,
  ResourceAmount,
  ListResourcePoolsParams,
} from '../types/unified/resource-pool.js';
import type {
  BackendResourcePoolSpec,
  BackendQueueItem,
  BackendNode,
  BackendResourceAmount,
} from '../types/backend/resource-pool.js';

/**
 * 资源池类型映射
 */
const POOL_TYPE_FROM_BACKEND: Record<string, string> = {
  common: 'common',
  dedicatedV2: 'dedicatedV2',
};

/**
 * 队列类型映射
 */
const QUEUE_TYPE_FROM_BACKEND: Record<string, string> = {
  regular: 'regular',
  elastic: 'elastic',
  physical: 'physical',
};

/**
 * 资源池转换器
 */
export class ResourcePoolTransformer {
  /**
   * 统一查询参数 -> 后端查询参数
   */
  toBackendParams(params: ListResourcePoolsParams): Record<string, string> {
    const result: Record<string, string> = {
      resourcePoolType: params.type === 'common' ? 'common' : 'dedicatedV2',
    };

    if (params.keywordType) {
      result.keywordType = params.keywordType === 'name' ? 'resourcePoolName' : 'resourcePoolId';
    }
    if (params.keyword) {
      result.keyword = params.keyword;
    }
    if (params.orderBy) {
      result.orderBy = params.orderBy === 'name' ? 'resourcePoolName' :
        params.orderBy === 'id' ? 'resourcePoolId' : 'createdAt';
    }
    if (params.order) {
      result.order = params.order.toUpperCase();
    }
    if (params.pageNumber) {
      result.pageNumber = String(params.pageNumber);
    }
    if (params.pageSize) {
      result.pageSize = String(params.pageSize);
    }

    return result;
  }

  /**
   * 后端响应 -> 统一响应
   */
  fromBackend(pool: BackendResourcePoolSpec): ResourcePool {
    return {
      id: pool.resourcePoolId,
      name: pool.name,
      region: pool.region,
      type: POOL_TYPE_FROM_BACKEND[pool.type] as 'common' | 'dedicatedV2',
      description: pool.description,
      status: pool.phase,
      nodeCount: pool.nodeNum,
      exposedPublic: pool.configuration?.exposedPublic ?? pool.exposedPublic,
      forbidDelete: pool.configuration?.forbidDelete ?? pool.forbidDelete,
      deschedulerEnabled: pool.configuration?.deschedulerEnabled ?? pool.deschedulerEnabled,
      k8sVersion: pool.k8sVersion,
      createdAt: pool.createdAt || (pool as any).createTime,
      updatedAt: pool.updatedAt || (pool as any).updateTime,
      createdBy: pool.createdBy,
    };
  }

  /**
   * 后端队列 -> 统一队列
   */
  queueFromBackend(queue: BackendQueueItem): Queue {
    return {
      id: queue.resourceQueueId,
      name: queue.resourceQueueName,
      type: queue.resourceQueueType ? QUEUE_TYPE_FROM_BACKEND[queue.resourceQueueType.toLowerCase()] as 'regular' | 'elastic' | 'physical' : undefined,
      resourcePoolId: queue.resourcePoolId,
      description: queue.description,
      opened: queue.opened,
      reclaimable: queue.reclaimable,
      queueingStrategy: queue.queueingStrategy?.toLowerCase() === 'strictfifo'
        ? 'strictFIFO'
        : 'bestEffortFIFO',
      enableVGPU: queue.enableVGPU,
      capability: queue.capability ? this.resourceAmountFromBackend(queue.capability) : undefined,
      allocated: queue.allocated ? this.resourceAmountFromBackend(queue.allocated) : undefined,
      runningJobs: queue.runningJobs,
      pendingJobs: queue.pendingJobs,
      createdAt: queue.createdAt ? String(queue.createdAt) : ((queue as any).createTime ? String((queue as any).createTime) : undefined),
      updatedAt: queue.updatedAt ? String(queue.updatedAt) : ((queue as any).updateTime ? String((queue as any).updateTime) : undefined),
    };
  }

  /**
   * 后端节点 -> 统一节点
   */
  nodeFromBackend(node: BackendNode): Node {
    return {
      name: node.nodeSpec?.nodeName,
      instanceId: node.nodeSpec?.instanceId,
      region: node.nodeSpec?.region,
      zone: node.nodeSpec?.zone,
      flavorName: node.nodeSpec?.flavorName,
      status: node.nodeStatus?.statusPhase,
      chargingType: node.nodeSpec?.resourceChargingOption?.chargingType?.toLowerCase() as 'prepaid' | 'postpaid' | undefined,
      createdAt: node.nodeStatus?.createdAt || (node.nodeStatus as any)?.createTime || (node as any).createTime,
      resources: node.nodeStatus?.nodeResource?.capacity ? {
        cpuCores: node.nodeStatus.nodeResource.capacity.cpuCores,
        memoryGi: node.nodeStatus.nodeResource.capacity.memoryGi,
        gpuCount: node.nodeStatus.nodeResource.capacity.gpuNum,
      } : undefined,
    };
  }

  /**
   * 后端资源数量 -> 统一资源数量
   */
  resourceAmountFromBackend(amount: BackendResourceAmount): ResourceAmount {
    return {
      cpuMilliCores: amount.milliCPUcores,
      memoryGi: amount.memoryGi,
      acceleratorCards: amount.acceleratorCardList?.map(card => ({
        type: card.acceleratorType,
        count: card.acceleratorCount,
        description: card.acceleratorDescription,
      })),
    };
  }
}

export const resourcePoolTransformer = new ResourcePoolTransformer();
