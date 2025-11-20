import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { YamlConfigManager } from '@/config/yaml-config';
import { IcafeCard, IcafeCardHistory, IcafeQueryParams, IcafeStatistics } from '@/models/icafe.model';
import { BaseService } from '@/utils/sdk/base.service';

/**
 * iCafe API SDK - 与Python版本功能完全一致
 */
export class IcafeSDK extends BaseService {
  private httpClient: AxiosInstance;
  private config: any;

  constructor() {
    super('IcafeSDK');
    this.config = YamlConfigManager.getInstance();
    this.httpClient = this.createHttpClient();
  }

  /**
   * 创建HTTP客户端
   */
  private createHttpClient(): AxiosInstance {
    const icafeConfig = this.config.getIcafeConfig();

    const baseURL = process.env.ICAFE_BASE_URL || 'http://icafeapi.baidu-int.com';
    const spacePrefixCode = process.env.ICAFE_SPACE_PREFIX_CODE || 'aihc-customer';

    const client = axios.create({
      baseURL: `${baseURL}/api/spaces/${spacePrefixCode}`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 添加请求拦截器 - 自动添加认证参数
    client.interceptors.request.use(
      (config) => {
        // 在URL中添加认证参数（与Python版本一致）
        if (config.params) {
          config.params.u = icafeConfig.username;
          config.params.pw = icafeConfig.password;
        } else {
          config.params = {
            u: icafeConfig.username,
            pw: icafeConfig.password,
          };
        }
        return config;
      },
      (error) => {
        console.error('iCafe SDK request error:', error);
        return Promise.reject(error);
      }
    );

    // 添加响应拦截器
    client.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        console.error('iCafe SDK response error:', error);
        return Promise.reject(this.handleApiError(error));
      }
    );

    return client;
  }

  /**
   * 处理API错误
   */
  private handleApiError(error: any): Error {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      if (status === 401) {
        return new Error('iCafe认证失败，请检查用户名和密码');
      }

      if (status === 404) {
        return new Error('请求的资源不存在');
      }

      if (status === 500) {
        return new Error('iCafe服务器内部错误');
      }

      if (data && data.error) {
        return new Error(`iCafe API错误: ${data.error}`);
      }
    }

    if (error.code === 'ECONNABORTED') {
      return new Error('iCafe API连接超时');
    }

    if (error.code === 'ENOTFOUND') {
      return new Error('iCafe API服务器地址无效');
    }

