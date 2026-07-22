/**
 * 统一的调度配置
 * 适用于：训练任务、服务部署、开发机
 */
export interface ScheduleConfig {
  /** 调度优先级 */
  priority?: 'high' | 'normal' | 'low';
  /** 是否优先调度到CPU节点（开发机专用） */
  cpuNodeAffinity?: boolean;
}

/**
 * 后端调度配置类型
 */
export interface BackendScheduleConf {
  priority?: 'high' | 'normal' | 'low';
  cpuNodeAffinity?: boolean;
}

/**
 * 调度配置转换器
 */
export class ScheduleConfigTransformer {
  /**
   * 统一结构 -> 后端结构
   */
  toBackend(config: ScheduleConfig): BackendScheduleConf {
    return {
      priority: config.priority,
      cpuNodeAffinity: config.cpuNodeAffinity,
    };
  }

  /**
   * 后端结构 -> 统一结构
   */
  fromBackend(backend: BackendScheduleConf): ScheduleConfig {
    return {
      priority: backend.priority,
      cpuNodeAffinity: backend.cpuNodeAffinity,
    };
  }
}

export const scheduleConfigTransformer = new ScheduleConfigTransformer();
