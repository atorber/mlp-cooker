import { Request, Response } from 'express';
import { ResponseUtils } from '@/utils/response.utils';
import { AihcSDK } from '@/utils/sdk/aihc.sdk';
import { YamlConfigManager } from '@/config/yaml-config';

/**
 * 开发机控制器
 */
export class DevInstanceController {
  /**
   * 获取SDK实例
   */
  private static getSDK(ak: string): AihcSDK {
    const yamlConfig = YamlConfigManager.getInstance(ak);
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
   * 获取开发机列表
   */
  public static async list(req: Request, res: Response): Promise<void> {
    try {
      const { pageNo = 1, pageSize = 10 } = req.body || {};
      const sdk = DevInstanceController.getSDK(req.user!.ak!);

      const result = await sdk.describeDevInstances({
        pageNumber: Number(pageNo),
        pageSize: Number(pageSize),
        onlyMyDevs: true, // 默认只看自己的
      });

      res.json({
        success: true,
        data: {
          list: result.devInstances || [],
          count: result.totalCount || 0,
        },
      });
    } catch (error) {
      console.error('获取开发机列表失败:', error);
      ResponseUtils.error(res, '获取开发机列表失败', error);
    }
  }

  /**
   * 获取开发机详情
   */
  public static async get(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        ResponseUtils.error(res, '开发机ID不能为空');
        return;
      }

      const sdk = DevInstanceController.getSDK(req.user!.ak!);
      const result = await sdk.describeDevInstance(id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('获取开发机详情失败:', error);
      ResponseUtils.error(res, '获取开发机详情失败', error);
    }
  }

  /**
   * 创建开发机
   */
  public static async create(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body;
      if (!payload.name) {
        ResponseUtils.error(res, '实例名称不能为空');
        return;
      }

      const sdk = DevInstanceController.getSDK(req.user!.ak!);

      // 构建请求体
      const createBody: any = {
        name: payload.name,
        desc: payload.desc || '',
        image: payload.image || undefined,
        conf: {
          resourcePool: {
            resourcePoolId: payload.resourcePoolId || undefined,
            queueName: payload.queueName || undefined,
          },
          resources: payload.resources || {
            cpu: 2,
            memory: 8,
            shmSize: 1,
            acceleratorCount: 0,
            acceleratorType: '',
          },
        },
      };

      const result = await sdk.createDevInstance(createBody);
      res.json({
        success: true,
        data: result,
        message: '操作成功',
      });
    } catch (error) {
      console.error('创建开发机失败:', error);
      ResponseUtils.error(res, '创建开发机失败', error);
    }
  }

  /**
   * 停止开发机
   */
  public static async stop(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        ResponseUtils.error(res, '开发机ID不能为空');
        return;
      }

      const sdk = DevInstanceController.getSDK(req.user!.ak!);
      const result = await sdk.stopDevInstance(id);

      res.json({
        success: true,
        data: result,
        message: '已发送停止指令',
      });
    } catch (error) {
      console.error('停止开发机失败:', error);
      ResponseUtils.error(res, '停止开发机失败', error);
    }
  }

  /**
   * 删除开发机
   */
  public static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        ResponseUtils.error(res, '开发机ID不能为空');
        return;
      }

      const sdk = DevInstanceController.getSDK(req.user!.ak!);
      const result = await sdk.deleteDevInstance(id);

      res.json({
        success: true,
        data: result,
        message: '已发送删除指令',
      });
    } catch (error) {
      console.error('删除开发机失败:', error);
      ResponseUtils.error(res, '删除开发机失败', error);
    }
  }
}
