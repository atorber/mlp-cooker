import type { FastifyInstance, FastifyRequest } from 'fastify';
import z from 'zod';
import { getBackendClient } from '../backend/index.js';
import { trainingJobTransformer, type CreateTrainingJobRequest } from '../transformers/training-job.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('training-jobs-routes');

/**
 * 创建训练任务请求验证
 */
const createJobBodySchema = z.object({
  name: z.string().min(1).max(256),
  resourcePool: z.object({
    poolId: z.string(),
    queue: z.string(),
    poolType: z.enum(['common', 'dedicatedV2', 'serverless']).optional(),
  }),
  framework: z.enum(['PyTorchJob', 'TFJob', 'MPIJob']).optional(),
  command: z.string(),
  resources: z.object({
    cpu: z.number().int().positive(),
    memory: z.number().positive(),
    accelerator: z.object({
      type: z.string(),
      count: z.number().int().positive(),
    }).optional(),
    sharedMemory: z.number().optional(),
  }),
  replicas: z.number().int().positive().default(1),
  image: z.object({
    url: z.string(),
    auth: z.object({
      username: z.string(),
      password: z.string(),
    }).optional(),
  }),
  storageMounts: z.array(z.any()).optional(),
  envs: z.record(z.string()).optional(),
  labels: z.record(z.string()).optional(),
  priority: z.enum(['high', 'normal', 'low']).optional(),
  enableRDMA: z.boolean().optional(),
});

/**
 * 查询训练任务列表参数
 */
const describeJobsSchema = z.object({
  action: z.literal('DescribeJobs'),
  region: z.string().default('bd'),
  resourcePoolId: z.string(),
  queue: z.string().optional(),
  status: z.string().optional(),
  keywordType: z.string().optional(),
  keyword: z.string().optional(),
  orderBy: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  pageNumber: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
});

/**
 * 查询训练任务详情参数
 */
const describeJobSchema = z.object({
  action: z.literal('DescribeJob'),
  region: z.string().default('bd'),
  resourcePoolId: z.string(),
  queue: z.string(),
  jobId: z.string(),
  needDetail: z.coerce.boolean().optional(),
});

/**
 * 删除训练任务参数
 */
const deleteJobBodySchema = z.object({
  resourcePoolId: z.string(),
  queue: z.string(),
  jobId: z.string(),
});

/**
 * 训练任务路由 - RPC风格
 * 所有请求通过 ?action=XXX 参数区分操作
 */
export async function trainingJobsRoutes(fastify: FastifyInstance): Promise<void> {

  /**
   * GET /api/v1/jobs?action=XXX
   * 支持: DescribeJobs, DescribeJob
   */
  fastify.get('/api/v1/jobs', async (request: FastifyRequest<{ Querystring: { action?: string } }>) => {
    const { action } = request.query;

    switch (action) {
      case 'DescribeJobs': {
        const params = describeJobsSchema.parse(request.query);
        logger.debug({ params }, 'Listing training jobs');

        const requestBody = {
          queue: params.queue,
          status: params.status,
          keywordType: params.keywordType,
          keyword: params.keyword,
          orderBy: params.orderBy,
          order: params.order,
          pageNumber: params.pageNumber,
          pageSize: params.pageSize,
        };

        const result = await getBackendClient(request).describeJobs(
          params.region,
          params.resourcePoolId,
          params.queue,
          requestBody
        ) as { requestId?: string; totalCount: number; jobs: unknown[] };

        const items = (result.jobs || []).map((job: unknown) =>
          trainingJobTransformer.fromBackendResponse(job as Parameters<typeof trainingJobTransformer.fromBackendResponse>[0])
        );

        return {
          requestId: result.requestId,
          totalCount: result.totalCount || 0,
          items,
        };
      }

      case 'DescribeJob': {
        const params = describeJobSchema.parse(request.query);
        logger.debug({ params }, 'Getting training job detail');

        const result = await getBackendClient(request).describeJob(
          params.region,
          params.resourcePoolId,
          params.queue,
          { jobId: params.jobId, needDetail: params.needDetail }
        );

        return { job: result };
      }

      default:
        return { error: 'Invalid action', validActions: ['DescribeJobs', 'DescribeJob'] };
    }
  });

  /**
   * POST /api/v1/jobs?action=XXX
   * 支持: CreateJob, DeleteJob
   */
  fastify.post('/api/v1/jobs', async (request: FastifyRequest<{ Querystring: { action?: string } }>, reply) => {
    const { action } = request.query;

    switch (action) {
      case 'CreateJob': {
        const region = (request.query as { region?: string }).region || 'bd';
        const body = createJobBodySchema.parse(request.body) as CreateTrainingJobRequest;
        logger.debug({ region, name: body.name }, 'Creating training job');

        const backendRequest = trainingJobTransformer.toBackendRequest(body);

        const result = await getBackendClient(request).createJob(
          region,
          body.resourcePool.poolId,
          body.resourcePool.queue,
          backendRequest
        );

        reply.code(201);
        return {
          requestId: result.requestId,
          jobId: result.jobId,
          jobName: result.jobName,
        };
      }

      case 'DeleteJob': {
        const region = (request.query as { region?: string }).region || 'bd';
        const body = deleteJobBodySchema.parse(request.body);
        logger.debug({ region, jobId: body.jobId }, 'Deleting training job');

        const result = await getBackendClient(request).deleteJob(
          region,
          body.resourcePoolId,
          body.queue,
          { jobId: body.jobId }
        );

        return {
          requestId: result.requestId,
          jobId: body.jobId,
        };
      }

      case 'StopJob':
      case 'BatchStopJobs':
      case 'ModifyJob':
      case 'DescribePodEvents':
      case 'DescribeJobEvents':
      case 'DescribeJobNodes':
      case 'DescribeJobLogs':
      case 'DescribeJobMetrics':
      case 'DescribeJobWebterminal': {
        const region = (request.query as { region?: string }).region || 'bd';
        logger.debug({ region, action }, `Proxying advanced training job action: ${action}`);
        
        // 宽松验证并直接透传给后端
        return await getBackendClient(request).sendRequest(
          'aihc', 
          region, 
          action, 
          'POST', 
          request.query as Record<string, string>, 
          request.body
        );
      }

      default:
        reply.code(400);
        return { error: 'Invalid action', validActions: ['CreateJob', 'DeleteJob', 'StopJob', 'BatchStopJobs', 'ModifyJob', 'DescribePodEvents', 'DescribeJobEvents', 'DescribeJobNodes', 'DescribeJobLogs', 'DescribeJobMetrics', 'DescribeJobWebterminal'] };
    }
  });
}

export default trainingJobsRoutes;
