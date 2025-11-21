import { Router } from 'express';
import { AuthController } from '@/controllers/auth.controller';
import { ConfigController } from '@/controllers/config.controller';
import { DatasetController } from '@/controllers/dataset.controller';
import { ModelController } from '@/controllers/model.controller';
import { ServiceController } from '@/controllers/service.controller';
import { JobController } from '@/controllers/job.controller';
import { AppController } from '@/controllers/app.controller';
import { ResourceController } from '@/controllers/resource.controller';
import { authMiddleware } from '@/middleware/auth.middleware';

/**
 * 路由器
 */
const router = Router();

/**
 * 认证相关路由 - 不需要认证
 */
// 用户登录
router.post('/api/login/account', AuthController.login);

// 用户登出
router.post('/api/login/outLogin', AuthController.logout);

// 获取验证码
router.get('/api/login/captcha', AuthController.captcha);

// 获取当前用户信息 - 需要认证
router.get('/api/currentUser', authMiddleware, AuthController.currentUser);

/**
 * 配置管理相关路由 - 需要认证
 */
router.get('/api/config', authMiddleware, ConfigController.getConfig);
router.post('/api/config/batch', authMiddleware, ConfigController.batchGetConfig);
router.put('/api/config', authMiddleware, ConfigController.updateConfig);
router.post('/api/config/reset', authMiddleware, ConfigController.resetConfig);
router.get('/api/config/validate', authMiddleware, ConfigController.validateConfig);
router.get('/api/config/metadata', authMiddleware, ConfigController.getConfigMetadata);
router.get('/api/config/:key', authMiddleware, ConfigController.getConfigItem);
router.get('/api/environment/info', authMiddleware, ConfigController.getEnvironmentInfo);

/**
 * 健康检查路由
 */
router.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

/**
 * 数据集相关路由
 */
// 查询数据集列表
router.get('/api/datasets', DatasetController.list);

// 查询数据集详情
router.get('/api/datasets/:datasetId', DatasetController.get);

// 查询数据集版本列表
router.get('/api/datasets/:datasetId/versions', DatasetController.listVersions);

// 创建数据集
router.post('/api/datasets', DatasetController.create);

// 删除数据集
router.delete('/api/datasets/:datasetId', DatasetController.delete);

// 创建数据集版本
router.post('/api/datasets/:datasetId/versions', DatasetController.createVersion);

// 删除数据集版本
router.delete('/api/datasets/:datasetId/versions/:versionId', DatasetController.deleteVersion);

/**
 * 模型相关路由
 */
// 查询模型列表
router.get('/api/models', ModelController.list);

// 查询模型详情
router.get('/api/models/:modelId', ModelController.get);

// 查询模型版本列表
router.get('/api/models/:modelId/versions', ModelController.listVersions);

// 创建模型
router.post('/api/models', ModelController.create);

// 删除模型
router.delete('/api/models/:modelId', ModelController.delete);

// 创建模型版本
router.post('/api/models/:modelId/versions', ModelController.createVersion);

// 删除模型版本
router.delete('/api/models/:modelId/versions/:versionId', ModelController.deleteVersion);

/**
 * 服务部署相关路由
 */
// 查询服务列表
router.get('/api/services', authMiddleware, ServiceController.list);

// 查询服务详情
router.get('/api/services/:serviceId', authMiddleware, ServiceController.get);

// 查询服务状态
router.get('/api/services/:serviceId/status', authMiddleware, ServiceController.getStatus);

// 创建服务
router.post('/api/services', authMiddleware, ServiceController.create);

// 删除服务
router.delete('/api/services/:serviceId', authMiddleware, ServiceController.delete);

/**
 * 训练任务相关路由
 */
// 查询训练任务列表
router.post('/api/jobs', authMiddleware, JobController.list);

// 查询训练任务详情
router.get('/api/jobs/:jobId', authMiddleware, JobController.get);

// 创建训练任务
router.post('/api/jobs/create', authMiddleware, JobController.create);

// 停止训练任务
router.post('/api/jobs/:jobId/stop', authMiddleware, JobController.stop);

// 删除训练任务
router.delete('/api/jobs/:jobId', authMiddleware, JobController.delete);

// 查询训练任务事件
router.get('/api/jobs/:jobId/events', authMiddleware, JobController.getEvents);

// 查询训练任务日志
router.get('/api/jobs/:jobId/pods/:podName/logs', authMiddleware, JobController.getLogs);

/**
 * 应用模板相关路由
 */
// 查询应用模板列表
router.get('/api/apps', authMiddleware, AppController.list);

// 查询应用模板详情
router.get('/api/apps/:appId', authMiddleware, AppController.get);

/**
 * 计算资源相关路由
 */
// 查询队列列表
router.get('/api/resources/queues', authMiddleware, ResourceController.listQueues);

// 查询队列详情
router.get('/api/resources/queues/:queueId', authMiddleware, ResourceController.getQueue);

// 查询资源池列表
router.get('/api/resources/pools', authMiddleware, ResourceController.listResourcePools);

// 查询资源池详情
router.get('/api/resources/pools/:resourcePoolId', authMiddleware, ResourceController.getResourcePool);

export default router;