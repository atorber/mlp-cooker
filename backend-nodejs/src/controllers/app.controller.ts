import { Request, Response } from 'express';
import { ResponseUtils } from '@/utils/response.utils';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 应用模板控制器
 */
export class AppController {
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

      // 读取 data/app 目录下的所有 JSON 文件
      const files = fs.readdirSync(appDir);
      const apps: any[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(appDir, file);
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const appData = JSON.parse(fileContent);
            
            // 从文件名提取应用ID（去掉.json后缀）
            const appId = path.basename(file, '.json');
            
            apps.push({
              id: appId,
              ...appData,
            });
          } catch (error) {
            console.error(`读取应用模板文件 ${file} 失败:`, error);
            // 跳过无效的文件
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

      const filePath = path.join(process.cwd(), 'data', 'app', `${appId}.json`);
      
      if (!fs.existsSync(filePath)) {
        ResponseUtils.error(res, '应用模板不存在');
        return;
      }

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const appData = JSON.parse(fileContent);

      ResponseUtils.success(res, {
        id: appId,
        ...appData,
      }, '获取应用模板详情成功');
    } catch (error) {
      console.error('获取应用模板详情失败:', error);
      ResponseUtils.error(res, '获取应用模板详情失败', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

