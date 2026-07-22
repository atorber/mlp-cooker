import type { ComputeResources } from '../types/unified/index.js';
import type {
  BackendResource,
  BackendContainerConf,
  BackendDevResources,
} from '../types/backend/index.js';

/**
 * 资源规格转换器
 * 负责统一结构 <-> 后端结构之间的转换
 */
export class ComputeResourcesTransformer {
  /**
   * 统一结构 -> 训练任务后端结构
   */
  toTrainingJob(resources: ComputeResources): BackendResource[] {
    const result: BackendResource[] = [];

    // CPU
    result.push({ name: 'cpu', quantity: resources.cpu });

    // 内存
    result.push({ name: 'memory', quantity: resources.memory });

    // 加速卡
    if (resources.accelerator) {
      result.push({
        name: resources.accelerator.type,
        quantity: resources.accelerator.count,
      });
    }

    // 共享内存
    if (resources.sharedMemory) {
      result.push({ name: 'sharedMemory', quantity: resources.sharedMemory });
    }

    return result;
  }

  /**
   * 训练任务后端结构 -> 统一结构
   */
  fromTrainingJob(resources: BackendResource[]): ComputeResources {
    const result: ComputeResources = {
      cpu: 0,
      memory: 0,
    };

    for (const res of resources) {
      if (res.name === 'cpu') {
        result.cpu = res.quantity;
      } else if (res.name === 'memory') {
        result.memory = res.quantity;
      } else if (res.name === 'sharedMemory') {
        result.sharedMemory = res.quantity;
      } else {
        // 其他都是加速卡类型
        result.accelerator = {
          type: res.name,
          count: res.quantity,
        };
      }
    }

    return result;
  }

  /**
   * 统一结构 -> 服务部署后端结构（ContainerConf部分字段）
   */
  toService(resources: ComputeResources): { cpus: number; memory: number; acceleratorCount?: number } {
    return {
      cpus: resources.cpu,
      memory: resources.memory,
      acceleratorCount: resources.accelerator?.count,
    };
  }

  /**
   * 服务部署后端结构 -> 统一结构
   */
  fromService(container: BackendContainerConf, acceleratorType?: string): ComputeResources {
    const result: ComputeResources = {
      cpu: container.cpus,
      memory: container.memory,
    };

    if (container.acceleratorCount && container.acceleratorCount > 0) {
      result.accelerator = {
        type: acceleratorType || '',
        count: container.acceleratorCount,
      };
    }

    return result;
  }

  /**
   * 统一结构 -> 开发机后端结构
   */
  toDevInstance(resources: ComputeResources): BackendDevResources {
    return {
      cpus: resources.cpu,
      memory: resources.memory,
      acceleratorCount: resources.accelerator?.count,
      acceleratorType: resources.accelerator?.type,
      shmSize: resources.sharedMemory,
    };
  }

  /**
   * 开发机后端结构 -> 统一结构
   */
  fromDevInstance(resources: BackendDevResources): ComputeResources {
    const result: ComputeResources = {
      cpu: resources.cpus,
      memory: resources.memory,
    };

    if (resources.acceleratorCount && resources.acceleratorCount > 0) {
      result.accelerator = {
        type: resources.acceleratorType || '',
        count: resources.acceleratorCount,
      };
    }

    if (resources.shmSize) {
      result.sharedMemory = resources.shmSize;
    }

    return result;
  }
}

export const computeResourcesTransformer = new ComputeResourcesTransformer();
