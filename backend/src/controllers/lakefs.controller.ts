import { Request, Response } from 'express';
import { ResponseUtils } from '@/utils/response.utils';
import { lakefsService } from '@/services/lakefs.service';

/**
 * LakeFS 控制器
 */
export class LakeFSController {
  
  /**
   * 获取仓库列表
   */
  public static async getRepositories(req: Request, res: Response): Promise<void> {
    try {
      const { prefix, after, amount } = req.query;
      const data = await lakefsService.getRepositories(
        prefix as string,
        after as string,
        amount ? Number(amount) : undefined
      );
      ResponseUtils.success(res, data, '获取仓库列表成功');
    } catch (error: any) {
      console.error('获取仓库列表失败:', error);
      ResponseUtils.error(res, error.message || '获取仓库列表失败');
    }
  }

  /**
   * 创建仓库
   */
  public static async createRepository(req: Request, res: Response): Promise<void> {
    try {
      const { id, defaultBranch, storageNamespace } = req.body;
      if (!id || !storageNamespace) {
        ResponseUtils.error(res, '仓库名称和存储命名空间不能为空');
        return;
      }
      const data = await lakefsService.createRepository(id, defaultBranch || 'main', storageNamespace);
      ResponseUtils.success(res, data, '创建仓库成功');
    } catch (error: any) {
      console.error('创建仓库失败:', error);
      ResponseUtils.error(res, error.message || '创建仓库失败');
    }
  }

  /**
   * 获取指定仓库的分支
   */
  public static async getBranches(req: Request, res: Response): Promise<void> {
    try {
      const { repository } = req.params;
      const { prefix, after, amount } = req.query;
      const data = await lakefsService.getBranches(
        repository,
        prefix as string,
        after as string,
        amount ? Number(amount) : undefined
      );
      ResponseUtils.success(res, data, `获取仓库 ${repository} 分支成功`);
    } catch (error: any) {
      console.error(`获取仓库 ${req.params.repository} 分支失败:`, error);
      ResponseUtils.error(res, error.message || `获取仓库分支失败`);
    }
  }

  /**
   * 获取指定仓库和引用的对象列表 (例如某个分支下的文件)
   */
  public static async listObjects(req: Request, res: Response): Promise<void> {
    try {
      const { repository, ref } = req.params;
      const { prefix, after, amount, delimiter } = req.query;
      const data = await lakefsService.listObjects(
        repository,
        ref,
        prefix as string,
        after as string,
        amount ? Number(amount) : undefined,
        delimiter ? String(delimiter) : '/'
      );
      ResponseUtils.success(res, data, `获取目录内容成功`);
    } catch (error: any) {
      console.error(`获取对象列表失败:`, error);
      ResponseUtils.error(res, error.message || `获取对象列表失败`);
    }
  }

  /**
   * 获取指定仓库和引用的提交记录 (Commits)
   */
  public static async logCommits(req: Request, res: Response): Promise<void> {
    try {
      const { repository, ref } = req.params;
      const { after, amount } = req.query;
      const data = await lakefsService.logCommits(
        repository,
        ref,
        after as string,
        amount ? Number(amount) : undefined
      );
      ResponseUtils.success(res, data, `获取提交记录成功`);
    } catch (error: any) {
      console.error(`获取提交记录失败:`, error);
      ResponseUtils.error(res, error.message || `获取提交记录失败`);
    }
  }

  /**
   * 获取指定对象内容 (专用于文本内容探测如 README)
   */
  public static async getObjectContent(req: Request, res: Response): Promise<void> {
    try {
      const { repository, ref } = req.params;
      const { path } = req.query;
      if (!path) {
        ResponseUtils.error(res, `缺少文件路径参数`);
        return;
      }
      const data = await lakefsService.getObject(repository, ref, path as string);
      ResponseUtils.success(res, data, `获取对象内容成功`);
    } catch (error: any) {
      console.error(`获取对象内容失败:`, error);
      ResponseUtils.error(res, error.message || `获取对象内容失败`);
    }
  }

  /**
   * 提交分支未提交的更改
   */
  public static async commitChanges(req: Request, res: Response): Promise<void> {
    try {
      const { repository, branch } = req.params;
      const { message, metadata } = req.body;

      if (!message) {
        ResponseUtils.error(res, `提交信息不能为空`);
        return;
      }

      const data = await lakefsService.commit(repository, branch, message, metadata);
      ResponseUtils.success(res, data, `提交成功`);
    } catch (error: any) {
      console.error(`提交更改失败:`, error);
      ResponseUtils.error(res, error.message || `提交更改失败`);
    }
  }

  /**
   * 创建新分支
   */
  public static async createBranch(req: Request, res: Response): Promise<void> {
    try {
      const { repository } = req.params;
      const { name, source } = req.body;

      if (!name || !source) {
        ResponseUtils.error(res, `分支名称和来源分支不能为空`);
        return;
      }

      const data = await lakefsService.createBranch(repository, name, source);
      ResponseUtils.success(res, data, `分支创建成功`);
    } catch (error: any) {
      console.error(`创建分支失败:`, error);
      ResponseUtils.error(res, error.message || `创建分支失败`);
    }
  }

  /**
   * 获取分支的未提交更改差异
   */
  public static async getBranchDiff(req: Request, res: Response): Promise<void> {
    try {
      const { repository, branch } = req.params;
      const data = await lakefsService.getBranchDiff(repository, branch);
      ResponseUtils.success(res, data, `获取分支差异成功`);
    } catch (error: any) {
      console.error(`获取分支差异失败:`, error);
      ResponseUtils.error(res, error.message || `获取分支差异失败`);
    }
  }

}
