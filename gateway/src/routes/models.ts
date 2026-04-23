import type { FastifyInstance, FastifyRequest } from 'fastify';
import z from 'zod';
import { getBackendClient } from '../backend/client.js';
import { modelTransformer } from '../transformers/model.js';
import type { BackendModel, BackendModelVersionEntry } from '../types/backend/model.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('models-routes');

/**
 * 查询模型列表
 * GET /api/v1/models?action=DescribeModels
 */
const describeModelsSchema = z.object({
  action: z.literal('DescribeModels'),
  region: z.string().default('bd'),
  keyword: z.string().optional(),
  pageNumber: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * 查询模型详情
 * GET /api/v1/models?action=DescribeModel&modelId=xxx
 */
const describeModelSchema = z.object({
  action: z.literal('DescribeModel'),
  region: z.string().default('bd'),
  modelId: z.string().min(1),
});

/**
 * 查询模型版本列表
 * GET /api/v1/models?action=DescribeModelVersions&modelId=xxx
 */
const describeModelVersionsSchema = z.object({
  action: z.literal('DescribeModelVersions'),
  region: z.string().default('bd'),
  modelId: z.string().min(1),
  pageNumber: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * 创建模型请求体
 */
const createModelBodySchema = z.object({
  name: z.string().min(1).max(128),
  modelFormat: z.string().min(1),
  description: z.string().max(1024).optional(),
  owner: z.string().optional(),
  visibilityScope: z.enum(['all', 'owner', 'group']).default('owner'),
});

/**
 * 创建模型版本请求体
 */
const createModelVersionBodySchema = z.object({
  modelId: z.string().min(1),
  version: z.string().min(1),
  description: z.string().optional(),
  storageBucket: z.string().min(1),
  storagePath: z.string().min(1),
  modelMetrics: z.record(z.string(), z.unknown()).optional(),
});

/**
 * 删除模型请求体
 */
const deleteModelBodySchema = z.object({
  modelId: z.string().min(1),
});

/**
 * 删除模型版本请求体
 */
const deleteModelVersionBodySchema = z.object({
  modelId: z.string().min(1),
  versionId: z.string().min(1),
});

/**
 * 模型路由 - RPC风格
 * 所有请求通过 ?action=XXX 参数区分操作
 */
export async function modelsRoutes(fastify: FastifyInstance): Promise<void> {

  /**
   * GET /api/v1/models?action=XXX
   * 支持: DescribeModels, DescribeModel, DescribeModelVersions
   */
  fastify.get('/api/v1/models', async (request: FastifyRequest<{ Querystring: { action?: string } }>) => {
    const { action } = request.query;

    switch (action) {
      case 'DescribeModels': {
        const params = describeModelsSchema.parse(request.query);
        logger.debug({ params }, 'Listing models');

        const response = await getBackendClient(request).describeModels(params.region, {
          keyword: params.keyword,
          pageNumber: params.pageNumber,
          pageSize: params.pageSize,
        }) as {
          modelList: BackendModel[];
          pageNumber: number;
          pageSize: number;
          totalCount: number;
        };

        return {
          models: response.modelList?.map(m => modelTransformer.fromBackend(m)),
          pagination: {
            pageNumber: response.pageNumber,
            pageSize: response.pageSize,
            totalCount: response.totalCount,
          },
        };
      }

      case 'DescribeModel': {
        const params = describeModelSchema.parse(request.query);
        logger.debug({ params }, 'Getting model detail');

        const response = await getBackendClient(request).sendRequest('aihc', params.region, 'DescribeModel' as never, 'GET', { modelId: params.modelId }) as {
          model: BackendModel;
        };

        return {
          model: modelTransformer.fromBackend(response.model),
        };
      }

      case 'DescribeModelVersions': {
        const params = describeModelVersionsSchema.parse(request.query);
        logger.debug({ params }, 'Listing model versions');

        const response = await getBackendClient(request).sendRequest('aihc', params.region, 'ListModelVersions' as never, 'GET', {
          modelId: params.modelId,
          pageNumber: String(params.pageNumber),
          pageSize: String(params.pageSize),
        }) as {
          versionList: BackendModelVersionEntry[];
          pageNumber: number;
          pageSize: number;
          totalCount: number;
        };

        return {
          versions: response.versionList?.map(v => modelTransformer.versionFromBackend(v)),
          pagination: {
            pageNumber: response.pageNumber,
            pageSize: response.pageSize,
            totalCount: response.totalCount,
          },
        };
      }

      default:
        return { error: 'Invalid action', validActions: ['DescribeModels', 'DescribeModel', 'DescribeModelVersions'] };
    }
  });

  /**
   * POST /api/v1/models?action=XXX
   * 支持: CreateModel, CreateModelVersion, DeleteModel, DeleteModelVersion
   */
  fastify.post('/api/v1/models', async (request: FastifyRequest<{ Querystring: { action?: string } }>, reply) => {
    const { action } = request.query;

    switch (action) {
      case 'CreateModel': {
        const region = (request.query as { region?: string }).region || 'bd';
        const body = createModelBodySchema.parse(request.body);
        logger.debug({ region, name: body.name }, 'Creating model');

        const backendRequest = modelTransformer.toBackendRequest(body);

        const response = await getBackendClient(request).sendRequest('aihc', region, 'CreateModel' as never, 'POST', {}, backendRequest) as {
          requestId: string;
          modelId: string;
        };

        reply.code(201);
        return {
          requestId: response.requestId,
          modelId: response.modelId,
        };
      }

      case 'CreateModelVersion': {
        const region = (request.query as { region?: string }).region || 'bd';
        const body = createModelVersionBodySchema.parse(request.body);
        logger.debug({ region, modelId: body.modelId, version: body.version }, 'Creating model version');

        const response = await getBackendClient(request).sendRequest('aihc', region, 'CreateModelVersion' as never, 'POST', { modelId: body.modelId }, {
          version: body.version,
          description: body.description,
          storageBucket: body.storageBucket,
          storagePath: body.storagePath,
          modelMetrics: body.modelMetrics,
        }) as {
          requestId: string;
          versionId: string;
        };

        reply.code(201);
        return {
          requestId: response.requestId,
          versionId: response.versionId,
        };
      }

      case 'DeleteModel': {
        const region = (request.query as { region?: string }).region || 'bd';
        const body = deleteModelBodySchema.parse(request.body);
        logger.debug({ region, modelId: body.modelId }, 'Deleting model');

        const response = await getBackendClient(request).sendRequest('aihc', region, 'DeleteModel' as never, 'POST', { modelId: body.modelId }) as {
          requestId: string;
        };

        return {
          requestId: response.requestId,
          modelId: body.modelId,
        };
      }

      case 'DeleteModelVersion': {
        const region = (request.query as { region?: string }).region || 'bd';
        const body = deleteModelVersionBodySchema.parse(request.body);
        logger.debug({ region, modelId: body.modelId, versionId: body.versionId }, 'Deleting model version');

        const response = await getBackendClient(request).sendRequest('aihc', region, 'DeleteModelVersion' as never, 'POST', { modelId: body.modelId, versionId: body.versionId }) as {
          requestId: string;
        };

        return {
          requestId: response.requestId,
          modelId: body.modelId,
          versionId: body.versionId,
        };
      }

      default:
        reply.code(400);
        return { error: 'Invalid action', validActions: ['CreateModel', 'CreateModelVersion', 'DeleteModel', 'DeleteModelVersion'] };
    }
  });
}

export default modelsRoutes;
