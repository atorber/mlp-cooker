import { Request, Response } from 'express';
import { ResponseUtils } from '@/utils/response.utils';
import { AihcSDK, AIHC_DEFAULT_BASE_URL } from '@/utils/sdk/aihc.sdk';
import { YamlConfigManager } from '@/config/yaml-config';

/**
 * 服务部署控制器
 */
export class ServiceController {
  /**
   * 获取服务SDK实例（使用机器学习平台资源配置）
   */
  private static getServiceSDK(): AihcSDK {
    const yamlConfig = YamlConfigManager.getInstance();
    const mlResourceConfig = yamlConfig.getMLResourceConfig();
    
    // 获取baseURL：优先使用机器学习平台配置，其次使用数据集管理配置，最后使用默认地址
    const baseURL = mlResourceConfig.baseURL
    
    // 使用机器学习平台资源配置创建SDK实例，如果配置为空则回退到数据集任务配置
    return new AihcSDK({
      accessKey: mlResourceConfig.ak,
      secretKey: mlResourceConfig.sk,
      baseURL: baseURL,
      defaultResourcePoolId: mlResourceConfig.poolId,
      defaultQueue: mlResourceConfig.queueId,
      defaultPfsInstanceId: mlResourceConfig.pfsInstanceId,
    });
  }

  /**
   * 查询服务列表
   */
  public static async list(req: Request, res: Response): Promise<void> {
    try {
      const { pageNumber = 1, pageSize = 1000, orderBy, order } = req.query;
      
      const sdk = ServiceController.getServiceSDK();
      const result = await sdk.describeServices({
        pageNumber: Number(pageNumber),
        pageSize: Number(pageSize),
        orderBy: orderBy as string,
        order: order as string,
      });

      ResponseUtils.success(res, result);
    } catch (error) {
      console.error('查询服务列表失败:', error);
      ResponseUtils.error(res, '查询服务列表失败', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 查询服务详情
   */
  public static async get(req: Request, res: Response): Promise<void> {
    try {
      const { serviceId } = req.params;
      
      if (!serviceId) {
        ResponseUtils.error(res, '服务ID不能为空');
        return;
      }

      const sdk = ServiceController.getServiceSDK();
      const result = await sdk.describeService(serviceId);

      ResponseUtils.success(res, result);
    } catch (error) {
      console.error('查询服务详情失败:', error);
      ResponseUtils.error(res, '查询服务详情失败', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 查询服务状态
   */
  public static async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const { serviceId } = req.params;
      
      if (!serviceId) {
        ResponseUtils.error(res, '服务ID不能为空');
        return;
      }

      const sdk = ServiceController.getServiceSDK();
      const result = await sdk.describeServiceStatus(serviceId);

      // 提取对应serviceId的状态信息
      if (result && result.service && result.service[serviceId]) {
        ResponseUtils.success(res, {
          serviceId,
          ...result.service[serviceId],
        });
      } else {
        ResponseUtils.error(res, '未找到服务状态信息');
      }
    } catch (error) {
      console.error('查询服务状态失败:', error);
      ResponseUtils.error(res, '查询服务状态失败', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 创建服务
   */
  public static async create(req: Request, res: Response): Promise<void> {
    try {
      const requestBody = req.body;
      const { clientToken } = req.query;

      if (!requestBody) {
        ResponseUtils.error(res, '请求体不能为空');
        return;
      }

      // 从配置文件读取资源池ID和队列ID
      const yamlConfig = YamlConfigManager.getInstance();
      const mlResourceConfig = yamlConfig.getMLResourceConfig();
      
      const resourcePoolId = mlResourceConfig.poolId;
      const queueName = mlResourceConfig.queueId;

      if (!resourcePoolId || !queueName) {
        ResponseUtils.error(res, '配置文件中缺少资源池ID或队列ID，请在系统设置中配置 ML_PLATFORM_RESOURCE_POOL_ID 和 ML_PLATFORM_RESOURCE_QUEUE_ID');
        return;
      }

      const sdk = ServiceController.getServiceSDK();
      const result = await sdk.createService(
        requestBody,
        resourcePoolId,
        queueName,
        clientToken as string
      );

      ResponseUtils.success(res, result, '服务创建成功');
    } catch (error) {
      console.error('创建服务失败:', error);
      ResponseUtils.error(res, '创建服务失败', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 删除服务
   */
  public static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { serviceId } = req.params;
      
      if (!serviceId) {
        ResponseUtils.error(res, '服务ID不能为空');
        return;
      }

      const sdk = ServiceController.getServiceSDK();
      const result = await sdk.deleteService(serviceId);

      ResponseUtils.success(res, result, '服务删除成功');
    } catch (error) {
      console.error('删除服务失败:', error);
      ResponseUtils.error(res, '删除服务失败', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

