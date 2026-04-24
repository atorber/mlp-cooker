import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { BceBaseClient } = require('@atorber/baiducloud-sdk');
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'PATCH';
import config from '../config/index.js';
import { createLogger } from '../utils/logger.js';
import type { BackendActionType } from '../types/backend/common.js';

const logger = createLogger('backend-client');

/**
 * 后端API客户端
 * 负责与百舸后端服务通信
 */
export class BackendClient {
  private endpoints: Record<string, Record<string, string>>;
  private ak: string;
  private sk: string;

  constructor(ak?: string, sk?: string) {
    this.endpoints = config.backend.endpoints;
    this.ak = ak || config.auth.ak;
    this.sk = sk || config.auth.sk;
  }
  /**
   * 获取区域端点
   */
  getEndpoint(product: string, region: string): string {
    const productEndpoints = this.endpoints[product];
    if (!productEndpoints) {
      throw new Error(`Unknown product: ${product}`);
    }
    const endpoint = productEndpoints[region];
    if (!endpoint) {
      throw new Error(`Unknown region ${region} for product ${product}`);
    }
    return endpoint;
  }

  /**
   * 判断是否为 Job 相关接口
   */
  private isJobAction(action: string): boolean {
    const jobActions = [
      'DescribeJobs',
      'CreateJob',
      'DeleteJob',
      'DescribeJob',
      'ModifyJob',
      'DescribeJobEvents',
      'DescribeJobLogs',
      'DescribePodEvents',
      'StopJob',
      'DescribeJobMetrics',
      'DescribeJobNodes',
      'DescribeJobWebterminal',
    ];
    return jobActions.includes(action);
  }

  /**
   * 发送请求到后端
   */
  async sendRequest<T>(
    product: string,
    region: string,
    action: BackendActionType | string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD',
    queryParams: Record<string, string> = {},
    body?: unknown,
    customHeaders?: Record<string, string>,
    path: string = '/'
  ): Promise<T> {
    const endpoint = this.getEndpoint(product, region);
    
    const bceConfig = {
      endpoint: `https://${endpoint}`,
      credentials: {
        ak: this.ak,
        sk: this.sk,
      },
    };

    const client = new BceBaseClient(bceConfig, product);

    // 构建 Query 参数
    const params: Record<string, string> = { ...queryParams };
    if (action) {
      params.action = action;
    }

    // 构建请求头
    const headers: Record<string, string> = {
      ...customHeaders,
    };
    if (body) {
      headers['Content-Type'] = 'application/json';
    }
    if (product === 'aihc') {
      if (this.isJobAction(action)) {
        headers['X-API-Version'] = 'v2';
      } else {
        headers['version'] = 'v2';
      }
      if (body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    }

    // 转换参数为字符串格式
    const stringParams: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        stringParams[key] = String(value);
      }
    }

    const requestOptions: any = {
      params: stringParams,
      config: {},
      headers,
    };

    if (method === 'POST' || method === 'PUT') {
      requestOptions.body = JSON.stringify(body || {});
    } else if (body) {
      requestOptions.body = body;
    }

    logger.info({ 
      endpoint, 
      method, 
      path,
      action,
      url: `https://${endpoint}${path}`,
      requestHeaders: headers,
      requestParams: stringParams,
      requestBody: body
    }, 'Sending request to backend via BceBaseClient');

