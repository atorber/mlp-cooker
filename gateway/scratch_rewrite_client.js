const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/backend/client.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Replace imports
content = content.replace(/import \{ request \} from 'undici';\nimport crypto from 'crypto';/, `// @ts-ignore
import { BceBaseClient, HttpMethod } from '@atorber/baiducloud-sdk';`);

// Replace generateSignature, normalizeUri, canonicalQueryString, canonicalHeaders, and sendRequest
const classRegex = /(export class BackendClient \{[\s\S]*?constructor\(.*?\)\s*\{[\s\S]*?\})([\s\S]*?)(\/\/ ============ 训练任务接口 ============)/;
const match = content.match(classRegex);

if (match) {
  const newClassMethods = `
  /**
   * 获取区域端点
   */
  getEndpoint(product: string, region: string): string {
    const productEndpoints = this.endpoints[product];
    if (!productEndpoints) {
      throw new Error(\`Unknown product: \${product}\`);
    }
    const endpoint = productEndpoints[region];
    if (!endpoint) {
      throw new Error(\`Unknown region \${region} for product \${product}\`);
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
      endpoint: \`https://\${endpoint}\`,
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

    logger.debug({ endpoint, method, action }, 'Sending request to backend via BceBaseClient');

    try {
      const response = await client.sendRequest(method as HttpMethod, path, requestOptions);
      const responseBody = (response.body || response) as T;
      
      logger.debug({ action }, 'Received response from backend');
      return responseBody;
    } catch (error: any) {
      logger.error({ action, status: error.status || error.response?.status, error: error.body || error.message }, 'Request to backend failed');
      throw error;
    }
  }

  `;

  content = content.replace(match[2], newClassMethods);
  fs.writeFileSync(filePath, content);
  console.log('Successfully refactored BackendClient to use BceBaseClient.');
} else {
  console.log('Failed to match class structure');
}
