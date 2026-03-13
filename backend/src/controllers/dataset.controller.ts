import { Request, Response } from 'express';
import { ResponseUtils } from '@/utils/response.utils';
import { AihcSDK, AIHC_DEFAULT_BASE_URL } from '@/utils/sdk/aihc.sdk';
import { YamlConfigManager } from '@/config/yaml-config';
import { S3Client, ListObjectsV2Command, ListObjectsV2CommandOutput } from '@aws-sdk/client-s3';

/**
 * 数据集控制器
 */
export class DatasetController {
  /**
   * 获取数据集SDK实例（使用机器学习平台资源配置）
   */
  private static getDatasetSDK(): AihcSDK {
    const yamlConfig = YamlConfigManager.getInstance();
    const mlResourceConfig = yamlConfig.getMLResourceConfig();

    // 获取baseURL：优先使用机器学习平台配置，其次使用数据集管理配置，最后使用默认地址
    const baseURL = mlResourceConfig.baseURL;
    return new AihcSDK({
      accessKey: mlResourceConfig.ak,
      secretKey: mlResourceConfig.sk,
      baseURL: baseURL,
      defaultResourcePoolId: mlResourceConfig.poolId,
      defaultQueue: mlResourceConfig.queueId,
      defaultPfsInstanceId: mlResourceConfig.pfsInstanceId,
    });
  }

  /**
   * 获取 S3 客户端实例（BOS S3 兼容协议）
   */
  private static getS3Client(): S3Client {
    const yamlConfig = YamlConfigManager.getInstance();
    const mlResourceConfig = yamlConfig.getMLResourceConfig();

    // 使用 BOS S3 兼容 endpoint（文档：https://cloud.baidu.com/doc/BOS/s/Hjwvyq84s）
    const endpoint = `https://s3.${mlResourceConfig.region || 'bj'}.bcebos.com`;

    const s3Client = new S3Client({
      region: mlResourceConfig.region || 'bj',
      credentials: {
        accessKeyId: mlResourceConfig.ak,
        secretAccessKey: mlResourceConfig.sk,
      },
      endpoint: endpoint,
      forcePathStyle: false,
    });
    return s3Client;
  }

