import { Response } from 'express';
import { ApiResponse } from '@/types/api';

/**
 * 响应工具类 - 统一处理API响应格式
 */
export class ResponseUtils {
  /**
   * 成功响应
   */
  static success<T>(
    res: Response,
    data: T,
    message = '操作成功'
  ): Response<ApiResponse<T>> {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
    };
    return res.json(response);
  }

  /**
   * 错误响应
   */
  static error(
    res: Response,
    message = '操作失败',
    details?: any
  ): Response<ApiResponse> {
    const response: ApiResponse = {
      success: false,
      message,
      details,
    };
    return res.json(response);
  }

  /**
   * 文件响应
   */
  static file(
    res: Response,
    message = '文件操作成功',
    filepath?: string,
    content?: string
  ): Response<ApiResponse> {
    const response: ApiResponse = {
      success: true,
      message,
      ...(filepath && { filepath }),
      ...(content && { content }),
    };
    return res.json(response);
  }

  /**
   * 创建带统计信息的响应
   */
  static stats<T>(
    res: Response,
    data: T,
    stats: {
      totalCards: number;
      checkedCards: number;
      skippedCards: number;
      nonCompliantCards: number;
    },
    message = '操作成功',
    cardCount?: number
  ): Response<ApiResponse<T>> {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      stats,
      ...(cardCount && { cardCount }),
    };
    return res.json(response);
  }
}