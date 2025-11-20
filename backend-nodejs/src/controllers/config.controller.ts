import { Request, Response } from 'express';
import { ResponseUtils } from '@/utils/response.utils';
import { YamlConfigManager } from '@/config/yaml-config';

/**
 * 配置管理控制器
 */
export class ConfigController {
  private static configManager = YamlConfigManager.getInstance();

  /**
   * 配置数据脱敏处理
   * AK和SK不需要脱敏，直接显示
   */
  private static sanitizeConfig(config: any): any {
    // 不需要脱敏的配置项（AK和SK直接显示）
    const noSanitizeKeys = ['ML_PLATFORM_RESOURCE_AK', 'ML_PLATFORM_RESOURCE_SK'];
    
    const sensitiveKeys = [
      'PASSWORD', 'SECRET', 'TOKEN'
    ];

    const sanitized = { ...config };

    for (const key in sanitized) {
      // 检查是否为不需要脱敏的配置项（AK和SK）
      const shouldNotSanitize = noSanitizeKeys.includes(key);
      
      if (shouldNotSanitize) {
        // AK和SK直接显示，不脱敏
        continue;
      }
      
      // 检查是否为敏感信息（排除已处理的AK/SK）
      const isSensitive = sensitiveKeys.some(sensitiveKey =>
        key.toUpperCase().includes(sensitiveKey) && 
        !key.toUpperCase().includes('PLATFORM_RESOURCE_AK') &&
        !key.toUpperCase().includes('PLATFORM_RESOURCE_SK')
      );

      if (isSensitive && sanitized[key]) {
        // 保留前几位和后几位，中间用*代替
        const value = String(sanitized[key]);
        if (value.length > 8) {
          sanitized[key] = value.substring(0, 4) + '***' + value.substring(value.length - 4);
        } else {
          sanitized[key] = '******';
        }
      }
    }

    return sanitized;
  }

  /**
   * 获取完整配置文件
   */
  public static async getConfig(req: Request, res: Response): Promise<void> {
    try {
      ConfigController.logInfo('获取配置文件开始');

      // 定义所有标准配置项（只包含机器学习平台资源配置）
      const standardKeys = [
        'ML_PLATFORM_RESOURCE_AK', 'ML_PLATFORM_RESOURCE_SK', 'ML_PLATFORM_RESOURCE_BASE_URL',
        'ML_PLATFORM_RESOURCE_POOL_ID', 'ML_PLATFORM_RESOURCE_QUEUE_ID',
        'ML_PLATFORM_RESOURCE_PFS_INSTANCE_ID', 'ML_PLATFORM_RESOURCE_BUCKET'
      ] as string[];

      // 遍历所有标准配置项，确保即使为空也会返回（与Python版本保持一致）
      const allConfig: Record<string, any> = {};
      for (const key of standardKeys) {
        try {
          const value = ConfigController.configManager.getConfig(key as any);
          // 如果值为 undefined 或 null，设置为空字符串（与Python版本保持一致）
          allConfig[key] = value !== undefined && value !== null ? value : '';
        } catch (error) {
          // 如果配置项不存在，设置为空字符串
          allConfig[key] = '';
        }
      }

      // 脱敏处理敏感信息
      const sanitizedConfig = ConfigController.sanitizeConfig(allConfig);

      // 返回与Python版本一致的格式
      const response = {
        success: true,
        data: {
          config: sanitizedConfig,
          config_file_exists: true, // 实际实现中应该检查文件是否存在
          config_file_path: '/Users/luyuchao/baidu/aihc/aihc-mentor/config.yaml'
        }
      };

      res.json(response);
    } catch (error) {
      console.error('获取配置文件失败:', error);
      const response = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(500).json(response);
    }
  }

