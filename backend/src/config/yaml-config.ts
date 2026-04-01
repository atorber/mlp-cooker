import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 配置定义接口 - 只包含机器学习平台资源配置
 */
export interface YamlConfigData {
  // 机器学习平台资源配置
  ML_PLATFORM_RESOURCE_AK: string;
  ML_PLATFORM_RESOURCE_SK: string;
  ML_PLATFORM_RESOURCE_BASE_URL: string;
  ML_PLATFORM_RESOURCE_POOL_ID: string;
  ML_PLATFORM_RESOURCE_QUEUE_ID: string;
  ML_PLATFORM_RESOURCE_PFS_INSTANCE_ID: string;
  ML_PLATFORM_RESOURCE_BUCKET: string;
  ML_PLATFORM_RESOURCE_REGION: string;
  /** MLP Cooker 常驻任务（组件）相关，供存储/PFS 等能力使用 */
  ML_COOKER_COMPONENT_JOB_NAME: string;
  ML_COOKER_COMPONENT_JOB_IMAGE: string;
  ML_COOKER_COMPONENT_JOB_COMMAND: string;
  // LakeFS 资源配置
  LAKEFS_ENDPOINT: string;
  LAKEFS_ACCESS_KEY_ID: string;
  LAKEFS_SECRET_ACCESS_KEY: string;
}

/**
 * 默认配置值
 */
const DEFAULT_CONFIG: Partial<YamlConfigData> = {};

/**
 * 配置类型转换定义 - 只包含机器学习平台资源配置
 */
const CONFIG_TYPE_DEFINITIONS: {
  [K in keyof YamlConfigData]: {
    type: 'string' | 'number' | 'boolean';
    required: boolean;
    default?: any;
  };
} = {
  ML_PLATFORM_RESOURCE_AK: { type: 'string', required: false },
  ML_PLATFORM_RESOURCE_SK: { type: 'string', required: false },
  ML_PLATFORM_RESOURCE_BASE_URL: { type: 'string', required: false },
  ML_PLATFORM_RESOURCE_POOL_ID: { type: 'string', required: false },
  ML_PLATFORM_RESOURCE_QUEUE_ID: { type: 'string', required: false },
  ML_PLATFORM_RESOURCE_PFS_INSTANCE_ID: { type: 'string', required: false },
  ML_PLATFORM_RESOURCE_BUCKET: { type: 'string', required: false },
  ML_PLATFORM_RESOURCE_REGION: { type: 'string', required: false, default: 'bj' },
  ML_COOKER_COMPONENT_JOB_NAME: { type: 'string', required: false },
  ML_COOKER_COMPONENT_JOB_IMAGE: { type: 'string', required: false },
  ML_COOKER_COMPONENT_JOB_COMMAND: { type: 'string', required: false },
  LAKEFS_ENDPOINT: { type: 'string', required: false },
  LAKEFS_ACCESS_KEY_ID: { type: 'string', required: false },
  LAKEFS_SECRET_ACCESS_KEY: { type: 'string', required: false },
};

/**
 * YAML配置管理器 - 与Python版本逻辑完全一致
 */
export class YamlConfigManager {
  private static instance: YamlConfigManager;
  private configData: Partial<YamlConfigData> = {};
  private configFilePath: string;

