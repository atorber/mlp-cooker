// 动态导入 SDK 以避免 lint 错误
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { BceBaseClient, HttpMethod } from '@atorber/baiducloud-sdk';
import { YamlConfigManager } from '@/config/yaml-config';
import { BaseService } from '@/utils/sdk/base.service';

/**
 * AIHC API 默认请求地址
 */
export const AIHC_DEFAULT_BASE_URL = 'http://aihc.bj.baidubce.com';

/**
 * AIHC API 配置接口
 */
export interface AihcConfig {
  accessKey: string;
  secretKey: string;
  baseURL: string;
  defaultResourcePoolId: string;
  defaultQueue: string;
  defaultPfsInstanceId: string;
  defaultBucket: string;
}

/**
 * 查询参数接口
 */
export interface QueryParams {
  [key: string]: string | number | boolean | undefined;
}

/**
 * 请求体接口
 */
export interface RequestBody {
  [key: string]: any;
}

/**
 * AIHC API SDK - 百度百舸平台 OpenAPI SDK
 */
export class AihcSDK extends BaseService {
  private client: BceBaseClient;
  private config: AihcConfig;

  constructor(config?: Partial<AihcConfig>) {
    super('AihcSDK');
    const yamlConfig = YamlConfigManager.getInstance();

    // 优先使用传入的配置，其次使用机器学习平台资源配置，最后使用数据集配置
    const mlResourceConfig = yamlConfig.getMLResourceConfig();

    this.config = {
      accessKey: config?.accessKey || mlResourceConfig.ak,
      secretKey: config?.secretKey || mlResourceConfig.sk,
      baseURL: config?.baseURL || mlResourceConfig.baseURL,
      defaultResourcePoolId: config?.defaultResourcePoolId || mlResourceConfig.poolId,
      defaultQueue: config?.defaultQueue || mlResourceConfig.queueId,
      defaultPfsInstanceId: config?.defaultPfsInstanceId || mlResourceConfig.pfsInstanceId,
      defaultBucket: config?.defaultBucket || mlResourceConfig.bucket,
    };

    this.client = this.createClient();
  }

  /**
   * 创建百度云客户端
   * 使用 BceBaseClient 进行签名认证，自动处理百度云 API 的签名逻辑
   */
  private createClient(): BceBaseClient {
    const bceConfig = {
      endpoint: this.config.baseURL,
      credentials: {
        ak: this.config.accessKey,
        sk: this.config.secretKey,
      },
    };

    return new BceBaseClient(bceConfig, 'aihc');
  }

  /**
   * 处理 API 错误
   */
  private handleApiError(error: any): Error {
    // BceBaseClient 的错误格式可能与 axios 不同，需要适配
    if (error.response || error.status) {
      const status = error.status || error.response?.status;
      const data = error.body || error.data || error.response?.data;

      if (status === 401) {
        return new Error('AIHC 认证失败，请检查 Access Key 和 Secret Key');
      }

      if (status === 404) {
        return new Error('请求的资源不存在');
      }

      if (status === 500) {
        return new Error('AIHC 服务器内部错误');
      }

      if (data && data.error) {
        return new Error(`AIHC API错误: ${data.error}`);
      }

      if (data && data.code) {
        return new Error(`AIHC API错误: ${data.code} - ${data.message || '未知错误'}`);
      }
    }

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return new Error('AIHC API 连接超时');
    }

    if (error.code === 'ENOTFOUND' || error.message?.includes('ENOTFOUND')) {
      return new Error('AIHC API 服务器地址无效');
    }

    return new Error(`AIHC API 请求失败: ${error.message || String(error)}`);
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
   * 构建请求头
   */
  private buildHeaders(action: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Job 相关接口使用 X-API-Version: v2，其他接口使用 version: v2
    if (this.isJobAction(action)) {
      headers['X-API-Version'] = 'v2';
    } else {
      headers['version'] = 'v2';
    }

    return headers;
  }

