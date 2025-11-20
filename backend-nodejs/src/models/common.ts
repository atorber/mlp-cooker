/**
 * 基础数据模型接口
 */

/**
 * 基础实体接口
 */
export interface BaseEntity {
  id: string;
  createTime: number;
  updateTime: number;
}

/**
 * 任务状态枚举
 */
export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * 任务基础接口
 */
export interface TaskEntity extends BaseEntity {
  status: TaskStatus;
  progress: number; // 0-100
  message?: string;
  error?: string;
}

/**
 * 分页请求参数
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}