  private constructor(configFilePath?: string) {
    this.configFilePath = configFilePath || path.join(process.cwd(), '..', 'config.yaml');
    this.loadConfig();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(configFilePath?: string): YamlConfigManager {
    if (!YamlConfigManager.instance) {
      YamlConfigManager.instance = new YamlConfigManager(configFilePath);
    }
    return YamlConfigManager.instance;
  }

  /**
   * 加载YAML配置文件
   */
  private loadConfig(): void {
    try {
      if (fs.existsSync(this.configFilePath)) {
        const fileContent = fs.readFileSync(this.configFilePath, 'utf8');
        this.configData = yaml.load(fileContent) || {};
        console.log(`✅ YAML配置文件加载成功: ${this.configFilePath}`);
      } else {
        console.warn(`⚠️  YAML配置文件不存在: ${this.configFilePath}`);
        this.configData = {};
      }
    } catch (error) {
      console.error(`❌ YAML配置文件加载失败:`, error);
      this.configData = {};
    }
  }

  /**
   * 获取配置值 - 优先级：环境变量 > YAML配置 > 默认值
   */
  public getConfig<T extends keyof YamlConfigData>(key: T): YamlConfigData[T] {
    const typeDef = CONFIG_TYPE_DEFINITIONS[key];
    if (!typeDef) {
      throw new Error(`未知的配置键: ${String(key)}`);
    }

    // 1. 尝试从环境变量获取
    const envValue = process.env[key];

    // 2. 尝试从YAML配置获取
    const yamlValue = this.configData[key];

    // 3. 使用默认值
    const defaultValue = typeDef.default || (DEFAULT_CONFIG as any)[key];

    // 确定最终值
    let finalValue: any = envValue ?? yamlValue ?? defaultValue;

    // 类型转换
    return this.convertType(finalValue, typeDef.type);
  }

  /**
   * 获取完整配置对象
   */
  public getAllConfig(): Partial<YamlConfigData> {
    const config: any = {};

    for (const key in CONFIG_TYPE_DEFINITIONS) {
      const value = this.getConfig(key as keyof YamlConfigData);
      if (value !== undefined) {
        config[key] = value;
      }
    }

    return config as Partial<YamlConfigData>;
  }

  /**
   * 类型转换 - 与Python版本保持一致
   */
  private convertType(value: any, targetType: string): any {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    switch (targetType) {
      case 'string':
        return String(value);

      case 'number':
        const num = Number(value);
        return isNaN(num) ? 0 : num;

      case 'boolean':
        if (typeof value === 'boolean') {
          return value;
        }
        const str = String(value).toLowerCase();
        return ['true', '1', 'yes', 'on'].includes(str);

      default:
        return value;
    }
  }

  /**
   * 验证配置
   */
  public validateConfig(): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const [key, typeDef] of Object.entries(CONFIG_TYPE_DEFINITIONS)) {
      const value = this.getConfig(key as keyof YamlConfigData);

      // 检查必填项
      if (typeDef.required && (value === undefined || value === null || value === '')) {
        errors.push(`必需的配置项缺失: ${key}`);
      }

      // 检查空的生产环境配置
      if (key.toString().includes('PRODUCTION') && (!value || value === '')) {
        warnings.push(`生产环境配置为空: ${key}`);
      }

      // 类型检查
      if (value !== undefined && typeof value !== typeDef.type) {
        warnings.push(`配置项类型不匹配: ${key} 期望 ${typeDef.type}, 实际 ${typeof value}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 重新加载配置文件
   */
  public reloadConfig(): void {
    this.loadConfig();
    console.log('🔄 YAML配置文件已重新加载');
  }

  /**
   * 保存配置到文件
   * 与Python版本的save_config方法功能一致
   */
  public saveConfig(configData: Partial<YamlConfigData>): boolean {
    try {
      // 确保目录存在
      const dir = path.dirname(this.configFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // 转换配置数据，确保类型正确
      const configToSave: any = {};
      
      // 遍历所有标准配置项，确保所有配置项都存在
      for (const key in CONFIG_TYPE_DEFINITIONS) {
        const configKey = key as keyof YamlConfigData;
        const typeDef = CONFIG_TYPE_DEFINITIONS[configKey];
        
        if (configData[configKey] !== undefined) {
          // 转换类型
          const value = this.convertType(configData[configKey], typeDef.type);
          configToSave[configKey] = value;
        } else if (this.configData[configKey] !== undefined) {
          // 保留原有值
          configToSave[configKey] = this.configData[configKey];
        } else {
          // 使用默认值或空值
          const defaultValue = typeDef.default !== undefined 
            ? typeDef.default 
            : (typeDef.type === 'number' ? 0 : '');
          configToSave[configKey] = defaultValue;
        }
      }

      // 保存配置到文件
      // 使用 js-yaml 的 dump 方法保存配置
      // flowLevel: -1 表示使用块样式（等同于 Python 的 default_flow_style=False）
      // sortKeys: true 按键名排序（等同于 Python 的 sort_keys=True）
      const yamlContent = yaml.dump(configToSave, {
        indent: 2, // 缩进2个空格
        flowLevel: -1, // 使用块样式（等同于 defaultFlowStyle: false）
        sortKeys: true, // 按键名排序
        lineWidth: -1, // 不限制行宽
        noRefs: true, // 不引用（避免对象引用）
      });

      fs.writeFileSync(this.configFilePath, yamlContent, 'utf8');

      // 更新内存中的配置数据
      this.configData = configToSave;

      console.log(`✅ 配置已保存到: ${this.configFilePath}`);
      return true;
    } catch (error) {
      console.error(`❌ 保存配置文件失败:`, error);
      return false;
    }
  }

  /**
   * 获取AIHC数据集管理配置（已废弃，返回空对象）
   * @deprecated 请使用 getMLResourceConfig()
   */
  public getDatasetConfig() {
    return {
      ak: '',
      sk: '',
      hostGray: '',
      hostProduction: {
        bd: '',
        bj: '',
        cd: '',
        gz: '',
        hkg: '',
        su: '',
        yq: '',
      },
      maxRetries: 3,
      timeout: 30,
    };
  }


  /**
   * 获取IM配置（已废弃，返回空对象）
   * @deprecated
   */
  public getImConfig() {
    return {
      accessToken: '',
      apiToken: '',
      appKey: '',
      appSecret: '',
      personalAk: '',
      personalSk: '',
    };
  }

  /**
   * 获取快速应用管理配置（已废弃，返回空对象）
   * @deprecated
   */
  public getFastAppConfig() {
    return {
      hostGray: '',
      hostProduction: '',
    };
  }

  /**
   * 获取数据集任务配置（已废弃，返回空对象）
   * @deprecated 请使用 getMLResourceConfig()
   */
  public getDatasetJobConfig() {
    return {
      ak: '',
      sk: '',
      region: '',
      bucket: '',
      pfs: '',
      poolId: '',
      queueId: '',
    };
  }

  /**
   * 获取 LakeFS 资源配置
   */
  public getLakeFSConfig() {
    return {
      endpoint: this.getConfig('LAKEFS_ENDPOINT'),
      accessKeyId: this.getConfig('LAKEFS_ACCESS_KEY_ID'),
      secretAccessKey: this.getConfig('LAKEFS_SECRET_ACCESS_KEY'),
    };
  }

  /**
   * 获取机器学习平台资源配置
   */
  public getMLResourceConfig() {
    return {
      ak: this.getConfig('ML_PLATFORM_RESOURCE_AK'),
      sk: this.getConfig('ML_PLATFORM_RESOURCE_SK'),
      baseURL: this.getConfig('ML_PLATFORM_RESOURCE_BASE_URL'),
      poolId: this.getConfig('ML_PLATFORM_RESOURCE_POOL_ID'),
      queueId: this.getConfig('ML_PLATFORM_RESOURCE_QUEUE_ID'),
      pfsInstanceId: this.getConfig('ML_PLATFORM_RESOURCE_PFS_INSTANCE_ID'),
      bucket: this.getConfig('ML_PLATFORM_RESOURCE_BUCKET'),
      region: this.getConfig('ML_PLATFORM_RESOURCE_REGION') || 'bj',
    };
  }
}