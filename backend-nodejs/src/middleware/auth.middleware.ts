import { Request, Response, NextFunction } from 'express';
import { ResponseUtils } from '@/utils/response.utils';
import { LoginResult, RequestUser } from '@/types/api';

/**
 * 扩展Request接口以包含用户信息
 */
declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}

/**
 * Token存储（简单内存存储，实际生产环境应使用Redis等）
 */
interface TokenInfo {
  ak: string;
  sk: string;
  createdAt: number;
}

// 简单的token存储（实际生产环境应使用Redis等）
const tokenStore = new Map<string, TokenInfo>();

/**
 * 认证服务 - 使用AK/SK验证
 */
export class AuthService {
  /**
   * 生成token（使用AK/SK）
   */
  static generateToken(ak: string, sk: string): string {
    // 生成简单的token（实际生产环境应使用JWT等）
    const token = `token_${ak.substring(0, 8)}_${Date.now()}`;
    
    // 存储token信息（有效期24小时）
    tokenStore.set(token, {
      ak,
      sk,
      createdAt: Date.now(),
    });

    // 清理过期token（24小时）
    setTimeout(() => {
      tokenStore.delete(token);
    }, 24 * 60 * 60 * 1000);

    return token;
  }

  /**
   * 验证token
   */
  static validateToken(token?: string): { valid: boolean; ak?: string; sk?: string; authority: string } {
    if (!token) {
      return { valid: false, authority: '' };
    }

    const tokenInfo = tokenStore.get(token);
    if (!tokenInfo) {
      return { valid: false, authority: '' };
    }

    // 检查token是否过期（24小时）
    const now = Date.now();
    if (now - tokenInfo.createdAt > 24 * 60 * 60 * 1000) {
      tokenStore.delete(token);
      return { valid: false, authority: '' };
    }

    return {
      valid: true,
      ak: tokenInfo.ak,
      sk: tokenInfo.sk,
      authority: 'admin',
    };
  }

  /**
   * 验证登录（兼容旧接口，但已不使用）
   */
  static validateLogin(token?: string, username?: string, password?: string): { valid: boolean; authority: string } {
    // 优先使用token验证
    if (token) {
      const tokenResult = this.validateToken(token);
      if (tokenResult.valid) {
        return { valid: true, authority: tokenResult.authority };
      }
    }

    return { valid: false, authority: '' };
  }

  /**
   * 获取当前用户信息
   */
  static getCurrentUser(authority: string, ak?: string) {
    return {
      name: ak ? `用户 ${ak.substring(0, 8)}...` : 'AIHC用户',
      avatar: 'https://gw.alipayobjects.com/zos/antfincdn/XAosXuNZyF/BiazfanxmamNRoxxVxka.png',
      userid: ak ? ak.substring(0, 16) : '00000001',
      email: 'user@aihc.com',
      access: authority,
    };
  }
}

/**
 * 认证中间件 - 使用token认证
 */
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // 检查是否已经认证（例如通过其他中间件）
  if (req.user) {
    return next();
  }

  // 从请求头或查询参数中获取token
  const token = req.headers.authorization?.replace('Bearer ', '') ||
                req.headers['x-auth-token'] as string ||
                req.query.token as string ||
                req.body?.token;

  // 验证token
  const tokenResult = AuthService.validateToken(token);

  if (!tokenResult.valid) {
    ResponseUtils.error(res, '认证失败，请重新登录', {
      code: 'AUTH_FAILED',
    });
    return;
  }

  // 设置用户信息到请求对象
  req.user = {
    authority: tokenResult.authority,
    ak: tokenResult.ak,
    sk: tokenResult.sk,
  };

  next();
};

/**
 * 权限验证中间件
 */
export const authorize = (requiredAuthority: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      ResponseUtils.error(res, '未认证', {
        code: 'NOT_AUTHENTICATED',
      });
      return;
    }

    // Admin权限可以访问所有资源
    if (req.user.authority === 'admin') {
      return next();
    }

    // 检查具体权限
    if (requiredAuthority && req.user.authority !== requiredAuthority) {
      ResponseUtils.error(res, '权限不足', {
        code: 'INSUFFICIENT_PERMISSIONS',
        required: requiredAuthority,
        current: req.user.authority,
      });
      return;
    }

    next();
  };
};

/**
 * 可选认证中间件 - 不强制要求认证
 */
export const optionalAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // 尝试获取认证信息，但不强制
  const token = req.headers.authorization?.replace('Bearer ', '') ||
                req.query.token as string;

  if (token) {
    const authResult = AuthService.validateLogin(token);
    if (authResult.valid) {
      req.user = {
        authority: authResult.authority,
      };
    }
  }

  next();
};