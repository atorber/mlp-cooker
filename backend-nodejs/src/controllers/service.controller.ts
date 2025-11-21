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
      const { pageNumber = 1, pageSize = 1000, orderBy, order, serviceId, serviceName, keyword } = req.query;
      
      const sdk = ServiceController.getServiceSDK();
      const result = await sdk.describeServices({
        pageNumber: Number(pageNumber),
        pageSize: Number(pageSize),
        orderBy: orderBy as string,
        order: order as string,
      });

      // 处理不同的响应数据格式，提取服务列表
      let services: any[] = [];
      if (Array.isArray(result)) {
        services = result;
      } else if (result.services && Array.isArray(result.services)) {
        services = result.services;
      } else if (result.data && Array.isArray(result.data)) {
        services = result.data;
      }

      // 从配置文件获取队列ID，用于过滤服务
      const yamlConfig = YamlConfigManager.getInstance();
      const mlResourceConfig = yamlConfig.getMLResourceConfig();
      const configQueueId = mlResourceConfig.queueId;

      // 第一步：如果配置了队列ID，则过滤服务列表
      if (configQueueId) {
        services = services.filter((service: any) => {
          const serviceQueueName = service.queueName || service.queue || '';
          return serviceQueueName === configQueueId;
        });
      }

      // 第二步：如果提供了搜索参数，进行模糊搜索过滤
      const searchServiceId = (serviceId as string) || keyword as string;
      const searchServiceName = (serviceName as string) || keyword as string;

      if (searchServiceId || searchServiceName) {
        const searchKeyword = (searchServiceId || searchServiceName || '').toLowerCase().trim();
        
        if (searchKeyword) {
          services = services.filter((service: any) => {
            const serviceId = (service.id || service.serviceId || '').toLowerCase();
            const serviceName = (service.name || '').toLowerCase();
            
            // 支持按服务ID或服务名称模糊匹配
            return serviceId.includes(searchKeyword) || serviceName.includes(searchKeyword);
          });
        }
      }

      // 更新结果中的服务列表和总数
      if (Array.isArray(result)) {
        // 如果结果是数组，直接返回过滤后的数组
        ResponseUtils.success(res, services);
      } else {
        // 如果结果是对象，更新其中的服务列表和总数
        const filteredResult = {
          ...result,
          services: services,
          totalCount: services.length,
          total: services.length,
        };
        ResponseUtils.success(res, filteredResult);
      }
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
   * 请求体格式：{ "taskParams": "{...}" } 或 { "taskParams": {...} }
   * taskParams 可以是 JSON 字符串或 JSON 对象，将作为 requestBody 发送给 AIHC API
   */
  public static async create(req: Request, res: Response): Promise<void> {
    try {
      const { taskParams } = req.body;
      const { clientToken } = req.query;
      
      if (!taskParams) {
        ResponseUtils.error(res, '任务参数字段不能为空');
        return;
      }

      // 解析任务参数（支持 JSON 字符串或 JSON 对象）
      let requestBody: any;
      if (typeof taskParams === 'string') {
        try {
          requestBody = JSON.parse(taskParams);
        } catch (parseError) {
          ResponseUtils.error(res, '任务参数格式错误，必须是有效的 JSON 格式', {
            error: parseError instanceof Error ? parseError.message : 'Unknown error'
          });
          return;
        }
      } else if (typeof taskParams === 'object') {
        requestBody = taskParams;
      } else {
        ResponseUtils.error(res, '任务参数必须是 JSON 字符串或 JSON 对象');
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

      // 确保请求体中的 queue 字段和配置的 queueID 一致
      requestBody.queue = queueName;

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

