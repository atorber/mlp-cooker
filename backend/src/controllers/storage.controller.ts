import { Request, Response } from 'express';
import { ResponseUtils } from '@/utils/response.utils';
import { YamlConfigManager } from '@/config/yaml-config';
import { S3Client, ListObjectsV2Command, ListObjectsV2CommandOutput } from '@aws-sdk/client-s3';
import { AihcSDK } from '@/utils/sdk/aihc.sdk';
import { runWebShellCommand, stripAnsi } from '@/utils/webterminal-exec';

const MLP_COOKER_JOB_NAME = 'mlp-cooker';
const PFS_MOUNT = '/data';

function getPfsJobSdk(ak: string): AihcSDK {
  const yamlConfig = YamlConfigManager.getInstance(ak);
  const mlResourceConfig = yamlConfig.getMLResourceConfig();
  return new AihcSDK({
    accessKey: mlResourceConfig.ak,
    secretKey: mlResourceConfig.sk,
    baseURL: mlResourceConfig.baseURL || 'https://aihc.bj.baidubce.com',
    defaultResourcePoolId: mlResourceConfig.poolId || '',
    defaultQueue: mlResourceConfig.queueId || '',
    defaultPfsInstanceId: mlResourceConfig.pfsInstanceId || '',
  });
}

function sanitizePfsRelPath(pathParam: string): string {
  const s = pathParam.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!s) return '';
  const parts = s.split('/').filter((p) => p && p !== '.' && p !== '..');
  return parts.join('/');
}

function toFsPath(rel: string): string {
  const clean = sanitizePfsRelPath(rel);
  if (!clean) return PFS_MOUNT;
  return `${PFS_MOUNT}/${clean}`;
}

function extractJobsList(result: any): any[] {
  const j =
    result?.jobs ??
    result?.result?.jobs ??
    result?.data?.jobs ??
    result?.data?.data?.jobs;
  return Array.isArray(j) ? j : [];
}

function extractPods(detail: any): any[] {
  const j = detail?.job ?? detail?.result?.job ?? detail;
  const pods = j?.pods ?? detail?.pods ?? detail?.result?.pods;
  return Array.isArray(pods) ? pods : [];
}

function getFirstPodName(detail: any): string | null {
  const pods = extractPods(detail);
  if (pods.length === 0) return null;
  const p = pods[0];
  const name = p?.podName ?? p?.name ?? p?.PodName;
  return typeof name === 'string' && name.length > 0 ? name : null;
}

function extractWebTerminalUrl(result: any): string | null {
  if (!result || typeof result !== 'object') return null;
  const candidates = [
    result.WebTerminalUrl,
    result.webTerminalUrl,
    result.result?.WebTerminalUrl,
    result.result?.webTerminalUrl,
    result.data?.WebTerminalUrl,
    result.data?.webTerminalUrl,
  ];
  for (const u of candidates) {
    if (typeof u === 'string' && (u.startsWith('ws://') || u.startsWith('wss://'))) {
      return u;
    }
  }
  return null;
}

function parseMarkedLsOutput(raw: string): string[] {
  const text = stripAnsi(raw);
  const start = text.indexOf('__PFS_LIST_START__');
  const end = text.indexOf('__PFS_LIST_END__');
  if (start === -1 || end === -1 || end <= start) {
    return [];
  }
  const block = text.slice(start + '__PFS_LIST_START__'.length, end);
  return block
    .split(/\r?\n/)
    .map((l) => l.replace(/\r$/, '').trim())
    .filter((l) => l.length > 0);
}

/**
 * 将完整脚本 base64 后由 sh 一次性执行，避免 WebTerminal 对长行分段执行导致只有 echo 生效、后续片段被当作输出混入列表。
 */
function buildListCommand(fsPath: string): string {
  const pathB64 = Buffer.from(fsPath, 'utf-8').toString('base64');
  const innerScript = [
    'echo __PFS_LIST_START__',
    `P=$(printf '%s' '${pathB64}' | base64 -d)`,
    // -1：每行一个条目；否则 ls 在「终端宽度」下会多列输出，空格拼接会被误解析成一条「多层路径」
    'ls -1FA "$P" 2>&1',
    'echo __PFS_LIST_END__',
  ].join('; ');
  const scriptB64 = Buffer.from(innerScript, 'utf-8').toString('base64');
  return `printf '%s' '${scriptB64}' | base64 -d | sh`;
}

