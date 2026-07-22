import { Request, Response } from 'express';
import { ResponseUtils } from '@/utils/response.utils';
import { DatabaseFactory } from '@/utils/json-storage';

export interface TemplateTag {
  code: string;
  level: number;
  name: string;
}

export interface TemplateItem {
  id: number;
  name: string;
  logo_type: string;
  description?: string;
  doc_url?: string;
  source: 'preset' | 'custom';
  module: string;
  sub_module?: string;
  tags?: TemplateTag[];
  template_content?: string;
  version?: string;
  created_at: string;
  updated_at: string;
}

const MODULE_OPTIONS = ['通用', '资源池', '分布式训练', '在线服务部署', '开发机', '工作流'] as const;

const SUB_MODULES_BY_MODULE: Record<string, string[]> = {
  通用: [],
  资源池: ['资源套餐模板'],
  分布式训练: ['任务模板'],
  在线服务部署: ['服务模版'],
  开发机: [],
  工作流: ['工作流模板', '子任务模板'],
};

/**
 * 模板管理控制器
 * 数据保存在 backend/data/db/templates.json
 */
export class TemplateController {
  private static getStorage() {
    return DatabaseFactory.getStorage<TemplateItem>('templates');
  }

  private static normalizeTags(tags: unknown): TemplateTag[] {
    if (!Array.isArray(tags)) return [];
    return tags
      .map((tag) => {
        if (typeof tag === 'string') {
          return { code: tag, level: 1, name: tag };
        }
        if (tag && typeof tag === 'object') {
          const t = tag as Record<string, unknown>;
          const code = String(t.code ?? t.name ?? '').trim();
          if (!code) return null;
          return {
            code,
            level: Number(t.level ?? 1) || 1,
            name: String(t.name ?? code),
          };
        }
        return null;
      })
      .filter((tag): tag is TemplateTag => tag !== null);
  }

  private static nextId(templates: TemplateItem[]): number {
    const maxId = templates.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
    return maxId + 1;
  }

