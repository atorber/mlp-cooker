import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import path from 'path';
import { configManager } from '@/config/environment';
import { corsMiddleware } from '@/middleware/cors.middleware';
import { errorHandler, notFoundHandler } from '@/middleware/error.middleware';
import { getLogger } from '@/utils/logger';
import routes from '@/routes';

/**
 * Express应用类
 */
class App {
  public app: express.Application;
  private config = configManager.getConfig();

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * 初始化中间件
   */
  private initializeMiddlewares(): void {
    // 安全中间件
    this.app.use(helmet({
      contentSecurityPolicy: false, // 根据需要配置CSP
    }));

    // CORS中间件
    this.app.use(corsMiddleware as any);

    // 压缩中间件
    this.app.use(compression());

    // 请求解析中间件
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // 日志中间件
    this.app.use(getLogger(this.config.server.debug));

    // 静态文件服务
    const uploadsPath = path.join(process.cwd(), 'data', 'uploads');
    this.app.use('/uploads', express.static(uploadsPath));

    // 生产环境下提供前端静态文件
    if (!this.config.server.debug) {
      const frontendDistPath = path.join(process.cwd(), '..', 'frontend-antd', 'dist');
      this.app.use(express.static(frontendDistPath));
    }

    // 请求ID中间件
    this.app.use((req, res, next) => {
      req.headers['x-request-id'] = req.headers['x-request-id'] ||
                                    Math.random().toString(36).substring(7);
      next();
    });
  }

  /**
   * 初始化路由
   */
  private initializeRoutes(): void {
    // API路由
    this.app.use('/', routes);

    // API文档路由（开发环境）
    if (this.config.server.debug) {
      this.app.get('/api/docs', (req, res) => {
        res.json({
          message: 'API Documentation',
          version: '1.0.0',
          endpoints: [
            'POST /api/login/account - 用户登录',
            'POST /api/login/outLogin - 用户登出',
            'GET /api/currentUser - 获取当前用户信息',
            'GET /api/health - 健康检查',
            // TODO: 添加更多API端点
          ],
        });
      });
    }

    // 前端路由支持（SPA） - 简化处理
    // 这个功能在后续集成前端时再启用
  }

  /**
   * 初始化错误处理
   */
  private initializeErrorHandling(): void {
    // 404错误处理
    this.app.use(notFoundHandler);

    // 全局错误处理
    this.app.use(errorHandler);
  }

  /**
   * 启动服务器
   */
  public listen(): void {
    const { host, port } = this.config.server;

    this.app.listen(port, host, () => {
      console.log(`🚀 Server is running on http://${host}:${port}`);
      console.log(`📊 Environment: ${this.config.server.debug ? 'development' : 'production'}`);
      console.log(`📝 Log level: ${this.config.logging.level}`);

      // 验证配置
      const validation = configManager.validateConfig();
      if (!validation.isValid) {
        console.warn('⚠️  Configuration errors:', validation.errors);
      }
      if (validation.warnings && validation.warnings.length > 0) {
        console.warn('⚠️  Configuration warnings:', validation.warnings);
      }
    });
  }

  /**
   * 获取Express应用实例
   */
  public getApp(): express.Application {
    return this.app;
  }
}

// 创建并导出应用实例
export default new App();