import type { FastifyInstance, FastifyRequest } from 'fastify';
import z from 'zod';
import { getBackendClient } from '../backend/client.js';
import { resourcePoolTransformer } from '../transformers/resource-pool.js';
import type { BackendResourcePoolSpec, BackendQueueItem, BackendNode, BackendResourceAmount } from '../types/backend/resource-pool.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('resource-pools-routes');

/**
 * 查询资源池列表
 * GET /api/v1/resource-pools?action=DescribeResourcePools
 */
const describeResourcePoolsSchema = z.object({
  action: z.literal('DescribeResourcePools'),
  region: z.string().default('bd'),
  type: z.enum(['selfManaged', 'managed']).default('selfManaged'),
  keywordType: z.enum(['name', 'id']).optional(),
  keyword: z.string().optional(),
  orderBy: z.enum(['name', 'id', 'createdAt']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  pageNumber: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * 查询资源池详情
 * GET /api/v1/resource-pools?action=DescribeResourcePool&resourcePoolId=xxx
 */
const describeResourcePoolSchema = z.object({
  action: z.literal('DescribeResourcePool'),
  region: z.string().default('bd'),
  resourcePoolId: z.string().min(1),
});

/**
 * 查询队列列表
 * GET /api/v1/resource-pools?action=DescribeQueues&resourcePoolId=xxx
 */
const describeQueuesSchema = z.object({
  action: z.literal('DescribeQueues'),
  region: z.string().default('bd'),
  resourcePoolId: z.string().min(1),
  keywordType: z.enum(['name', 'id']).optional(),
  keyword: z.string().optional(),
  pageNumber: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * 查询队列详情
 * GET /api/v1/resource-pools?action=DescribeQueue&resourcePoolId=xxx&queueId=xxx
 */
const describeQueueSchema = z.object({
  action: z.literal('DescribeQueue'),
  region: z.string().default('bd'),
  resourcePoolId: z.string().min(1),
  queueId: z.string().min(1),
});

/**
 * 查询节点列表
 * GET /api/v1/resource-pools?action=DescribeNodes&resourcePoolId=xxx
 */
const describeNodesSchema = z.object({
  action: z.literal('DescribeNodes'),
  region: z.string().default('bd'),
  resourcePoolId: z.string().min(1),
  pageNumber: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * 查询节点详情
 * GET /api/v1/resource-pools?action=DescribeNode&resourcePoolId=xxx&nodeName=xxx
 */
const describeNodeSchema = z.object({
  action: z.literal('DescribeNode'),
  region: z.string().default('bd'),
  resourcePoolId: z.string().min(1),
  nodeName: z.string().min(1),
});

/**
 * 查询资源池使用情况
 * GET /api/v1/resource-pools?action=DescribeResourcePoolUsage&resourcePoolId=xxx
 */
const describeResourcePoolUsageSchema = z.object({
  action: z.literal('DescribeResourcePoolUsage'),
  region: z.string().default('bd'),
  resourcePoolId: z.string().min(1),
});

/**
 * 资源池路由 - RPC风格
 * 所有请求通过 ?action=XXX 参数区分操作
 */
export async function resourcePoolsRoutes(fastify: FastifyInstance): Promise<void> {

  /**
   * GET /api/v1/resource-pools?action=XXX
   * 支持: DescribeResourcePools, DescribeResourcePool, DescribeQueues, DescribeQueue,
   *       DescribeNodes, DescribeNode, DescribeResourcePoolUsage
   */
  fastify.get('/api/v1/resource-pools', async (request: FastifyRequest<{ Querystring: { action?: string } }>) => {
    const { action } = request.query;

    switch (action) {
      case 'DescribeResourcePools': {
        const params = describeResourcePoolsSchema.parse(request.query);
        logger.debug({ params }, 'Listing resource pools');

        const backendParams = resourcePoolTransformer.toBackendParams(params);

        const response = await getBackendClient(request).describeResourcePools(params.region, {
          resourcePoolType: backendParams.resourcePoolType,
          keywordType: backendParams.keywordType,
          keyword: backendParams.keyword,
          orderBy: backendParams.orderBy,
          order: backendParams.order,
          pageNumber: params.pageNumber,
          pageSize: params.pageSize,
        }) as {
          resourcePoolList: BackendResourcePoolSpec[];
          pageNumber: number;
          pageSize: number;
          totalCount: number;
        };

        return {
          resourcePools: response.resourcePoolList?.map(p => resourcePoolTransformer.fromBackend(p)),
          pagination: {
            pageNumber: response.pageNumber,
            pageSize: response.pageSize,
            totalCount: response.totalCount,
          },
        };
      }

      case 'DescribeResourcePool': {
        const params = describeResourcePoolSchema.parse(request.query);
        logger.debug({ params }, 'Getting resource pool detail');

        const response = await getBackendClient(request).sendRequest('aihc', params.region, 'DescribeResourcePool' as never, 'GET', { resourcePoolId: params.resourcePoolId }) as {
          resourcePool: BackendResourcePoolSpec;
        };

        return {
          resourcePool: resourcePoolTransformer.fromBackend(response.resourcePool),
        };
      }

      case 'DescribeQueues': {
        const params = describeQueuesSchema.parse(request.query);
        logger.debug({ params }, 'Listing queues');

        const response = await getBackendClient(request).describeQueues(params.region, params.resourcePoolId, {
          keywordType: params.keywordType === 'name' ? 'resourceQueueName' : params.keywordType === 'id' ? 'resourceQueueId' : undefined,
          keyword: params.keyword,
          pageNumber: params.pageNumber,
          pageSize: params.pageSize,
        }) as {
          resourceQueueList: BackendQueueItem[];
          pageNumber: number;
          pageSize: number;
          totalCount: number;
        };

        return {
          queues: response.resourceQueueList?.map(q => resourcePoolTransformer.queueFromBackend(q)),
          pagination: {
            pageNumber: response.pageNumber,
            pageSize: response.pageSize,
            totalCount: response.totalCount,
          },
        };
      }

      case 'DescribeQueue': {
        const params = describeQueueSchema.parse(request.query);
        logger.debug({ params }, 'Getting queue detail');

        const response = await getBackendClient(request).sendRequest('aihc', params.region, 'DescribeQueue' as never, 'GET', { resourcePoolId: params.resourcePoolId, queueId: params.queueId }) as {
          resourceQueue: BackendQueueItem;
        };

        return {
          queue: resourcePoolTransformer.queueFromBackend(response.resourceQueue),
        };
      }

      case 'DescribeNodes': {
        const params = describeNodesSchema.parse(request.query);
        logger.debug({ params }, 'Listing nodes');

        const response = await getBackendClient(request).sendRequest('aihc', params.region, 'ListNodes' as never, 'GET', {
          resourcePoolId: params.resourcePoolId,
          pageNumber: String(params.pageNumber),
          pageSize: String(params.pageSize),
        }) as {
          nodeList: BackendNode[];
          pageNumber: number;
          pageSize: number;
          totalCount: number;
        };

        return {
          nodes: response.nodeList?.map(n => resourcePoolTransformer.nodeFromBackend(n)),
          pagination: {
            pageNumber: response.pageNumber,
            pageSize: response.pageSize,
            totalCount: response.totalCount,
          },
        };
      }

      case 'DescribeNode': {
        const params = describeNodeSchema.parse(request.query);
        logger.debug({ params }, 'Getting node detail');

        const response = await getBackendClient(request).sendRequest('aihc', params.region, 'DescribeNode' as never, 'GET', { resourcePoolId: params.resourcePoolId, nodeName: params.nodeName }) as {
          node: BackendNode;
        };

        return {
          node: resourcePoolTransformer.nodeFromBackend(response.node),
        };
      }

      case 'DescribeResourcePoolUsage': {
        const params = describeResourcePoolUsageSchema.parse(request.query);
        logger.debug({ params }, 'Getting resource pool usage');

        const response = await getBackendClient(request).sendRequest('aihc', params.region, 'DescribeResourcePoolUsage' as never, 'GET', { resourcePoolId: params.resourcePoolId }) as {
          usage: {
            totalResources?: BackendResourceAmount;
            usedResources?: BackendResourceAmount;
            availableResources?: BackendResourceAmount;
          };
        };

        return {
          usage: {
            total: response.usage?.totalResources ? resourcePoolTransformer.resourceAmountFromBackend(response.usage.totalResources) : undefined,
            used: response.usage?.usedResources ? resourcePoolTransformer.resourceAmountFromBackend(response.usage.usedResources) : undefined,
            available: response.usage?.availableResources ? resourcePoolTransformer.resourceAmountFromBackend(response.usage.availableResources) : undefined,
          },
        };
      }

      default:
        return {
          error: 'Invalid action',
          validActions: ['DescribeResourcePools', 'DescribeResourcePool', 'DescribeQueues', 'DescribeQueue', 'DescribeNodes', 'DescribeNode', 'DescribeResourcePoolUsage'],
        };
    }
  });
}

export default resourcePoolsRoutes;