  /**
   * 发送请求（通用方法）
   * 使用 BceBaseClient 发送请求，自动处理签名认证
   */
  private async sendRequest<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    action: string,
    queryParams?: QueryParams,
    requestBody?: RequestBody
  ): Promise<T> {
    try {
      const headers = this.buildHeaders(action);
      const params: Record<string, string> = { ...queryParams, action } as Record<string, string>;

      // 转换参数为字符串格式（BceBaseClient 可能需要字符串格式的参数）
      const stringParams: Record<string, string> = {};
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          stringParams[key] = String(value);
        }
      }

      // 使用 BceBaseClient 发送请求
      const requestOptions: any = {
        params: stringParams,
        config: {},
        headers,
      };

      // 对于 POST/PUT 请求，即使请求体为空对象，也需要设置 body
      // BceBaseClient 可能需要字符串格式的 body 来正确计算 Content-Length
      if (method === 'POST' || method === 'PUT') {
        // 确定要使用的 body
        let bodyToSend: any;
        if (requestBody !== undefined && requestBody !== null) {
          bodyToSend = requestBody;
        } else {
          // POST/PUT 请求如果没有提供 body，使用空对象
          bodyToSend = {};
        }

        // 将 body 序列化为 JSON 字符串，确保 Content-Length 可以被正确计算
        // 即使 BceBaseClient 会自动处理，显式序列化可以避免 Content-Length 计算问题
        requestOptions.body = JSON.stringify(bodyToSend);
      } else if (requestBody) {
        // GET/DELETE 请求只有在有请求体时才添加 body
        requestOptions.body = requestBody;
      }

      const response = await this.client.sendRequest(method as HttpMethod, '/', requestOptions);

      // BceBaseClient 返回的响应格式可能是 response.body
      return (response.body || response) as T;
    } catch (error) {
      this.logError(`AIHC API 请求失败 [${action}]`, error);
      throw this.handleApiError(error);
    }
  }

  // ==================== 资源池相关接口 ====================

  /**
   * 查询资源池列表
   */
  async describeResourcePools(resourcePoolType: string = 'common'): Promise<any> {
    return this.withRetry(async () => {
      return this.sendRequest('GET', 'DescribeResourcePools', {
        resourcePoolType,
      });
    });
  }

  /**
   * 查询资源池详情
   */
  async describeResourcePool(resourcePoolId: string): Promise<any> {
    return this.withRetry(async () => {
      return this.sendRequest('GET', 'DescribeResourcePool', {
        resourcePoolId: resourcePoolId || this.config.defaultResourcePoolId,
      });
    });
  }

  /**
   * 查询资源池配置
   */
  async describeResourcePoolConfiguration(resourcePoolId: string): Promise<any> {
    return this.withRetry(async () => {
      return this.sendRequest('GET', 'DescribeResourcePoolConfiguration', {
        resourcePoolId: resourcePoolId || this.config.defaultResourcePoolId,
      });
    });
  }

  // ==================== 训练任务（Job）相关接口 ====================

  /**
   * 查询训练任务列表
   */
  async describeJobs(resourcePoolId: string = '', queueID: string = '', requestBody: RequestBody = {}): Promise<any> {
    if (queueID) {
      requestBody.queue = queueID;
    }

    return this.withRetry(async () => {
      return this.sendRequest('POST', 'DescribeJobs', {
        resourcePoolId: resourcePoolId,
        queueID: queueID,
      }, requestBody);
    });
  }

  /**
   * 查询训练任务详情
   */
  async describeJob(
    jobId: string,
    resourcePoolId?: string,
    queueID?: string,
    needDetail: boolean = false
  ): Promise<any> {
    return this.withRetry(async () => {
      return this.sendRequest('POST', 'DescribeJob', {
        resourcePoolId: resourcePoolId || this.config.defaultResourcePoolId,
        queueID: queueID || this.config.defaultQueue,
      }, {
        jobId,
        needDetail,
      });
    });
  }

  /**
   * 创建训练任务
   */
  async createJob(
    requestBody: RequestBody,
    resourcePoolId?: string,
    queueID?: string
  ): Promise<any> {
    return this.withRetry(async () => {
      const finalResourcePoolId = resourcePoolId || this.config.defaultResourcePoolId;
      const finalQueueID = queueID || this.config.defaultQueue || requestBody.queue as string || '';

      if (!finalQueueID) {
        throw new Error('队列ID 不能为空');
      }

      // 确保请求体中的 queue 字段和 queueID 一致
      const body: RequestBody = { ...requestBody, queue: finalQueueID };
      delete body.queueID;

      return this.sendRequest('POST', 'CreateJob', {
        resourcePoolId: finalResourcePoolId,
        queueID: finalQueueID,
      }, body);
    });
  }

  /**
   * 停止训练任务
   */
  async stopJob(jobId: string, resourcePoolId?: string): Promise<any> {
    return this.withRetry(async () => {
      return this.sendRequest('POST', 'StopJob', {
        resourcePoolId: resourcePoolId || this.config.defaultResourcePoolId,
      }, {
        jobId,
      });
    });
  }

  /**
   * 删除训练任务
   */
  async deleteJob(jobId: string, resourcePoolId?: string): Promise<any> {
    return this.withRetry(async () => {
      return this.sendRequest('POST', 'DeleteJob', {
        resourcePoolId: resourcePoolId || this.config.defaultResourcePoolId,
      }, {
        jobId,
      });
    });
  }

  /**
   * 获取训练任务 WebTerminal 地址
   */
  async describeJobWebterminal(
    resourcePoolId: string,
    jobId: string,
    podName: string,
    handshakeTimeoutSecond: number = 30,
    pingTimeoutSecond: number = 900,
    queueID?: string
  ): Promise<any> {
    return this.withRetry(async () => {
      return this.sendRequest('POST', 'DescribeJobWebterminal', {
        resourcePoolId,
        queueID,
      }, {
        jobId,
        podName,
        handshakeTimeoutSecond: handshakeTimeoutSecond.toString(),
        pingTimeoutSecond: pingTimeoutSecond.toString(),
      });
    });
  }

  /**
   * 查询训练任务事件
   */
  async describeJobEvents(
    jobId: string,
    resourcePoolId?: string,
    startTime?: string,
    endTime?: string
  ): Promise<any> {
    return this.withRetry(async () => {
      const body: RequestBody = { jobId };
      if (startTime) body.startTime = startTime;
      if (endTime) body.endTime = endTime;

      return this.sendRequest('POST', 'DescribeJobEvents', {
        resourcePoolId: resourcePoolId || this.config.defaultResourcePoolId,
      }, body);
    });
  }

  /**
   * 查询训练任务日志
   */
  async describeJobLogs(
    jobId: string,
    podName: string,
    resourcePoolId?: string,
    options?: {
      keywords?: string;
      startTime?: number;
      endTime?: number;
      maxLines?: number;
      chunkSize?: number;
      marker?: string;
    }
  ): Promise<any> {
    return this.withRetry(async () => {
      const body: RequestBody = { jobId, podName };
      if (options?.keywords) body.keywords = options.keywords;
      if (options?.startTime) body.startTime = options.startTime.toString();
      if (options?.endTime) body.endTime = options.endTime.toString();
      if (options?.maxLines) body.maxLines = options.maxLines.toString();
      if (options?.chunkSize) body.chunkSize = options.chunkSize.toString();
      if (options?.marker) body.marker = options.marker;

      return this.sendRequest('POST', 'DescribeJobLogs', {
        resourcePoolId: resourcePoolId || this.config.defaultResourcePoolId,
      }, body);
    });
  }

  // ==================== 数据集相关接口 ====================

  /**
   * 查询数据集列表
   */
  async describeDatasets(options?: {
    pageNumber?: number;
    pageSize?: number;
    keyword?: string;
    storageType?: string;
    storageInstances?: string;
    importFormat?: string;
  }): Promise<any> {
    return this.withRetry(async () => {
      const params: QueryParams = {
        pageNumber: (options?.pageNumber || 1).toString(),
        pageSize: (options?.pageSize || 10).toString(),
      };
      if (options?.keyword) params.keyword = options.keyword;
      if (options?.storageType) params.storageType = options.storageType;
      if (options?.storageInstances) params.storageInstances = options.storageInstances;
      if (options?.importFormat) params.importFormat = options.importFormat;

      return this.sendRequest('GET', 'DescribeDatasets', params);
    });
  }

  /**
   * 查询数据集详情
   */
  async describeDataset(datasetId: string): Promise<any> {
    return this.withRetry(async () => {
      return this.sendRequest('GET', 'DescribeDataset', {
        datasetId,
      });
    });
  }

  /**
   * 查询数据集版本列表
   */
  async describeDatasetVersions(
    datasetId: string,
    pageNumber: number = 1,
    pageSize: number = 0
  ): Promise<any> {
    return this.withRetry(async () => {
      const params: QueryParams = {
        datasetId,
        pageNumber: pageNumber.toString(),
      };
      if (pageSize > 0) {
        params.pageSize = pageSize.toString();
      }

      return this.sendRequest('GET', 'DescribeDatasetVersions', params);
    });
  }

  /**
   * 创建数据集
   */
  async createDataset(requestBody: RequestBody): Promise<any> {
    return this.withRetry(async () => {
      return this.sendRequest('POST', 'CreateDataset', undefined, requestBody);
    });
  }

  /**
   * 删除数据集
   */
  async deleteDataset(datasetId: string): Promise<any> {
    return this.withRetry(async () => {
      return this.sendRequest('POST', 'DeleteDataset', {
        datasetId,
      });
    });
  }

  /**
   * 创建数据集版本
   */
  async createDatasetVersion(datasetId: string, requestBody: RequestBody): Promise<any> {
    return this.withRetry(async () => {
      return this.sendRequest('POST', 'CreateDatasetVersion', {
        datasetId,
      }, requestBody);
    });
  }

  /**
   * 删除数据集版本
   */
  async deleteDatasetVersion(datasetId: string, versionId: string): Promise<any> {
    return this.withRetry(async () => {
      return this.sendRequest('POST', 'DeleteDatasetVersion', {
        datasetId,
        versionId,
      });
    });
  }

  // ==================== 模型相关接口 ====================

  /**
   * 查询模型列表
   */
  async describeModels(pageNumber: number = 1, keyword?: string): Promise<any> {
    return this.withRetry(async () => {
      const params: QueryParams = {
        pageNumber: pageNumber.toString(),
      };
      if (keyword) params.keyword = keyword;

      return this.sendRequest('GET', 'DescribeModels', params);
    });
  }

  /**
   * 查询模型详情
   */
  async describeModel(modelId: string): Promise<any> {
    return this.withRetry(async () => {
      return this.sendRequest('GET', 'DescribeModel', {
        modelId,
      });
    });
  }

  /**
   * 查询模型版本列表
   */
  async describeModelVersions(
    modelId: string,
    pageNumber: number = 1,
    pageSize: number = 0
  ): Promise<any> {
    return this.withRetry(async () => {
      const params: QueryParams = {
        modelId,
        pageNumber: pageNumber.toString(),
      };
      if (pageSize > 0) {
        params.pageSize = pageSize.toString();
      }

      return this.sendRequest('GET', 'DescribeModelVersions', params);
    });
  }

  /**
   * 创建模型
   */
  async createModel(requestBody: RequestBody): Promise<any> {
    return this.withRetry(async () => {
      return this.sendRequest('POST', 'CreateModel', undefined, requestBody);
    });
  }

  /**
   * 删除模型
   */
  async deleteModel(modelId: string): Promise<any> {
    return this.withRetry(async () => {
      return this.sendRequest('POST', 'DeleteModel', {
        modelId,
      });
    });
  }

  /**
   * 创建模型版本
   */
  async createModelVersion(modelId: string, requestBody: RequestBody): Promise<any> {
    return this.withRetry(async () => {
      return this.sendRequest('POST', 'CreateModelVersion', {
        modelId,
      }, requestBody);
    });
  }

  /**
   * 删除模型版本
   */
  async deleteModelVersion(modelId: string, versionId: string): Promise<any> {
    return this.withRetry(async () => {
      return this.sendRequest('POST', 'DeleteModelVersion', {
        modelId,
        versionId,
      });
    });
  }

  // ==================== 开发实例相关接口 ====================

  /**
   * 查询开发实例列表
   */
  async describeDevInstances(options?: {
    pageNumber?: number;
    pageSize?: number;
    onlyMyDevs?: boolean;
    resourcePoolId?: string;
    queueName?: string;
    status?: string;
  }): Promise<any> {
    return this.withRetry(async () => {
      const params: QueryParams = {
        pageNumber: (options?.pageNumber || 1).toString(),
        pageSize: (options?.pageSize || 10).toString(),
        onlyMyDevs: (options?.onlyMyDevs || false) ? 'true' : 'false',
      };
      if (options?.resourcePoolId) params.resourcePoolId = options.resourcePoolId;
      if (options?.queueName) params.queueName = options.queueName;
      if (options?.status) params.status = options.status;

      return this.sendRequest('GET', 'DescribeDevInstances', params);
    });
  }

  /**
   * 查询开发机详情
   */
  async describeDevInstance(devInstanceId: string): Promise<any> {
    return this.withRetry(async () => {
      return this.sendRequest('GET', 'DescribeDevInstance', {
        devInstanceId,
      });
    });
  }

  /**
   * 创建开发机
   */
  async createDevInstance(
    requestBody: RequestBody,
    resourcePoolId?: string,
    queueName?: string
  ): Promise<any> {
    return this.withRetry(async () => {
      const body = { ...requestBody };

      // 如果设置了资源池ID、队列名称，替换请求体中的对应值
      if (resourcePoolId || queueName) {
        if (!body.conf) body.conf = {};
        if (!(body.conf as any).resourcePool) (body.conf as any).resourcePool = {};

        const resourcePool = (body.conf as any).resourcePool;
        if (resourcePoolId) resourcePool.resourcePoolId = resourcePoolId;
        if (queueName) resourcePool.queueName = queueName;
      }

      return this.sendRequest('POST', 'CreateDevInstance', undefined, body);
    });
  }

  /**
   * 停止开发机实例
   */
  async stopDevInstance(devInstanceId: string): Promise<any> {
    return this.withRetry(async () => {
      return this.sendRequest('POST', 'StopDevInstance', {
        devInstanceId,
      });
    });
  }

  /**
   * 删除开发机
   */
  async deleteDevInstance(devInstanceId: string): Promise<any> {
    return this.withRetry(async () => {
      return this.sendRequest('POST', 'DeleteDevInstance', {
        devInstanceId,
      });
    });
  }

  // ==================== 服务相关接口 ====================

  /**
   * 查询服务列表
   */
  async describeServices(options?: {
    pageNumber?: number;
    pageSize?: number;
    orderBy?: string;
    order?: string;
  }): Promise<any> {
    return this.withRetry(async () => {
      const params: QueryParams = {
        pageNumber: (options?.pageNumber || 1).toString(),
        pageSize: (options?.pageSize || 10).toString(),
        orderBy: options?.orderBy || 'createdAt',
        order: options?.order || 'desc',
      };

      return this.sendRequest('GET', 'DescribeServices', params);
    });
  }

  /**
   * 查询服务详情
   */
  async describeService(serviceId: string): Promise<any> {
    return this.withRetry(async () => {
      return this.sendRequest('GET', 'DescribeService', {
        serviceId,
      });
    });
  }

  /**
   * 查询服务状态
   * @param serviceId 服务ID
   * @returns 服务状态信息 { status: 1|2|3|4, availableIns: number, totalIns: number, reason?: string }
   * status: 1=部署中, 2=运行中, 3=未运行, 4=异常
   */
  async describeServiceStatus(serviceId: string): Promise<any> {
    return this.withRetry(async () => {
      return this.sendRequest('GET', 'DescribeServiceStatus', {
        serviceId,
      });
    });
  }

  /**
   * 创建服务
   */
  async createService(
    requestBody: RequestBody,
    clientToken?: string
  ): Promise<any> {
    return this.withRetry(async () => {
      // 浅拷贝 requestBody，并确保 resourcePool 也是新对象，避免副作用
      const body = { ...requestBody };
      body.resourcePool = { ...(body.resourcePool || {}) };

      const params: QueryParams = {};
      if (clientToken) params.clientToken = clientToken;

      return this.sendRequest('POST', 'CreateService', params, body);
    });
  }

  /**
   * 删除服务
   */
  async deleteService(serviceId: string): Promise<any> {
    return this.withRetry(async () => {
      return this.sendRequest('POST', 'DeleteService', {
        serviceId,
      });
    });
  }

  // ==================== 队列相关接口 ====================

  /**
   * 查询队列列表
   */
  async describeQueues(options?: {
    resourcePoolId?: string;
    pageNumber?: number;
    pageSize?: number;
    keywordType?: string;
    keyword?: string;
  }): Promise<any> {
    return this.withRetry(async () => {
      const params: QueryParams = {
        resourcePoolId: options?.resourcePoolId || this.config.defaultResourcePoolId || '',
      };
      if (options?.keywordType) params.keywordType = options.keywordType;
      if (options?.keyword) params.keyword = options.keyword;
      if (options?.pageNumber) params.pageNumber = options.pageNumber.toString();
      if (options?.pageSize) params.pageSize = options.pageSize.toString();

      return this.sendRequest('GET', 'DescribeQueues', params);
    });
  }

  /**
   * 查询队列详情
   */
  async describeQueue(queueId: string): Promise<any> {
    return this.withRetry(async () => {
      return this.sendRequest('GET', 'DescribeQueue', {
        queueId,
      });
    });
  }

  // ==================== 通用 API 调用接口 ====================

  /**
   * 通用 API 调用
   */
  async callApi(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    action: string,
    queryParams?: QueryParams,
    requestBody?: RequestBody
  ): Promise<any> {
    return this.withRetry(async () => {
      return this.sendRequest(method, action, queryParams, requestBody);
    });
  }
}

