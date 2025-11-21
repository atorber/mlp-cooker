import { Request, Response, NextFunction } from 'express';
import { ResponseUtils } from '@/utils/response.utils';

/**
 * 自定义错误类
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 全局错误处理中间件
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // 如果响应已经发送，交给默认错误处理器
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = 500;
  let message = '服务器内部错误';

  // 处理自定义应用错误
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  }
  // 处理验证错误
  else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = '数据验证失败';
  }
  // 处理JWT错误
  else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = '无效的访问令牌';
  }
  // 处理文件上传错误
  else if (error.name === 'MulterError') {
    statusCode = 400;
    message = '文件上传失败';
  }

  // 记录错误日志
  console.error(`[${new Date().toISOString()}] Error:`, {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
  });

  // 返回错误响应
  ResponseUtils.error(res, message, {
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    type: error.name,
  });
};

/**
 * 404错误处理中间件
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  ResponseUtils.error(res, `路由 ${req.originalUrl} 不存在`, {
    method: req.method,
    url: req.originalUrl,
  });
};

/**
 * 异步错误捕获包装器
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};