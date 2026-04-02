import { Request, Response } from 'express';
import { ResponseUtils } from '@/utils/response.utils';
import { AihcSDK, AIHC_DEFAULT_BASE_URL } from '@/utils/sdk/aihc.sdk';
import { YamlConfigManager } from '@/config/yaml-config';
import { S3Client, ListObjectsV2Command, ListObjectsV2CommandOutput, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * 数据集控制器
 */
export class DatasetController {
  /**
   * 获取数据集SDK实例（使用机器学习平台资源配置）
   */
  private static getDatasetSDK(ak: string): AihcSDK {
    const yamlConfig = YamlConfigManager.getInstance(ak);
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
  private static getS3Client(ak: string): S3Client {
    const yamlConfig = YamlConfigManager.getInstance(ak);
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
      
      const sdk = DatasetController.getDatasetSDK(req.user!.ak!);
      const yamlConfig = YamlConfigManager.getInstance(req.user!.ak!);
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

      const sdk = DatasetController.getDatasetSDK(req.user!.ak!);
      const result = await sdk.describeDataset(datasetId as string);

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

      const sdk = DatasetController.getDatasetSDK(req.user!.ak!);
      const result = await sdk.describeDatasetVersions(
        datasetId as string,
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

      const sdk = DatasetController.getDatasetSDK(req.user!.ak!);
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

      const sdk = DatasetController.getDatasetSDK(req.user!.ak!);
      const result = await sdk.deleteDataset(datasetId as string);

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

      const sdk = DatasetController.getDatasetSDK(req.user!.ak!);
      const result = await sdk.createDatasetVersion(datasetId as string, requestBody);

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

      const sdk = DatasetController.getDatasetSDK(req.user!.ak!);
      const result = await sdk.deleteDatasetVersion(datasetId as string, versionId as string);

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
      const { prefix = '', continuationToken = '', maxKeys = 1000, versionId } = req.query;

      if (!datasetId) {
        ResponseUtils.error(res, '数据集ID不能为空');
        return;
      }

      const sdk = DatasetController.getDatasetSDK(req.user!.ak!);

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

      // 从版本信息中获取存储路径；若请求带了 versionId 则从版本列表中取该版本的 storagePath
      let storagePath = '';
      const requestedVersionId = typeof versionId === 'string' ? versionId.trim() : '';
      if (requestedVersionId) {
        const versionListResult = await sdk.describeDatasetVersions(datasetId, 1, 100);
        const versionList: any[] = Array.isArray(versionListResult)
          ? versionListResult
          : versionListResult?.versions ?? versionListResult?.result ?? versionListResult?.data ?? versionListResult?.list ?? [];
        const versionEntry = versionList.find(
          (v: any) => (v.id && String(v.id) === requestedVersionId) || (v.versionId && String(v.versionId) === requestedVersionId)
        );
        if (versionEntry?.storagePath) {
          storagePath = versionEntry.storagePath;
        }
      }
      if (!storagePath && !requestedVersionId) {
        if (datasetDetail.versionEntry && datasetDetail.versionEntry.storagePath) {
          storagePath = datasetDetail.versionEntry.storagePath;
        } else if (datasetDetail.latestVersionEntry && datasetDetail.latestVersionEntry.storagePath) {
          storagePath = datasetDetail.latestVersionEntry.storagePath;
        }
      }
      const requestPrefix = typeof prefix === 'string' ? prefix : '';
      const basePath = requestPrefix.trim() || storagePath;

      // S3/BOS 的 Prefix 不带前导斜杠；有内容时末尾加 / 表示列出该“目录”下直接子项
      const prefixForS3 = basePath
        ? basePath.replace(/^\/+/, '').replace(/([^/])$/, '$1/')
        : undefined;
      const prefixDisplay = basePath ? (basePath.startsWith('/') ? basePath : '/' + basePath) : '';

      // 使用 S3 协议获取文件列表
      const s3Client = DatasetController.getS3Client(req.user!.ak!);
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
   * 获取单个文件的访问 URL（预签名，用于预览或下载）
   */
  public static async getFileAccessUrl(req: Request, res: Response): Promise<void> {
    try {
      const { datasetId } = req.params;
      const { key, disposition = 'inline' } = req.query;

      if (!datasetId || !key || typeof key !== 'string' || !key.trim()) {
        ResponseUtils.error(res, 'datasetId 与 key 不能为空');
        return;
      }

      const sdk = DatasetController.getDatasetSDK(req.user!.ak!);
      const datasetDetail = await sdk.describeDataset(datasetId);
      if (!datasetDetail) {
        ResponseUtils.error(res, '数据集不存在');
        return;
      }

      if (datasetDetail.storageType !== 'BOS') {
        ResponseUtils.error(res, '当前只支持 BOS 存储类型的文件访问');
        return;
      }

      const bucket = datasetDetail.storageInstance;
      if (!bucket) {
        ResponseUtils.error(res, '数据集存储实例为空');
        return;
      }

      const objectKey = key.trim();
      const isAttachment = disposition === 'attachment';
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        ...(isAttachment && {
          ResponseContentDisposition: `attachment; filename="${encodeURIComponent(objectKey.replace(/^.*\//, ''))}"`,
        }),
      });

      const s3Client = DatasetController.getS3Client(req.user!.ak!);
      const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      const suggestedFilename = objectKey.replace(/^.*\//, '');

      ResponseUtils.success(res, { url, suggestedFilename }, '获取成功');
    } catch (error: any) {
      console.error('获取文件访问 URL 失败:', error);
      const message = error?.code === 'ENOTFOUND'
        ? '无法解析存储服务地址，请检查网络或 VPN 是否已连接'
        : (error instanceof Error ? error.message : 'Unknown error');
      ResponseUtils.error(res, '获取文件访问 URL 失败', { error: message });
    }
  }

  /** 允许预览的文本文件扩展名（小写） */
  private static readonly PREVIEW_TEXT_EXT = new Set([
    'txt', 'json', 'yaml', 'yml', 'xml', 'md', 'csv', 'log', 'conf', 'cfg', 'ini', 'env', 'properties', 'text',
  ]);

  /** 预览文件最大大小（字节，默认 1MB） */
  private static readonly PREVIEW_MAX_BYTES = 1024 * 1024;

  /**
   * 获取文本文件内容（仅用于预览，仅支持 txt、json、yaml 等文本格式）
   */
  public static async getFileContent(req: Request, res: Response): Promise<void> {
    try {
      const { datasetId } = req.params;
      const { key } = req.query;

      if (!datasetId || !key || typeof key !== 'string' || !key.trim()) {
        ResponseUtils.error(res, 'datasetId 与 key 不能为空');
        return;
      }

      const objectKey = key.trim();
      const ext = objectKey.split('.').pop()?.toLowerCase() ?? '';
      if (!DatasetController.PREVIEW_TEXT_EXT.has(ext)) {
        ResponseUtils.error(res, '仅支持预览 txt、json、yaml、xml、md、csv 等文本格式文件');
        return;
      }

      const sdk = DatasetController.getDatasetSDK(req.user!.ak!);
      const datasetDetail = await sdk.describeDataset(datasetId);
      if (!datasetDetail) {
        ResponseUtils.error(res, '数据集不存在');
        return;
      }

      if (datasetDetail.storageType !== 'BOS') {
        ResponseUtils.error(res, '当前只支持 BOS 存储类型的文件访问');
        return;
      }

      const bucket = datasetDetail.storageInstance;
      if (!bucket) {
        ResponseUtils.error(res, '数据集存储实例为空');
        return;
      }

      const s3Client = DatasetController.getS3Client(req.user!.ak!);

      const headCommand = new HeadObjectCommand({ Bucket: bucket, Key: objectKey });
      const headResult = await s3Client.send(headCommand);
      const contentLength = headResult.ContentLength ?? 0;
      if (contentLength > DatasetController.PREVIEW_MAX_BYTES) {
        ResponseUtils.error(res, `文件过大，仅支持预览不超过 ${DatasetController.PREVIEW_MAX_BYTES / 1024}KB 的文本文件`);
        return;
      }

      const getCommand = new GetObjectCommand({ Bucket: bucket, Key: objectKey });
      const getResult = await s3Client.send(getCommand);
      if (!getResult.Body) {
        ResponseUtils.error(res, '文件内容为空');
        return;
      }

      const content = await getResult.Body.transformToString('utf-8');
      ResponseUtils.success(res, { content, filename: objectKey.replace(/^.*\//, '') }, '获取成功');
    } catch (error: any) {
      console.error('获取文件内容失败:', error);
      const message = error?.code === 'ENOTFOUND'
        ? '无法解析存储服务地址，请检查网络或 VPN 是否已连接'
        : (error instanceof Error ? error.message : 'Unknown error');
      ResponseUtils.error(res, '获取文件内容失败', { error: message });
    }
  }

  /**
   * 判断当前数据集根目录是否为 Lance 格式。
   * 逻辑：获取数据集根目录文件列表（BOS ListObjectsV2，Delimiter=/），根据目录结构判断：
   * - 存在 _versions 目录（Lance 版本清单）或 data 目录（Lance 数据目录），或
   * - 存在任意以 .lance 结尾的 key
   * 则视为 Lance 数据集。
   */
  public static async checkLance(req: Request, res: Response): Promise<void> {
    try {
      const { datasetId } = req.params;
      if (!datasetId) {
        ResponseUtils.error(res, '数据集ID不能为空');
        return;
      }

      const sdk = DatasetController.getDatasetSDK(req.user!.ak!);
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

      const s3Client = DatasetController.getS3Client(req.user!.ak!);
      const listCommand = new ListObjectsV2Command({
        Bucket: datasetDetail.storageInstance,
        Prefix: prefixForS3,
        MaxKeys: 500,
        Delimiter: '/',
      });

      const s3Result: ListObjectsV2CommandOutput = await s3Client.send(listCommand);

      const topLevelNames = new Set<string>();
      let hasLanceFile = false;

      if (s3Result.CommonPrefixes) {
        for (const p of s3Result.CommonPrefixes) {
          if (!p.Prefix) continue;
          const rel = prefixForS3 ? p.Prefix.slice(prefixForS3.length) : p.Prefix;
          const top = rel.split('/').filter(Boolean)[0] || '';
          topLevelNames.add(top);
        }
      }
      if (s3Result.Contents) {
        for (const obj of s3Result.Contents || []) {
          if (!obj.Key) continue;
          const rel = prefixForS3 ? obj.Key.slice(prefixForS3.length) : obj.Key;
          if (rel.endsWith('.lance')) {
            hasLanceFile = true;
            break;
          }
          const top = rel.split('/').filter(Boolean)[0] || '';
          topLevelNames.add(top);
        }
      }

      const isLance =
        hasLanceFile || topLevelNames.has('_versions') || topLevelNames.has('data');

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

      const sdk = DatasetController.getDatasetSDK(req.user!.ak!);
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

      const yamlConfig = YamlConfigManager.getInstance(req.user!.ak!);
      const ml = yamlConfig.getMLResourceConfig();
      const region = ml?.region || 'bj';
      const endpoint = `https://s3.${region}.bcebos.com`;

      const { spawn } = await import('child_process');
      const path = await import('path');
      const fs = await import('fs');
      const cwd = process.cwd();
      const scriptPath = path.join(cwd, 'scripts', 'query_lance.py');
      const venvPython = path.join(cwd, '.venv-lance', 'bin', 'python3');
      const pythonCmd = fs.existsSync(venvPython) ? venvPython : 'python3';

      const env = {
        ...process.env,
        LANCE_S3_URI: uri,
        LANCE_SQL: sql,
        LANCE_S3_ENDPOINT: endpoint,
        LANCE_S3_ACCESS_KEY: ml?.ak || '',
        LANCE_S3_SECRET_KEY: ml?.sk || '',
        LANCE_S3_REGION: region,
      };

      const proc = spawn(pythonCmd, [scriptPath], {
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