  /**
   * 查询数据集列表
   */
  public static async list(req: Request, res: Response): Promise<void> {
    try {
      const { pageNumber = 1, pageSize = 10, keyword, storageType, importFormat } = req.query;
      
      const sdk = DatasetController.getDatasetSDK();
      const yamlConfig = YamlConfigManager.getInstance();
      const mlResourceConfig = yamlConfig.getMLResourceConfig();
      const result = await sdk.describeDatasets({
        pageNumber: Number(pageNumber),
        pageSize: Number(pageSize),
        keyword: keyword as string,
        storageType: storageType as string,
        storageInstances: `${mlResourceConfig.pfsInstanceId},${mlResourceConfig.bucket}`,
        importFormat: importFormat as string,
      });

      ResponseUtils.success(res, result, '获取数据集列表成功');
    } catch (error) {
      console.error('获取数据集列表失败:', error);
      ResponseUtils.error(res, '获取数据集列表失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 查询数据集详情
   */
  public static async get(req: Request, res: Response): Promise<void> {
    try {
      const { datasetId } = req.params;
      
      if (!datasetId) {
        ResponseUtils.error(res, '数据集ID不能为空');
        return;
      }

      const sdk = DatasetController.getDatasetSDK();
      const result = await sdk.describeDataset(datasetId);

      ResponseUtils.success(res, result, '获取数据集详情成功');
    } catch (error) {
      console.error('获取数据集详情失败:', error);
      ResponseUtils.error(res, '获取数据集详情失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 查询数据集版本列表
   */
  public static async listVersions(req: Request, res: Response): Promise<void> {
    try {
      const { datasetId } = req.params;
      const { pageNumber = 1, pageSize = 0 } = req.query;
      
      if (!datasetId) {
        ResponseUtils.error(res, '数据集ID不能为空');
        return;
      }

      const sdk = DatasetController.getDatasetSDK();
      const result = await sdk.describeDatasetVersions(
        datasetId,
        Number(pageNumber),
        Number(pageSize)
      );

      ResponseUtils.success(res, result, '获取数据集版本列表成功');
    } catch (error) {
      console.error('获取数据集版本列表失败:', error);
      ResponseUtils.error(res, '获取数据集版本列表失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 创建数据集
   */
  public static async create(req: Request, res: Response): Promise<void> {
    try {
      const requestBody = req.body;
      
      if (!requestBody) {
        ResponseUtils.error(res, '请求体不能为空');
        return;
      }

      const sdk = DatasetController.getDatasetSDK();
      const result = await sdk.createDataset(requestBody);

      ResponseUtils.success(res, result, '创建数据集成功');
    } catch (error) {
      console.error('创建数据集失败:', error);
      ResponseUtils.error(res, '创建数据集失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 删除数据集
   */
  public static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { datasetId } = req.params;
      
      if (!datasetId) {
        ResponseUtils.error(res, '数据集ID不能为空');
        return;
      }

      const sdk = DatasetController.getDatasetSDK();
      const result = await sdk.deleteDataset(datasetId);

      ResponseUtils.success(res, result, '删除数据集成功');
    } catch (error) {
      console.error('删除数据集失败:', error);
      ResponseUtils.error(res, '删除数据集失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 创建数据集版本
   */
  public static async createVersion(req: Request, res: Response): Promise<void> {
    try {
      const { datasetId } = req.params;
      const requestBody = req.body;
      
      if (!datasetId) {
        ResponseUtils.error(res, '数据集ID不能为空');
        return;
      }
      
      if (!requestBody) {
        ResponseUtils.error(res, '请求体不能为空');
        return;
      }

      const sdk = DatasetController.getDatasetSDK();
      const result = await sdk.createDatasetVersion(datasetId, requestBody);

      ResponseUtils.success(res, result, '创建数据集版本成功');
    } catch (error) {
      console.error('创建数据集版本失败:', error);
      ResponseUtils.error(res, '创建数据集版本失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 删除数据集版本
   */
  public static async deleteVersion(req: Request, res: Response): Promise<void> {
    try {
      const { datasetId, versionId } = req.params;
      
      if (!datasetId) {
        ResponseUtils.error(res, '数据集ID不能为空');
        return;
      }
      
      if (!versionId) {
        ResponseUtils.error(res, '版本ID不能为空');
        return;
      }

      const sdk = DatasetController.getDatasetSDK();
      const result = await sdk.deleteDatasetVersion(datasetId, versionId);

      ResponseUtils.success(res, result, '删除数据集版本成功');
    } catch (error) {
      console.error('删除数据集版本失败:', error);
      ResponseUtils.error(res, '删除数据集版本失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 获取数据集文件列表（BOS存储）
   */
  public static async listFiles(req: Request, res: Response): Promise<void> {
    try {
      const { datasetId } = req.params;
      const { prefix = '', continuationToken = '', maxKeys = 1000 } = req.query;

      if (!datasetId) {
        ResponseUtils.error(res, '数据集ID不能为空');
        return;
      }

      const sdk = DatasetController.getDatasetSDK();

      // 获取数据集详情
      const datasetDetail = await sdk.describeDataset(datasetId);

      if (!datasetDetail) {
        ResponseUtils.error(res, '数据集不存在');
        return;
      }

      const storageType = datasetDetail.storageType;
      const storageInstance = datasetDetail.storageInstance;

      // 只支持 BOS 存储类型
      if (storageType !== 'BOS') {
        ResponseUtils.error(res, '当前只支持BOS存储类型的文件列表查询');
        return;
      }

      if (!storageInstance) {
        ResponseUtils.error(res, '数据集存储实例为空');
        return;
      }

      // 从版本信息中获取存储路径；若请求带了 prefix（子目录），则以其为准
      let storagePath = '';
      if (datasetDetail.versionEntry && datasetDetail.versionEntry.storagePath) {
        storagePath = datasetDetail.versionEntry.storagePath;
      } else if (datasetDetail.latestVersionEntry && datasetDetail.latestVersionEntry.storagePath) {
        storagePath = datasetDetail.latestVersionEntry.storagePath;
      }
      const requestPrefix = typeof prefix === 'string' ? prefix : '';
      const basePath = requestPrefix.trim() || storagePath;

      // S3/BOS 的 Prefix 不带前导斜杠；有内容时末尾加 / 表示列出该“目录”下直接子项
      const prefixForS3 = basePath
        ? basePath.replace(/^\/+/, '').replace(/([^/])$/, '$1/')
        : undefined;
      const prefixDisplay = basePath ? (basePath.startsWith('/') ? basePath : '/' + basePath) : '';

      // 使用 S3 协议获取文件列表
      const s3Client = DatasetController.getS3Client();
      const listCommand = new ListObjectsV2Command({
        Bucket: storageInstance,
        Prefix: prefixForS3,
        ContinuationToken: (continuationToken as string) || undefined,
        MaxKeys: Math.min(Math.max(parseInt(String(maxKeys), 10) || 1000, 1), 1000),
        Delimiter: '/',
      });

      const s3Result: ListObjectsV2CommandOutput = await s3Client.send(listCommand);

      const stripPrefix = (key: string): string => {
        if (!prefixForS3 || !key.startsWith(prefixForS3)) return key;
        return key.slice(prefixForS3.length) || key;
      };

      const files: any[] = [];
      const commonPrefixes: any[] = [];

      if (s3Result.Contents) {
        for (const obj of s3Result.Contents) {
          if (obj.Key === prefixForS3) continue;
          files.push({
            name: stripPrefix(obj.Key!),
            key: obj.Key,
            size: obj.Size,
            lastModified: obj.LastModified?.toISOString(),
            etag: obj.ETag,
            isDirectory: false,
          });
        }
      }

      if (s3Result.CommonPrefixes) {
        for (const prefixObj of s3Result.CommonPrefixes) {
          if (!prefixObj.Prefix) continue;
          commonPrefixes.push({
            name: stripPrefix(prefixObj.Prefix),
            key: prefixObj.Prefix,
            isDirectory: true,
          });
        }
      }

      ResponseUtils.success(res, {
        bucket: storageInstance,
        prefix: prefixDisplay,
        files,
        commonPrefixes,
        nextMarker: s3Result.NextContinuationToken || '',
        isTruncated: s3Result.IsTruncated || false,
      }, '获取文件列表成功');
    } catch (error: any) {
      console.error('获取文件列表失败:', error);
      const message = error?.code === 'ENOTFOUND'
        ? '无法解析存储服务地址，请检查网络或 VPN 是否已连接'
        : (error instanceof Error ? error.message : 'Unknown error');
      ResponseUtils.error(res, '获取文件列表失败', { error: message });
    }
  }

  /**
   * 检测数据集根目录是否为 Lance 格式（存在 _versions 或 data 目录，或 .lance 文件）
   */
  public static async checkLance(req: Request, res: Response): Promise<void> {
    try {
      const { datasetId } = req.params;
      if (!datasetId) {
        ResponseUtils.error(res, '数据集ID不能为空');
        return;
      }

      const sdk = DatasetController.getDatasetSDK();
      const datasetDetail = await sdk.describeDataset(datasetId);
      if (!datasetDetail || datasetDetail.storageType !== 'BOS' || !datasetDetail.storageInstance) {
        ResponseUtils.success(res, { isLance: false }, 'ok');
        return;
      }

      let storagePath = '';
      if (datasetDetail.versionEntry?.storagePath) {
        storagePath = datasetDetail.versionEntry.storagePath;
      } else if (datasetDetail.latestVersionEntry?.storagePath) {
        storagePath = datasetDetail.latestVersionEntry.storagePath;
      }

      const prefixForS3 = storagePath
        ? storagePath.replace(/^\/+/, '').replace(/([^/])$/, '$1/')
        : '';

      const s3Client = DatasetController.getS3Client();
      const listCommand = new ListObjectsV2Command({
        Bucket: datasetDetail.storageInstance,
        Prefix: prefixForS3,
        MaxKeys: 500,
        Delimiter: '/',
      });

      const s3Result: ListObjectsV2CommandOutput = await s3Client.send(listCommand);

      let isLance = false;
      const names = new Set<string>();

      if (s3Result.CommonPrefixes) {
        for (const p of s3Result.CommonPrefixes) {
          if (!p.Prefix) continue;
          const rel = prefixForS3 ? p.Prefix.slice(prefixForS3.length) : p.Prefix;
          const top = rel.split('/').filter(Boolean)[0] || '';
          names.add(top);
        }
      }
      if (s3Result.Contents) {
        for (const obj of s3Result.Contents || []) {
          if (!obj.Key) continue;
          const rel = prefixForS3 ? obj.Key.slice(prefixForS3.length) : obj.Key;
          if (rel.endsWith('.lance')) {
            isLance = true;
            break;
          }
          const top = rel.split('/').filter(Boolean)[0] || '';
          names.add(top);
        }
      }

      if (!isLance) {
        isLance = names.has('_versions') || names.has('data');
      }

      ResponseUtils.success(res, { isLance }, 'ok');
    } catch (error: any) {
      console.error('Lance 检测失败:', error);
      ResponseUtils.success(res, { isLance: false }, 'ok');
    }
  }

  /**
   * Lance 数据集 SQL 查询（需部署环境安装 Python3 及 lance、duckdb、s3fs 等依赖）
   */
  public static async queryLance(req: Request, res: Response): Promise<void> {
    try {
      const { datasetId } = req.params;
      const body = req.body as { sql?: string };
      const sql = typeof body?.sql === 'string' ? body.sql.trim() : '';

      if (!datasetId) {
        ResponseUtils.error(res, '数据集ID不能为空');
        return;
      }
      if (!sql) {
        ResponseUtils.error(res, 'SQL 不能为空');
        return;
      }

      const sdk = DatasetController.getDatasetSDK();
      const datasetDetail = await sdk.describeDataset(datasetId);
      if (!datasetDetail || datasetDetail.storageType !== 'BOS' || !datasetDetail.storageInstance) {
        ResponseUtils.error(res, '仅支持 BOS 存储类型的数据集');
        return;
      }

      let storagePath = '';
      if (datasetDetail.versionEntry?.storagePath) {
        storagePath = datasetDetail.versionEntry.storagePath;
      } else if (datasetDetail.latestVersionEntry?.storagePath) {
        storagePath = datasetDetail.latestVersionEntry.storagePath;
      }
      const prefix = storagePath.replace(/^\/+/, '').replace(/\/+$/, '') || '';
      const bucket = datasetDetail.storageInstance;
      const uri = `s3://${bucket}/${prefix}`;

      const yamlConfig = YamlConfigManager.getInstance();
      const ml = yamlConfig.getMLResourceConfig();
      const region = ml?.region || 'bj';
      const endpoint = `https://s3.${region}.bcebos.com`;

      const { spawn } = await import('child_process');
      const path = await import('path');
      const scriptPath = path.join(process.cwd(), 'scripts', 'query_lance.py');

      const env = {
        ...process.env,
        LANCE_S3_URI: uri,
        LANCE_SQL: sql,
        LANCE_S3_ENDPOINT: endpoint,
        LANCE_S3_ACCESS_KEY: ml?.ak || '',
        LANCE_S3_SECRET_KEY: ml?.sk || '',
        LANCE_S3_REGION: region,
      };

      const proc = spawn('python3', [scriptPath], {
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      proc.stdout?.on('data', (chunk) => { stdout += chunk.toString(); });
      proc.stderr?.on('data', (chunk) => { stderr += chunk.toString(); });

      const code = await new Promise<number>((resolve) => {
        proc.on('close', resolve);
      });

      if (code !== 0) {
        console.error('query_lance.py stderr:', stderr);
        ResponseUtils.error(res, 'SQL 执行失败', {
          error: stderr || stdout || `exit code ${code}`,
        });
        return;
      }

      let data: { columns?: string[]; rows?: any[][] };
      try {
        data = JSON.parse(stdout) as { columns?: string[]; rows?: any[][] };
      } catch {
        ResponseUtils.error(res, 'SQL 执行结果解析失败', { error: stdout.slice(0, 500) });
        return;
      }

      ResponseUtils.success(res, {
        columns: data?.columns ?? [],
        rows: data?.rows ?? [],
      }, '查询成功');
    } catch (error: any) {
      console.error('Lance SQL 查询失败:', error);
      ResponseUtils.error(res, 'Lance SQL 查询失败', {
        error: error?.message || 'Unknown error',
      });
    }
  }
}