/**
 * 平台存储浏览（对象存储桶 / PFS）
 */
export class StorageController {
  private static getS3Client(ak: string): S3Client {
    const yamlConfig = YamlConfigManager.getInstance(ak);
    const mlResourceConfig = yamlConfig.getMLResourceConfig();
    const endpoint = `https://s3.${mlResourceConfig.region || 'bj'}.bcebos.com`;
    return new S3Client({
      region: mlResourceConfig.region || 'bj',
      credentials: {
        accessKeyId: mlResourceConfig.ak,
        secretAccessKey: mlResourceConfig.sk,
      },
      endpoint,
      forcePathStyle: false,
    });
  }

  /**
   * 列举配置中对象存储桶（BOS）下的对象（目录 + 文件）
   * GET /api/storage/bucket/files?prefix=&continuationToken=&maxKeys=
   */
  public static async listBucketFiles(req: Request, res: Response): Promise<void> {
    try {
      const yamlConfig = YamlConfigManager.getInstance(req.user!.ak!);
      const mlResourceConfig = yamlConfig.getMLResourceConfig();
      const bucket = mlResourceConfig.bucket?.trim();
      if (!bucket) {
        ResponseUtils.error(res, '未配置 ML_PLATFORM_RESOURCE_BUCKET，请在全局配置中填写对象存储桶');
        return;
      }

      const { prefix = '', continuationToken = '', maxKeys = 500 } = req.query;
      const rawPrefix = typeof prefix === 'string' ? prefix : '';
      const prefixForS3 = rawPrefix
        ? rawPrefix.replace(/^\/+/, '').replace(/([^/])$/, '$1/')
        : undefined;

      const s3Client = StorageController.getS3Client(req.user!.ak!);
      const listCommand = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefixForS3,
        ContinuationToken: (continuationToken as string) || undefined,
        MaxKeys: Math.min(Math.max(parseInt(String(maxKeys), 10) || 500, 1), 1000),
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

      const prefixDisplay = rawPrefix
        ? rawPrefix.startsWith('/')
          ? rawPrefix
          : `/${rawPrefix}`
        : '/';

      ResponseUtils.success(
        res,
        {
          bucket,
          prefix: prefixDisplay,
          /** 请求使用的原始 prefix（不含前导 /），用于前端面包屑与继续请求 */
          prefixRaw: rawPrefix,
          files,
          commonPrefixes,
          nextMarker: s3Result.NextContinuationToken || '',
          isTruncated: s3Result.IsTruncated || false,
        },
        '获取存储桶文件列表成功',
      );
    } catch (error: any) {
      console.error('获取存储桶文件列表失败:', error);
      const message =
        error?.code === 'ENOTFOUND'
          ? '无法解析存储服务地址，请检查网络或 VPN 是否已连接'
          : error instanceof Error
            ? error.message
            : 'Unknown error';
      ResponseUtils.error(res, '获取存储桶文件列表失败', { error: message });
    }
  }

