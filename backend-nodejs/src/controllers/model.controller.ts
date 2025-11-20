import { Request, Response } from 'express';
import { ResponseUtils } from '@/utils/response.utils';
import { AihcSDK, AIHC_DEFAULT_BASE_URL } from '@/utils/sdk/aihc.sdk';
import { YamlConfigManager } from '@/config/yaml-config';

/**
 * 模型控制器
 */
export class ModelController {
  /**
   * 获取模型SDK实例（使用机器学习平台资源配置）
   */
  private static getModelSDK(): AihcSDK {
    const yamlConfig = YamlConfigManager.getInstance();
    const mlResourceConfig = yamlConfig.getMLResourceConfig();
    
    // 获取baseURL：优先使用机器学习平台配置，其次使用数据集管理配置，最后使用默认地址
    let baseURL = mlResourceConfig.baseURL;
    if (!baseURL) {
      const datasetConfig = yamlConfig.getDatasetConfig();
      baseURL = datasetConfig.hostGray || datasetConfig.hostProduction?.bj || AIHC_DEFAULT_BASE_URL;
    }
    
    // 确保 baseURL 有协议前缀（如果缺少协议，自动添加 http://）
    if (baseURL && !baseURL.match(/^https?:\/\//)) {
      baseURL = `http://${baseURL}`;
    }
    
    // 使用机器学习平台资源配置创建SDK实例，如果配置为空则回退到数据集任务配置
    const jobConfig = yamlConfig.getDatasetJobConfig();
    return new AihcSDK({
      accessKey: (mlResourceConfig.ak || jobConfig.ak) as string,
      secretKey: (mlResourceConfig.sk || jobConfig.sk) as string,
      baseURL: baseURL,
      defaultResourcePoolId: (mlResourceConfig.poolId || jobConfig.poolId) as string,
      defaultQueue: (mlResourceConfig.queueId || jobConfig.queueId) as string,
      defaultPfsInstanceId: (mlResourceConfig.pfsInstanceId || jobConfig.pfs) as string,
    });
  }

  /**
   * 查询模型列表
   */
  public static async list(req: Request, res: Response): Promise<void> {
    try {
      const { pageNumber = 1, keyword } = req.query;
      
      const sdk = ModelController.getModelSDK();
      const result = await sdk.describeModels(
        Number(pageNumber),
        keyword as string
      );

      ResponseUtils.success(res, result, '获取模型列表成功');
    } catch (error) {
      console.error('获取模型列表失败:', error);
      ResponseUtils.error(res, '获取模型列表失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 查询模型详情
   */
  public static async get(req: Request, res: Response): Promise<void> {
    try {
      const { modelId } = req.params;
      
      if (!modelId) {
        ResponseUtils.error(res, '模型ID不能为空');
        return;
      }

      const sdk = ModelController.getModelSDK();
      const result = await sdk.describeModel(modelId);

      ResponseUtils.success(res, result, '获取模型详情成功');
    } catch (error) {
      console.error('获取模型详情失败:', error);
      ResponseUtils.error(res, '获取模型详情失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 查询模型版本列表
   */
  public static async listVersions(req: Request, res: Response): Promise<void> {
    try {
      const { modelId } = req.params;
      const { pageNumber = 1, pageSize = 0 } = req.query;
      
      if (!modelId) {
        ResponseUtils.error(res, '模型ID不能为空');
        return;
      }

      const sdk = ModelController.getModelSDK();
      const result = await sdk.describeModelVersions(
        modelId,
        Number(pageNumber),
        Number(pageSize)
      );

      ResponseUtils.success(res, result, '获取模型版本列表成功');
    } catch (error) {
      console.error('获取模型版本列表失败:', error);
      ResponseUtils.error(res, '获取模型版本列表失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 创建模型
   */
  public static async create(req: Request, res: Response): Promise<void> {
    try {
      const requestBody = req.body;
      
      if (!requestBody) {
        ResponseUtils.error(res, '请求体不能为空');
        return;
      }

      const sdk = ModelController.getModelSDK();
      const result = await sdk.createModel(requestBody);

      ResponseUtils.success(res, result, '创建模型成功');
    } catch (error) {
      console.error('创建模型失败:', error);
      ResponseUtils.error(res, '创建模型失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 删除模型
   */
  public static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { modelId } = req.params;
      
      if (!modelId) {
        ResponseUtils.error(res, '模型ID不能为空');
        return;
      }

      const sdk = ModelController.getModelSDK();
      const result = await sdk.deleteModel(modelId);

      ResponseUtils.success(res, result, '删除模型成功');
    } catch (error) {
      console.error('删除模型失败:', error);
      ResponseUtils.error(res, '删除模型失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 创建模型版本
   */
  public static async createVersion(req: Request, res: Response): Promise<void> {
    try {
      const { modelId } = req.params;
      const requestBody = req.body;
      
      if (!modelId) {
        ResponseUtils.error(res, '模型ID不能为空');
        return;
      }
      
      if (!requestBody) {
        ResponseUtils.error(res, '请求体不能为空');
        return;
      }

      const sdk = ModelController.getModelSDK();
      const result = await sdk.createModelVersion(modelId, requestBody);

      ResponseUtils.success(res, result, '创建模型版本成功');
    } catch (error) {
      console.error('创建模型版本失败:', error);
      ResponseUtils.error(res, '创建模型版本失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 删除模型版本
   */
  public static async deleteVersion(req: Request, res: Response): Promise<void> {
    try {
      const { modelId, versionId } = req.params;
      
      if (!modelId) {
        ResponseUtils.error(res, '模型ID不能为空');
        return;
      }
      
      if (!versionId) {
        ResponseUtils.error(res, '版本ID不能为空');
        return;
      }

      const sdk = ModelController.getModelSDK();
      const result = await sdk.deleteModelVersion(modelId, versionId);

      ResponseUtils.success(res, result, '删除模型版本成功');
    } catch (error) {
      console.error('删除模型版本失败:', error);
      ResponseUtils.error(res, '删除模型版本失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

