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
  type: z.enum(['common', 'dedicatedV2']).default('common'),
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
 * 查询资源池配置
 * GET /api/v1/resource-pools?action=DescribeResourcePoolConfiguration&resourcePoolId=xxx
 */
const describeResourcePoolConfigurationSchema = z.object({
  action: z.literal('DescribeResourcePoolConfiguration'),
  region: z.string().default('bd'),
  resourcePoolId: z.string().min(1),
});

/**
 * 查询资源池概览
 * GET /api/v1/resource-pools?action=DescribeResourcePoolsStatistic
 */
const describeResourcePoolsStatisticSchema = z.object({
  action: z.literal('DescribeResourcePoolsStatistic'),
  region: z.string().default('bd'),
  resourcePoolType: z.enum(['common', 'dedicatedV2']).optional(),
});

/**
 * 创建资源池请求体
 */
const createResourcePoolBodySchema = z.object({
  name: z.string().min(1).max(65),
  description: z.string().max(300).optional(),
  type: z.enum(['dedicatedV2']),
  network: z.object({
    nodes: z.array(z.object({
      vpcId: z.string(),
      subnetIds: z.array(z.string()),
    })),
  }),
  bindingStorages: z.array(z.object({
    provider: z.string(),
    type: z.string().optional(),
    id: z.string().optional(),
  })).optional(),
  bindingMonitors: z.array(z.object({
    provider: z.string(),
    id: z.string().optional(),
  })).optional(),
});

/**
 * 删除资源池请求体
 */
const deleteResourcePoolBodySchema = z.object({
  resourcePoolId: z.string().min(1),
});

/**
 * 创建队列请求体
 */
const createQueueBodySchema = z.object({
  resourcePoolId: z.string().min(1),
  resourceQueueName: z.string().min(1),
  description: z.string().optional(),
  resourceQueueType: z.enum(['regular', 'elastic', 'physical']).optional(),
  parentQueue: z.string().optional(),
  capability: z.record(z.string(), z.unknown()).optional(),
  deserved: z.record(z.string(), z.unknown()).optional(),
  guarantee: z.record(z.string(), z.unknown()).optional(),
});

/**
 * 删除队列请求体
 */
const deleteQueueBodySchema = z.object({
  resourcePoolId: z.string().min(1),
  queueId: z.string().min(1),
});

/**
 * 创建节点请求体
 */
const createNodesBodySchema = z.object({
  resourcePoolId: z.string().min(1),
  nodeSet: z.array(z.object({
    count: z.number().int().min(1).max(50),
    addNodeSpec: z.object({
      machineSpec: z.string(),
      zoneName: z.string(),
      resourceChargingOption: z.object({
        chargingType: z.enum(['Prepaid', 'Postpaid']),
        purchaseTime: z.number().optional(),
        purchaseTimeUnit: z.enum(['MONTH']).optional(),
        autoRenew: z.boolean().optional(),
        autoRenewTime: z.number().optional(),
        autoRenewTimeUnit: z.enum(['MONTH']).optional(),
      }),
      ehcClusterId: z.string().optional(),
    }),
  })),
});

/**
 * 删除节点请求体
 */
