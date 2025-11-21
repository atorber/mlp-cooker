import { Request, Response, NextFunction } from 'express';

/**
 * CORS配置中间件
 */
export const corsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // 允许的源
  const allowedOrigins = [
    'http://localhost:3000',  // React开发服务器
    'http://localhost:8000',  // 可能的其他开发端口
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8000',
  ];

  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin || '') || !origin) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }

  // 允许的HTTP方法
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

  // 允许的请求头
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Auth-Token');

  // 允许发送凭证
  res.header('Access-Control-Allow-Credentials', 'true');

  // 预检请求的缓存时间
  res.header('Access-Control-Max-Age', '86400');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }

  next();
};