import { Request, Response } from 'express';
import { ResponseUtils } from '@/utils/response.utils';
import { AihcSDK } from '@/utils/sdk/aihc.sdk';
import { YamlConfigManager } from '@/config/yaml-config';

/**
 * 任务控制器
 * 专门用于处理任务类型的 job（name 包含 task- 关键字）
 */
export class TaskController {
  /**
   * 查询任务列表（自动过滤包含 task- 关键字的 job）
   */
  public static async list(req: Request, res: Response): Promise<void> {
    try {
      const { keyword, status, owner } = req.body || req.query;
      const requestBody: any = {
        keywordType: 'name'
      };
      
      // 自动添加 task- 关键字过滤
      // 如果用户提供了关键字，则组合为 task-{keyword}
      // 如果用户没有提供关键字，则使用 task- 作为默认关键字
      if (keyword && typeof keyword === 'string' && keyword.trim()) {
        // 如果关键字已经包含 task-，直接使用；否则添加前缀
        if (keyword.includes('task-')) {
          requestBody.keyword = keyword;
        } else {
          requestBody.keyword = `task-${keyword}`;
        }
      } else {
        // 默认只查询包含 task- 的任务
        requestBody.keyword = 'task-';
      }
      
      if (status) requestBody.status = status;
      if (owner) requestBody.owner = owner;
      
      // 从配置文件读取poolId/queueId
      const yamlConfig = YamlConfigManager.getInstance();
      const mlResourceConfig = yamlConfig.getMLResourceConfig();
      
      // 验证必要的配置是否存在
      if (!mlResourceConfig.ak || !mlResourceConfig.sk) {
        ResponseUtils.error(res, '配置文件中缺少访问密钥（AK/SK），请在系统设置中配置 ML_PLATFORM_RESOURCE_AK 和 ML_PLATFORM_RESOURCE_SK', {
          error: 'Missing access key or secret key'
        });
        return;
      }

      const resourcePoolId = mlResourceConfig.poolId || '';
      const queueId = mlResourceConfig.queueId || '';

      if (!resourcePoolId || !queueId) {
        ResponseUtils.error(res, '配置文件中缺少资源池ID或队列ID，请在系统设置中配置 ML_PLATFORM_RESOURCE_POOL_ID 和 ML_PLATFORM_RESOURCE_QUEUE_ID', {
          error: 'Missing resource pool ID or queue ID'
        });
        return;
      }
      
      // 获取任务SDK实例（使用机器学习平台资源配置）
      const sdk = new AihcSDK({
        accessKey: mlResourceConfig.ak,
        secretKey: mlResourceConfig.sk,
        baseURL: mlResourceConfig.baseURL || 'https://aihc.bj.baidubce.com',
        defaultResourcePoolId: resourcePoolId,
        defaultQueue: queueId,
        defaultPfsInstanceId: mlResourceConfig.pfsInstanceId || '',
      });
      
      const result = await sdk.describeJobs('aihc-serverless', queueId, requestBody);

      ResponseUtils.success(res, result);
    } catch (error) {
      console.error('查询任务列表失败:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      ResponseUtils.error(res, `查询任务列表失败: ${errorMessage}`, {
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      });
    }
  }
}

