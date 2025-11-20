// API响应类型定义 - 保持与Python后端完全一致
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

// 当前用户信息
export interface CurrentUser {
  name: string;
  avatar: string;
  userid: string;
  email?: string;
  signature?: string;
  title?: string;
  group?: string;
  tags?: Array<{ key: string; label: string }>;
  notifyCount?: number;
  unreadCount?: number;
  country?: string;
  access?: string;
  geographic?: {
    province?: { label: string; key: string };
    city?: { label: string; key: string };
  };
  address?: string;
  phone?: string;
}

// 登录参数
export interface LoginParams {
  ak?: string;
  sk?: string;
  username?: string;
  password?: string;
  token?: string;
  type?: string;
}

// 登录结果
export interface LoginResult {
  status?: string;
  type?: string;
  currentAuthority?: string;
}

// 请求用户信息
export interface RequestUser {
  authority: string;
  ak?: string;
  sk?: string;
}