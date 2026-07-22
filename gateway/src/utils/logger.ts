import pino from 'pino';
import config from '../config/index.js';

/**
 * 创建日志实例
 */
export const logger = pino({
  level: config.log.level,
  transport: config.server.nodeEnv === 'development'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  formatters: {
    level: (label) => ({ level: label }),
  },
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
});

/**
 * 创建子日志器
 */
export function createLogger(name: string): pino.Logger {
  return logger.child({ name });
}

export default logger;
