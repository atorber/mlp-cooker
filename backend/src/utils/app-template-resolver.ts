import { DatabaseFactory } from '@/utils/json-storage';
import type { TemplateItem } from '@/controllers/template.controller';

/** 应用 template_content 中保存的配置结构 */
export interface AppTemplateConfig {
  taskParams?: Record<string, unknown>;
  command?: string;
  accelerators?: Record<string, number>;
}

const ACTION_MODULE_MAP: Record<
  string,
  { module: string; sub_module: string; logo_type: string }
> = {
  train: { module: '分布式训练', sub_module: '任务模板', logo_type: 'training' },
  deploy: { module: '在线服务部署', sub_module: '服务模版', logo_type: 'deployment' },
  'deploy-tool': { module: '在线服务部署', sub_module: '服务模版', logo_type: 'deployment' },
  'create-job': { module: '工作流', sub_module: '子任务模板', logo_type: 'default' },
};

export class AppTemplateResolver {
  private static getStorage() {
    return DatabaseFactory.getStorage<TemplateItem>('templates');
  }

  static getActionMeta(actionType: string) {
    return (
      ACTION_MODULE_MAP[actionType] || {
        module: '通用',
        sub_module: '',
        logo_type: 'default',
      }
    );
  }

  static serializeAppConfig(config: AppTemplateConfig): string {
    return JSON.stringify(config, null, 2);
  }

  static parseAppConfig(content?: string): AppTemplateConfig | null {
    const raw = String(content || '').trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return null;

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed.taskParams || parsed.command || parsed.accelerators) {
        return {
          taskParams: (parsed.taskParams as Record<string, unknown>) || {},
          command: parsed.command ? String(parsed.command) : undefined,
          accelerators: (parsed.accelerators as Record<string, number>) || {},
        };
      }
      return {
        taskParams: parsed,
        accelerators: {},
      };
    } catch {
      return null;
    }
  }

  static normalizeLoadedConfig(config: AppTemplateConfig): AppTemplateConfig {
    const taskParams = config.taskParams || {};
    const command =
      config.command ||
      (typeof taskParams.command === 'string' ? taskParams.command : undefined);

    if (command && taskParams.command === undefined) {
      taskParams.command = command;
    }

    return {
      taskParams,
      command,
      accelerators: config.accelerators || {},
    };
  }

  static toRuntimeTemplate(config: AppTemplateConfig) {
    const normalized = AppTemplateResolver.normalizeLoadedConfig(config);
    return {
      taskParams: normalized.taskParams || {},
      command: normalized.command,
      accelerators: normalized.accelerators || {},
    };
  }

  static async findById(templateId: number): Promise<TemplateItem | undefined> {
    const storage = AppTemplateResolver.getStorage();
    return storage.findById(templateId);
  }

  static async loadRuntimeTemplate(templateId: number) {
    const template = await AppTemplateResolver.findById(templateId);
    if (!template?.template_content) return null;

    const config = AppTemplateResolver.parseAppConfig(template.template_content);
    if (!config) return null;

    return {
      template,
      runtime: AppTemplateResolver.toRuntimeTemplate(config),
    };
  }

  static nextTemplateId(templates: TemplateItem[]): number {
    const maxId = templates.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
    return maxId + 1;
  }

  static async createAppTemplate(params: {
    name: string;
    description?: string;
    actionType: string;
    config: AppTemplateConfig;
    source?: 'preset' | 'custom';
  }): Promise<TemplateItem> {
    const storage = AppTemplateResolver.getStorage();
    const templates = await storage.load();
    const meta = AppTemplateResolver.getActionMeta(params.actionType);
    const now = new Date().toISOString();

    const item: TemplateItem = {
      id: AppTemplateResolver.nextTemplateId(templates),
      name: params.name,
      logo_type: meta.logo_type,
      description: params.description || '',
      source: params.source || 'custom',
      module: meta.module,
      sub_module: meta.sub_module || undefined,
      template_content: AppTemplateResolver.serializeAppConfig(
        AppTemplateResolver.normalizeLoadedConfig(params.config),
      ),
      version: '1.0.0',
      created_at: now,
      updated_at: now,
    };

    await storage.append(item);
    return item;
  }
}