    return new Error(`iCafe API请求失败: ${error.message}`);
  }

  /**
   * 根据IQL查询获取卡片列表
   * @param iql iCafe查询语句
   * @returns 卡片列表
   */
  async getCards(iql: string): Promise<any> {
    try {
      return await this.withRetry(async () => {
        const response: AxiosResponse = await this.httpClient.get('/cards', {
          params: { iql }
        });

        return response.data;
      });
    } catch (error) {
      console.error('获取iCafe卡片失败:', error);
      throw error;
    }
  }

  /**
   * 获取单个卡片详情
   * @param sequence 卡片序号
   * @returns 卡片详情
   */
  async getCardDetails(sequence: number): Promise<IcafeCard> {
    try {
      return await this.withRetry(async () => {
        const response: AxiosResponse = await this.httpClient.get(`/card/${sequence}`);

        return response.data;
      });
    } catch (error) {
      console.error(`获取iCafe卡片详情失败 [${sequence}]:`, error);
      throw error;
    }
  }

  /**
   * 获取卡片历史记录
   * @param sequence 卡片序号
   * @returns 历史记录列表
   */
  async getCardHistory(sequence: number): Promise<IcafeCardHistory[]> {
    try {
      return await this.withRetry(async () => {
        const response: AxiosResponse = await this.httpClient.get(`/card/${sequence}/history`);

        return response.data;
      });
    } catch (error) {
      console.error(`获取iCafe卡片历史失败 [${sequence}]:`, error);
      throw error;
    }
  }

  /**
   * 根据条件查询卡片
   * @param params 查询参数
   * @returns 卡片列表
   */
  async queryCards(params: IcafeQueryParams): Promise<any> {
    try {
      // 构建IQL查询语句
      let iql = '';

      // 卡片类型过滤
      if (params.cardTypes && params.cardTypes.length > 0) {
        const typeCondition = params.cardTypes.map(type => `类型 = "${type}"`).join(' OR ');
        iql += `(${typeCondition})`;
      }

      // 时间范围过滤
      if (params.startDate && params.endDate) {
        if (iql) iql += ' AND ';
        iql += `创建时间 > ${params.startDate} AND 创建时间 < ${params.endDate}`;
      }

      // 状态过滤
      if (params.status) {
        if (iql) iql += ' AND ';
        iql += `状态 = "${params.status}"`;
      }

      // 严重程度过滤
      if (params.severity) {
        if (iql) iql += ' AND ';
        iql += `严重程度 = "${params.severity}"`;
      }

      // 创建者过滤
      if (params.creator) {
        if (iql) iql += ' AND ';
        iql += `创建人 = "${params.creator}"`;
      }

      // 使用自定义IQL（优先级最高）
      if (params.iql) {
        iql = params.iql;
      }

      return await this.getCards(iql);
    } catch (error) {
      console.error('查询iCafe卡片失败:', error);
      throw error;
    }
  }

  /**
   * 获取卡片统计信息
   * @param params 查询参数
   * @returns 统计信息
   */
  async getStatistics(params: IcafeQueryParams): Promise<IcafeStatistics> {
    try {
      const cards = await this.queryCards(params);

      const statistics: IcafeStatistics = {
        totalCount: Array.isArray(cards) ? cards.length : 0,
        typeStatistics: {},
        statusStatistics: {},
        timeRange: {
          startDate: params.startDate || '',
          endDate: params.endDate || '',
        },
      };

      // 统计卡片类型
      if (Array.isArray(cards)) {
        cards.forEach(card => {
          const type = card.type || '未知';
          statistics.typeStatistics[type] = (statistics.typeStatistics[type] || 0) + 1;

          const status = card.status || '未知';
          statistics.statusStatistics[status] = (statistics.statusStatistics[status] || 0) + 1;
        });
      }

      return statistics;
    } catch (error) {
      console.error('获取iCafe统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取上周统计数据
   * @returns 上周统计
   */
  async getLastWeekStatistics(): Promise<IcafeStatistics> {
    // 计算上周的开始和结束日期
    const now = new Date();
    const lastWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekEnd = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const startDate = lastWeekStart.toISOString().split('T')[0];
    const endDate = lastWeekEnd.toISOString().split('T')[0];

    return await this.getStatistics({
      startDate,
      endDate,
    });
  }

  /**
   * 获取2025H2统计数据
   * @returns 2025H2统计
   */
  async get2025H2Statistics(): Promise<IcafeStatistics> {
    const startDate = '2025-01-01';
    const endDate = '2025-06-30';

    return await this.getStatistics({
      startDate,
      endDate,
    });
  }

  /**
   * 验证连接
   * @returns 连接状态
   */
  async validateConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // 尝试获取少量数据进行连接测试
      const response = await this.getCards('创建时间 > 2024-01-01 LIMIT 1');

      return {
        success: true,
        message: 'iCafe API连接正常',
      };
    } catch (error) {
      return {
        success: false,
        message: `iCafe API连接失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * 获取当前SDK配置信息
   */
  getConfigInfo(): {
    baseURL: string;
    spacePrefixCode: string;
    username: string;
    isAuthenticated: boolean;
  } {
    const icafeConfig = this.config.getIcafeConfig();

    return {
      baseURL: process.env.ICAFE_BASE_URL || 'http://icafeapi.baidu-int.com',
      spacePrefixCode: process.env.ICAFE_SPACE_PREFIX_CODE || 'aihc-customer',
      username: icafeConfig.username,
      isAuthenticated: !!(icafeConfig.username || icafeConfig.password),
    };
  }

  /**
   * 调试API请求
   * @param params 调试参数
   * @returns 调试结果
   */
  async debugApi(params: {
    method?: 'GET' | 'POST';
    endpoint?: string;
    iql?: string;
    data?: any;
  }) {
    try {
      const { method = 'GET', endpoint, iql, data } = params;

      let url = endpoint || '/cards';
      if (iql && method === 'GET') {
        url += `?iql=${encodeURIComponent(iql)}`;
      }

      let response: AxiosResponse;
      if (method === 'GET') {
        response = await this.httpClient.get(url);
      } else {
        response = await this.httpClient.post(url, data);
      }

      return {
        success: true,
        method,
        url,
        data: response.data,
        status: response.status,
      };
    } catch (error) {
      return {
        success: false,
        method: params.method || 'GET',
        url: params.endpoint || '/cards',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}