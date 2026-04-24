import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('error-handler');

/**
 * 错误响应格式
 */
interface ErrorResponse {
  code: number;
  message: string;
  requestId: string;
  details?: Array<{ field: string; message: string }>;
  backendCode?: string;
}

/**
 * 错误码映射
 * 统一错误码格式: HTTP状态码 + 3位业务码
 */
const ERROR_CODE_MAPPING: Record<string, number> = {
  // 400 系列 - 请求参数错误
  'FST_ERR_VALIDATION': 400001,
  'FST_ERR_MISSING_PARAM': 400002,
  'InvalidParameter': 400001,
  'MissingParameter': 400002,
  'MalformedJSON': 400003,
  'InvalidResourcePoolId': 400004,
  'InvalidQueueId': 400005,
  'InvalidJobId': 400006,
  'InvalidServiceId': 400007,
  'InvalidDevInstanceId': 400008,
  'InvalidDatasetId': 400009,
  'InvalidModelId': 400010,
  'InvalidImageConfig': 400011,
  'InvalidResourceConfig': 400012,
  'InvalidStorageConfig': 400013,
  'QuotaExceeded': 400014,
  'ResourceInsufficient': 400015,
  'OperationNotSupported': 400016,

  // 401 系列 - 认证错误
  'SignatureDoesNotMatch': 401001,
  'InvalidAccessKeyId': 401002,
  'RequestExpired': 401003,
  'SignatureExpired': 401004,
  'MissingAuthorization': 401005,

  // 403 系列 - 权限错误
  'AccessDenied': 403001,
  'Forbidden': 403002,
  'ResourceNotOwned': 403003,
  'OperationDenied': 403004,
  'QuotaLimitExceeded': 403005,

  // 404 系列 - 资源不存在
  'NotFound': 404001,
  'NoSuchResource': 404002,
  'NoSuchResourcePool': 404003,
  'NoSuchQueue': 404004,
  'NoSuchJob': 404005,
  'NoSuchService': 404006,
  'NoSuchDevInstance': 404007,
  'NoSuchDataset': 404008,
  'NoSuchDatasetVersion': 404009,
  'NoSuchModel': 404010,
  'NoSuchModelVersion': 404011,
  'NoSuchNode': 404012,

  // 409 系列 - 资源冲突
  'AlreadyExists': 409001,
  'ResourceConflict': 409002,
  'JobAlreadyRunning': 409003,
  'ServiceAlreadyRunning': 409004,
  'DevInstanceAlreadyRunning': 409005,
  'NameAlreadyExists': 409006,

  // 412 系列 - 前置条件失败
  'PreconditionFailed': 412001,
  'ResourceInUse': 412002,
  'JobNotStopped': 412003,
  'ServiceNotStopped': 412004,
  'DevInstanceNotStopped': 412005,

  // 429 系列 - 请求频率限制
  'TooManyRequests': 429001,
  'RateLimitExceeded': 429002,

  // 500 系列 - 服务端错误
  'InternalError': 500001,
  'BackendError': 500002,
  'ServiceUnavailable': 500003,
  'GatewayTimeout': 500004,
  'DatabaseError': 500005,
  'NetworkError': 500006,

  // 503 系列 - 服务不可用
  'ServiceBusy': 503001,
  'Maintenance': 503002,
};

/**
 * HTTP状态码映射
 */
const HTTP_STATUS_MAPPING: Record<string, number> = {
  'InvalidParameter': 400,
  'MissingParameter': 400,
  'MalformedJSON': 400,
  'InvalidResourcePoolId': 400,
  'InvalidQueueId': 400,
  'InvalidJobId': 400,
  'InvalidServiceId': 400,
  'InvalidDevInstanceId': 400,
  'InvalidDatasetId': 400,
  'InvalidModelId': 400,
  'InvalidImageConfig': 400,
  'InvalidResourceConfig': 400,
  'InvalidStorageConfig': 400,
  'QuotaExceeded': 400,
  'ResourceInsufficient': 400,
  'OperationNotSupported': 400,
  'SignatureDoesNotMatch': 401,
  'InvalidAccessKeyId': 401,
  'RequestExpired': 401,
  'SignatureExpired': 401,
  'MissingAuthorization': 401,
  'AccessDenied': 403,
  'Forbidden': 403,
  'ResourceNotOwned': 403,
  'OperationDenied': 403,
  'QuotaLimitExceeded': 403,
  'NotFound': 404,
  'NoSuchResource': 404,
  'NoSuchResourcePool': 404,
  'NoSuchQueue': 404,
  'NoSuchJob': 404,
  'NoSuchService': 404,
  'NoSuchDevInstance': 404,
  'NoSuchDataset': 404,
  'NoSuchDatasetVersion': 404,
  'NoSuchModel': 404,
  'NoSuchModelVersion': 404,
  'NoSuchNode': 404,
  'AlreadyExists': 409,
  'ResourceConflict': 409,
  'JobAlreadyRunning': 409,
  'ServiceAlreadyRunning': 409,
  'DevInstanceAlreadyRunning': 409,
  'NameAlreadyExists': 409,
  'PreconditionFailed': 412,
  'ResourceInUse': 412,
  'JobNotStopped': 412,
  'ServiceNotStopped': 412,
  'DevInstanceNotStopped': 412,
  'TooManyRequests': 429,
  'RateLimitExceeded': 429,
  'InternalError': 500,
  'BackendError': 500,
  'ServiceUnavailable': 503,
  'GatewayTimeout': 504,
  'DatabaseError': 500,
  'NetworkError': 500,
  'ServiceBusy': 503,
  'Maintenance': 503,
};

