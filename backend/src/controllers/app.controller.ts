import { Request, Response } from 'express';
import { ResponseUtils } from '@/utils/response.utils';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 应用模板控制器
 * 
 * 支持多种应用模板结构：
 * 1. 最新结构（目录+分离模板文件）：data/app/{appId}/app.json + {action}.json + {action}.command.sh
 * 2. 新结构（目录方式）：data/app/{appId}/app.json + command.sh + thumbnail.*
 * 3. 旧结构（单文件方式）：data/app/{appId}.json + {appId}.sh（向后兼容）
 */
export class AppController {
  // 支持的操作类型及其对应的文件名
  private static readonly ACTION_FILES = {
    'deploy': 'deploy.json',
    'train': 'train.json',
    'create-job': 'create-job.json',
    'deploy-tool': 'deploy-tool.json',
  };

  /**
   * 从目录中的 command.sh 或 {action}.command.sh 文件加载启动命令
   */
  private static loadCommandFromShell(appDir: string, appData: any, templateKey?: string) {
    try {
      // 优先尝试加载 {action}.command.sh（新结构）
      if (templateKey) {
        const actionCommandPath = path.join(appDir, `${templateKey}.command.sh`);
        if (fs.existsSync(actionCommandPath)) {
          const command = fs.readFileSync(actionCommandPath, 'utf-8').trim();
          return command;
        }
      }

      // 回退到全局 command.sh
      const shPath = path.join(appDir, 'command.sh');
      if (fs.existsSync(shPath)) {
        const command = fs.readFileSync(shPath, 'utf-8').trim();
        return command;
      }
    } catch (error) {
      console.error(`加载 command.sh 失败:`, error);
    }
    return null;
  }

  /**
   * 加载操作模板文件（deploy.json, train.json等）
   */
  private static loadActionTemplate(appPath: string, actionType: string): any | null {
    const templateFileName = AppController.ACTION_FILES[actionType as keyof typeof AppController.ACTION_FILES];
    if (!templateFileName) {
      return null;
    }

    const templatePath = path.join(appPath, templateFileName);
    if (!fs.existsSync(templatePath)) {
      return null;
    }

    try {
      const fileContent = fs.readFileSync(templatePath, 'utf-8');
      const templateData = JSON.parse(fileContent);

      // 加载对应的 command.sh 文件
      const command = AppController.loadCommandFromShell(appPath, null, actionType);

      // 判断模板数据的结构：如果已经有 taskParams，直接使用；否则包装为 taskParams
      let template: any;
      if (templateData.taskParams) {
        // 已经有 taskParams 结构，直接使用
        template = {
          ...templateData,
        };
        if (command) {
          template.taskParams.command = command;
        }
      } else {
        // 没有 taskParams 结构，将整个内容作为 taskParams
        template = {
          taskParams: templateData,
        };
        if (command) {
          template.command = command;
          template.taskParams.command = command;
        }
      }

      return template;
    } catch (error) {
      console.error(`读取操作模板文件 ${templateFileName} 失败:`, error);
      return null;
    }
  }

