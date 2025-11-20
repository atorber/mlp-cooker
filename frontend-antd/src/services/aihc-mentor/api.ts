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

// iCafe调试参数
export interface IcafeDebugParams {
  iql: string;
}

// 每日报告参数
export interface DailyReportParams {
  saveToFile: boolean;
}


// 获取上周问题统计
export async function getIcafeLastweek(): Promise<ApiResponse> {
  return request('/api/icafe-lastweek', {
    method: 'GET',
  });
}

// 获取2025H2需求统计
export async function getIcafe2025h2(): Promise<ApiResponse> {
  return request('/api/icafe-2025h2', {
    method: 'GET',
  });
}

// 获取每日报告
export async function getDailyReport(saveToFile: boolean = false): Promise<ApiResponse> {
  return request(`/api/daily-report?saveToFile=${saveToFile}`, {
    method: 'GET',
  });
}

// 主查询
export async function getMainQuery(): Promise<ApiResponse> {
  return request('/api/main-query', {
    method: 'POST',
  });
}

// iCafe调试
export async function debugIcafe(params: IcafeDebugParams): Promise<ApiResponse> {
  return request('/api/icafe-debug', {
    method: 'POST',
    data: params,
  });
}

// 创建KU文档
export async function createKuDoc(params: KuDocCreateParams): Promise<ApiResponse> {
  return request('/api/ku-create-doc', {
    method: 'POST',
    data: params,
  });
}

// 卡片规范性检测相关API
export async function checkCardCompliance(
  cardType: 'customer_demand' | 'customer_issue',
  immediate: boolean = false
): Promise<ApiResponse<CheckResult>> {
  return request('/api/card-compliance/check', {
    method: 'POST',
    data: { cardType, immediate },
  });
}

export async function getCards(
  type: 'customer_demand' | 'customer_issue',
  checkStatus: 'all' | 'compliant' | 'non_compliant' = 'all'
): Promise<ApiResponse<CardItem[]>> {
  return request(`/api/card-compliance/cards`, {
    method: 'GET',
    params: { type, checkStatus },
  });
}

export async function manualCheck(
  cardType: 'customer_demand' | 'customer_issue',
  notify: boolean = true
): Promise<ApiResponse<CheckResult>> {
  return request('/api/card-compliance/check-manual', {
    method: 'POST',
    data: { cardType, notify },
  });
}

export async function getCheckHistory(
  type: 'customer_demand' | 'customer_issue',
  limit: number = 10
): Promise<ApiResponse<CheckHistory[]>> {
  return request('/api/card-compliance/check-history', {
    method: 'GET',
    params: { type, limit },
  });
}

export async function sendNotification(
  cardId: string,
  notificationType: 'private_message' | 'group_announcement',
  recipientUsername?: string,
  complianceIssues?: string[]
): Promise<ApiResponse<any>> {
  const data: any = { cardId, notificationType };
  if (recipientUsername) {
    data.recipientUsername = recipientUsername;
  }
  if (complianceIssues) {
    data.complianceIssues = complianceIssues;
  }
  return request('/api/card-compliance/notifications/send', {
    method: 'POST',
    data,
  });
}

// 获取单张卡片详情
export async function getCardDetails(sequence: number) {
  return request<ApiResponse>(`/api/icafe/card/${sequence}`, {
    method: 'GET',
  });
}

// 获取卡片历史
export async function getCardHistory(sequence: number) {
  return request<ApiResponse>(`/api/icafe/card/${sequence}/history`, {
    method: 'GET',
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