const deleteNodesBodySchema = z.object({
  resourcePoolId: z.string().min(1),
  nodeNameList: z.array(z.string()),
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
          requestId?: string;
          resourcePoolList: BackendResourcePoolSpec[];
          totalCount: number;
        };

        return {
          requestId: response.requestId,
          totalCount: response.totalCount || 0,
          items: (response.resourcePoolList || []).map(p => resourcePoolTransformer.fromBackend(p)),
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
          requestId?: string;
          resourceQueueList: BackendQueueItem[];
          totalCount: number;
        };

        return {
          requestId: response.requestId,
          totalCount: response.totalCount || 0,
          items: (response.resourceQueueList || []).map(q => resourcePoolTransformer.queueFromBackend(q)),
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

        const response = await getBackendClient(request).sendRequest('aihc', params.region, 'DescribeNodes' as never, 'GET', {
          resourcePoolId: params.resourcePoolId,
          pageNumber: String(params.pageNumber),
          pageSize: String(params.pageSize),
        }) as {
          requestId?: string;
          nodeList: BackendNode[];
          totalCount: number;
        };

        return {
          requestId: response.requestId,
          totalCount: response.totalCount || 0,
          items: (response.nodeList || []).map(n => resourcePoolTransformer.nodeFromBackend(n)),
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

      case 'DescribeResourcePoolConfiguration': {
        const params = describeResourcePoolConfigurationSchema.parse(request.query);
        logger.debug({ params }, 'Getting resource pool configuration');

        const response = await getBackendClient(request).sendRequest('aihc', params.region, 'DescribeResourcePoolConfiguration' as never, 'GET', { resourcePoolId: params.resourcePoolId });

        return response;
      }

      case 'DescribeResourcePoolsStatistic': {
        const params = describeResourcePoolsStatisticSchema.parse(request.query);
        logger.debug({ params }, 'Getting resource pools statistic');

        const response = await getBackendClient(request).sendRequest('aihc', params.region, 'DescribeResourcePoolsStatistic' as never, 'GET', params.resourcePoolType ? { resourcePoolType: params.resourcePoolType } : {});

        return response;
      }

      default:
        return {
          error: 'Invalid action',
          validActions: ['DescribeResourcePools', 'DescribeResourcePool', 'DescribeQueues', 'DescribeQueue', 'DescribeNodes', 'DescribeNode', 'DescribeResourcePoolUsage', 'DescribeResourcePoolConfiguration', 'DescribeResourcePoolsStatistic'],
        };
    }
  });

  /**
   * POST /api/v1/resource-pools?action=XXX
   * 支持: CreateResourcePool, DeleteResourcePool, CreateQueue, DeleteQueue, CreateNodes, DeleteNodes
   */
  fastify.post('/api/v1/resource-pools', async (request: FastifyRequest<{ Querystring: { action?: string } }>, reply) => {
    const { action } = request.query;

    switch (action) {
      case 'CreateResourcePool': {
        const region = (request.query as { region?: string }).region || 'bd';
        const body = createResourcePoolBodySchema.parse(request.body);
        logger.debug({ region, name: body.name }, 'Creating resource pool');

        const response = await getBackendClient(request).sendRequest('aihc', region, 'CreateResourcePool' as never, 'POST', {}, body) as {
          requestId: string;
          resourcePoolId: string;
        };

        reply.code(201);
        return {
          requestId: response.requestId,
          resourcePoolId: response.resourcePoolId,
        };
      }

      case 'DeleteResourcePool': {
        const region = (request.query as { region?: string }).region || 'bd';
        const body = deleteResourcePoolBodySchema.parse(request.body);
        logger.debug({ region, resourcePoolId: body.resourcePoolId }, 'Deleting resource pool');

        const response = await getBackendClient(request).sendRequest('aihc', region, 'DeleteResourcePool' as never, 'POST', { resourcePoolId: body.resourcePoolId }) as {
          requestId: string;
        };

        return {
          requestId: response.requestId,
          resourcePoolId: body.resourcePoolId,
        };
      }

      case 'CreateQueue': {
        const region = (request.query as { region?: string }).region || 'bd';
        const body = createQueueBodySchema.parse(request.body);
        logger.debug({ region, resourcePoolId: body.resourcePoolId, name: body.resourceQueueName }, 'Creating queue');

        const response = await getBackendClient(request).sendRequest('aihc', region, 'CreateQueue' as never, 'POST', { resourcePoolId: body.resourcePoolId }, {
          resourceQueueName: body.resourceQueueName,
          description: body.description,
          resourceQueueType: body.resourceQueueType,
          parentQueue: body.parentQueue,
          capability: body.capability,
          deserved: body.deserved,
          guarantee: body.guarantee,
        }) as {
          requestId: string;
          resourceQueueId: string;
        };

        reply.code(201);
        return {
          requestId: response.requestId,
          queueId: response.resourceQueueId,
        };
      }

      case 'DeleteQueue': {
        const region = (request.query as { region?: string }).region || 'bd';
        const body = deleteQueueBodySchema.parse(request.body);
        logger.debug({ region, resourcePoolId: body.resourcePoolId, queueId: body.queueId }, 'Deleting queue');

        const response = await getBackendClient(request).sendRequest('aihc', region, 'DeleteQueue' as never, 'POST', { resourcePoolId: body.resourcePoolId, queueId: body.queueId }) as {
          requestId: string;
        };

        return {
          requestId: response.requestId,
          queueId: body.queueId,
        };
      }

      case 'CreateNodes': {
        const region = (request.query as { region?: string }).region || 'bd';
        const body = createNodesBodySchema.parse(request.body);
        logger.debug({ region, resourcePoolId: body.resourcePoolId }, 'Creating nodes');

        const response = await getBackendClient(request).sendRequest('aihc', region, 'CreateNodes' as never, 'POST', { resourcePoolId: body.resourcePoolId }, {
          nodeSet: body.nodeSet,
        }) as {
          requestId: string;
        };

        reply.code(201);
        return {
          requestId: response.requestId,
        };
      }

      case 'DeleteNodes': {
        const region = (request.query as { region?: string }).region || 'bd';
        const body = deleteNodesBodySchema.parse(request.body);
        logger.debug({ region, resourcePoolId: body.resourcePoolId }, 'Deleting nodes');

        const response = await getBackendClient(request).sendRequest('aihc', region, 'DeleteNodes' as never, 'POST', { resourcePoolId: body.resourcePoolId }, {
          nodeNameList: body.nodeNameList,
        }) as {
          requestId: string;
        };

        return {
          requestId: response.requestId,
        };
      }

      default:
        reply.code(400);
        return { error: 'Invalid action', validActions: ['CreateResourcePool', 'DeleteResourcePool', 'CreateQueue', 'DeleteQueue', 'CreateNodes', 'DeleteNodes'] };
    }
  });
}

export default resourcePoolsRoutes;
