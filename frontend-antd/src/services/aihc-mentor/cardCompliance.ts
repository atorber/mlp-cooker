// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 卡片规范性检测接口 POST /api/card-compliance/check */
export async function checkCardCompliance(
  body: {
    cardType: 'customer_demand' | 'customer_issue';
    immediate?: boolean;
  },
  options?: { [key: string]: any },
) {
  return request<API.Response>('/api/card-compliance/check', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取卡片列表接口 GET /api/card-compliance/cards */
export async function getCards(
  params: {
    type: 'customer_demand' | 'customer_issue';
    checkStatus?: 'all' | 'compliant' | 'non_compliant';
  },
  options?: { [key: string]: any },
) {
  return request<API.Response>('/api/card-compliance/cards', {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

/** 发送通知接口 POST /api/card-compliance/notifications/send */
export async function sendNotification(
  body: {
    cardId: string;
    notificationType: 'private_message' | 'group_announcement';
  },
  options?: { [key: string]: any },
) {
  return request<API.Response>('/api/card-compliance/notifications/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取检测历史接口 GET /api/card-compliance/check-history */
export async function getCheckHistory(
  params: {
    type: 'customer_demand' | 'customer_issue';
    limit?: number;
  },
  options?: { [key: string]: any },
) {
  return request<API.Response>('/api/card-compliance/check-history', {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

/** 手动触发检测接口 POST /api/card-compliance/check-manual */
export async function manualCheck(
  body: {
    cardType: 'customer_demand' | 'customer_issue';
    notify?: boolean;
  },
  options?: { [key: string]: any },
) {
  return request<API.Response>('/api/card-compliance/check-manual', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取定时任务状态接口 GET /api/card-compliance/scheduler/status */
export async function getSchedulerStatus(options?: { [key: string]: any }) {
  return request<API.Response>('/api/card-compliance/scheduler/status', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 启动定时任务调度器接口 POST /api/card-compliance/scheduler/start */
export async function startScheduler(options?: { [key: string]: any }) {
  return request<API.Response>('/api/card-compliance/scheduler/start', {
    method: 'POST',
    ...(options || {}),
  });
}

/** 停止定时任务调度器接口 POST /api/card-compliance/scheduler/stop */
export async function stopScheduler(options?: { [key: string]: any }) {
  return request<API.Response>('/api/card-compliance/scheduler/stop', {
    method: 'POST',
    ...(options || {}),
  });
}