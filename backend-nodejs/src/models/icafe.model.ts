import { BaseEntity } from './common';

/**
 * iCafe卡片信息
 */
export interface IcafeCard {
  sequence: number;
  title: string;
  type: string;
  status: string;
  creator?: string;
  techHandler?: string;
  pmOwner?: string;
  createTime?: string | number;
  updateTime?: string | number;
  expectedOnlineTime?: string;
  severity?: string;
  description?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

/**
 * iCafe历史记录
 */
export interface IcafeCardHistory {
  id: string;
  cardId: string;
  sequence: number;
  action: string;
  field: string;
  oldValue?: any;
  newValue?: any;
  operator?: string;
  operateTime: string;
  comment?: string;
}

/**
 * iCafe统计信息
 */
export interface IcafeStatistics {
  totalCount: number;
  typeStatistics: Record<string, number>;
  statusStatistics: Record<string, number>;
  timeRange: {
    startDate: string;
    endDate: string;
  };
}

/**
 * iCafe查询参数
 */
export interface IcafeQueryParams {
  iql?: string;
  cardTypes?: string[];
  startDate?: string;
  endDate?: string;
  creator?: string;
  status?: string;
  severity?: string;
  page?: number;
  pageSize?: number;
}