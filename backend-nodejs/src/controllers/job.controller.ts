import { Request, Response } from 'express';
import { ResponseUtils } from '@/utils/response.utils';
import { AihcSDK, AIHC_DEFAULT_BASE_URL } from '@/utils/sdk/aihc.sdk';
import { YamlConfigManager } from '@/config/yaml-config';

/**
 * 训练任务控制器
 */
export class JobController {
  /**
   * 获取训练任务SDK实例（使用机器学习平台资源配置）
   */
  private static getJobSDK(): AihcSDK {
    const yamlConfig = YamlConfigManager.getInstance();
    const mlResourceConfig = yamlConfig.getMLResourceConfig();
    
    // 获取baseURL：优先使用机器学习平台配置，其次使用数据集管理配置，最后使用默认地址
    
    // 使用机器学习平台资源配置创建SDK实例，如果配置为空则回退到数据集任务配置
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
   * 查询训练任务列表
   */
  public static async list(req: Request, res: Response): Promise<void> {
    try {
      const { keyword, status, owner } = req.query;
      const requestBody: any = {};
      
      if (keyword) requestBody.keyword = keyword;
      if (status) requestBody.status = status;
      if (owner) requestBody.owner = owner;
      
      // 从配置文件读取poolId/queueId
      const yamlConfig = YamlConfigManager.getInstance();
      const mlResourceConfig = yamlConfig.getMLResourceConfig();
      
      const sdk = JobController.getJobSDK();
      const result = await sdk.describeJobs(mlResourceConfig.poolId, mlResourceConfig.queueId, requestBody);

      ResponseUtils.success(res, result);
    } catch (error) {
      console.error('查询训练任务列表失败:', error);
      ResponseUtils.error(res, '查询训练任务列表失败', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 查询训练任务详情
   */
  public static async get(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const { resourcePoolId, queueID, needDetail } = req.query;
      
      if (!jobId) {
        ResponseUtils.error(res, '训练任务ID不能为空');
        return;
      }

      const sdk = JobController.getJobSDK();
      const result = await sdk.describeJob(
        jobId,
        resourcePoolId as string,
        queueID as string,
        needDetail === 'true'
      );

      ResponseUtils.success(res, result);
    } catch (error) {
      console.error('查询训练任务详情失败:', error);
      ResponseUtils.error(res, '查询训练任务详情失败', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 创建训练任务
   */
  public static async create(req: Request, res: Response): Promise<void> {
    try {
      const requestBody = req.body;
      const { resourcePoolId, queueID } = req.query;

      if (!requestBody) {
        ResponseUtils.error(res, '请求体不能为空');
        return;
      }

      // 从配置文件读取资源池ID和队列ID
      const yamlConfig = YamlConfigManager.getInstance();
      const mlResourceConfig = yamlConfig.getMLResourceConfig();
      
      const finalResourcePoolId = (resourcePoolId as string) || mlResourceConfig.poolId;
      const finalQueueID = (queueID as string) || mlResourceConfig.queueId;

      if (!finalQueueID) {
        ResponseUtils.error(res, '配置文件中缺少队列ID，请在系统设置中配置 ML_PLATFORM_RESOURCE_QUEUE_ID');
        return;
      }

      const sdk = JobController.getJobSDK();
      const result = await sdk.createJob(
        requestBody,
        finalResourcePoolId,
        finalQueueID
      );

      ResponseUtils.success(res, result, '训练任务创建成功');
    } catch (error) {
      console.error('创建训练任务失败:', error);
      ResponseUtils.error(res, '创建训练任务失败', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 停止训练任务
   */
  public static async stop(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const { resourcePoolId } = req.query;
      
      if (!jobId) {
        ResponseUtils.error(res, '训练任务ID不能为空');
        return;
      }

      const sdk = JobController.getJobSDK();
      const result = await sdk.stopJob(jobId, resourcePoolId as string);

      ResponseUtils.success(res, result, '训练任务停止成功');
    } catch (error) {
      console.error('停止训练任务失败:', error);
      ResponseUtils.error(res, '停止训练任务失败', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 删除训练任务
   */
  public static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const { resourcePoolId } = req.query;
      
      if (!jobId) {
        ResponseUtils.error(res, '训练任务ID不能为空');
        return;
      }

      const sdk = JobController.getJobSDK();
      const result = await sdk.deleteJob(jobId, resourcePoolId as string);

      ResponseUtils.success(res, result, '训练任务删除成功');
    } catch (error) {
      console.error('删除训练任务失败:', error);
      ResponseUtils.error(res, '删除训练任务失败', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 查询训练任务事件
   */
  public static async getEvents(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const { resourcePoolId, startTime, endTime } = req.query;
      
      if (!jobId) {
        ResponseUtils.error(res, '训练任务ID不能为空');
        return;
      }

      const sdk = JobController.getJobSDK();
      const result = await sdk.describeJobEvents(
        jobId,
        resourcePoolId as string,
        startTime as string,
        endTime as string
      );

      ResponseUtils.success(res, result);
    } catch (error) {
      console.error('查询训练任务事件失败:', error);
      ResponseUtils.error(res, '查询训练任务事件失败', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 查询训练任务日志
   */
  public static async getLogs(req: Request, res: Response): Promise<void> {
    try {
      const { jobId, podName } = req.params;
      const { resourcePoolId, keywords, startTime, endTime, maxLines, chunkSize, marker } = req.query;
      
      if (!jobId || !podName) {
        ResponseUtils.error(res, '训练任务ID和Pod名称不能为空');
        return;
      }

      const sdk = JobController.getJobSDK();
      const result = await sdk.describeJobLogs(
        jobId,
        podName,
        resourcePoolId as string,
        {
          keywords: keywords as string,
          startTime: startTime ? Number(startTime) : undefined,
          endTime: endTime ? Number(endTime) : undefined,
          maxLines: maxLines ? Number(maxLines) : undefined,
          chunkSize: chunkSize ? Number(chunkSize) : undefined,
          marker: marker as string,
        }
      );

      ResponseUtils.success(res, result);
    } catch (error) {
      console.error('查询训练任务日志失败:', error);
      ResponseUtils.error(res, '查询训练任务日志失败', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

