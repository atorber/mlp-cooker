import axios, { AxiosInstance } from 'axios';
import { YamlConfigManager } from '@/config/yaml-config';

/**
 * LakeFS 服务类
 * 用于和独立的 LakeFS 实例通过 REST API 交互
 */
export class LakeFSService {
  private configManager = YamlConfigManager.getInstance();

  /**
   * 获取 Axios 实例
   */
  private getClient(): AxiosInstance {
    const config = this.configManager.getLakeFSConfig();
    if (!config.endpoint || !config.accessKeyId || !config.secretAccessKey) {
      throw new Error('LakeFS 配置不完整，请前往系统设置中完善配置');
    }

    // 格式化 endpoint，确保不以 / 结尾
    let baseURL = config.endpoint.trim();
    if (baseURL.endsWith('/')) {
      baseURL = baseURL.slice(0, -1);
    }
    // 确保包含 /api/v1
    if (!baseURL.endsWith('/api/v1')) {
      baseURL = `${baseURL}/api/v1`;
    }

    // Basic Auth
    const authTokens = Buffer.from(`${config.accessKeyId}:${config.secretAccessKey}`).toString('base64');

    return axios.create({
      baseURL,
      headers: {
        'Authorization': `Basic ${authTokens}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 10000,
    });
  }

  /**
   * 获取所有的仓库 (Repositories)
   */
  public async getRepositories(prefix?: string, after?: string, amount?: number) {
    try {
      const client = this.getClient();
      const response = await client.get('/repositories', {
        params: { prefix, after, amount }
      });
      return response.data;
    } catch (error: any) {
      this.handleError(error, '获取仓库列表失败');
    }
  }

  /**
   * 获取指定仓库的分支 (Branches)
   */
  public async getBranches(repository: string, prefix?: string, after?: string, amount?: number) {
    try {
      const client = this.getClient();
      const response = await client.get(`/repositories/${repository}/branches`, {
        params: { prefix, after, amount }
      });
      return response.data;
    } catch (error: any) {
      this.handleError(error, `获取仓库 ${repository} 的分支失败`);
    }
  }

  /**
   * 创建仓库 (Repository)
   */
  public async createRepository(id: string, defaultBranch: string, storageNamespace: string) {
    try {
      const client = this.getClient();
      const response = await client.post('/repositories', {
        name: id,
        default_branch: defaultBranch,
        storage_namespace: storageNamespace
      });
      return response.data;
    } catch (error: any) {
      this.handleError(error, '创建仓库失败');
    }
  }

  /**
   * 获取指定仓库和引用的对象列表 (Objects ls)
   */
  public async listObjects(repository: string, ref: string, prefix?: string, after?: string, amount?: number, delimiter = '/') {
    try {
      const client = this.getClient();
      const response = await client.get(`/repositories/${repository}/refs/${ref}/objects/ls`, {
        params: { prefix, after, amount, delimiter }
      });
      return response.data;
    } catch (error: any) {
      this.handleError(error, `获取目录内容失败`);
    }
  }

  /**
   * 获取指定引用的提交记录 (Commits)
   */
  public async logCommits(repository: string, ref: string, after?: string, amount?: number) {
    try {
      const client = this.getClient();
      const response = await client.get(`/repositories/${repository}/refs/${ref}/commits`, {
        params: { after, amount }
      });
      return response.data;
    } catch (error: any) {
      this.handleError(error, `获取仓库 ${repository} 分支 ${ref} 的提交记录失败`);
    }
  }

  /**
   * 获取对象内容 (如 README.md 的文本内容)
   */
  public async getObject(repository: string, ref: string, path: string) {
    try {
      const client = this.getClient();
      const response = await client.get(`/repositories/${repository}/refs/${ref}/objects`, {
        params: { path },
        responseType: 'text',
      });
      return response.data;
    } catch (error: any) {
      // 404 不抛出异常，通常意味着文件不存在 (例如 README.md)
      if (error.response?.status === 404) {
        return null;
      }
      this.handleError(error, `获取对象内容失败: ${path}`);
    }
  }

  /**
   * 提交分支上的所有未提交更改
   */
  public async commit(repository: string, branch: string, message: string, metadata?: Record<string, string>) {
    try {
      const client = this.getClient();
      const response = await client.post(`/repositories/${repository}/branches/${branch}/commits`, {
        message,
        metadata
      });
      return response.data;
    } catch (error: any) {
      this.handleError(error, `提交仓库 ${repository} 分支 ${branch} 的更改失败`);
    }
  }

  /**
   * 创建新分支
   */
  public async createBranch(repository: string, name: string, source: string) {
    try {
      const client = this.getClient();
      const response = await client.post(`/repositories/${repository}/branches`, {
        name,
        source
      });
      return response.data;
    } catch (error: any) {
      this.handleError(error, `在仓库 ${repository} 创建分支 ${name} 失败`);
    }
  }

  /**
   * 获取分支的未提交更改差异
   */
  public async getBranchDiff(repository: string, branch: string) {
    try {
      const client = this.getClient();
      const response = await client.get(`/repositories/${repository}/branches/${branch}/diff`);
      return response.data;
    } catch (error: any) {
      this.handleError(error, `获取仓库 ${repository} 分支 ${branch} 的差异失败`);
    }
  }

  /**
   * 统一错误处理
   */
  private handleError(error: any, defaultMessage: string): never {
    let message = defaultMessage;
    if (error.response) {
      // 请求已发出，但服务器响应的状态码不在 2xx 范围内
      message = `${defaultMessage}: ${error.response.status} - ${JSON.stringify(error.response.data)}`;
    } else if (error.request) {
      // 请求已发出，但没有收到响应
      message = `${defaultMessage}: 未收到服务器响应，请检查 LakeFS 地址是否正确或网络连接。`;
    } else if (error.message) {
      // 发生了一些错误
      message = `${defaultMessage}: ${error.message}`;
    }
    console.error('[LakeFSService Error]', error);
    throw new Error(message);
  }
}

export const lakefsService = new LakeFSService();
