import type { EnvironmentVariables, KeyValue } from '../types/unified/index.js';

/**
 * 环境变量转换器
 */
export class EnvVarsTransformer {
  /**
   * 对象形式 -> 数组形式（用于训练任务）
   */
  toArray(envs: EnvironmentVariables): KeyValue[] {
    return Object.entries(envs).map(([name, value]) => ({
      name,
      value,
    }));
  }

  /**
   * 数组形式 -> 对象形式
   */
  fromArray(envs: KeyValue[]): EnvironmentVariables {
    const result: EnvironmentVariables = {};
    for (const { name, value } of envs) {
      result[name] = value;
    }
    return result;
  }

  /**
   * 确保是对象形式（用于服务部署、开发机）
   */
  toObject(envs: EnvironmentVariables | KeyValue[] | undefined): EnvironmentVariables {
    if (!envs) {
      return {};
    }
    if (Array.isArray(envs)) {
      return this.fromArray(envs);
    }
    return envs;
  }
}

/**
 * 标签转换器
 */
export class LabelsTransformer {
  /**
   * 对象形式 -> 数组形式（用于训练任务）
   */
  toArray(labels: Record<string, string>): KeyValue[] {
    return Object.entries(labels).map(([key, value]) => ({
      name: key,
      value,
    }));
  }

  /**
   * 数组形式 -> 对象形式
   */
  fromArray(labels: { key: string; value: string }[]): Record<string, string> {
    const result: Record<string, string> = {};
    for (const { key, value } of labels) {
      result[key] = value;
    }
    return result;
  }
}

export const envVarsTransformer = new EnvVarsTransformer();
export const labelsTransformer = new LabelsTransformer();
