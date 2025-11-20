import { Request, Response } from 'express';
import { ResponseUtils } from '@/utils/response.utils';
import { IcafeSDK } from '@/utils/sdk/icafe.sdk';
import { IcafeQueryParams } from '@/models/icafe.model';

/**
 * iCafe控制器
 */
export class IcafeController {
  private static icafeSDK = new IcafeSDK();

  /**
   * 获取上周问题统计
   */
  public static async getLastWeekStats(req: Request, res: Response): Promise<void> {
    try {
      IcafeController.logInfo('获取上周iCafe统计开始');

      const statistics = await IcafeController.icafeSDK.getLastWeekStatistics();

      ResponseUtils.success(res, statistics, '获取上周统计成功');
    } catch (error) {
      console.error('获取上周iCafe统计失败:', error);
      ResponseUtils.error(res, '获取上周统计失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 获取2025H2需求统计
   */
  public static async get2025H2Stats(req: Request, res: Response): Promise<void> {
    try {
      IcafeController.logInfo('获取2025H2 iCafe统计开始');

      const statistics = await IcafeController.icafeSDK.get2025H2Statistics();

      ResponseUtils.success(res, statistics, '获取2025H2统计成功');
    } catch (error) {
      console.error('获取2025H2 iCafe统计失败:', error);
      ResponseUtils.error(res, '获取2025H2统计失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 调试iCafe API
   */
  public static async debugIcafe(req: Request, res: Response): Promise<void> {
    try {
      const { method = 'GET', endpoint, iql, data } = req.body;

      IcafeController.logInfo('iCafe API调试开始', { method, endpoint, iql });

      const result = await IcafeController.icafeSDK.debugApi({
        method,
        endpoint,
        iql,
        data,
      });

      if (result.success) {
        ResponseUtils.success(res, result, 'iCafe API调试成功');
      } else {
        ResponseUtils.error(res, 'iCafe API调试失败', result);
      }
    } catch (error) {
      console.error('iCafe API调试失败:', error);
      ResponseUtils.error(res, 'iCafe API调试失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 获取单张卡片详情
   */
  public static async getCardDetails(req: Request, res: Response): Promise<void> {
    try {
      const { sequence } = req.params;
      const cardSequence = parseInt(sequence, 10);

      if (isNaN(cardSequence)) {
        ResponseUtils.error(res, '无效的卡片序号', {
          sequence,
        });
        return;
      }

      IcafeController.logInfo('获取卡片详情开始', { sequence: cardSequence });

      const card = await IcafeController.icafeSDK.getCardDetails(cardSequence);

      ResponseUtils.success(res, card, '获取卡片详情成功');
    } catch (error) {
      console.error(`获取卡片详情失败 [${req.params.sequence}]:`, error);
      ResponseUtils.error(res, '获取卡片详情失败', {
        sequence: req.params.sequence,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 获取卡片历史记录
   */
  public static async getCardHistory(req: Request, res: Response): Promise<void> {
    try {
      const { sequence } = req.params;
      const cardSequence = parseInt(sequence, 10);

      if (isNaN(cardSequence)) {
        ResponseUtils.error(res, '无效的卡片序号', {
          sequence,
        });
        return;
      }

      IcafeController.logInfo('获取卡片历史开始', { sequence: cardSequence });

      const history = await IcafeController.icafeSDK.getCardHistory(cardSequence);

      ResponseUtils.success(res, history, '获取卡片历史成功');
    } catch (error) {
      console.error(`获取卡片历史失败 [${req.params.sequence}]:`, error);
      ResponseUtils.error(res, '获取卡片历史失败', {
        sequence: req.params.sequence,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 根据条件查询卡片
   */
  public static async queryCards(req: Request, res: Response): Promise<void> {
    try {
      const params = req.body as IcafeQueryParams;

      IcafeController.logInfo('查询iCafe卡片开始', params);

      const cards = await IcafeController.icafeSDK.queryCards(params);

      ResponseUtils.success(res, cards, '查询卡片成功');
    } catch (error) {
      console.error('查询iCafe卡片失败:', error);
      ResponseUtils.error(res, '查询卡片失败', {
        params: req.body,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 获取卡片统计信息
   */
  public static async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const params = req.body as IcafeQueryParams;

      IcafeController.logInfo('获取iCafe统计开始', params);

      const statistics = await IcafeController.icafeSDK.getStatistics(params);

      ResponseUtils.success(res, statistics, '获取统计信息成功');
    } catch (error) {
      console.error('获取iCafe统计失败:', error);
      ResponseUtils.error(res, '获取统计信息失败', {
        params: req.body,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 验证iCafe API连接
   */
  public static async validateConnection(req: Request, res: Response): Promise<void> {
    try {
      IcafeController.logInfo('验证iCafe API连接');

      const result = await IcafeController.icafeSDK.validateConnection();

      if (result.success) {
        ResponseUtils.success(res, result, 'iCafe API连接验证成功');
      } else {
        ResponseUtils.error(res, result.message, result);
      }
    } catch (error) {
      console.error('验证iCafe API连接失败:', error);
      ResponseUtils.error(res, '验证iCafe API连接失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 获取SDK配置信息
   */
  public static async getConfigInfo(req: Request, res: Response): Promise<void> {
    try {
      const configInfo = IcafeController.icafeSDK.getConfigInfo();

      ResponseUtils.success(res, configInfo, '获取SDK配置信息成功');
    } catch (error) {
      console.error('获取SDK配置信息失败:', error);
      ResponseUtils.error(res, '获取SDK配置信息失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 记录日志信息
   */
  private static logInfo(message: string, data?: any): void {
    console.log(`[IcafeController] ${message}`, data || '');
  }
}