  private static looksLikeMarkdown(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed) return false;
    if (/^<!DOCTYPE/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) return false;
    if (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('apiVersion:')) {
      return false;
    }
    return /^#{1,6}\s|^\*\*[^*]+\*\*|^-\s|^\d+\.\s|^```/m.test(trimmed);
  }

  /** 子模块仅存 `/` 后的名称；兼容历史 `模块/子模块` 格式 */
  private static normalizeSubModule(module: string, subModule?: string): string | undefined {
    const raw = String(subModule || '').trim();
    if (!raw) return undefined;

    let suffix = raw;
    if (raw.includes('/')) {
      const [prefix, ...rest] = raw.split('/');
      suffix = rest.join('/').trim();
      if (!suffix && prefix) suffix = prefix.trim();
    }

    const allowed = SUB_MODULES_BY_MODULE[module] || [];
    if (allowed.length > 0 && suffix && !allowed.includes(suffix)) {
      throw new Error(`子模块「${suffix}」不属于功能模块「${module}」`);
    }

    return suffix || undefined;
  }

  private static isMarkdownUrl(url: string): boolean {
    try {
      const pathname = new URL(url).pathname.toLowerCase();
      return pathname.endsWith('.md') || pathname.endsWith('.markdown');
    } catch {
      return url.toLowerCase().includes('.md');
    }
  }

  private static filterTemplates(
    templates: TemplateItem[],
    query: Record<string, unknown>,
  ): TemplateItem[] {
    const keyword = String(query.keyword || '').trim().toLowerCase();
    const module = String(query.module || '').trim();
    const source = String(query.source || '').trim();
    const tag = String(query.tag || '').trim().toLowerCase();

    return templates.filter((item) => {
      if (module && item.module !== module) return false;
      if (source && item.source !== source) return false;
      if (tag) {
        const matched = (item.tags || []).some(
          (t) =>
            t.code.toLowerCase() === tag ||
            t.name.toLowerCase().includes(tag),
        );
        if (!matched) return false;
      }
      if (keyword) {
        const haystack = [
          item.name,
          item.description,
          item.sub_module,
          ...(item.tags || []).map((t) => `${t.code} ${t.name}`),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }
      return true;
    });
  }

  /**
   * 查询模板列表
   */
  public static async list(req: Request, res: Response): Promise<void> {
    try {
      const { pageNo = 1, pageSize = 12 } = req.query;
      const storage = TemplateController.getStorage();
      let templates = await storage.load();
      templates = TemplateController.filterTemplates(templates, req.query as Record<string, unknown>);

      const total = templates.length;
      const page = Math.max(1, Number(pageNo));
      const size = Math.max(1, Number(pageSize));
      const start = (page - 1) * size;
      const list = templates.slice(start, start + size);

      ResponseUtils.success(res, { list, total, pageNo: page, pageSize: size });
    } catch (error) {
      console.error('查询模板列表失败:', error);
      ResponseUtils.error(res, '查询模板列表失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 查询模板详情
   */
  public static async get(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      if (!id) {
        ResponseUtils.error(res, '模板ID不能为空');
        return;
      }

      const storage = TemplateController.getStorage();
      const template = await storage.findById(id);
      if (!template) {
        ResponseUtils.error(res, '模板不存在');
        return;
      }

      ResponseUtils.success(res, template);
    } catch (error) {
      console.error('查询模板详情失败:', error);
      ResponseUtils.error(res, '查询模板详情失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 创建自定义模板
   */
  public static async create(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body || {};
      const name = String(body.name || '').trim();
      const module = String(body.module || '').trim();

      if (!name) {
        ResponseUtils.error(res, '模板名称不能为空');
        return;
      }
      if (!module) {
        ResponseUtils.error(res, '所属功能模块不能为空');
        return;
      }
      if (!MODULE_OPTIONS.includes(module as (typeof MODULE_OPTIONS)[number])) {
        ResponseUtils.error(res, '所属功能模块不合法');
        return;
      }

      const storage = TemplateController.getStorage();
      const templates = await storage.load();
      const now = new Date().toISOString();

      let subModule: string | undefined;
      try {
        subModule = TemplateController.normalizeSubModule(module, body.sub_module);
      } catch (error) {
        ResponseUtils.error(
          res,
          error instanceof Error ? error.message : '子模块不合法',
        );
        return;
      }

      const newTemplate: TemplateItem = {
        id: TemplateController.nextId(templates),
        name,
        logo_type: String(body.logo_type || 'default').trim() || 'default',
        description: String(body.description || '').trim(),
        doc_url: String(body.doc_url || '').trim(),
        source: 'custom',
        module,
        sub_module: subModule,
        tags: TemplateController.normalizeTags(body.tags),
        template_content: String(body.template_content || '').trim() || undefined,
        version: String(body.version || '1.0.0').trim() || '1.0.0',
        created_at: now,
        updated_at: now,
      };

      await storage.append(newTemplate);
      ResponseUtils.success(res, newTemplate, '模板创建成功');
    } catch (error) {
      console.error('创建模板失败:', error);
      ResponseUtils.error(res, '创建模板失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 更新自定义模板
   */
  public static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      if (!id) {
        ResponseUtils.error(res, '模板ID不能为空');
        return;
      }

      const storage = TemplateController.getStorage();
      const existing = await storage.findById(id);
      if (!existing) {
        ResponseUtils.error(res, '模板不存在');
        return;
      }
      if (existing.source === 'preset') {
        ResponseUtils.error(res, '预置模板不允许修改');
        return;
      }

      const body = req.body || {};
      const updates: Partial<TemplateItem> = {
        updated_at: new Date().toISOString(),
      };

      if (body.name !== undefined) updates.name = String(body.name).trim();
      if (body.logo_type !== undefined) updates.logo_type = String(body.logo_type).trim();
      if (body.description !== undefined) updates.description = String(body.description).trim();
      if (body.doc_url !== undefined) updates.doc_url = String(body.doc_url).trim();

      const nextModule =
        body.module !== undefined ? String(body.module).trim() : existing.module;
      if (body.module !== undefined) {
        if (!MODULE_OPTIONS.includes(nextModule as (typeof MODULE_OPTIONS)[number])) {
          ResponseUtils.error(res, '所属功能模块不合法');
          return;
        }
        updates.module = nextModule;
      }
      if (body.sub_module !== undefined || body.module !== undefined) {
        try {
          const subModuleInput =
            body.sub_module !== undefined ? body.sub_module : existing.sub_module;
          updates.sub_module = TemplateController.normalizeSubModule(nextModule, subModuleInput);
        } catch (error) {
          ResponseUtils.error(
            res,
            error instanceof Error ? error.message : '子模块不合法',
          );
          return;
        }
      }
      if (body.template_content !== undefined) {
        updates.template_content = String(body.template_content).trim() || undefined;
      }
      if (body.version !== undefined) updates.version = String(body.version).trim();
      if (body.tags !== undefined) updates.tags = TemplateController.normalizeTags(body.tags);

      const updated = await storage.update(id, updates);
      if (!updated) {
        ResponseUtils.error(res, '模板更新失败');
        return;
      }

      const template = await storage.findById(id);
      ResponseUtils.success(res, template, '模板更新成功');
    } catch (error) {
      console.error('更新模板失败:', error);
      ResponseUtils.error(res, '更新模板失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 删除自定义模板
   */
  public static async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      if (!id) {
        ResponseUtils.error(res, '模板ID不能为空');
        return;
      }

      const storage = TemplateController.getStorage();
      const existing = await storage.findById(id);
      if (!existing) {
        ResponseUtils.error(res, '模板不存在');
        return;
      }
      if (existing.source === 'preset') {
        ResponseUtils.error(res, '预置模板不允许删除');
        return;
      }

      await storage.delete(id);
      ResponseUtils.success(res, {}, '模板删除成功');
    } catch (error) {
      console.error('删除模板失败:', error);
      ResponseUtils.error(res, '删除模板失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 获取模块与标签元数据（供前端筛选项使用）
   */
  public static async metadata(_req: Request, res: Response): Promise<void> {
    try {
      const storage = TemplateController.getStorage();
      const templates = await storage.load();
      const tagMap = new Map<string, TemplateTag>();

      for (const item of templates) {
        for (const tag of item.tags || []) {
          if (!tagMap.has(tag.code)) {
            tagMap.set(tag.code, tag);
          }
        }
      }

      ResponseUtils.success(res, {
        modules: [...MODULE_OPTIONS],
        subModulesByModule: SUB_MODULES_BY_MODULE,
        sources: ['preset', 'custom'],
        tags: Array.from(tagMap.values()),
      });
    } catch (error) {
      console.error('获取模板元数据失败:', error);
      ResponseUtils.error(res, '获取模板元数据失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 拉取远程文档内容，供前端 Markdown 预览（规避浏览器 CORS）
   */
  public static async previewDoc(req: Request, res: Response): Promise<void> {
    const url = String(req.query.url || '').trim();
    if (!url) {
      ResponseUtils.error(res, '文档地址不能为空');
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      ResponseUtils.error(res, '仅支持 http/https 文档地址');
      return;
    }

    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'text/markdown,text/plain,text/html,*/*',
          'User-Agent': 'mlp-cooker-template-preview/1.0',
        },
        redirect: 'follow',
      });

      if (!response.ok) {
        ResponseUtils.error(res, `获取文档失败: HTTP ${response.status}`);
        return;
      }

      const contentType = response.headers.get('content-type') || '';
      const content = await response.text();
      const isMarkdown =
        TemplateController.isMarkdownUrl(url) ||
        contentType.includes('markdown') ||
        TemplateController.looksLikeMarkdown(content);

      ResponseUtils.success(res, {
        url,
        content,
        contentType,
        isMarkdown,
      });
    } catch (error) {
      console.error('获取文档预览失败:', error);
      ResponseUtils.error(res, '获取文档预览失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
