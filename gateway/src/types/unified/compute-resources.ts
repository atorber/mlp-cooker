/**
 * 统一的计算资源配置
 * 适用于：训练任务、服务部署、开发机
 */
export interface ComputeResources {
  /** CPU核数 */
  cpu: number;
  /** 内存大小(GB) */
  memory: number;
  /** 加速卡配置 */
  accelerator?: AcceleratorConfig;
  /** 共享内存大小(GB) */
  sharedMemory?: number;
}

/**
 * 加速卡配置
 */
export interface AcceleratorConfig {
  /** 加速卡类型，如 baidu.com/a800_80g_cgpu */
  type: string;
  /** 加速卡数量 */
  count: number;
}

/**
 * GPU芯片类型映射表
 */
export const GPU_TYPE_MAPPING: Record<string, string> = {
  'A800-SXM4-80GB': 'baidu.com/a800_80g_cgpu',
  'A100-SXM4-40GB': 'baidu.com/a100_40g_cgpu',
  'A100-SXM-80GB': 'baidu.com/a100_80g_cgpu',
  'A10': 'baidu.com/a10_24g_cgpu',
  'H800': 'baidu.com/h800_80g_cgpu',
  'Tesla V100-SXM2-16GB': 'baidu.com/v100_16g_cgpu',
  'Tesla V100-SXM2-32GB': 'baidu.com/v100_32g_cgpu',
  'L20': 'baidu.com/l20_cgpu',
  'L40': 'baidu.com/l40_cgpu',
  'H20': 'baidu.com/h20_96g_cgpu',
  'H20Z': 'baidu.com/h20z_141g_cgpu',
  'H20-3e': 'baidu.com/h20_141g_cgpu',
};
