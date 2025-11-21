import { Request, Response } from 'express';
import { ResponseUtils } from '@/utils/response.utils';
import { AihcSDK } from '@/utils/sdk/aihc.sdk';
import { YamlConfigManager } from '@/config/yaml-config';

/**
 * 计算资源控制器
 */
export class ResourceController {
  /**
   * 获取资源SDK实例（使用机器学习平台资源配置）
   */
  private static getResourceSDK(): AihcSDK {
    const yamlConfig = YamlConfigManager.getInstance();
    const mlResourceConfig = yamlConfig.getMLResourceConfig();
    
    return new AihcSDK({
      accessKey: mlResourceConfig.ak,
      secretKey: mlResourceConfig.sk,
      baseURL: mlResourceConfig.baseURL || 'https://aihc.bj.baidubce.com',
      defaultResourcePoolId: mlResourceConfig.poolId || '',
      defaultQueue: mlResourceConfig.queueId || '',
      defaultPfsInstanceId: mlResourceConfig.pfsInstanceId || '',
    });
  }

  /**
   * 查询队列列表（包含详情信息）
   */
  public static async listQueues(req: Request, res: Response): Promise<void> {
    try {
      const { resourcePoolId, pageNumber, pageSize, keywordType, keyword, includeDetails } = req.query;
      
      const sdk = ResourceController.getResourceSDK();
      let result = await sdk.describeQueues({
        resourcePoolId: (resourcePoolId as string) || undefined,
        pageNumber: pageNumber ? parseInt(pageNumber as string, 10) : undefined,
        pageSize: pageSize ? parseInt(pageSize as string, 10) : undefined,
        keywordType: (keywordType as string) || undefined,
        keyword: (keyword as string) || undefined,
      });

      // 如果需要包含详情，为每个队列获取详情信息
      if (includeDetails === 'true' || includeDetails === '1') {
        let queues: any[] = [];
        
        // 解析响应数据
        if (Array.isArray(result)) {
          queues = result;
        } else if (result?.queues && Array.isArray(result.queues)) {
          queues = result.queues;
        } else if (result?.data && Array.isArray(result.data)) {
          queues = result.data;
        }

        // 并发获取每个队列的详情
        const queueDetails = await Promise.allSettled(
          queues.map(async (queue) => {
            const queueId = queue.queueId || queue.id;
            if (queueId) {
              try {
                const detail = await sdk.describeQueue(queueId);
                return {
                  ...queue,
                  detail: detail?.queue || detail?.data || detail,
                };
              } catch (error) {
                console.error(`获取队列 ${queueId} 详情失败:`, error);
                return {
                  ...queue,
                  detail: null,
                };
              }
            }
            return queue;
          })
        );

        // 合并详情到队列数据中
        const queuesWithDetails = queueDetails.map((detailResult) => {
          if (detailResult.status === 'fulfilled') {
            return detailResult.value;
          }
          return null;
        }).filter(Boolean);

        // 更新结果
        if (Array.isArray(result)) {
          result = queuesWithDetails as any;
        } else if (result?.queues) {
          result = { ...result, queues: queuesWithDetails };
        } else if (result?.data) {
          result = { ...result, data: queuesWithDetails };
        } else {
          result = queuesWithDetails as any;
        }
      }

      ResponseUtils.success(res, result, '查询队列列表成功');
    } catch (error) {
      console.error('查询队列列表失败:', error);
      ResponseUtils.error(res, '查询队列列表失败', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 查询队列详情
   */
  public static async getQueue(req: Request, res: Response): Promise<void> {
    try {
      const { queueId } = req.params;
      
      if (!queueId) {
        ResponseUtils.error(res, '队列ID不能为空');
        return;
      }

      const sdk = ResourceController.getResourceSDK();
      const result = await sdk.describeQueue(queueId);

      // console.log(result);

      ResponseUtils.success(res, result, '查询队列详情成功');
    } catch (error) {
      console.error('查询队列详情失败:', error);
      ResponseUtils.error(res, '查询队列详情失败', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 查询资源池列表
   */
  public static async listResourcePools(req: Request, res: Response): Promise<void> {
    try {
      const { resourcePoolType } = req.query;
      
      const sdk = ResourceController.getResourceSDK();
      const result = await sdk.describeResourcePools((resourcePoolType as string) || 'common');

      ResponseUtils.success(res, result, '查询资源池列表成功');
    } catch (error) {
      console.error('查询资源池列表失败:', error);
      ResponseUtils.error(res, '查询资源池列表失败', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 查询资源池详情
   */
  public static async getResourcePool(req: Request, res: Response): Promise<void> {
    try {
      const { resourcePoolId } = req.params;
      
      if (!resourcePoolId) {
        ResponseUtils.error(res, '资源池ID不能为空');
        return;
      }

      const sdk = ResourceController.getResourceSDK();
      const result = await sdk.describeResourcePool(resourcePoolId);

      ResponseUtils.success(res, result, '查询资源池详情成功');
    } catch (error) {
      console.error('查询资源池详情失败:', error);
      ResponseUtils.error(res, '查询资源池详情失败', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

