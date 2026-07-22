import { Request, Response } from 'express';
import { ResponseUtils } from '@/utils/response.utils';
import { AppTemplateResolver } from '@/utils/app-template-resolver';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 应用控制器
 * 应用元数据保存在 data/app/{appId}/app.json
 * 应用配置参数通过 actions[].templateId 引用模板库中的 template_content
 */
export class AppController {
  private static readonly ACTION_FILES = {
    deploy: 'deploy.json',
    train: 'train.json',
    'create-job': 'create-job.json',
    'deploy-tool': 'deploy-tool.json',
  };

  private static getAppDir() {
    return path.join(process.cwd(), 'data', 'app');
  }

  private static loadCommandFromShell(appDir: string, templateKey?: string) {
    try {
      if (templateKey) {
        const actionCommandPath = path.join(appDir, `${templateKey}.command.sh`);
        if (fs.existsSync(actionCommandPath)) {
          return fs.readFileSync(actionCommandPath, 'utf-8').trim();
        }
      }

      const shPath = path.join(appDir, 'command.sh');
      if (fs.existsSync(shPath)) {
        return fs.readFileSync(shPath, 'utf-8').trim();
      }
    } catch (error) {
      console.error('加载 command.sh 失败:', error);
    }
    return null;
  }

  private static loadLegacyActionTemplate(appPath: string, actionType: string) {
    const templateFileName =
      AppController.ACTION_FILES[actionType as keyof typeof AppController.ACTION_FILES];
    if (!templateFileName) return null;

    const templatePath = path.join(appPath, templateFileName);
    if (!fs.existsSync(templatePath)) return null;

    try {
      const templateData = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));
      const command = AppController.loadCommandFromShell(appPath, actionType);

      if (templateData.taskParams) {
        const template = { ...templateData };
        if (command) template.taskParams.command = command;
        return template;
      }

