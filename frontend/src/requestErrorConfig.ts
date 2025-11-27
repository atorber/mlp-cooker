import type { RequestOptions } from '@@/plugin-request/request';
import type { RequestConfig } from '@umijs/max';
import { message, notification } from 'antd';

// 错误处理方案： 错误类型
enum ErrorShowType {
  SILENT = 0,
  WARN_MESSAGE = 1,
  ERROR_MESSAGE = 2,
  NOTIFICATION = 3,
  REDIRECT = 9,
}
// 与后端约定的响应数据格式
interface ResponseStructure {
  success: boolean;
  data: any;
  errorCode?: number | string;
  errorMessage?: string;
  showType?: ErrorShowType;
}

/**
 * @name 错误处理
 * pro 自带的错误处理， 可以在这里做自己的改动
 * @doc https://umijs.org/docs/max/request#配置
 */
export const errorConfig: RequestConfig = {
  // 错误处理： umi@3 的错误处理方案。
  errorConfig: {
    // 错误抛出
    errorThrower: (res) => {
      const response = res as unknown as ResponseStructure & { message?: string };
      const { success, data, errorCode, errorMessage, showType, message } = response;

      if (!success) {
        // 优先使用 errorMessage，如果没有则使用 message
        const errorMsg = errorMessage || message || '操作失败';
        const error: any = new Error(errorMsg);
        error.name = 'BizError';
        error.info = {
          errorCode,
          errorMessage: errorMsg,
          showType: showType || ErrorShowType.ERROR_MESSAGE,
          data
        };
        throw error; // 抛出自制的错误
      }
    },
    // 错误接收及处理
    errorHandler: (error: any, opts: any) => {
      if (opts?.skipErrorHandler) throw error;
      // 我们的 errorThrower 抛出的错误。
      if (error.name === 'BizError') {
        const errorInfo: ResponseStructure | undefined = error.info;
        if (errorInfo) {
          const { errorMessage, errorCode } = errorInfo;
          const errorMsg = errorMessage || error.message || '操作失败';

          // 如果是认证错误，跳转到登录页
          if (errorMsg.includes('认证失败') || errorMsg.includes('未认证') || errorCode === 'AUTH_FAILED') {
            message.error(errorMsg || '认证失败，请重新登录');
            // 延迟跳转，让用户看到错误提示
            setTimeout(() => {
              const { history } = require('@umijs/max');
              history.push('/user/login');
            }, 1000);
            return;
          }

          switch (errorInfo.showType) {
            case ErrorShowType.SILENT:
              // do nothing
              break;
            case ErrorShowType.WARN_MESSAGE:
              message.warning(errorMsg);
              break;
            case ErrorShowType.ERROR_MESSAGE:
              message.error(errorMsg);
              break;
            case ErrorShowType.NOTIFICATION:
              notification.open({
                description: errorMsg,
                message: errorCode || '错误',
              });
              break;
            case ErrorShowType.REDIRECT:
              // TODO: redirect
              break;
            default:
              message.error(errorMsg);
          }
        } else {
          // 如果没有 errorInfo，检查是否是认证错误
          const errorMsg = error.message || '操作失败';
          if (errorMsg.includes('认证失败') || errorMsg.includes('未认证')) {
            message.error(errorMsg || '认证失败，请重新登录');
            setTimeout(() => {
              const { history } = require('@umijs/max');
              history.push('/user/login');
            }, 1000);
          } else {
            message.error(errorMsg);
          }
        }
      } else if (error.response) {
        // Axios 的错误
        // 请求成功发出且服务器也响应了状态码，但状态代码超出了 2xx 的范围
        const status = error.response.status;
        const responseData = error.response.data;
        const errorMsg = responseData?.message || responseData?.errorMessage || `请求失败 (${status})`;

        // 如果是认证错误（401），跳转到登录页
        if (status === 401 || errorMsg.includes('认证失败') || errorMsg.includes('未认证')) {
          message.error(errorMsg || '认证失败，请重新登录');
          // 延迟跳转，让用户看到错误提示
          setTimeout(() => {
            const { history } = require('@umijs/max');
            history.push('/user/login');
          }, 1000);
        } else {
          message.error(errorMsg);
        }
      } else if (error.request) {
        // 请求已经成功发起，但没有收到响应
        // \`error.request\` 在浏览器中是 XMLHttpRequest 的实例，
        // 而在node.js中是 http.ClientRequest 的实例
        message.error('请求超时，请检查网络连接后重试');
      } else {
        // 发送请求时出了点问题
        message.error(error.message || '请求错误，请重试');
      }
    },
  },

  // 请求拦截器
  requestInterceptors: [
    (config: RequestOptions) => {
      // 从localStorage获取token并添加到请求头
      // 登录接口不需要token，跳过
      if (config.url?.includes('/api/login/account') || config.url?.includes('/api/login/captcha')) {
        return config;
      }

      const token = localStorage.getItem('auth_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
        config.headers['X-Auth-Token'] = token;
      }
      return config;
    },
  ],

  // 响应拦截器
  responseInterceptors: [
    (response) => {
      // 拦截响应数据，进行个性化处理
      // 不在这里显示错误，错误处理由 errorHandler 统一处理
      return response;
    },
  ],
};
