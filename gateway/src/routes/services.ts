import type { FastifyInstance, FastifyRequest } from 'fastify';
import z from 'zod';
import { getBackendClient } from '../backend/index.js';
import { serviceTransformer } from '../transformers/service.js';
import type { BackendServiceBriefInfo } from '../types/backend/service.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('services-routes');

/**
 * 查询服务列表参数
 * GET /api/v1/services?action=DescribeServices
 */
const describeServicesSchema = z.object({
  action: z.literal('DescribeServices'),
  region: z.string().default('bd'),
  pageNumber: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  orderBy: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

/**
 * 查询服务详情参数
 * GET /api/v1/services?action=DescribeService&serviceId=xxx
 */
const describeServiceSchema = z.object({
  action: z.literal('DescribeService'),
  region: z.string().default('bd'),
  serviceId: z.string().min(1),
});

/**
 * 删除服务请求体
 */
const deleteServiceBodySchema = z.object({
  serviceId: z.string().min(1),
});

/**
 * 服务部署路由 - RPC风格
 * 所有请求通过 ?action=XXX 参数区分操作
 */
export async function servicesRoutes(fastify: FastifyInstance): Promise<void> {

  /**
   * GET /api/v1/services?action=XXX
   * 支持: DescribeServices, DescribeService
   */
  fastify.get('/api/v1/services', async (request: FastifyRequest<{ Querystring: { action?: string } }>) => {
    const { action } = request.query;

    switch (action) {
      case 'DescribeServices': {
        const params = describeServicesSchema.parse(request.query);
        logger.debug({ params }, 'Listing services');

        const result = await getBackendClient(request).describeServices(params.region, {
          pageNumber: params.pageNumber,
          pageSize: params.pageSize,
          orderBy: params.orderBy,
          order: params.order,
        }) as {
          requestId?: string;
          services: BackendServiceBriefInfo[];
          totalCount: number;
        };

        const items = (result.services || []).map(s => serviceTransformer.fromBackendBrief(s));

        return {
          requestId: result.requestId,
          totalCount: result.totalCount || 0,
          items,
        };
      }

      case 'DescribeService': {
        const params = describeServiceSchema.parse(request.query);
        logger.debug({ params }, 'Getting service detail');

        const result = await getBackendClient(request).describeService(params.region, params.serviceId);

        return { service: result };
      }

      default:
        return { error: 'Invalid action', validActions: ['DescribeServices', 'DescribeService'] };
    }
  });

  /**
   * POST /api/v1/services?action=XXX
   * 支持: CreateService, DeleteService
   */
  fastify.post('/api/v1/services', async (request: FastifyRequest<{ Querystring: { action?: string } }>, reply) => {
    const { action } = request.query;

    switch (action) {
      case 'CreateService': {
        const query = request.query as { region?: string; clientToken?: string };
        const region = query.region || 'bd';
        const clientToken = query.clientToken;
        const body = request.body as any; // Allow wide interface for now, generic CreateServiceRequest applies
        logger.debug({ region, clientToken }, 'Creating service via generic gateway transformer');

        const backendParams = serviceTransformer.toBackendCreateRequest(body);
        
        const result = await getBackendClient(request).createService(region, backendParams, clientToken);

        reply.code(201);
        return {
          requestId: result.requestId,
          serviceId: result.serviceId,
        };
      }

      case 'DeleteService': {
        const region = (request.query as { region?: string }).region || 'bd';
        const body = deleteServiceBodySchema.parse(request.body);
        logger.debug({ region, serviceId: body.serviceId }, 'Deleting service');

        const result = await getBackendClient(request).deleteService(region, body.serviceId);

        return {
          requestId: result.requestId,
          serviceId: body.serviceId,
        };
      }

      default:
        reply.code(400);
        return { error: 'Invalid action', validActions: ['CreateService', 'DeleteService'] };
    }
  });
}

export default servicesRoutes;
