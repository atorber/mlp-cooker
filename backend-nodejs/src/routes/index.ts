import { Router } from 'express';
import { AuthController } from '@/controllers/auth.controller';
import { IcafeController } from '@/controllers/icafe.controller';
import { ConfigController } from '@/controllers/config.controller';
import { DatasetController } from '@/controllers/dataset.controller';
import { ModelController } from '@/controllers/model.controller';
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

// TODO: 添加调试路由（暂时移除以简化）

/**
 * iCafe集成相关路由
 */
router.post('/api/icafe-debug', IcafeController.debugIcafe);
router.get('/api/icafe-lastweek', IcafeController.getLastWeekStats);
router.get('/api/icafe-2025h2', IcafeController.get2025H2Stats);
router.get('/api/icafe/card/:sequence', IcafeController.getCardDetails);
router.get('/api/icafe/card/:sequence/history', IcafeController.getCardHistory);
router.post('/api/icafe/query', IcafeController.queryCards);
router.post('/api/icafe/statistics', IcafeController.getStatistics);
router.post('/api/icafe/validate-connection', IcafeController.validateConnection);
router.get('/api/icafe/config', IcafeController.getConfigInfo);

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

export default router;