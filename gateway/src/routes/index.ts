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

  // 中间件：将请求头中的 region 参数提取到 query 中，以确保 Zod 能够正常验证
  fastify.addHook('onRequest', async (request, _reply) => {
    // 因为 url 在前置层已经被 rewriteUrl 重写成了 /api/v1/datasets，所以直接匹配 /api/v1/
    if (request.url.startsWith('/api/v1/') && request.headers.region) {
      (request.query as any).region = request.headers.region;
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
    description: '百度云API网关',
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
