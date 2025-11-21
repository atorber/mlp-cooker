import morgan from 'morgan';
import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

/**
 * 自定义日志格式
 */
morgan.token('id', (req: Request) => (req.headers['x-request-id'] as string) || '');
morgan.token('real-ip', (req: Request) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];

  if (typeof forwardedFor === 'string') {
    return forwardedFor.split(',')[0]?.trim() || '';
  }
  if (typeof realIp === 'string') {
    return realIp;
  }

  return req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         '';
});

/**
 * 开发环境日志格式
 */
const devFormat = ':id :method :url :status :response-time ms - :res[content-length] - :real-ip';

/**
 * 生产环境日志格式
 */
const prodFormat = JSON.stringify({
  id: ':id',
  method: ':method',
  url: ':url',
  status: ':status',
  responseTime: ':response-time',
  contentLength: ':res[content-length]',
  ip: ':real-ip',
  userAgent: ':user-agent',
  timestamp: ':date[iso]',
});

/**
 * 创建日志目录
 */
const ensureLogDir = (logPath: string): void => {
  const dir = path.dirname(logPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

/**
 * 获取日志流
 */
const getLogStream = (logPath: string) => {
  ensureLogDir(logPath);
  return fs.createWriteStream(logPath, { flags: 'a' });
};

/**
 * 获取开发环境中间件
 */
export const devLogger = () => {
  return morgan(devFormat, {
    stream: process.stdout,
  });
};

/**
 * 获取生产环境中间件
 */
export const prodLogger = (logPath = './logs/access.log') => {
  return morgan(prodFormat, {
    stream: getLogStream(logPath),
  });
};

/**
 * 根据环境获取合适的日志中间件
 */
export const getLogger = (isDev = process.env.NODE_ENV !== 'production') => {
  if (isDev) {
    return devLogger();
  }
  return prodLogger();
};

/**
 * 错误日志记录工具
 */
export const logError = (error: Error, req?: Request): void => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    message: error.message,
    stack: error.stack,
    ...(req && {
      url: req.url,
      method: req.method,
      body: req.body,
      params: req.params,
      query: req.query,
      headers: req.headers,
    }),
  };

  console.error('ERROR:', JSON.stringify(errorLog, null, 2));

  // 在生产环境中写入错误日志文件
  if (process.env.NODE_ENV === 'production') {
    try {
      const errorLogPath = './logs/error.log';
      ensureLogDir(errorLogPath);
      fs.appendFileSync(errorLogPath, JSON.stringify(errorLog) + '\n');
    } catch (writeError) {
      console.error('Failed to write error log:', writeError);
    }
  }
};

/**
 * 信息日志记录工具
 */
export const logInfo = (message: string, data?: any): void => {
  const infoLog = {
    timestamp: new Date().toISOString(),
    level: 'INFO',
    message,
    data,
  };

  console.log('INFO:', JSON.stringify(infoLog, null, 2));
};

/**
 * 警告日志记录工具
 */
export const logWarning = (message: string, data?: any): void => {
  const warningLog = {
    timestamp: new Date().toISOString(),
    level: 'WARNING',
    message,
    data,
  };

  console.warn('WARNING:', JSON.stringify(warningLog, null, 2));
};