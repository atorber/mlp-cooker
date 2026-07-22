import type { FastifyInstance, FastifyRequest } from 'fastify';
import { getBackendClient } from '../backend/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('bos-routes');

/**
 * BOS 路由 - RPC风格透传
 * 处理 /v1/bos?action=XXX
 */
export async function bosRoutes(fastify: FastifyInstance): Promise<void> {

  fastify.all('/v1/bos', async (request: FastifyRequest<{ Querystring: { action?: string; region?: string } }>, reply) => {
    const { action, region = 'bd' } = request.query;

    if (!action) {
      reply.code(400);
      return { error: 'Missing action parameter' };
    }

    logger.debug({ action, region }, 'Handling BOS request');

    try {
      // 这里的逻辑根据 BOS API 进行简单透传。
      // 对于 DescribeBuckets 或 ListBuckets (BOS 叫 ListBuckets)
      // 如果使用标准 RPC，我们直接发给 backendClient
      let method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' = 'POST';
      let path = '/';
      let customHeaders: Record<string, string> = {};

      if (action === 'DescribeBuckets' || action === 'ListBuckets') {
        method = 'GET';
      }

      const result = await getBackendClient(request).sendRequest(
        'bos',
        region,
        action,
        method as any,
        request.query as Record<string, string>,
        request.body,
        customHeaders,
        path
      );

      return result;
    } catch (error: any) {
      logger.error(error, 'BOS Request failed');
      reply.code(error.statusCode || 500);
      return { error: error.message };
    }
  });
}

export default bosRoutes;
