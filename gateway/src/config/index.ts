import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface Config {
  server: {
    port: number;
    host: string;
    nodeEnv: string;
  };
  log: {
    level: string;
  };
  backend: {
    endpoints: Record<string, Record<string, string>>;
    timeout: number;
    retries: number;
  };
  auth: {
    ak: string;
    sk: string;
  };
  cache: {
    redisUrl?: string;
    ttl: number;
  };
  rateLimit: {
    max: number;
    windowMs: number;
  };
}

/**
 * 区域端点映射
 */
const REGION_ENDPOINTS: Record<string, Record<string, string>> = {
  aihc: {
    bj: process.env.BACKEND_ENDPOINT_BJ || 'aihc.bj.baidubce.com',
    gz: process.env.BACKEND_ENDPOINT_GZ || 'aihc.gz.baidubce.com',
    su: process.env.BACKEND_ENDPOINT_SU || 'aihc.su.baidubce.com',
    bd: process.env.BACKEND_ENDPOINT_BD || 'aihc.bd.baidubce.com',
    fwh: process.env.BACKEND_ENDPOINT_FWH || 'aihc.fwh.baidubce.com',
    yq: process.env.BACKEND_ENDPOINT_YQ || 'aihc.yq.baidubce.com',
  },
  bos: {
    bj: process.env.BOS_ENDPOINT_BJ || 'bj.bcebos.com',
    gz: process.env.BOS_ENDPOINT_GZ || 'gz.bcebos.com',
    su: process.env.BOS_ENDPOINT_SU || 'su.bcebos.com',
    bd: process.env.BOS_ENDPOINT_BD || 'bd.bcebos.com',
  }
};

/**
 * 应用配置
 */
export const config: Config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  log: {
    level: process.env.LOG_LEVEL || 'info',
  },
  backend: {
    endpoints: REGION_ENDPOINTS,
    timeout: parseInt(process.env.BACKEND_TIMEOUT || '30000', 10),
    retries: parseInt(process.env.BACKEND_RETRIES || '3', 10),
  },
  auth: {
    ak: process.env.BAIDU_CLOUD_AK || '',
    sk: process.env.BAIDU_CLOUD_SK || '',
  },
  cache: {
    redisUrl: process.env.REDIS_URL,
    ttl: parseInt(process.env.CACHE_TTL || '300', 10),
  },
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  },
};

/**
 * 验证配置
 */
export function validateConfig(): void {
  const errors: string[] = [];

  if (!config.auth.ak) {
    errors.push('BAIDU_CLOUD_AK is required');
  }
  if (!config.auth.sk) {
    errors.push('BAIDU_CLOUD_SK is required');
  }

  if (errors.length > 0) {
    console.warn('Configuration warnings:', errors.join(', '));
  }
}

export default config;
