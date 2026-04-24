import type { FastifyInstance, FastifyRequest } from 'fastify';
import z from 'zod';
import { getBackendClient } from '../backend/client.js';
import { datasetTransformer } from '../transformers/dataset.js';
import type { BackendDataset, BackendDatasetVersionEntry } from '../types/backend/dataset.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('datasets-routes');

/**
 * 查询数据集列表
 * GET /api/v1/datasets?action=DescribeDatasets
 */
const describeDatasetsSchema = z.object({
  action: z.literal('DescribeDatasets'),
  region: z.string().default('bd'),
  keyword: z.string().optional(),
  storageType: z.enum(['pfs', 'bos']).optional(),
  storageInstances: z.string().optional(),
  importFormat: z.enum(['file', 'folder']).optional(),
  pageNumber: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * 查询数据集详情
 * GET /api/v1/datasets?action=DescribeDataset&datasetId=xxx
 */
const describeDatasetSchema = z.object({
  action: z.literal('DescribeDataset'),
  region: z.string().default('bd'),
  datasetId: z.string().min(1),
});

/**
 * 查询数据集版本列表
 * GET /api/v1/datasets?action=DescribeDatasetVersions&datasetId=xxx
 */
const describeDatasetVersionsSchema = z.object({
  action: z.literal('DescribeDatasetVersions'),
  region: z.string().default('bd'),
  datasetId: z.string().min(1),
  pageNumber: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * 查询数据集版本详情
 * GET /api/v1/datasets?action=DescribeDatasetVersion&datasetId=xxx&versionId=xxx
 */
const describeDatasetVersionSchema = z.object({
  action: z.literal('DescribeDatasetVersion'),
  region: z.string().default('bd'),
  datasetId: z.string().min(1),
  versionId: z.string().min(1),
});

/**
 * 创建数据集请求体
 */
const createDatasetBodySchema = z.object({
  name: z.string().min(1).max(128),
  storageType: z.enum(['pfs', 'bos']),
  storageInstance: z.string().min(1),
  importFormat: z.enum(['file', 'folder']),
  description: z.string().max(1024).optional(),
  owner: z.string().optional(),
  visibilityScope: z.enum(['all', 'owner', 'group']).default('owner'),
  visibilityUser: z.array(z.object({
    id: z.string(),
    name: z.string(),
    permission: z.enum(['read', 'write']),
  })).optional(),
  visibilityGroup: z.array(z.object({
    id: z.string(),
    name: z.string(),
    permission: z.enum(['read', 'write']),
  })).optional(),
  initialVersion: z.object({
    description: z.string().optional(),
    storagePath: z.string().min(1),
    mountPath: z.string().min(1),
  }),
});

/**
 * 创建数据集版本请求体
 */
const createDatasetVersionBodySchema = z.object({
  datasetId: z.string().min(1),
  description: z.string().optional(),
  storagePath: z.string().min(1),
  mountPath: z.string().min(1),
});

/**
 * 删除数据集请求体
 */
const deleteDatasetBodySchema = z.object({
  datasetId: z.string().min(1),
});

/**
 * 删除数据集版本请求体
 */
const deleteDatasetVersionBodySchema = z.object({
  datasetId: z.string().min(1),
  versionId: z.string().min(1),
});

/**
 * 修改数据集请求体
 */
const modifyDatasetBodySchema = z.object({
  datasetId: z.string().min(1),
  name: z.string().min(1).max(128).optional(),
  description: z.string().max(1024).optional(),
  visibilityScope: z.enum(['all', 'owner', 'group']).optional(),
  visibilityUser: z.array(z.object({
    id: z.string(),
    name: z.string(),
    permission: z.enum(['read', 'write']),
  })).optional(),
  visibilityGroup: z.array(z.object({
    id: z.string(),
    name: z.string(),
    permission: z.enum(['read', 'write']),
  })).optional(),
});

/**
 * 数据集路由 - RPC风格
 * 所有请求通过 ?action=XXX 参数区分操作
 */
export async function datasetsRoutes(fastify: FastifyInstance): Promise<void> {

  /**
   * GET /api/v1/datasets?action=XXX
   * 支持: DescribeDatasets, DescribeDataset, DescribeDatasetVersions
   */
  fastify.get('/api/v1/datasets', async (request: FastifyRequest<{ Querystring: { action?: string } }>) => {
    const { action } = request.query;

    switch (action) {
      case 'DescribeDatasets': {
        const params = describeDatasetsSchema.parse(request.query);
        logger.debug({ params }, 'Listing datasets');

        const response = await getBackendClient(request).describeDatasets(params.region, {
          keyword: params.keyword,
          storageType: params.storageType?.toUpperCase(),
          storageInstances: params.storageInstances,
          importFormat: params.importFormat?.toUpperCase(),
          pageNumber: params.pageNumber,
          pageSize: params.pageSize,
        }) as {
          requestId?: string;
          datasets: BackendDataset[];
          totalCount: number;
        };

        return {
          requestId: response.requestId,
          totalCount: response.totalCount || 0,
          items: (response.datasets || []).map(d => datasetTransformer.fromBackend(d)),
        };
      }

      case 'DescribeDataset': {
        const params = describeDatasetSchema.parse(request.query);
        logger.debug({ params }, 'Getting dataset detail');

        const response = await getBackendClient(request).sendRequest('aihc', params.region, 'DescribeDataset' as never, 'GET', { datasetId: params.datasetId }) as {
          dataset: BackendDataset;
        };

        return {
          dataset: datasetTransformer.fromBackend(response.dataset),
        };
      }

      case 'DescribeDatasetVersions': {
        const params = describeDatasetVersionsSchema.parse(request.query);
        logger.debug({ params }, 'Listing dataset versions');

        const response = await getBackendClient(request).sendRequest('aihc', params.region, 'DescribeDatasetVersions' as never, 'GET', {
          datasetId: params.datasetId,
          pageNumber: String(params.pageNumber),
          pageSize: String(params.pageSize),
        }) as {
          requestId?: string;
          versionList: BackendDatasetVersionEntry[];
          totalCount: number;
        };

        return {
          requestId: response.requestId,
          totalCount: response.totalCount || 0,
          items: (response.versionList || []).map(v => datasetTransformer.versionFromBackend(v)),
        };
      }

      case 'DescribeDatasetVersion': {
        const params = describeDatasetVersionSchema.parse(request.query);
        logger.debug({ params }, 'Getting dataset version detail');

        const response = await getBackendClient(request).sendRequest('aihc', params.region, 'DescribeDatasetVersion' as never, 'GET', {
          datasetId: params.datasetId,
          versionId: params.versionId,
        }) as {
          version: BackendDatasetVersionEntry;
        };

        return {
          version: datasetTransformer.versionFromBackend(response.version),
        };
      }

      default:
        return { error: 'Invalid action', validActions: ['DescribeDatasets', 'DescribeDataset', 'DescribeDatasetVersions', 'DescribeDatasetVersion'] };
    }
  });

  /**
   * POST /api/v1/datasets?action=XXX
   * 支持: CreateDataset, CreateDatasetVersion, DeleteDataset, DeleteDatasetVersion
   */
  fastify.post('/api/v1/datasets', async (request: FastifyRequest<{ Querystring: { action?: string } }>, reply) => {
    const { action } = request.query;

    switch (action) {
      case 'CreateDataset': {
        const region = (request.query as { region?: string }).region || 'bd';
        const body = createDatasetBodySchema.parse(request.body);
        logger.debug({ region, name: body.name }, 'Creating dataset');

        const backendRequest = datasetTransformer.toBackendRequest({
          ...body,
          visibilityScope: body.visibilityScope || 'owner',
        });

        const response = await getBackendClient(request).sendRequest('aihc', region, 'CreateDataset' as never, 'POST', {}, backendRequest) as {
          requestId: string;
          datasetId: string;
        };

        reply.code(201);
        return {
          requestId: response.requestId,
          datasetId: response.datasetId,
        };
      }

      case 'CreateDatasetVersion': {
        const region = (request.query as { region?: string }).region || 'bd';
        const body = createDatasetVersionBodySchema.parse(request.body);
        logger.debug({ region, datasetId: body.datasetId }, 'Creating dataset version');

        const response = await getBackendClient(request).sendRequest('aihc', region, 'CreateDatasetVersion' as never, 'POST', { datasetId: body.datasetId }, {
          description: body.description,
          storagePath: body.storagePath,
          mountPath: body.mountPath,
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

      case 'DeleteDataset': {
        const region = (request.query as { region?: string }).region || 'bd';
        const body = deleteDatasetBodySchema.parse(request.body);
        logger.debug({ region, datasetId: body.datasetId }, 'Deleting dataset');

        const response = await getBackendClient(request).sendRequest('aihc', region, 'DeleteDataset' as never, 'POST', { datasetId: body.datasetId }) as {
          requestId: string;
        };

        return {
          requestId: response.requestId,
          datasetId: body.datasetId,
        };
      }

      case 'DeleteDatasetVersion': {
        const region = (request.query as { region?: string }).region || 'bd';
        const body = deleteDatasetVersionBodySchema.parse(request.body);
        logger.debug({ region, datasetId: body.datasetId, versionId: body.versionId }, 'Deleting dataset version');

        const response = await getBackendClient(request).sendRequest('aihc', region, 'DeleteDatasetVersion' as never, 'POST', { datasetId: body.datasetId, versionId: body.versionId }) as {
          requestId: string;
        };

        return {
          requestId: response.requestId,
          datasetId: body.datasetId,
          versionId: body.versionId,
        };
      }

      case 'ModifyDataset': {
        const region = (request.query as { region?: string }).region || 'bd';
        const body = modifyDatasetBodySchema.parse(request.body);
        logger.debug({ region, datasetId: body.datasetId }, 'Modifying dataset');

        const response = await getBackendClient(request).sendRequest('aihc', region, 'ModifyDataset' as never, 'POST', { datasetId: body.datasetId }, {
          name: body.name,
          description: body.description,
          visibilityScope: body.visibilityScope,
          visibilityUser: body.visibilityUser,
          visibilityGroup: body.visibilityGroup,
        }) as {
          requestId: string;
        };

        return {
          requestId: response.requestId,
          datasetId: body.datasetId,
        };
      }

      default:
        reply.code(400);
        return { error: 'Invalid action', validActions: ['CreateDataset', 'CreateDatasetVersion', 'DeleteDataset', 'DeleteDatasetVersion', 'ModifyDataset'] };
    }
  });
}

export default datasetsRoutes;