  /**
   * PFS 文件目录列举：通过 DescribeJobWebterminal 获取 WebTerminal 地址，在 Pod 内执行 ls 列出 /data 挂载目录。
   * GET /api/storage/pfs/files?path=
   */
  public static async listPfsFiles(req: Request, res: Response): Promise<void> {
    try {
      const yamlConfig = YamlConfigManager.getInstance(req.user!.ak!);
      const mlResourceConfig = yamlConfig.getMLResourceConfig();
      const instanceId = mlResourceConfig.pfsInstanceId?.trim();
      if (!instanceId) {
        ResponseUtils.error(res, '未配置 ML_PLATFORM_RESOURCE_PFS_INSTANCE_ID，请在全局配置中填写 PFS 存储实例');
        return;
      }

      const pathParam = typeof req.query.path === 'string' ? req.query.path : '';
      const rel = sanitizePfsRelPath(pathParam);
      const displayPath = rel ? `/${rel}` : '/';
      const fsPath = toFsPath(rel);
      const wantDebug =
        req.query.debug === '1' ||
        String(req.query.debug ?? '').toLowerCase() === 'true';

      const poolId = 'aihc-serverless';
      const queueId = mlResourceConfig.queueId?.trim() || '';

      const sdk = getPfsJobSdk(req.user!.ak!);
      const jobsResult = await sdk.describeJobs(poolId, queueId, {
        keyword: MLP_COOKER_JOB_NAME,
      });
      const jobs = extractJobsList(jobsResult);
      const mlpJob = jobs.find((j: any) => j.name === MLP_COOKER_JOB_NAME);
      if (!mlpJob) {
        ResponseUtils.error(res, '未找到 mlp-cooker 组件，请先在存储管理或队列详情中初始化该组件', {
          code: 'MLP_COOKER_JOB_MISSING',
        });
        return;
      }

      const jobId = String(mlpJob.jobId ?? mlpJob.id ?? mlpJob.JobId ?? '').trim();
      if (!jobId) {
        ResponseUtils.error(res, '无法解析 mlp-cooker 任务 ID');
        return;
      }

      const detail = await sdk.describeJob(jobId, poolId, queueId, true);
      const podName = getFirstPodName(detail);
      if (!podName) {
        ResponseUtils.error(res, '任务暂无可用 Pod，请确认 mlp-cooker 已运行且 Pod 就绪');
        return;
      }

      const wtResult = await sdk.describeJobWebterminal(
        poolId,
        jobId,
        podName,
        30,
        900,
        queueId,
      );
      const wsUrl = extractWebTerminalUrl(wtResult);
      if (!wsUrl) {
        ResponseUtils.error(res, '未能获取 WebTerminal 连接地址，请稍后重试或检查任务状态');
        return;
      }

      const cmd = buildListCommand(fsPath);
      const rawOut = await runWebShellCommand(wsUrl, cmd, { timeoutMs: 25000, settleMs: 900 });
      const lines = parseMarkedLsOutput(rawOut);

      if (wantDebug) {
        console.warn('[PFS list debug]', {
          fsPath,
          jobId,
          podName,
          cmdLen: cmd.length,
          cmdPreview: cmd.slice(0, 160),
          rawLen: rawOut.length,
          hasStart: rawOut.includes('__PFS_LIST_START__'),
          hasEnd: rawOut.includes('__PFS_LIST_END__'),
          rawPreview: rawOut.slice(0, 800),
          parsedLines: lines.length,
        });
      }

      const commonPrefixes: any[] = [];
      const files: any[] = [];

      for (const line of lines) {
        if (
          /^\s*;\s*P=\$\(printf/.test(line) ||
          /base64\s+-d/.test(line) ||
          /^\s*ls\s+-FA/.test(line)
        ) {
          continue;
        }
        if (line.includes('__PFS_LIST') || /^total\s+\d+$/i.test(line)) {
          continue;
        }
        if (/No such file or directory/i.test(line) || /^ls: /.test(line)) {
          ResponseUtils.error(res, `无法列出目录：${line}`, {
            path: displayPath,
          });
          return;
        }
        const isDir = line.endsWith('/');
        let name = line;
        if (isDir) {
          name = name.slice(0, -1);
        } else {
          if (name.endsWith('*')) name = name.slice(0, -1);
          if (name.endsWith('@')) name = name.slice(0, -1);
        }
        if (!name || name === '.' || name === '..') continue;

        const childRel = rel ? `${rel}/${name}` : name;
        if (isDir) {
          commonPrefixes.push({
            name,
            key: `${childRel}/`,
            isDirectory: true,
          });
        } else {
          files.push({
            name,
            key: childRel,
            isDirectory: false,
          });
        }
      }

      commonPrefixes.sort((a, b) => String(a.name).localeCompare(String(b.name)));
      files.sort((a, b) => String(a.name).localeCompare(String(b.name)));

      const payload: Record<string, unknown> = {
        instanceId,
        path: displayPath,
        prefixRaw: rel,
        files,
        commonPrefixes,
        nextMarker: '',
        isTruncated: false,
      };
      if (wantDebug) {
        payload.debug = {
          fsPath,
          jobId,
          podName,
          commandLength: cmd.length,
          commandPreview: cmd.slice(0, 200),
          rawLength: rawOut.length,
          rawPreview: rawOut.slice(0, 2000),
          hasStartMarker: rawOut.includes('__PFS_LIST_START__'),
          hasEndMarker: rawOut.includes('__PFS_LIST_END__'),
          parsedLineCount: lines.length,
          sampleParsedLines: lines.slice(0, 30),
        };
      }

      ResponseUtils.success(res, payload, '获取 PFS 文件列表成功');
    } catch (error) {
      console.error('PFS 文件列表接口异常:', error);
      ResponseUtils.error(res, '获取 PFS 文件列表失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
