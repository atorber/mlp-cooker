import { Request, Response } from 'express';
import { ResponseUtils } from '@/utils/response.utils';
import { AuthService } from '@/middleware/auth.middleware';
import { LoginParams, LoginResult, CurrentUser } from '@/types/api';
import { AihcSDK, AIHC_DEFAULT_BASE_URL } from '@/utils/sdk/aihc.sdk';
import { YamlConfigManager } from '@/config/yaml-config';

/**
 * 认证控制器
 */
export class AuthController {
  /**
   * 用户登录 - 使用AK/SK验证
   */
  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const { ak, sk, type } = req.body as LoginParams;
      const loginType = type || 'account';

      // 验证AK/SK是否提供
      if (!ak || !sk) {
        res.status(401).json({
          status: 'error',
          type: loginType,
          currentAuthority: 'guest',
        });
        return;
      }

      // 通过调用数据集接口验证AK/SK是否有效
      try {
        const yamlConfig = YamlConfigManager.getInstance();
        const mlResourceConfig = yamlConfig.getMLResourceConfig();
        
        // 获取baseURL：优先使用机器学习平台配置，其次使用默认地址
        let baseURL = mlResourceConfig.baseURL || AIHC_DEFAULT_BASE_URL;
        
        // 确保 baseURL 有协议前缀
        if (baseURL && !baseURL.match(/^https?:\/\//)) {
          baseURL = `http://${baseURL}`;
        }

        // 使用提供的AK/SK创建SDK实例
        const sdk = new AihcSDK({
          accessKey: ak,
          secretKey: sk,
          baseURL: baseURL,
        });

        // 调用模型列表接口验证AK/SK（比数据集接口更轻量，更通用）
        // 如果模型接口失败，再尝试数据集接口
        try {
          await sdk.describeModels(1);
        } catch (modelError) {
          // 如果模型接口失败，尝试数据集接口
          console.warn('模型接口验证失败，尝试数据集接口:', modelError);
          await sdk.describeDatasets({
            pageNumber: 1,
            pageSize: 1,
          });
        }

        // 验证成功，自动更新配置文件中的AK/SK
        try {
          const yamlConfig = YamlConfigManager.getInstance();
          const currentConfig = yamlConfig.getAllConfig();
          
          // 准备更新配置（只更新AK/SK，保留其他配置）
          const updatedConfig: Partial<typeof currentConfig> = {
            ...currentConfig,
            ML_PLATFORM_RESOURCE_AK: ak,
            ML_PLATFORM_RESOURCE_SK: sk,
          };
          
          // 如果baseURL为空或未配置，也自动设置
          if (!mlResourceConfig.baseURL && baseURL) {
            // 保存时保留协议前缀，支持 http:// 和 https://
            updatedConfig.ML_PLATFORM_RESOURCE_BASE_URL = baseURL;
          }
          
          // 保存配置到文件（saveConfig是同步方法，不需要await）
          const saveSuccess = yamlConfig.saveConfig(updatedConfig);
          if (saveSuccess) {
            console.log('✅ 登录成功，已自动更新配置文件中的AK/SK');
          } else {
            console.warn('⚠️  登录成功，但自动更新配置失败');
          }
        } catch (configError) {
          // 配置更新失败不影响登录，只记录日志
          console.warn('⚠️  自动更新配置失败，但不影响登录:', configError);
        }

        // 验证成功，生成token（使用AK作为标识）
        const token = AuthService.generateToken(ak, sk);

        // 返回成功响应
        const loginResult = {
          status: 'ok',
          type: loginType,
          currentAuthority: 'admin',
          token: token,
        };

        res.json(loginResult);
      } catch (error) {
        console.error('AK/SK验证失败:', error);
        
        // 提取错误信息
        let errorMessage = 'Access Key或Secret Key验证失败，请检查输入是否正确';
        if (error instanceof Error) {
          const errorMsg = error.message || '';
          if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
            errorMessage = 'Access Key或Secret Key无效，请检查输入是否正确';
          } else if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
            errorMessage = 'Access Key或Secret Key权限不足';
          } else if (errorMsg.includes('404') || errorMsg.includes('Not Found')) {
            errorMessage = 'API地址不存在，请检查baseURL配置';
          } else if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('ENOTFOUND')) {
            errorMessage = '无法连接到API服务器，请检查网络或baseURL配置';
          } else if (errorMsg.includes('timeout')) {
            errorMessage = 'API请求超时，请稍后重试';
          }
        }
        
        // AK/SK验证失败，返回详细的错误信息
        res.status(401).json({
          status: 'error',
          type: loginType,
          currentAuthority: 'guest',
          message: errorMessage,
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        status: 'error',
        type: 'account',
        currentAuthority: 'guest',
      });
    }
  }

  /**
   * 用户登出
   */
  public static async logout(req: Request, res: Response): Promise<void> {
    try {
      // 在实际应用中，这里可能需要清除token或session
      // 但由于当前是简单token认证，直接返回成功即可
      res.json({
        data: {},
        success: true,
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        data: {},
        success: false,
      });
    }
  }

  /**
   * 获取当前用户信息
   */
  public static async currentUser(req: Request, res: Response): Promise<void> {
    try {
      // 如果没有用户信息，返回未认证
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: '未认证',
        });
        return;
      }

      // 获取用户详细信息
      const currentUser = AuthService.getCurrentUser(req.user.authority, req.user.ak);

      res.json({
        success: true,
        data: currentUser,
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        message: '获取用户信息失败',
      });
    }
  }

  /**
   * 获取验证码（占位方法，与Python版本保持一致）
   */
  public static async captcha(req: Request, res: Response): Promise<void> {
    try {
      // Python版本返回纯文本验证码
      const captcha = Math.random().toString(36).substring(7);
      res.send(captcha);
    } catch (error) {
      console.error('Captcha error:', error);
      res.status(500).send('Error generating captcha');
    }
  }
}