  /**
   * 加载应用模板（支持新结构和旧结构）
   */
  private static loadApp(appId: string): any | null {
    const appDir = path.join(process.cwd(), 'data', 'app');
    const appPath = path.join(appDir, appId);
    
    // 优先尝试新结构（目录方式）
    if (fs.existsSync(appPath) && fs.statSync(appPath).isDirectory()) {
      const appJsonPath = path.join(appPath, 'app.json');
      if (fs.existsSync(appJsonPath)) {
        try {
          const fileContent = fs.readFileSync(appJsonPath, 'utf-8');
          const appData = JSON.parse(fileContent);
          
          // 如果 app.json 中已经有 templates，直接使用（向后兼容）
          if (appData.templates) {
            // 加载全局 command.sh（如果存在）
            const globalCommand = AppController.loadCommandFromShell(appPath, null);
            if (globalCommand) {
              Object.values(appData.templates).forEach((template: any) => {
                if (template.taskParams && template.taskParams.command !== undefined) {
                  template.taskParams.command = globalCommand;
                }
              });
            }

            return {
              id: appId,
              ...appData,
            };
          }

          // 新结构：从分离的文件加载模板
          // 如果有 actions 配置，根据 actions 加载对应的模板文件
          if (appData.actions && Array.isArray(appData.actions)) {
            const templates: any = {};
            
            for (const action of appData.actions) {
              const actionType = action.type || action.templateKey;
              const templateKey = action.templateKey || actionType;
              
              if (actionType) {
                const template = AppController.loadActionTemplate(appPath, actionType);
                if (template) {
                  templates[templateKey] = template;
                }
              }
            }

            // 如果加载到了模板，合并到 appData
            if (Object.keys(templates).length > 0) {
              appData.templates = templates;
            }
          }

          // 如果没有 actions 或加载失败，尝试加载所有支持的操作类型
          if (!appData.templates || Object.keys(appData.templates).length === 0) {
            const templates: any = {};
            for (const [actionType, fileName] of Object.entries(AppController.ACTION_FILES)) {
              const templatePath = path.join(appPath, fileName);
              if (fs.existsSync(templatePath)) {
                const template = AppController.loadActionTemplate(appPath, actionType);
                if (template) {
                  templates[actionType] = template;
                }
              }
            }
            
            if (Object.keys(templates).length > 0) {
              appData.templates = templates;
              
              // 自动生成 actions 配置
              if (!appData.actions) {
                appData.actions = Object.keys(templates).map(key => ({
                  type: key,
                  label: key === 'deploy' ? '部署推理服务' : 
                         key === 'train' ? '创建训练任务' : 
                         key === 'create-job' ? '创建任务' : 
                         key === 'deploy-tool' ? '部署工具' : key,
                  templateKey: key,
                }));
              }
            }
          }
          
          return {
            id: appId,
            ...appData,
          };
        } catch (error) {
          console.error(`读取应用模板目录 ${appId}/app.json 失败:`, error);
          return null;
        }
      }
    }
    
    // 回退到旧结构（单文件方式，向后兼容）
    const oldJsonPath = path.join(appDir, `${appId}.json`);
    if (fs.existsSync(oldJsonPath)) {
      try {
        const fileContent = fs.readFileSync(oldJsonPath, 'utf-8');
        const appData = JSON.parse(fileContent);
        
        // 尝试加载 {appId}.sh（旧方式）
        const oldShPath = path.join(appDir, `${appId}.sh`);
        if (fs.existsSync(oldShPath)) {
          const command = fs.readFileSync(oldShPath, 'utf-8').trim();
          if (appData.templates) {
            Object.values(appData.templates).forEach((template: any) => {
              if (template.taskParams && template.taskParams.command !== undefined) {
                template.taskParams.command = command;
              }
            });
          }
          if (appData.template && appData.template.taskParams) {
            appData.template.taskParams.command = command;
          }
        }
        
        return {
          id: appId,
          ...appData,
        };
      } catch (error) {
        console.error(`读取应用模板文件 ${appId}.json 失败:`, error);
        return null;
      }
    }
    
    return null;
  }

  /**
   * 获取应用模板列表
   */
  public static async list(req: Request, res: Response): Promise<void> {
    try {
      const appDir = path.join(process.cwd(), 'data', 'app');

      // 如果目录不存在，返回空列表
      if (!fs.existsSync(appDir)) {
        ResponseUtils.success(res, []);
        return;
      }

      const apps: any[] = [];
      const processedAppIds = new Set<string>();
      const entries = fs.readdirSync(appDir, { withFileTypes: true });

      // 先处理目录（新结构，优先级高）
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const appId = entry.name;
          
          // 跳过隐藏目录
          if (appId.startsWith('.')) {
            continue;
          }
          
          const appData = AppController.loadApp(appId);
          if (appData) {
            apps.push(appData);
            processedAppIds.add(appId);
          }
        }
      }

      // 再处理 JSON 文件（旧结构，向后兼容，但跳过已有目录的应用）
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.json')) {
          const appId = path.basename(entry.name, '.json');
          
          // 跳过隐藏文件和系统文件
          if (appId.startsWith('.')) {
            continue;
          }
          
          // 如果已经处理过（存在目录），跳过
          if (processedAppIds.has(appId)) {
            continue;
          }
          
          const appData = AppController.loadApp(appId);
          if (appData) {
            apps.push(appData);
            processedAppIds.add(appId);
          }
        }
      }

      ResponseUtils.success(res, apps, '获取应用模板列表成功');
    } catch (error) {
      console.error('获取应用模板列表失败:', error);
      ResponseUtils.error(res, '获取应用模板列表失败', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 获取应用模板详情
   */
  public static async get(req: Request, res: Response): Promise<void> {
    try {
      const { appId } = req.params;

      if (!appId) {
        ResponseUtils.error(res, '应用ID不能为空');
        return;
      }

      const appData = AppController.loadApp(appId);

      if (!appData) {
        ResponseUtils.error(res, '应用模板不存在');
        return;
      }

      ResponseUtils.success(res, appData, '获取应用模板详情成功');
    } catch (error) {
      console.error('获取应用模板详情失败:', error);
      ResponseUtils.error(res, '获取应用模板详情失败', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

