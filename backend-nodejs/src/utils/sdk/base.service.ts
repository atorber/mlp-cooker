/**
 * 外部SDK基础服务类
 */
export class BaseService {
  protected serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  /**
   * 带重试的异步操作
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error = new Error('Unknown error occurred');

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 如果是最后一次尝试，直接抛出错误
        if (attempt === maxRetries) {
          break;
        }

        // 指数退避
        const waitTime = delay * Math.pow(2, attempt - 1);
        console.warn(`${this.serviceName} 尝试 ${attempt}/${maxRetries} 失败，${waitTime}ms后重试...`, lastError.message);
        await this.sleep(waitTime);
      }
    }

    throw lastError;
  }

  /**
   * 延时函数
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 记录日志
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${this.serviceName}] ${level.toUpperCase()}: ${message}`;

    if (data) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  }

  /**
   * 记录信息日志
   */
  protected logInfo(message: string, data?: any): void {
    this.log('info', message, data);
  }

  /**
   * 记录警告日志
   */
  protected logWarning(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  /**
   * 记录错误日志
   */
  protected logError(message: string, data?: any): void {
    this.log('error', message, data);
  }
}