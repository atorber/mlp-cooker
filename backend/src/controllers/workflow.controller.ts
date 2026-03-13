import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { ResponseUtils } from '@/utils/response.utils';

/**
 * 工作流数据类型
 */
interface Workflow {
  id: string;
  name: string;
  description?: string;
  type?: string;
  publishStatus?: string;
  nodes?: any[];
  edges?: any[];
  createdAt: string;
  updatedAt: string;
}

/**
 * 工作流控制器
 * 数据保存在 backend/data/db/workflows.json
 */
export class WorkflowController {
  private static readonly DATA_FILE = path.join(
    __dirname,
    '..',
    '..',
    'data',
    'db',
    'workflows.json'
  );

  /**
   * 读取工作流数据文件
   */
  private static readWorkflowsFile(): Workflow[] {
    try {
      if (fs.existsSync(WorkflowController.DATA_FILE)) {
        const data = fs.readFileSync(WorkflowController.DATA_FILE, 'utf-8');
        return JSON.parse(data) || [];
      }
    } catch (error) {
      console.error('读取工作流数据失败:', error);
    }
    return [];
  }

  /**
   * 写入工作流数据文件
   */
  private static writeWorkflowsFile(workflows: Workflow[]): void {
    try {
      const dir = path.dirname(WorkflowController.DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(
        WorkflowController.DATA_FILE,
        JSON.stringify(workflows, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('写入工作流数据失败:', error);
      throw error;
    }
  }

  /**
   * 生成唯一ID
   */
  private static generateId(): string {
    return `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 查询工作流列表
   */
  public static async list(req: Request, res: Response): Promise<void> {
    try {
      const { pageNumber = 1, pageSize = 10, keyword } = req.query;

      let workflows = WorkflowController.readWorkflowsFile();

      // 过滤关键词
      if (keyword) {
        workflows = workflows.filter((w) =>
          w.name?.toLowerCase().includes(String(keyword).toLowerCase())
        );
      }

      const total = workflows.length;

      // 分页
      const start = (Number(pageNumber) - 1) * Number(pageSize);
      const end = start + Number(pageSize);
      const paginatedWorkflows = workflows.slice(start, end);

      ResponseUtils.success(
        res,
        {
          workflows: paginatedWorkflows,
          total,
          pageNumber: Number(pageNumber),
          pageSize: Number(pageSize),
        },
        '获取工作流列表成功'
      );
    } catch (error) {
      console.error('获取工作流列表失败:', error);
      ResponseUtils.error(res, '获取工作流列表失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 获取工作流详情
   */
  public static async get(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;

      if (!workflowId) {
        ResponseUtils.error(res, '工作流ID不能为空');
        return;
      }

      const workflows = WorkflowController.readWorkflowsFile();
      const workflow = workflows.find((w) => w.id === workflowId);

      if (!workflow) {
        ResponseUtils.error(res, '工作流不存在');
        return;
      }

      ResponseUtils.success(res, workflow, '获取工作流详情成功');
    } catch (error) {
      console.error('获取工作流详情失败:', error);
      ResponseUtils.error(res, '获取工作流详情失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 创建工作流
   */
  public static async create(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, type } = req.body;

      if (!name) {
        ResponseUtils.error(res, '工作流名称不能为空');
        return;
      }

      const workflows = WorkflowController.readWorkflowsFile();
      const now = new Date().toISOString();

      const newWorkflow: Workflow = {
        id: WorkflowController.generateId(),
        name,
        description: description || '',
        type: type || 'workflow',
        publishStatus: 'draft',
        createdAt: now,
        updatedAt: now,
      };

      workflows.push(newWorkflow);
      WorkflowController.writeWorkflowsFile(workflows);

      ResponseUtils.success(res, newWorkflow, '创建工作流成功');
    } catch (error) {
      console.error('创建工作流失败:', error);
      ResponseUtils.error(res, '创建工作流失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 更新工作流
   */
  public static async update(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      const { name, description, publishStatus, nodes, edges } = req.body;

      if (!workflowId) {
        ResponseUtils.error(res, '工作流ID不能为空');
        return;
      }

      const workflows = WorkflowController.readWorkflowsFile();
      const index = workflows.findIndex((w) => w.id === workflowId);

      if (index === -1) {
        ResponseUtils.error(res, '工作流不存在');
        return;
      }

      // 更新工作流信息
      if (name !== undefined) {
        workflows[index].name = name;
      }
      if (description !== undefined) {
        workflows[index].description = description;
      }
      if (publishStatus !== undefined) {
        workflows[index].publishStatus = publishStatus;
      }
      if (nodes !== undefined) {
        workflows[index].nodes = nodes;
      }
      if (edges !== undefined) {
        workflows[index].edges = edges;
      }
      workflows[index].updatedAt = new Date().toISOString();

      WorkflowController.writeWorkflowsFile(workflows);

      ResponseUtils.success(res, workflows[index], '更新工作流成功');
    } catch (error) {
      console.error('更新工作流失败:', error);
      ResponseUtils.error(res, '更新工作流失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 删除工作流
   */
  public static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;

      if (!workflowId) {
        ResponseUtils.error(res, '工作流ID不能为空');
        return;
      }

      const workflows = WorkflowController.readWorkflowsFile();
      const index = workflows.findIndex((w) => w.id === workflowId);

      if (index === -1) {
        ResponseUtils.error(res, '工作流不存在');
        return;
      }

      // 删除工作流
      workflows.splice(index, 1);
      WorkflowController.writeWorkflowsFile(workflows);

      ResponseUtils.success(res, {}, '删除工作流成功');
    } catch (error) {
      console.error('删除工作流失败:', error);
      ResponseUtils.error(res, '删除工作流失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