      const template: Record<string, unknown> = { taskParams: templateData };
      if (command) {
        template.command = command;
        (template.taskParams as Record<string, unknown>).command = command;
      }
      return template;
    } catch (error) {
      console.error(`读取操作模板文件 ${templateFileName} 失败:`, error);
      return null;
    }
  }

  private static async resolveActionTemplates(appId: string, appData: any) {
    const appPath = path.join(AppController.getAppDir(), appId);
    const templates: Record<string, any> = appData.templates ? { ...appData.templates } : {};

    if (!appData.actions || !Array.isArray(appData.actions)) {
      return templates;
    }

    for (const action of appData.actions) {
      const actionType = action.type || action.templateKey;
      const templateKey = action.templateKey || actionType;
      const templateId = Number(action.templateId ?? action.template_id);

      if (templateId) {
        const loaded = await AppTemplateResolver.loadRuntimeTemplate(templateId);
        if (loaded) {
          templates[templateKey] = {
            ...loaded.runtime,
            templateId,
            templateName: loaded.template.name,
          };
          continue;
        }
      }

      const legacyTemplate = AppController.loadLegacyActionTemplate(appPath, actionType);
      if (legacyTemplate) {
        templates[templateKey] = legacyTemplate;
      }
    }

    return templates;
  }

  private static async loadApp(appId: string): Promise<any | null> {
    const appDir = AppController.getAppDir();
    const appPath = path.join(appDir, appId);

    if (fs.existsSync(appPath) && fs.statSync(appPath).isDirectory()) {
      const appJsonPath = path.join(appPath, 'app.json');
      if (!fs.existsSync(appJsonPath)) return null;

      try {
        const appData = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
        const templates = await AppController.resolveActionTemplates(appId, appData);

        return {
          id: appId,
          ...appData,
          templates: Object.keys(templates).length > 0 ? templates : appData.templates,
        };
      } catch (error) {
        console.error(`读取应用模板目录 ${appId}/app.json 失败:`, error);
        return null;
      }
    }

    const oldJsonPath = path.join(appDir, `${appId}.json`);
    if (fs.existsSync(oldJsonPath)) {
      try {
        const appData = JSON.parse(fs.readFileSync(oldJsonPath, 'utf-8'));
        return { id: appId, ...appData };
      } catch (error) {
        console.error(`读取应用模板文件 ${appId}.json 失败:`, error);
        return null;
      }
    }

    return null;
  }

  public static async list(req: Request, res: Response): Promise<void> {
    try {
      const appDir = AppController.getAppDir();
      if (!fs.existsSync(appDir)) {
        ResponseUtils.success(res, []);
        return;
      }

      const apps: any[] = [];
      const processedAppIds = new Set<string>();
      const entries = fs.readdirSync(appDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
        const appData = await AppController.loadApp(entry.name);
        if (appData) {
          apps.push(appData);
          processedAppIds.add(entry.name);
        }
      }

      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.json') || entry.name.startsWith('.')) {
          continue;
        }
        const appId = path.basename(entry.name, '.json');
        if (processedAppIds.has(appId)) continue;
        const appData = await AppController.loadApp(appId);
        if (appData) apps.push(appData);
      }

      ResponseUtils.success(res, apps, '获取应用列表成功');
    } catch (error) {
      console.error('获取应用列表失败:', error);
      ResponseUtils.error(res, '获取应用列表失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  public static async get(req: Request, res: Response): Promise<void> {
    try {
      const { appId } = req.params;
      if (!appId) {
        ResponseUtils.error(res, '应用ID不能为空');
        return;
      }

      const appData = await AppController.loadApp(appId);
      if (!appData) {
        ResponseUtils.error(res, '应用不存在');
        return;
      }

      ResponseUtils.success(res, appData, '获取应用详情成功');
    } catch (error) {
      console.error('获取应用详情失败:', error);
      ResponseUtils.error(res, '获取应用详情失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  public static async create(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, type, categoryType, tags, taskParams, command } = req.body;

      if (!name) {
        ResponseUtils.error(res, '应用名称不能为空');
        return;
      }
      if (!type) {
        ResponseUtils.error(res, '应用类型不能为空');
        return;
      }

      const appId = name
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
        .replace(/^-|-$/g, '');
      const appDir = path.join(AppController.getAppDir(), appId);

      if (fs.existsSync(appDir)) {
        ResponseUtils.error(res, '应用已存在，请使用不同的名称');
        return;
      }

      const actionType =
        type === 'training' ? 'train' : type === 'deployment' ? 'deploy' : 'create-job';

      let parsedTaskParams: Record<string, unknown> = {};
      if (taskParams) {
        if (typeof taskParams === 'string') {
          try {
            parsedTaskParams = JSON.parse(taskParams);
          } catch {
            parsedTaskParams = {};
          }
        } else {
          parsedTaskParams = taskParams;
        }
      }

      const template = await AppTemplateResolver.createAppTemplate({
        name: `${name} - 应用配置`,
        description: description || '',
        actionType,
        config: {
          taskParams: parsedTaskParams,
          command: command ? String(command) : undefined,
          accelerators: {},
        },
        source: 'custom',
      });

      fs.mkdirSync(appDir, { recursive: true });

      const appJson = {
        name,
        description: description || '',
        type,
        categoryType: categoryType || (type === 'training' ? 'model' : 'task'),
        tags: tags || [],
        actions: [
          {
            type: actionType,
            label:
              type === 'training'
                ? '创建训练任务'
                : type === 'deployment'
                  ? '部署推理服务'
                  : '创建任务',
            templateKey: actionType,
            templateId: template.id,
          },
        ],
      };

      fs.writeFileSync(path.join(appDir, 'app.json'), JSON.stringify(appJson, null, 2), 'utf-8');

      ResponseUtils.success(res, { id: appId, ...appJson }, '应用创建成功');
    } catch (error) {
      console.error('创建应用失败:', error);
      ResponseUtils.error(res, '创建应用失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
