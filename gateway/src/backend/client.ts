import { request } from 'undici';
import crypto from 'crypto';
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
   * 生成百度云签名
   */
  private generateSignature(
    method: string,
    uri: string,
    params: Record<string, string>,
    headers: Record<string, string>
  ): string {
    const timestamp = new Date().toISOString().replace(/\.\d{3}/, '');
    const expirationPeriod = 1800;

    // 构建认证字符串前缀
    const authStringPrefix = `bce-auth-v1/${this.ak}/${timestamp}/${expirationPeriod}`;

    // 计算签名密钥
    const signingKey = crypto
      .createHmac('sha256', this.sk)
      .update(authStringPrefix)
      .digest('hex');

    // 构建规范请求
    const canonicalUri = this.normalizeUri(uri);
    const canonicalQueryString = this.canonicalQueryString(params);
    const canonicalHeaders = this.canonicalHeaders(headers);

    const canonicalRequest = [
      method.toUpperCase(),
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
    ].join('\n');

    // 计算签名
    const signature = crypto
      .createHmac('sha256', signingKey)
      .update(canonicalRequest)
      .digest('hex');

    // 返回 Authorization 头
    const signedHeaders = Object.keys(headers)
      .map((k) => k.toLowerCase())
      .sort()
      .join(';');

    return `${authStringPrefix}/${signedHeaders}/${signature}`;
  }

  private normalizeUri(uri: string): string {
    return encodeURIComponent(uri).replace(/%2F/g, '/');
  }

  private canonicalQueryString(params: Record<string, string>): string {
    return Object.keys(params)
      .sort()
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
  }

  private canonicalHeaders(headers: Record<string, string>): string {
    return Object.keys(headers)
      .sort()
      .map((key) => `${key.toLowerCase()}:${headers[key].trim()}`)
      .join('\n');
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
    const uri = path;

    // 构建 Query 参数
    const params: Record<string, string> = { ...queryParams };
    if (action) {
      params.action = action;
    }

    // 构建请求头
    const headers: Record<string, string> = {
      Host: endpoint,
      'x-bce-date': new Date().toISOString().replace(/\.\d{3}/, '') + 'Z',
      ...customHeaders,
    };
    if (body) {
      headers['Content-Type'] = 'application/json';
    }
    if (product === 'aihc') {
      headers['version'] = 'v2';
      if (body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    }

    // 生成签名
    headers.Authorization = this.generateSignature(method, uri, params, headers);

    // 构建完整 URL
    const queryString = Object.keys(params)
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
    const url = `https://${endpoint}${uri}?${queryString}`;

    logger.debug({ url, method, action }, 'Sending request to backend');

    try {
      const response = await request(url, {
        method,
        headers: headers as Record<string, string>,
        body: body ? JSON.stringify(body) : undefined,
        throwOnError: true,
      });

      const responseBody = await response.body.json() as T;

      logger.debug({ action, status: response.statusCode }, 'Received response from backend');

      return responseBody;
    } catch (error) {
      logger.error({ action, error }, 'Request to backend failed');
      throw error;
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
