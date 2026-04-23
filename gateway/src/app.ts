import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import config from './config/index.js';
import { createLogger } from './utils/logger.js';
import { errorHandler, requestLogger } from './middlewares/index.js';
import { registerRoutes } from './routes/index.js';
import path from 'node:path';
import url from 'node:url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const appLogger = createLogger('app');

/**
 * 创建 Fastify 应用实例
 */
export async function createApp() {
  const fastify = Fastify({
    logger: false, // 使用自定义日志
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
    trustProxy: true,
  });

  // 注册 Swagger 文档
  await fastify.register(swagger, {
    mode: 'static',
    specification: {
      path: path.join(__dirname, '../docs/openapi.yaml'),
      baseDir: path.join(__dirname, '../docs'),
    },
  });

  // 注册 Swagger UI
  await fastify.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      displayOperationId: true,
      displayRequestDuration: true,
      persistAuthorization: true,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });

  // 注册安全插件
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
      },
    },
  });

  // 注册 CORS
  await fastify.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  });

  // 注册限流
  await fastify.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.windowMs,
    cache: 10000,
    allowList: ['127.0.0.1'],
    redis: config.cache.redisUrl ? { url: config.cache.redisUrl } : undefined,
  });

  // 注册请求日志中间件
  fastify.addHook('onRequest', requestLogger);

  // 注册错误处理
  fastify.setErrorHandler(errorHandler);

  // 注册路由
  await registerRoutes(fastify);

  return fastify;
}

/**
 * 启动服务器
 */
export async function startServer() {
  const app = await createApp();

  try {
    await app.listen({
      port: config.server.port,
      host: config.server.host,
    });

    appLogger.info(
      `Server listening on http://${config.server.host}:${config.server.port}`
    );
    appLogger.info(`Environment: ${config.server.nodeEnv}`);
    appLogger.info(`API Documentation: http://${config.server.host}:${config.server.port}/docs`);

    // 优雅关闭
    const signals = ['SIGINT', 'SIGTERM'];
    signals.forEach((signal) => {
      process.on(signal, async () => {
        appLogger.info(`Received ${signal}, shutting down...`);
        await app.close();
        process.exit(0);
      });
    });

    return app;
  } catch (error) {
    appLogger.error(error, 'Failed to start server');
    process.exit(1);
  }
}

export default createApp;
