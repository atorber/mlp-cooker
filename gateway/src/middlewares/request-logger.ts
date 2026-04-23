import type { FastifyRequest, FastifyReply } from 'fastify';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('request-logger');

/**
 * 请求日志中间件
 */
export async function requestLogger(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const startTime = Date.now();
  const requestId = request.id;

  // 记录请求
  logger.info({
    requestId,
    method: request.method,
    url: request.url,
    headers: {
      'content-type': request.headers['content-type'],
      'user-agent': request.headers['user-agent'],
    },
  }, 'Incoming request');

  // 响应完成后记录
  reply.raw.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info({
      requestId,
      statusCode: reply.statusCode,
      duration,
    }, 'Request completed');
  });
}

export default requestLogger;
