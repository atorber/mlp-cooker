/**
 * 统一的镜像配置
 * 适用于：训练任务、服务部署、开发机
 */
export interface ImageConfig {
  /** 镜像地址 */
  url: string;
  /** 镜像来源 */
  source?: ImageSource;
  /** 私有镜像认证 */
  auth?: ImageAuth;
}

/**
 * 镜像来源类型
 */
export type ImageSource = 'preset' | 'custom' | 'ccr' | 'other';

/**
 * 镜像认证信息
 */
export interface ImageAuth {
  username: string;
  password: string;
}

/**
 * 镜像类型映射（后端数值 -> 统一枚举）
 */
export const IMAGE_TYPE_MAPPING: Record<number, ImageSource> = {
  0: 'preset',
  1: 'custom',
  2: 'other',
};

/**
 * 统一枚举 -> 后端数值映射
 */
export const IMAGE_SOURCE_TO_TYPE: Record<ImageSource, number> = {
  preset: 0,
  custom: 1,
  ccr: 1,  // ccr归类为custom
  other: 2,
};