  /**
   * 获取特定配置项
   */
  public static async getConfigItem(req: Request, res: Response): Promise<void> {
    try {
      const { key } = req.params;

      if (!key) {
        const response = {
          success: false,
          error: '配置项键名不能为空'
        };
        res.status(400).json(response);
        return;
      }

      ConfigController.logInfo('获取配置项开始', { key });

      // 获取所有配置并查找指定键
      const allConfig = ConfigController.configManager.getAllConfig();
      const value = allConfig[key as keyof typeof allConfig];

      if (value === undefined) {
        const response = {
          success: false,
          error: `配置项 ${key} 不存在`
        };
        res.status(404).json(response);
        return;
      }

      const response = {
        success: true,
        data: {
          key,
          value
        }
      };

      res.json(response);
    } catch (error) {
      console.error('获取配置项失败:', error);
      const response = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(500).json(response);
    }
  }

  /**
   * 更新配置项
   * 与Python版本的update_config方法功能一致
   */
  public static async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body;
      if (!data) {
        ResponseUtils.error(res, '请求数据不能为空');
        return;
      }

      // 支持 {config: {...}} 或直接传入配置对象（与Python版本兼容）
      const configData = data.config || data;

      if (!configData || typeof configData !== 'object' || Array.isArray(configData)) {
        ResponseUtils.error(res, '配置数据格式错误，需要对象格式');
        return;
      }

      ConfigController.logInfo('更新配置开始', { configData });

      // 获取当前配置
      const currentConfig = ConfigController.configManager.getAllConfig();

      // 获取所有标准配置项（只包含机器学习平台资源配置）
      // 使用 Record<string, any> 类型来避免类型检查问题
      const standardKeys = [
        'ML_PLATFORM_RESOURCE_AK', 'ML_PLATFORM_RESOURCE_SK', 'ML_PLATFORM_RESOURCE_BASE_URL',
        'ML_PLATFORM_RESOURCE_POOL_ID', 'ML_PLATFORM_RESOURCE_QUEUE_ID',
        'ML_PLATFORM_RESOURCE_PFS_INSTANCE_ID', 'ML_PLATFORM_RESOURCE_BUCKET'
      ];

      // 合并配置：保留原有的所有配置项，只更新传入的值
      // 这样可以确保空白配置项不会丢失
      const mergedConfig: Record<string, any> = {};
      // 将 currentConfig 转换为 Record 类型以便索引访问
      const currentConfigRecord = currentConfig as Record<string, any>;
      const configDataRecord = configData as Record<string, any>;

      for (const key of standardKeys) {
        if (configDataRecord[key] !== undefined) {
          const newValue = configDataRecord[key];
          
          // 检查是否为脱敏值（全是星号）
          // 如果是脱敏值，保留原有值，不要覆盖
          if (typeof newValue === 'string' && newValue.trim().replace(/\*/g, '') === '' && newValue.length >= 4) {
            // 这是脱敏值，保留原有配置
            mergedConfig[key] = currentConfigRecord[key] || '';
            ConfigController.logInfo(`检测到脱敏值，保留原配置: ${key}`);
          } else {
            // 使用提交的值（可能是空字符串或新值）
            mergedConfig[key] = newValue;
          }
        } else if (currentConfigRecord[key] !== undefined) {
          // 保留原有值
          mergedConfig[key] = currentConfigRecord[key];
        } else {
          // 设置为空字符串（确保配置项存在）
          mergedConfig[key] = '';
        }
      }

      // 保存配置到文件
      const success = ConfigController.configManager.saveConfig(mergedConfig);

