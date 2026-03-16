import { request } from '@umijs/max';

/**
 * 获取仓库列表
 */
export async function getRepositories(params?: {
  prefix?: string;
  after?: string;
  amount?: number;
}) {
  return request('/api/lakefs/repositories', {
    method: 'GET',
    params,
  });
}

/**
 * 获取分支列表
 */
export async function getBranches(
  repository: string,
  params?: {
    prefix?: string;
    after?: string;
    amount?: number;
  },
) {
  return request(`/api/lakefs/repositories/${repository}/branches`, {
    method: 'GET',
    params,
  });
}

/**
 * 获取对象/文件列表
 */
export async function listObjects(
  repository: string,
  ref: string,
  params?: {
    prefix?: string;
    after?: string;
    amount?: number;
    delimiter?: string;
  },
) {
  return request(`/api/lakefs/repositories/${repository}/refs/${ref}/objects/ls`, {
    method: 'GET',
    params,
  });
}

/**
 * 创建仓库
 */
export async function createRepository(data: {
  id: string;
  defaultBranch?: string;
  storageNamespace: string;
}) {
  return request('/api/lakefs/repositories', {
    method: 'POST',
    data,
  });
}

/**
 * 创建新分支
 */
export async function createBranch(
  repository: string,
  data: {
    name: string;
    source: string;
  },
) {
  return request(`/api/lakefs/repositories/${repository}/branches`, {
    method: 'POST',
    data,
  });
}

/**
 * 获取对象文本内容
 */
export async function getObjectContent(
  repository: string,
  ref: string,
  params: { path: string }
) {
  return request(`/api/lakefs/repositories/${repository}/refs/${ref}/objects/content`, {
    method: 'GET',
    params,
  });
}

/**
 * 获取提交记录 (Commits)
 */
export async function logCommits(
  repository: string,
  ref: string,
  params?: {
    after?: string;
    amount?: number;
  },
) {
  return request(`/api/lakefs/repositories/${repository}/refs/${ref}/commits`, {
    method: 'GET',
    params,
  });
}

/**
 * 提交分支上的更改 (Commit)
 */
export async function commitChanges(
  repository: string,
  branch: string,
  data: {
    message: string;
    metadata?: Record<string, string>;
  },
) {
  return request(`/api/lakefs/repositories/${repository}/branches/${branch}/commits`, {
    method: 'POST',
    data,
  });
}

/**
 * 获取分支的未提交更改差异 (Diff)
 */
export async function getBranchDiff(repository: string, branch: string) {
  return request(`/api/lakefs/repositories/${repository}/branches/${branch}/diff`, {
    method: 'GET',
  });
}
