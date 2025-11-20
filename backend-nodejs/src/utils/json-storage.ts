import * as fs from 'fs';
import * as path from 'path';

/**
 * JSON文件存储基类 - 与Python版本完全一致的功能
 */
export class JsonStorage<T> {
  private filePath: string;
  private lockFilePath: string;

  constructor(filePath: string) {
    this.filePath = path.resolve(filePath);
    this.lockFilePath = `${this.filePath}.lock`;
    this.ensureDirectoryExists();
  }

  /**
   * 确保目录存在
   */
  private ensureDirectoryExists(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * 获取文件锁 - 防止并发写入
   */
  private async acquireLock(timeout: number = 5000): Promise<void> {
    const startTime = Date.now();

    while (fs.existsSync(this.lockFilePath)) {
      if (Date.now() - startTime > timeout) {
        // 超时，强制移除锁
        try {
          fs.unlinkSync(this.lockFilePath);
        } catch (error) {
          // 忽略错误，继续执行
        }
        break;
      }
      // 等待锁释放
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 创建锁文件
    fs.writeFileSync(this.lockFilePath, Date.now().toString());
  }

  /**
   * 释放文件锁
   */
  private releaseLock(): void {
    try {
      if (fs.existsSync(this.lockFilePath)) {
        fs.unlinkSync(this.lockFilePath);
      }
    } catch (error) {
      // 忽略错误
    }
  }

  /**
   * 加载数据 - 读取JSON文件
   */
  async load(): Promise<T[]> {
    try {
      if (!fs.existsSync(this.filePath)) {
        return [];
      }

      const content = fs.readFileSync(this.filePath, 'utf8');
      if (!content.trim()) {
        return [];
      }

      return JSON.parse(content) as T[];
    } catch (error) {
      console.error(`❌ 加载JSON文件失败: ${this.filePath}`, error);
      return [];
    }
  }

  /**
   * 保存数据 - 写入JSON文件
   */
  async save(data: T[]): Promise<void> {
    await this.acquireLock();

    try {
      const jsonData = JSON.stringify(data, null, 2);
      fs.writeFileSync(this.filePath, jsonData, 'utf8');
    } finally {
      this.releaseLock();
    }
  }

  /**
   * 添加新数据项
   */
  async append(item: T): Promise<void> {
    const data = await this.load();
    data.push(item);
    await this.save(data);
  }

  /**
   * 根据ID查找数据项
   */
  async findById(id: string | number): Promise<T | undefined> {
    const data = await this.load();
    return data.find((item: any) => item.id === id);
  }

  /**
   * 根据条件查找数据项
   */
  async find(predicate: (item: T) => boolean): Promise<T | undefined> {
    const data = await this.load();
    return data.find(predicate);
  }

  /**
   * 查找所有匹配条件的数据项
   */
  async findAll(predicate: (item: T) => boolean): Promise<T[]> {
    const data = await this.load();
    return data.filter(predicate);
  }

  /**
   * 更新数据项
   */
  async update(id: string | number, updates: Partial<T>): Promise<boolean> {
    await this.acquireLock();

    try {
      const data = await this.load();
      let updated = false;

      for (let i = 0; i < data.length; i++) {
        if ((data[i] as any).id === id) {
          data[i] = { ...data[i], ...updates };
          updated = true;
          break;
        }
      }

      if (updated) {
        await this.save(data);
      }

      return updated;
    } finally {
      this.releaseLock();
    }
  }

  /**
   * 根据条件更新数据项
   */
  async updateWhere(predicate: (item: T) => boolean, updates: Partial<T>): Promise<number> {
    await this.acquireLock();

    try {
      const data = await this.load();
      let updateCount = 0;

      for (let i = 0; i < data.length; i++) {
        if (predicate(data[i])) {
          data[i] = { ...data[i], ...updates };
          updateCount++;
        }
      }

      if (updateCount > 0) {
        await this.save(data);
      }

      return updateCount;
    } finally {
      this.releaseLock();
    }
  }

  /**
   * 删除数据项
   */
  async delete(id: string | number): Promise<boolean> {
    await this.acquireLock();

    try {
      const data = await this.load();
      const originalLength = data.length;
      const filteredData = data.filter((item: any) => item.id !== id);

      if (filteredData.length < originalLength) {
        await this.save(filteredData);
        return true;
      }

      return false;
    } finally {
      this.releaseLock();
    }
  }

  /**
   * 根据条件删除数据项
   */
  async deleteWhere(predicate: (item: T) => boolean): Promise<number> {
    await this.acquireLock();

    try {
      const data = await this.load();
      const originalLength = data.length;
      const filteredData = data.filter(item => !predicate(item));

      const deleteCount = originalLength - filteredData.length;

      if (deleteCount > 0) {
        await this.save(filteredData);
      }

      return deleteCount;
    } finally {
      this.releaseLock();
    }
  }

  /**
   * 获取数据数量
   */
  async count(): Promise<number> {
    const data = await this.load();
    return data.length;
  }

  /**
   * 检查数据是否存在
   */
  async exists(id: string | number): Promise<boolean> {
    const item = await this.findById(id);
    return item !== undefined;
  }

  /**
   * 清空所有数据
   */
  async clear(): Promise<void> {
    await this.save([]);
  }

  /**
   * 备份数据
   */
  async backup(backupPath?: string): Promise<void> {
    const defaultBackupPath = `${this.filePath}.backup.${Date.now()}`;
    const targetPath = backupPath || defaultBackupPath;

    try {
      const content = fs.readFileSync(this.filePath, 'utf8');
      fs.writeFileSync(targetPath, content, 'utf8');
      console.log(`✅ 数据备份成功: ${targetPath}`);
    } catch (error) {
      console.error(`❌ 数据备份失败: ${targetPath}`, error);
      throw error;
    }
  }

  /**
   * 获取文件大小
   */
  async getFileSize(): Promise<number> {
    try {
      if (!fs.existsSync(this.filePath)) {
        return 0;
      }
      const stats = fs.statSync(this.filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * 验证JSON格式
   */
  async validateJson(): Promise<{ isValid: boolean; error?: string }> {
    try {
      await this.load();
      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * 数据库工厂类 - 管理多个数据存储实例
 */
export class DatabaseFactory {
  private static instances: Map<string, JsonStorage<any>> = new Map();

  /**
   * 获取数据存储实例
   */
  static getStorage<T>(name: string): JsonStorage<T> {
    if (!this.instances.has(name)) {
      const filePath = path.join(process.cwd(), 'data', 'db', `${name}.json`);
      const storage = new JsonStorage<T>(filePath);
      this.instances.set(name, storage);
    }

    return this.instances.get(name) as JsonStorage<T>;
  }

  /**
   * 预定义的存储实例
   */
  static get quickAppsStorage(): JsonStorage<any> {
    return this.getStorage('quick_apps');
  }

  static get downloadTasksStorage(): JsonStorage<any> {
    return this.getStorage('download_tasks');
  }

  static get publicDatasetDownloadTasksStorage(): JsonStorage<any> {
    return this.getStorage('public_dataset_download_tasks');
  }

  static get cardComplianceHistoryStorage(): JsonStorage<any> {
    return this.getStorage('card_compliance_history');
  }

  static get testTasksStorage(): JsonStorage<any> {
    return this.getStorage('test_tasks');
  }

  static get imageBuildTasksStorage(): JsonStorage<any> {
    return this.getStorage('image_build_tasks');
  }

  static get fastAppListStorage(): JsonStorage<any> {
    return this.getStorage('fastapplist');
  }

  static get fastTagListStorage(): JsonStorage<any> {
    return this.getStorage('fasttaglist');
  }

  static getPresetImagesStorage(): JsonStorage<any> {
    return this.getStorage('preset_images');
  }
}