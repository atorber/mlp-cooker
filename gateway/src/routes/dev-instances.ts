import type { FastifyInstance, FastifyRequest } from 'fastify';
import z from 'zod';
import { getBackendClient } from '../backend/index.js';
import { devInstanceTransformer } from '../transformers/dev-instance.js';
import type { BackendDevInstanceDetail } from '../types/backend/dev-instance.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('dev-instances-routes');

/**
 * 查询开发机列表参数
 * GET /api/v1/dev-instances?action=DescribeDevInstances
 */
const describeDevInstancesSchema = z.object({
  action: z.literal('DescribeDevInstances'),
  region: z.string().default('bd'),
  pageNumber: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  resourcePoolId: z.string().optional(),
  queueName: z.string().optional(),
  onlyMyDevs: z.string().optional(),
  status: z.string().optional(),
  queryKey: z.string().optional(),
  queryVal: z.string().optional(),
});

/**
 * 查询开发机详情参数
 * GET /api/v1/dev-instances?action=DescribeDevInstance&devInstanceId=xxx
 */
const describeDevInstanceSchema = z.object({
  action: z.literal('DescribeDevInstance'),
  region: z.string().default('bd'),
  devInstanceId: z.string().min(1),
});

/**
 * 删除开发机请求体
 */
const deleteDevInstanceBodySchema = z.object({
  devInstanceId: z.string().min(1),
});

/**
 * 开发机路由 - RPC风格
 * 所有请求通过 ?action=XXX 参数区分操作
 */
export async function devInstancesRoutes(fastify: FastifyInstance): Promise<void> {

  /**
   * GET /api/v1/dev-instances?action=XXX
   * 支持: DescribeDevInstances, DescribeDevInstance
   */
  fastify.get('/api/v1/dev-instances', async (request: FastifyRequest<{ Querystring: { action?: string } }>) => {
    const { action } = request.query;

    switch (action) {
      case 'DescribeDevInstances': {
        const params = describeDevInstancesSchema.parse(request.query);
        logger.debug({ params }, 'Listing dev instances');

        const result = await getBackendClient(request).describeDevInstances(params.region, {
          pageNumber: params.pageNumber,
          pageSize: params.pageSize,
          resourcePoolId: params.resourcePoolId,
          queueName: params.queueName,
          onlyMyDevs: params.onlyMyDevs,
          status: params.status,
          queryKey: params.queryKey,
          queryVal: params.queryVal,
        }) as {
          requestId?: string;
          devInstances: BackendDevInstanceDetail[];
          totalCount: number;
        };

        const items = (result.devInstances || []).map(d => devInstanceTransformer.fromBackend(d));

        return {
          requestId: result.requestId,
          totalCount: result.totalCount || 0,
          items,
        };
      }

      case 'DescribeDevInstance': {
        const params = describeDevInstanceSchema.parse(request.query);
        logger.debug({ params }, 'Getting dev instance detail');

        const result = await getBackendClient(request).describeDevInstance(params.region, params.devInstanceId) as {
          devInstance: BackendDevInstanceDetail;
        };

        return {
          devInstance: devInstanceTransformer.fromBackend(result.devInstance),
        };
      }

      default:
        return { error: 'Invalid action', validActions: ['DescribeDevInstances', 'DescribeDevInstance'] };
    }
  });

  /**
   * POST /api/v1/dev-instances?action=XXX
   * 支持: CreateDevInstance, DeleteDevInstance
   */
  fastify.post('/api/v1/dev-instances', async (request: FastifyRequest<{ Querystring: { action?: string } }>, reply) => {
    const { action } = request.query;

    switch (action) {
      case 'CreateDevInstance': {
        const region = (request.query as { region?: string }).region || 'bd';
        const body = request.body;
        logger.debug({ region }, 'Creating dev instance');

        const result = await getBackendClient(request).createDevInstance(region, body);

        reply.code(201);
        return {
          requestId: result.requestId,
          devInstanceId: result.devInstanceId,
        };
      }

      case 'DeleteDevInstance': {
        const region = (request.query as { region?: string }).region || 'bd';
        const body = deleteDevInstanceBodySchema.parse(request.body);
        logger.debug({ region, devInstanceId: body.devInstanceId }, 'Deleting dev instance');

        const result = await getBackendClient(request).deleteDevInstance(region, body.devInstanceId);

        return {
          requestId: result.requestId,
          devInstanceId: body.devInstanceId,
        };
      }

      default:
        reply.code(400);
        return { error: 'Invalid action', validActions: ['CreateDevInstance', 'DeleteDevInstance'] };
    }
  });
}

export default devInstancesRoutes;