      if (success) {
        ConfigController.logInfo('配置保存成功');
        ResponseUtils.success(res, {
          original: currentConfig,
          updated: mergedConfig,
          changes: configData
        }, '配置保存成功');
      } else {
        ResponseUtils.error(res, '配置保存失败');
      }
    } catch (error) {
      console.error('更新配置失败:', error);
      ResponseUtils.error(res, '更新配置失败', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 重置配置到默认值
   */
  public static async resetConfig(req: Request, res: Response): Promise<void> {
    try {
      const { keys } = req.body; // 可选：指定要重置的配置键

      ConfigController.logInfo('重置配置开始', { keys });

      // 获取当前配置
      const currentConfig = ConfigController.configManager.getAllConfig();

      let resetConfig: any = {};

      if (keys && Array.isArray(keys)) {
        // 重置指定键
        resetConfig = { ...currentConfig };
        keys.forEach((key: string) => {
          delete resetConfig[key];
        });
      } else {
        // 重置所有配置
        resetConfig = {};
      }

      ConfigController.logInfo('配置重置成功（临时实现）', { resetConfig });

      const response = {
        success: true,
        data: {
          original: currentConfig,
          reset: resetConfig,
          resetKeys: keys || 'all'
        }
      };

      res.json(response);
    } catch (error) {
      console.error('重置配置失败:', error);
      const response = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(500).json(response);
    }
  }

  /**
   * 获取环境变量信息
   */
  public static async getEnvironmentInfo(req: Request, res: Response): Promise<void> {
    try {
      ConfigController.logInfo('获取环境变量信息开始');

      const envInfo = {
        nodeEnv: process.env.NODE_ENV || 'development',
        platform: process.platform,
        version: process.version,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        configWarnings: ConfigController.configManager.validateConfig()
      };

      const response = {
        success: true,
        data: envInfo
      };

      res.json(response);
    } catch (error) {
      console.error('获取环境变量信息失败:', error);
      const response = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(500).json(response);
    }
  }

  /**
   * 获取配置验证结果
   */
  public static async validateConfig(req: Request, res: Response): Promise<void> {
    try {
      ConfigController.logInfo('验证配置开始');

      const validationResult = ConfigController.configManager.validateConfig();

      const response = {
        success: true,
        data: validationResult
      };

      res.json(response);
    } catch (error) {
      console.error('验证配置失败:', error);
      const response = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(500).json(response);
    }
  }

  /**
   * 获取配置文件元信息
   */
  public static async getConfigMetadata(req: Request, res: Response): Promise<void> {
    try {
      ConfigController.logInfo('获取配置文件元信息开始');

      const config = ConfigController.configManager.getAllConfig();

      const metadata = {
        totalItems: Object.keys(config).length,
        configKeys: Object.keys(config),
        hasMLResourceConfig: !!(config.ML_PLATFORM_RESOURCE_AK && config.ML_PLATFORM_RESOURCE_SK),
        lastModified: new Date().toISOString(), // 实际实现中应该从文件系统获取
        configSource: 'yaml-file' // 可以是 'yaml-file', 'environment', 'combined'
      };

      const response = {
        success: true,
        data: metadata
      };

      res.json(response);
    } catch (error) {
      console.error('获取配置文件元信息失败:', error);
      const response = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(500).json(response);
    }
  }

  /**
   * 批量获取配置项
   */
  public static async batchGetConfig(req: Request, res: Response): Promise<void> {
    try {
      const { keys } = req.body;

      if (!keys || !Array.isArray(keys)) {
        const response = {
          success: false,
          error: '配置键列表格式错误，需要数组格式'
        };
        res.status(400).json(response);
        return;
      }

      ConfigController.logInfo('批量获取配置项开始', { keys });

      const allConfig = ConfigController.configManager.getAllConfig();
      const result: any = {};

      keys.forEach((key: string) => {
        if (allConfig[key as keyof typeof allConfig] !== undefined) {
          result[key] = allConfig[key as keyof typeof allConfig];
        }
      });

      const response = {
        success: true,
        data: {
          requested: keys,
          found: Object.keys(result),
          data: result
        }
      };

      res.json(response);
    } catch (error) {
      console.error('批量获取配置项失败:', error);
      const response = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(500).json(response);
    }
  }

  /**
   * 记录日志信息
   */
  private static logInfo(message: string, data?: any): void {
    console.log(`[ConfigController] ${message}`, data || '');
  }
}