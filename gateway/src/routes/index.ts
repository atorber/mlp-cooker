import type { FastifyInstance } from 'fastify';
import { trainingJobsRoutes } from './training-jobs.js';
import { servicesRoutes } from './services.js';
import { devInstancesRoutes } from './dev-instances.js';
import { datasetsRoutes } from './datasets.js';
import { modelsRoutes } from './models.js';
import { resourcePoolsRoutes } from './resource-pools.js';
import { bosRoutes } from './bos.js';

/**
 * 注册所有路由
 */
export async function registerRoutes(fastify: FastifyInstance): Promise<void> {

  // URL 重写中间件：统一 /v1/aihc 到各个拆分的 /api/v1/:resource
  fastify.addHook('onRequest', async (request, _reply) => {
    // 处理以 /v1 开头的路由（AIHC 和 BOS等）从而把 region 从 header 提取到 query
    if (request.url.startsWith('/v1/') && request.headers.region) {
      // 保证 Zod 之前的拦截和参数注入正常运作
      (request.query as any).region = request.headers.region;
    }

    // 处理所有属于 AIHC 的聚合与伪路径路由（兼容 swagger /v1/aihc/jobs/DescribeJobs 这种展开的拆分路由）
    if (request.url.startsWith('/v1/aihc')) {
      let action = (request.query as any).action;
      
      // 如果没有传 ?action=XXX，尝试从 URL 的最后一段路径提取 (比如 /v1/aihc/jobs/DescribeJobs)
      if (!action) {
        const urlWithoutQuery = request.url.split('?')[0];
        const segments = urlWithoutQuery.split('/').filter(Boolean);
        // 如果最后一段显然是一个大写开头的 Action
        const lastSegment = segments[segments.length - 1];
        if (lastSegment && /^[A-Z]/.test(lastSegment)) {
          action = lastSegment;
          (request.query as any).action = action; // 透传给内部机制
        }
      }

      if (!action) return;

      let rewritePath = '';
      if (['DescribeJobs', 'DescribeJob', 'CreateJob', 'DeleteJob', 'StopJob', 'BatchStopJobs', 'ModifyJob', 'DescribePodEvents', 'DescribeJobEvents', 'DescribeJobNodes', 'DescribeJobLogs', 'DescribeJobMetrics', 'DescribeJobWebterminal'].includes(action)) {
        rewritePath = '/api/v1/jobs';
      } else if (['DescribeDatasets', 'DescribeDataset', 'DescribeDatasetVersions', 'CreateDataset', 'CreateDatasetVersion', 'DeleteDataset', 'DeleteDatasetVersion'].includes(action)) {
        rewritePath = '/api/v1/datasets';
      } else if (['DescribeDevInstances', 'DescribeDevInstance', 'CreateDevInstance', 'DeleteDevInstance'].includes(action)) {
        rewritePath = '/api/v1/dev-instances';
      } else if (['DescribeModels', 'DescribeModel', 'DescribeModelVersions', 'CreateModel', 'CreateModelVersion', 'DeleteModel', 'DeleteModelVersion'].includes(action)) {
        rewritePath = '/api/v1/models';
      } else if (['DescribeResourcePools', 'DescribeResourcePool', 'DescribeQueues', 'DescribeQueue', 'DescribeNodes', 'DescribeNode', 'DescribeResourcePoolUsage'].includes(action)) {
        rewritePath = '/api/v1/resource-pools';
      } else if (['DescribeServices', 'DescribeService', 'CreateService', 'DeleteService'].includes(action)) {
        rewritePath = '/api/v1/services';
      }

      if (rewritePath) {
        // request.raw.url 包含查询参数
        const rawUrl = request.raw.url || '';
        const queryParams = rawUrl.split('?')[1] || '';
        request.raw.url = queryParams ? `${rewritePath}?${queryParams}` : rewritePath;
      }
    }
  });

  // 健康检查
  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  // API 版本信息
  fastify.get('/api/v1', async () => ({
    version: '1.0.0',
    description: '百舸API网关',
    documentation: '/docs',
    openapi: '/docs/json',
  }));

  // 注册各模块路由
  await fastify.register(trainingJobsRoutes);
  await fastify.register(servicesRoutes);
  await fastify.register(devInstancesRoutes);
  await fastify.register(datasetsRoutes);
  await fastify.register(modelsRoutes);
  await fastify.register(resourcePoolsRoutes);
  
  // 注册 BOS 路由
  await fastify.register(bosRoutes);
}

export default registerRoutes;
