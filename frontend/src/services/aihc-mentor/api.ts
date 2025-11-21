import { request } from '@umijs/max';

// API响应类型定义
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  details?: any;
  filepath?: string;
  content?: string;
  cardCount?: number;
  stats?: {
    totalCards: number;
    checkedCards: number;
    skippedCards: number;
    nonCompliantCards: number;
  };
}

// 卡片规范性检测相关类型定义
export interface CardItem {
  id: string;
  sequence: number;
  title: string;
  status: string;
  type: string;
  pmOwner?: string;
  techHandler?: string;
  nextFollowUpDate?: string;
  expectedOnlineDate?: string;
  complianceIssues?: string[];
  lastCheckTime?: string;
  isCompliant: boolean;
}

export interface CheckHistory {
  id: string;
  checkTime: string;
  cardType: string;
  cardTypeName: string;
  totalCards: number;
  nonCompliantCards: number;
  notificationStatus: string;
}

export interface CheckResult {
  checkTime: string;
  cardType: string;
  cardTypeName: string;
  totalCards: number;
  nonCompliantCards: number;
  issues: Array<{
    cardId: string;
    title: string;
    issues: string[];
    responsiblePerson: string;
  }>;
}

// KU文档创建参数
export interface KuDocCreateParams {
  title: string;
  content: string;
  creator: string;
}


// 创建KU文档
export async function createKuDoc(params: KuDocCreateParams): Promise<ApiResponse> {
  return request('/api/ku-create-doc', {
    method: 'POST',
    data: params,
  });
}


// =============================================================================
// 配置管理相关 API
// =============================================================================

// 配置数据类型定义
export interface ConfigData {
  [section: string]: {
    [key: string]: any;
  };
}

export interface ConfigResponse {
  config: ConfigData;
  config_file_exists: boolean;
  config_file_path: string;
}

export interface ValidationResponse {
  is_valid: boolean;
  errors: string[];
}

// 获取所有配置信息
export async function getConfig(): Promise<ApiResponse<ConfigResponse>> {
  return request('/api/config', {
    method: 'GET',
  });
}

// 更新配置
export async function updateConfig(data: { config: ConfigData }): Promise<ApiResponse> {
  return request('/api/config', {
    method: 'PUT',
    data,
  });
}

// 验证配置
export async function validateConfig(): Promise<ApiResponse<ValidationResponse>> {
  return request('/api/config/validate', {
    method: 'POST',
  });
}

// 获取配置模板
export async function getConfigTemplate(): Promise<ApiResponse<ConfigData>> {
  return request('/api/config/template', {
    method: 'GET',
  });
}
