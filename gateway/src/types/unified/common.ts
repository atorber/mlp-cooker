/**
 * 统一的环境变量配置
 * 使用对象形式，更简洁
 */
export type EnvironmentVariables = Record<string, string>;

/**
 * 标签配置
 */
export type Labels = Record<string, string>;

/**
 * 键值对（用于后端兼容）
 */
export interface KeyValue {
  name: string;
  value: string;
}

/**
 * 分页参数
 */
export interface Pagination {
  /** 页码，从1开始 */
  pageNumber: number;
  /** 每页数量 */
  pageSize: number;
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  /** 数据列表 */
  items: T[];
  /** 分页信息 */
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * 统一响应格式
 */
export interface ApiResponse<T = unknown> {
  /** 状态码，0表示成功 */
  code: number;
  /** 消息 */
  message: string;
  /** 请求ID */
  requestId: string;
  /** 数据 */
  data?: T;
}

/**
 * 错误详情
 */
export interface ErrorDetail {
  /** 字段名 */
  field: string;
  /** 错误消息 */
  message: string;
}

/**
 * 错误响应
 */
export interface ErrorResponse {
  code: number;
  message: string;
  requestId: string;
  details?: ErrorDetail[];
}

/**
 * 排序参数
 */
export interface SortParams {
  /** 排序字段 */
  orderBy?: string;
  /** 排序方向 */
  order?: 'asc' | 'desc';
}

/**
 * 时间范围
 */
export interface TimeRange {
  /** 开始时间 */
  startAt?: string;
  /** 结束时间 */
  endAt?: string;
}
