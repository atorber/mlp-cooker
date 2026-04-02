import { Router } from 'express';
import { AuthController } from '@/controllers/auth.controller';
import { ConfigController } from '@/controllers/config.controller';
import { DatasetController } from '@/controllers/dataset.controller';
import { ModelController } from '@/controllers/model.controller';
import { ServiceController } from '@/controllers/service.controller';
import { JobController } from '@/controllers/job.controller';
import { AppController } from '@/controllers/app.controller';
import { ResourceController } from '@/controllers/resource.controller';
import { StorageController } from '@/controllers/storage.controller';
import { TaskController } from '@/controllers/task.controller';
import { ImageController } from '@/controllers/image.controller';
import { WorkflowController } from '@/controllers/workflow.controller';
import { LakeFSController } from '@/controllers/lakefs.controller';
import { DevInstanceController } from '@/controllers/dev-instance.controller';
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
router.get('/api/datasets', authMiddleware, DatasetController.list);

// 查询数据集详情
router.get('/api/datasets/:datasetId', authMiddleware, DatasetController.get);

// 查询数据集版本列表
router.get('/api/datasets/:datasetId/versions', authMiddleware, DatasetController.listVersions);

// 创建数据集
router.post('/api/datasets', authMiddleware, DatasetController.create);

// 删除数据集
router.delete('/api/datasets/:datasetId', authMiddleware, DatasetController.delete);

// 创建数据集版本
router.post('/api/datasets/:datasetId/versions', authMiddleware, DatasetController.createVersion);

// 删除数据集版本
router.delete('/api/datasets/:datasetId/versions/:versionId', authMiddleware, DatasetController.deleteVersion);

// 获取数据集单个文件访问 URL（预签名，用于下载）
router.get('/api/datasets/:datasetId/files/access-url', authMiddleware, DatasetController.getFileAccessUrl);
// 获取数据集文本文件内容（用于前端预览）
router.get('/api/datasets/:datasetId/files/content', authMiddleware, DatasetController.getFileContent);
// 获取数据集文件列表（BOS存储）
router.get('/api/datasets/:datasetId/files', authMiddleware, DatasetController.listFiles);
// Lance 格式检测
router.get('/api/datasets/:datasetId/lance-check', authMiddleware, DatasetController.checkLance);
// Lance 数据集 SQL 查询
router.post('/api/datasets/:datasetId/query', authMiddleware, DatasetController.queryLance);

/**
 * 模型相关路由
 */
// 查询模型列表
router.get('/api/models', authMiddleware, ModelController.list);

// 查询模型详情
router.get('/api/models/:modelId', authMiddleware, ModelController.get);

// 查询模型版本列表
router.get('/api/models/:modelId/versions', authMiddleware, ModelController.listVersions);

// 创建模型
router.post('/api/models', authMiddleware, ModelController.create);

// 删除模型
router.delete('/api/models/:modelId', authMiddleware, ModelController.delete);

// 创建模型版本
router.post('/api/models/:modelId/versions', authMiddleware, ModelController.createVersion);

// 删除模型版本
router.delete('/api/models/:modelId/versions/:versionId', authMiddleware, ModelController.deleteVersion);

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

// 获取训练任务 Web Terminal 地址
router.get('/api/jobs/:jobId/pods/:podName/webterminal', authMiddleware, JobController.getWebTerminal);

/**
 * 任务相关路由（批量任务，自动过滤包含 task- 关键字的 job）
 */
// 查询任务列表
router.post('/api/tasks', authMiddleware, TaskController.list);

/**
 * 开发机相关路由
 */
router.post('/api/dev-instances', authMiddleware, DevInstanceController.list);
router.get('/api/dev-instances/:id', authMiddleware, DevInstanceController.get);
router.post('/api/dev-instances/create', authMiddleware, DevInstanceController.create);
router.post('/api/dev-instances/:id/stop', authMiddleware, DevInstanceController.stop);
router.delete('/api/dev-instances/:id', authMiddleware, DevInstanceController.delete);

/**
 * 应用模板相关路由
 */
// 查询应用模板列表
router.get('/api/apps', authMiddleware, AppController.list);

// 查询应用模板详情
router.get('/api/apps/:appId', authMiddleware, AppController.get);

// 创建应用模板（从训练任务导入）
router.post('/api/apps/create', authMiddleware, AppController.create);

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

/**
 * 存储管理（对象桶 / PFS 浏览）
 */
router.get('/api/storage/buckets', authMiddleware, StorageController.listBuckets);
router.get('/api/storage/bucket/files', authMiddleware, StorageController.listBucketFiles);
router.get('/api/storage/pfs/files', authMiddleware, StorageController.listPfsFiles);

/**
 * 镜像相关路由 - 需要认证
 */
// 查询镜像列表
router.get('/api/images', authMiddleware, ImageController.list);

// 创建镜像
router.post('/api/images', authMiddleware, ImageController.create);

// 查询镜像详情
router.get('/api/images/:id', authMiddleware, ImageController.get);

// 更新镜像
router.put('/api/images/:id', authMiddleware, ImageController.update);

// 删除镜像
router.delete('/api/images/:id', authMiddleware, ImageController.delete);

// 更新镜像状态
router.put('/api/images/:id/status', authMiddleware, ImageController.updateStatus);

// 查询镜像版本列表
router.get('/api/images/:id/versions', authMiddleware, ImageController.listVersions);

// 创建镜像版本
router.post('/api/images/:id/versions', authMiddleware, ImageController.createVersion);

/**
 * 工作流相关路由
 */
// 查询工作流列表
router.get('/api/workflows', WorkflowController.list);

// 查询工作流详情
router.get('/api/workflows/:workflowId', WorkflowController.get);

// 创建工作流
router.post('/api/workflows', WorkflowController.create);

// 更新工作流
router.put('/api/workflows/:workflowId', WorkflowController.update);

// 删除工作流
router.delete('/api/workflows/:workflowId', WorkflowController.delete);

/**
 * LakeFS 相关路由 - 需要认证
 */
// 查询仓库列表
router.get('/api/lakefs/repositories', authMiddleware, LakeFSController.getRepositories);
// 创建仓库
router.post('/api/lakefs/repositories', authMiddleware, LakeFSController.createRepository);
// 查询仓库分支列表
router.get('/api/lakefs/repositories/:repository/branches', authMiddleware, LakeFSController.getBranches);
// 创建新分支
router.post('/api/lakefs/repositories/:repository/branches', authMiddleware, LakeFSController.createBranch);
// 查询分支未提交更改 (Diff)
router.get('/api/lakefs/repositories/:repository/branches/:branch/diff', authMiddleware, LakeFSController.getBranchDiff);
// 查询对象列表（文件与目录）
router.get('/api/lakefs/repositories/:repository/refs/:ref/objects/ls', authMiddleware, LakeFSController.listObjects);
// 获取特定文件内容
router.get('/api/lakefs/repositories/:repository/refs/:ref/objects/content', authMiddleware, LakeFSController.getObjectContent);
// 查询提交记录 (Commits)
router.get('/api/lakefs/repositories/:repository/refs/:ref/commits', authMiddleware, LakeFSController.logCommits);
// 提交分支上的更改 (Commit)
router.post('/api/lakefs/repositories/:repository/branches/:branch/commits', authMiddleware, LakeFSController.commitChanges);

export default router;