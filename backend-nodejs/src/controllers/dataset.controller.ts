import { Request, Response } from 'express';
import { ResponseUtils } from '@/utils/response.utils';
import { AihcSDK, AIHC_DEFAULT_BASE_URL } from '@/utils/sdk/aihc.sdk';
import { YamlConfigManager } from '@/config/yaml-config';

/**
 * 数据集控制器
 */
export class DatasetController {
  /**
   * 获取数据集SDK实例（使用机器学习平台资源配置）
   */
  private static getDatasetSDK(): AihcSDK {
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
   * 查询数据集列表
   */
  public static async list(req: Request, res: Response): Promise<void> {
    try {
      const { pageNumber = 1, pageSize = 10, keyword, storageType, storageInstances, importFormat } = req.query;
      
      const sdk = DatasetController.getDatasetSDK();
      const result = await sdk.describeDatasets({
        pageNumber: Number(pageNumber),
        pageSize: Number(pageSize),
        keyword: keyword as string,
        storageType: storageType as string,
        storageInstances: storageInstances as string,
        importFormat: importFormat as string,
      });

      ResponseUtils.success(res, result, '获取数据集列表成功');
    } catch (error) {
      console.error('获取数据集列表失败:', error);
      ResponseUtils.error(res, '获取数据集列表失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 查询数据集详情
   */
  public static async get(req: Request, res: Response): Promise<void> {
    try {
      const { datasetId } = req.params;
      
      if (!datasetId) {
        ResponseUtils.error(res, '数据集ID不能为空');
        return;
      }

      const sdk = DatasetController.getDatasetSDK();
      const result = await sdk.describeDataset(datasetId);

      ResponseUtils.success(res, result, '获取数据集详情成功');
    } catch (error) {
      console.error('获取数据集详情失败:', error);
      ResponseUtils.error(res, '获取数据集详情失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 查询数据集版本列表
   */
  public static async listVersions(req: Request, res: Response): Promise<void> {
    try {
      const { datasetId } = req.params;
      const { pageNumber = 1, pageSize = 0 } = req.query;
      
      if (!datasetId) {
        ResponseUtils.error(res, '数据集ID不能为空');
        return;
      }

      const sdk = DatasetController.getDatasetSDK();
      const result = await sdk.describeDatasetVersions(
        datasetId,
        Number(pageNumber),
        Number(pageSize)
      );

      ResponseUtils.success(res, result, '获取数据集版本列表成功');
    } catch (error) {
      console.error('获取数据集版本列表失败:', error);
      ResponseUtils.error(res, '获取数据集版本列表失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 创建数据集
   */
  public static async create(req: Request, res: Response): Promise<void> {
    try {
      const requestBody = req.body;
      
      if (!requestBody) {
        ResponseUtils.error(res, '请求体不能为空');
        return;
      }

      const sdk = DatasetController.getDatasetSDK();
      const result = await sdk.createDataset(requestBody);

      ResponseUtils.success(res, result, '创建数据集成功');
    } catch (error) {
      console.error('创建数据集失败:', error);
      ResponseUtils.error(res, '创建数据集失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 删除数据集
   */
  public static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { datasetId } = req.params;
      
      if (!datasetId) {
        ResponseUtils.error(res, '数据集ID不能为空');
        return;
      }

      const sdk = DatasetController.getDatasetSDK();
      const result = await sdk.deleteDataset(datasetId);

      ResponseUtils.success(res, result, '删除数据集成功');
    } catch (error) {
      console.error('删除数据集失败:', error);
      ResponseUtils.error(res, '删除数据集失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 创建数据集版本
   */
  public static async createVersion(req: Request, res: Response): Promise<void> {
    try {
      const { datasetId } = req.params;
      const requestBody = req.body;
      
      if (!datasetId) {
        ResponseUtils.error(res, '数据集ID不能为空');
        return;
      }
      
      if (!requestBody) {
        ResponseUtils.error(res, '请求体不能为空');
        return;
      }

      const sdk = DatasetController.getDatasetSDK();
      const result = await sdk.createDatasetVersion(datasetId, requestBody);

      ResponseUtils.success(res, result, '创建数据集版本成功');
    } catch (error) {
      console.error('创建数据集版本失败:', error);
      ResponseUtils.error(res, '创建数据集版本失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 删除数据集版本
   */
  public static async deleteVersion(req: Request, res: Response): Promise<void> {
    try {
      const { datasetId, versionId } = req.params;
      
      if (!datasetId) {
        ResponseUtils.error(res, '数据集ID不能为空');
        return;
      }
      
      if (!versionId) {
        ResponseUtils.error(res, '版本ID不能为空');
        return;
      }

      const sdk = DatasetController.getDatasetSDK();
      const result = await sdk.deleteDatasetVersion(datasetId, versionId);

      ResponseUtils.success(res, result, '删除数据集版本成功');
    } catch (error) {
      console.error('删除数据集版本失败:', error);
      ResponseUtils.error(res, '删除数据集版本失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