    try {
      const response = await client.sendRequest(method as HttpMethod, path, requestOptions);
      const responseBody = (response.body || response) as T;
      
      logger.info({ 
        action,
        status: response.status || 200,
        responseBody 
      }, 'Received response from backend');
      return responseBody;
    } catch (error: any) {
      logger.error({ 
        action, 
        status: error.status || error.response?.status, 
        error: error.body || error.message,
        requestParams: stringParams,
        requestBody: body 
      }, 'Request to backend failed');
      
      const status = error.status || error.response?.status || 500;
      let message = error.message;
      
      if (error.body) {
        if (typeof error.body === 'string') {
          message = error.body;
        } else if (typeof error.body === 'object') {
          message = error.body.message || error.body.errorMessage || JSON.stringify(error.body);
        }
      }
      
      if (message === '[object Object]') {
        message = 'Backend API Error (Original message lost in SDK)';
      }
      
      const newError = new Error(message) as any;
      newError.statusCode = status;
      newError.code = error.code || 'BackendError';
      newError.body = error.body;
      throw newError;
    }
  }

  // ============ 训练任务接口 ============

  /**
   * 创建训练任务
   */
  async createJob(
    region: string,
    resourcePoolId: string,
    queueID: string,
    body: unknown
  ): Promise<{ requestId: string; jobId: string; jobName: string }> {
    return this.sendRequest('aihc', region, 'CreateJob' as BackendActionType, 'POST', {
      resourcePoolId,
      queueID,
    }, body);
  }

  /**
   * 查询训练任务列表
   */
  async describeJobs(
    region: string,
    resourcePoolId: string,
    queueID?: string,
    body?: unknown
  ): Promise<unknown> {
    const params: Record<string, string> = { resourcePoolId };
    if (queueID) {
      params.queueID = queueID;
    }
    return this.sendRequest('aihc', region, 'DescribeJobs' as BackendActionType, 'POST', params, body);
  }

  /**
   * 查询训练任务详情
   */
  async describeJob(
    region: string,
    resourcePoolId: string,
    queueID: string,
    body: { jobId: string; needDetail?: boolean }
  ): Promise<unknown> {
    return this.sendRequest('aihc', region, 'DescribeJob' as BackendActionType, 'POST', {
      resourcePoolId,
      queueID,
    }, body);
  }

  /**
   * 删除训练任务
   */
  async deleteJob(
    region: string,
    resourcePoolId: string,
    queueID: string,
    body: { jobId: string }
  ): Promise<{ requestId: string; jobId?: string }> {
    return this.sendRequest('aihc', region, 'DeleteJob' as BackendActionType, 'POST', {
      resourcePoolId,
      queueID,
    }, body);
  }

  // ============ 服务部署接口 ============

  /**
   * 创建服务
   */
  async createService(
    region: string,
    body: unknown,
    clientToken?: string
  ): Promise<{ requestId: string; serviceId: string }> {
    const params: Record<string, string> = {};
    if (clientToken) {
      params.clientToken = clientToken;
    }
    return this.sendRequest('aihc', region, 'CreateService' as BackendActionType, 'POST', params, body);
  }

  /**
   * 查询服务列表
   */
  async describeServices(
    region: string,
    params: { pageNumber?: number; pageSize?: number; orderBy?: string; order?: string }
  ): Promise<unknown> {
    const queryParams: Record<string, string> = {};
    if (params.pageNumber) queryParams.pageNumber = String(params.pageNumber);
    if (params.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params.orderBy) queryParams.orderBy = params.orderBy;
    if (params.order) queryParams.order = params.order;
    return this.sendRequest('aihc', region, 'DescribeServices' as BackendActionType, 'GET', queryParams);
  }

  /**
   * 查询服务详情
   */
  async describeService(region: string, serviceId: string): Promise<unknown> {
    return this.sendRequest('aihc', region, 'DescribeService' as BackendActionType, 'GET', { serviceId });
  }

  /**
   * 删除服务
   */
  async deleteService(region: string, serviceId: string): Promise<{ requestId: string }> {
    return this.sendRequest('aihc', region, 'DeleteService' as BackendActionType, 'POST', { serviceId });
  }

  // ============ 开发机接口 ============

  /**
   * 创建开发机
   */
  async createDevInstance(
    region: string,
    body: unknown
  ): Promise<{ requestId: string; devInstanceId: string }> {
    return this.sendRequest('aihc', region, 'CreateDevInstance' as BackendActionType, 'POST', {}, body);
  }

  /**
   * 查询开发机列表
   */
  async describeDevInstances(
    region: string,
    params: {
      pageNumber?: number;
      pageSize?: number;
      resourcePoolId?: string;
      queueName?: string;
      onlyMyDevs?: string;
      status?: string;
      queryKey?: string;
      queryVal?: string;
    }
  ): Promise<unknown> {
    const queryParams: Record<string, string> = {};
    if (params.pageNumber) queryParams.pageNumber = String(params.pageNumber);
    if (params.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params.resourcePoolId) queryParams.resourcePoolId = params.resourcePoolId;
    if (params.queueName) queryParams.queueName = params.queueName;
    if (params.onlyMyDevs) queryParams.onlyMyDevs = params.onlyMyDevs;
    if (params.status) queryParams.status = params.status;
    if (params.queryKey) queryParams.queryKey = params.queryKey;
    if (params.queryVal) queryParams.queryVal = params.queryVal;
    return this.sendRequest('aihc', region, 'DescribeDevInstances' as BackendActionType, 'GET', queryParams);
  }

  /**
   * 查询开发机详情
   */
  async describeDevInstance(region: string, devInstanceId: string): Promise<unknown> {
    return this.sendRequest('aihc', region, 'DescribeDevInstance' as BackendActionType, 'GET', { devInstanceId });
  }

  /**
   * 删除开发机
   */
  async deleteDevInstance(region: string, devInstanceId: string): Promise<{ requestId: string; devInstanceId: string }> {
    return this.sendRequest('aihc', region, 'DeleteDevInstance' as BackendActionType, 'POST', { devInstanceId });
  }

  // ============ 数据集接口 ============

  /**
   * 查询数据集列表
   */
  async describeDatasets(
    region: string,
    params: {
      keyword?: string;
      storageType?: string;
      storageInstances?: string;
      importFormat?: string;
      pageNumber?: number;
      pageSize?: number;
    }
  ): Promise<unknown> {
    const queryParams: Record<string, string> = {};
    if (params.keyword) queryParams.keyword = params.keyword;
    if (params.storageType) queryParams.storageType = params.storageType;
    if (params.storageInstances) queryParams.storageInstances = params.storageInstances;
    if (params.importFormat) queryParams.importFormat = params.importFormat;
    if (params.pageNumber) queryParams.pageNumber = String(params.pageNumber);
    if (params.pageSize) queryParams.pageSize = String(params.pageSize);
    return this.sendRequest('aihc', region, 'DescribeDatasets' as BackendActionType, 'GET', queryParams);
  }

  // ============ 模型接口 ============

  /**
   * 查询模型列表
   */
  async describeModels(
    region: string,
    params: { keyword?: string; pageNumber?: number; pageSize?: number }
  ): Promise<unknown> {
    const queryParams: Record<string, string> = {};
    if (params.keyword) queryParams.keyword = params.keyword;
    if (params.pageNumber) queryParams.pageNumber = String(params.pageNumber);
    if (params.pageSize) queryParams.pageSize = String(params.pageSize);
    return this.sendRequest('aihc', region, 'DescribeModels' as BackendActionType, 'GET', queryParams);
  }

  // ============ 资源池接口 ============

  /**
   * 查询资源池列表
   */
  async describeResourcePools(
    region: string,
    params: {
      resourcePoolType: string;
      keywordType?: string;
      keyword?: string;
      orderBy?: string;
      order?: string;
      pageNumber?: number;
      pageSize?: number;
    }
  ): Promise<unknown> {
    const queryParams: Record<string, string> = {
      resourcePoolType: params.resourcePoolType,
    };
    if (params.keywordType) queryParams.keywordType = params.keywordType;
    if (params.keyword) queryParams.keyword = params.keyword;
    if (params.orderBy) queryParams.orderBy = params.orderBy;
    if (params.order) queryParams.order = params.order;
    if (params.pageNumber) queryParams.pageNumber = String(params.pageNumber);
    if (params.pageSize) queryParams.pageSize = String(params.pageSize);
    return this.sendRequest('aihc', region, 'DescribeResourcePools' as BackendActionType, 'GET', queryParams);
  }

  /**
   * 查询队列列表
   */
  async describeQueues(
    region: string,
    resourcePoolId: string,
    params?: { keywordType?: string; keyword?: string; pageNumber?: number; pageSize?: number }
  ): Promise<unknown> {
    const queryParams: Record<string, string> = { resourcePoolId };
    if (params?.keywordType) queryParams.keywordType = params.keywordType;
    if (params?.keyword) queryParams.keyword = params.keyword;
    if (params?.pageNumber) queryParams.pageNumber = String(params.pageNumber);
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);
    return this.sendRequest('aihc', region, 'DescribeQueues' as BackendActionType, 'GET', queryParams);
  }
}

// 工厂函数，每请求实例化以保证 ak/sk 隔离
import type { FastifyRequest } from 'fastify';
export function getBackendClient(request?: FastifyRequest | any) {
  const ak = (request?.headers?.ak as string) || '';
  const sk = (request?.headers?.sk as string) || '';
  return new BackendClient(ak, sk);
}