/**
 * 错误处理中间件
 */
export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const requestId = request.id;
  const statusCode = error.statusCode || 500;

  // 记录错误日志
  logger.error({
    requestId,
    error: {
      message: error.message,
      code: error.code,
      stack: error.stack,
    },
    url: request.url,
    method: request.method,
  }, 'Request error');

  // 解析后端错误
  const backendError = parseBackendError(error);

  // 获取业务错误码
  const errorCode = ERROR_CODE_MAPPING[error.code] || ERROR_CODE_MAPPING[backendError.code] || 500001;
  const httpStatus = HTTP_STATUS_MAPPING[error.code] || HTTP_STATUS_MAPPING[backendError.code] || statusCode;

  // 构建错误响应
  const errorResponse: ErrorResponse = {
    code: errorCode,
    message: backendError.message || error.message || 'Internal Server Error',
    requestId,
  };

  // 保留原始后端错误码
  if (backendError.code) {
    errorResponse.backendCode = backendError.code;
  }

  // 处理验证错误
  if (error.code === 'FST_ERR_VALIDATION') {
    errorResponse.code = 400001;
    errorResponse.message = 'Validation error';
    errorResponse.details = (error as unknown as { validation?: unknown[] }).validation?.map((v: unknown) => ({
      field: (v as { instancePath?: string }).instancePath || '',
      message: (v as { message?: string }).message || '',
    }));
  }

  // 返回错误响应
  await reply.status(httpStatus).send(errorResponse);
}

function extractMessage(msg: any): string {
  if (typeof msg === 'string') return msg;
  if (!msg) return '';
  if (msg.message) return extractMessage(msg.message);
  if (msg.errorMessage) return extractMessage(msg.errorMessage);
  try {
    return JSON.stringify(msg);
  } catch {
    return String(msg);
  }
}

/**
 * 解析后端错误
 */
function parseBackendError(error: FastifyError): { code: string; message: string } {
  let message = extractMessage(error.message);
  let code = '';
  
  // 尝试解析后端错误响应
  try {
    const body = (error as unknown as { body?: any }).body;
    if (body) {
      const parsed = typeof body === 'string' ? JSON.parse(body) : body;
      if (parsed.code || parsed.errorCode) {
        code = parsed.code || parsed.errorCode;
        message = extractMessage(parsed.message || parsed.errorMessage || message);
      } else if (parsed.message || parsed.errorMessage) {
        message = extractMessage(parsed.message || parsed.errorMessage);
      }
    }
  } catch {
    // 忽略解析错误
  }

  return { code, message };
}

/**
 * 创建错误
 */
export function createError(
  statusCode: number,
  code: string,
  message: string
): FastifyError {
  const error = new Error(message) as FastifyError;
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

/**
 * 创建业务错误
 */
export function createBusinessError(
  code: string,
  message?: string
): FastifyError {
  const statusCode = HTTP_STATUS_MAPPING[code] || 500;
  const error = new Error(message || code) as FastifyError;
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

/**
 * 预定义错误工厂
 */
export const Errors = {
  invalidParameter: (message?: string) => createBusinessError('InvalidParameter', message || 'Invalid parameter'),
  missingParameter: (param: string) => createBusinessError('MissingParameter', `Missing required parameter: ${param}`),
  notFound: (resource: string) => createBusinessError('NotFound', `${resource} not found`),
  accessDenied: (message?: string) => createBusinessError('AccessDenied', message || 'Access denied'),
  alreadyExists: (resource: string) => createBusinessError('AlreadyExists', `${resource} already exists`),
  resourceInUse: (resource: string) => createBusinessError('ResourceInUse', `${resource} is in use`),
  internalError: (message?: string) => createBusinessError('InternalError', message || 'Internal server error'),
};

export default errorHandler;
