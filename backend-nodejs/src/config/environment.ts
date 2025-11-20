import { config } from 'dotenv';

// 加载环境变量
config();

/**
 * 应用配置接口
 */
export interface AppConfig {
  server: {
    host: string;
    port: number;
    debug: boolean;
  };
  database: {
    path: string;
  };
  external: {
    icafe: {
      baseUrl: string;
      username: string;
      password: string;
      spacePrefixCode?: string;
    };
        aihc: {
      datasetBaseUrl: string;
      environment: 'gray' | 'production';
    };
    im: {
      baseUrl: string;
    };
    fastapp: {
      baseUrl: string;
    };
    };
  logging: {
    level: string;
    format: string;
  };
}

/**
 * 配置管理器 - 加载和管理应用配置
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * 获取完整配置
   */
  public getConfig(): AppConfig {
    return this.config;
  }

  /**
   * 获取特定部分的配置
   */
  public get<T extends keyof AppConfig>(section: T): Pick<AppConfig, T>[T] {
    return this.config[section];
  }

  /**
   * 加载配置 - 合并默认值、环境变量和配置文件
   */
  private loadConfig(): AppConfig {
    // 默认配置
    const defaultConfig: AppConfig = {
      server: {
        host: process.env.FLASK_HOST || '0.0.0.0',
        port: parseInt(process.env.FLASK_PORT || '5002', 10),
        debug: process.env.FLASK_DEBUG === 'true',
      },
      database: {
        path: process.env.DB_PATH || './data',
      },
      external: {
        icafe: {
          baseUrl: process.env.ICAFE_BASE_URL || 'https://console.cloud.baidu-int.com',
          username: process.env.ICAFE_USERNAME || '',
          password: process.env.ICAFE_PASSWORD || '',
        },
                aihc: {
          datasetBaseUrl: process.env.AIHC_DATASET_BASE_URL || '',
          environment: (process.env.AIHC_ENVIRONMENT as 'gray' | 'production') || 'gray',
        },
        im: {
          baseUrl: process.env.IM_BASE_URL || 'https://api-in.baidu-int.com',
        },
        fastapp: {
          baseUrl: process.env.FASTAPP_BASE_URL || '',
        },
      },
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'combined',
      },
    };

    return defaultConfig;
  }

  /**
   * 验证配置完整性
   * 注意：旧的配置项（如 ICAFE_USERNAME）已经不再使用，只验证基本的服务器配置
   */
  public validateConfig(): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 只验证基本的服务器配置
    if (!this.config.server.port || this.config.server.port <= 0) {
      errors.push('Server port is required and must be greater than 0');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

// 导出配置实例
export const configManager = ConfigManager.getInstance();
export const appConfig = configManager.getConfig();