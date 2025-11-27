import { Request, Response } from 'express';
import { ResponseUtils } from '@/utils/response.utils';
import { DatabaseFactory } from '@/utils/json-storage';

/**
 * 生成唯一ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * 镜像控制器
 * 使用JSON文件存储数据
 */
export class ImageController {
  /**
   * 获取镜像存储实例
   */
  private static getStorage() {
    return DatabaseFactory.getPresetImagesStorage();
  }

  /**
   * 查询镜像列表
   */
  public static async list(req: Request, res: Response): Promise<void> {
    try {
      const {
        pageNo = 1,
        pageSize = 10,
        name,
        framework,
        chipType,
        applicableScope,
      } = req.query;

      const storage = ImageController.getStorage();
      let images = await storage.load();

      // 过滤
      if (name && typeof name === 'string') {
        images = images.filter((img: any) =>
          img.name?.toLowerCase().includes(name.toLowerCase())
        );
      }

      if (framework && typeof framework === 'string') {
        images = images.filter((img: any) =>
          img.frameworks?.includes(framework)
        );
      }

      if (chipType && typeof chipType === 'string') {
        images = images.filter((img: any) => img.chipType === chipType);
      }

      if (applicableScope && typeof applicableScope === 'string') {
        images = images.filter((img: any) =>
          img.applicableScopes?.includes(applicableScope)
        );
      }

      // 分页
      const total = images.length;
      const page = Number(pageNo);
      const size = Number(pageSize);
      const start = (page - 1) * size;
      const end = start + size;
      const paginatedImages = images.slice(start, end);

      ResponseUtils.success(res, {
        list: paginatedImages,
        total,
        pageNo: page,
        pageSize: size,
      });
    } catch (error) {
      console.error('查询镜像列表失败:', error);
      ResponseUtils.error(res, '查询镜像列表失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 创建镜像
   */
  public static async create(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body;

      // 验证必填字段
      if (!data.name || !data.imageAddress) {
        ResponseUtils.error(res, '镜像名称和镜像地址不能为空');
        return;
      }

      const storage = ImageController.getStorage();
      const images = await storage.load();

      // 检查是否已存在相同名称或imageId的镜像
      const existing = images.find(
        (img: any) => img.name === data.name || img.imageId === data.imageId
      );

      if (existing) {
        ResponseUtils.error(res, '镜像名称或镜像ID已存在');
        return;
      }

      // 创建新镜像
      const newImage = {
        id: generateId(),
        name: data.name,
        imageId: data.imageId || generateId(),
        frameworks: data.frameworks || [],
        applicableScopes: data.applicableScopes || [],
        chipType: data.chipType || 'GPU',
        presetCuda: data.presetCuda || false,
        description: data.description || '',
        imageAddress: data.imageAddress,
        lastUpdateTime: new Date().toISOString(),
        status: data.status || 'pending',
        icon: data.icon,
        introduction: data.introduction,
        paperUrl: data.paperUrl,
        codeUrl: data.codeUrl,
        license: data.license,
        versions: [], // 初始化版本列表
      };

      images.push(newImage);
      await storage.save(images);

      ResponseUtils.success(res, newImage, '创建镜像成功');
    } catch (error) {
      console.error('创建镜像失败:', error);
      ResponseUtils.error(res, '创建镜像失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 获取镜像详情
   */
  public static async get(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        ResponseUtils.error(res, '镜像ID不能为空');
        return;
      }

      const storage = ImageController.getStorage();
      const images = await storage.load();
      const image = images.find((img: any) => img.id === id);

      if (!image) {
        ResponseUtils.error(res, '镜像不存在', { statusCode: 404 });
        return;
      }

      ResponseUtils.success(res, image);
    } catch (error) {
      console.error('获取镜像详情失败:', error);
      ResponseUtils.error(res, '获取镜像详情失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 更新镜像
   */
  public static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data = req.body;

      if (!id) {
        ResponseUtils.error(res, '镜像ID不能为空');
        return;
      }

      const storage = ImageController.getStorage();
      const images = await storage.load();
      const index = images.findIndex((img: any) => img.id === id);

      if (index === -1) {
        ResponseUtils.error(res, '镜像不存在', { statusCode: 404 });
        return;
      }

      // 如果更新名称或imageId，检查是否与其他镜像冲突
      if (data.name || data.imageId) {
        const existing = images.find(
          (img: any, idx: number) =>
            idx !== index &&
            (img.name === data.name || img.imageId === data.imageId)
        );

        if (existing) {
          ResponseUtils.error(res, '镜像名称或镜像ID已存在');
          return;
        }
      }

      // 更新镜像数据（保留原有数据，只更新提供的字段）
      const updatedImage = {
        ...images[index],
        ...data,
        id: images[index].id, // 不允许修改ID
        lastUpdateTime: new Date().toISOString(),
      };

      images[index] = updatedImage;
      await storage.save(images);

      ResponseUtils.success(res, updatedImage, '更新镜像成功');
    } catch (error) {
      console.error('更新镜像失败:', error);
      ResponseUtils.error(res, '更新镜像失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 删除镜像
   */
  public static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        ResponseUtils.error(res, '镜像ID不能为空');
        return;
      }

      const storage = ImageController.getStorage();
      const images = await storage.load();
      const index = images.findIndex((img: any) => img.id === id);

      if (index === -1) {
        ResponseUtils.error(res, '镜像不存在', { statusCode: 404 });
        return;
      }

      images.splice(index, 1);
      await storage.save(images);

      ResponseUtils.success(res, null, '删除镜像成功');
    } catch (error) {
      console.error('删除镜像失败:', error);
      ResponseUtils.error(res, '删除镜像失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 更新镜像状态
   */
  public static async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!id) {
        ResponseUtils.error(res, '镜像ID不能为空');
        return;
      }

      if (!status || !['online', 'offline', 'pending'].includes(status)) {
        ResponseUtils.error(res, '状态值无效，必须是 online、offline 或 pending');
        return;
      }

      const storage = ImageController.getStorage();
      const images = await storage.load();
      const index = images.findIndex((img: any) => img.id === id);

      if (index === -1) {
        ResponseUtils.error(res, '镜像不存在', { statusCode: 404 });
        return;
      }

      images[index].status = status;
      images[index].lastUpdateTime = new Date().toISOString();

      await storage.save(images);

      ResponseUtils.success(res, images[index], '状态更新成功');
    } catch (error) {
      console.error('更新镜像状态失败:', error);
      ResponseUtils.error(res, '更新镜像状态失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 获取镜像版本列表
   */
  public static async listVersions(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        ResponseUtils.error(res, '镜像ID不能为空');
        return;
      }

      const storage = ImageController.getStorage();
      const images = await storage.load();
      const image = images.find((img: any) => img.id === id);

      if (!image) {
        ResponseUtils.error(res, '镜像不存在', { statusCode: 404 });
        return;
      }

      const versions = image.versions || [];

      ResponseUtils.success(res, {
        list: versions,
        total: versions.length,
      });
    } catch (error) {
      console.error('获取镜像版本列表失败:', error);
      ResponseUtils.error(res, '获取镜像版本列表失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 创建镜像版本
   */
  public static async createVersion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data = req.body;

      if (!id) {
        ResponseUtils.error(res, '镜像ID不能为空');
        return;
      }

      // 验证必填字段
      if (!data.version) {
        ResponseUtils.error(res, '版本号不能为空');
        return;
      }

      const storage = ImageController.getStorage();
      const images = await storage.load();
      const index = images.findIndex((img: any) => img.id === id);

      if (index === -1) {
        ResponseUtils.error(res, '镜像不存在', { statusCode: 404 });
        return;
      }

      // 初始化版本列表（如果不存在）
      if (!images[index].versions) {
        images[index].versions = [];
      }

      // 检查版本是否已存在
      const existingVersion = images[index].versions.find(
        (v: any) => v.version === data.version
      );

      if (existingVersion) {
        ResponseUtils.error(res, '版本号已存在');
        return;
      }

      // 创建新版本
      const newVersion = {
        version: data.version,
        imageAddress: data.imageAddress || images[index].imageAddress,
        size: data.size || '',
        pythonVersion: data.pythonVersion || '',
        cudaVersion: data.cudaVersion || '',
        description: data.description || '',
        createTime: data.createTime || new Date().toISOString(),
      };

      images[index].versions.push(newVersion);
      images[index].lastUpdateTime = new Date().toISOString();

      await storage.save(images);

      ResponseUtils.success(res, newVersion, '创建版本成功');
    } catch (error) {
      console.error('创建镜像版本失败:', error);
      ResponseUtils.error(res, '创建镜像版本失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

