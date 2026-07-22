import {
  FolderOutlined,
  FileOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { Link, request } from '@umijs/max';
import {
  Alert,
  App,
  Breadcrumb,
  Button,
  Card,
  Modal,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

const { Text } = Typography;

function getMlpCookerJobStatusInfo(status: unknown): {
  text: string;
  color: string;
  failed: boolean;
} {
  const normalized = status != null ? String(status).toLowerCase() : '';
  const statusTextMap: Record<string, string> = {
    running: '运行中',
    pending: '等待中',
    stopped: '已停止',
    completed: '已完成',
    manualtermination: '手动终止',
    error: '错误',
    failed: '失败',
  };
  const failed = normalized === 'failed' || normalized === 'error';
  const color =
    normalized === 'running'
      ? 'success'
      : normalized === 'pending'
        ? 'warning'
        : failed
          ? 'error'
          : 'default';
  return {
    text: statusTextMap[normalized] || (status != null ? String(status) : '未知'),
    color,
    failed,
  };
}

interface FileRow {
  key: string;
  name: string;
  storageKey: string;
  isDirectory: boolean;
  size?: number;
  lastModified?: string;
}

const StorageManagement: React.FC = () => {
  const { message: messageApi } = App.useApp();
  const [activeTab, setActiveTab] = useState<string>('bucket');

  /* —— 存储桶 —— */
  const [bucketLoading, setBucketLoading] = useState(false);
  const [bucketName, setBucketName] = useState('');
  const [prefixRaw, setPrefixRaw] = useState('');
  const [bucketRows, setBucketRows] = useState<FileRow[]>([]);
  const [nextMarker, setNextMarker] = useState('');
  const [isTruncated, setIsTruncated] = useState(false);

  const fetchBucketFiles = useCallback(
    async (prefix: string, continuationToken?: string) => {
      setBucketLoading(true);
      try {
        const params: Record<string, string> = {};
        if (prefix) params.prefix = prefix;
        if (continuationToken) params.continuationToken = continuationToken;

        const res = await request('/api/storage/bucket/files', {
          method: 'GET',
          params,
        });

        if (!res.success) {
          messageApi.error(res.message || '获取存储桶文件失败');
          setBucketRows([]);
          return;
        }

        const data = res.data;
        setBucketName(data.bucket || '');

        const rows: FileRow[] = [];

        if (data.commonPrefixes && Array.isArray(data.commonPrefixes)) {
          for (const p of data.commonPrefixes) {
            rows.push({
              key: `dir-${p.key}`,
              name: p.name || p.key,
              storageKey: p.key,
              isDirectory: true,
            });
          }
        }
        if (data.files && Array.isArray(data.files)) {
          for (const f of data.files) {
            rows.push({
              key: `file-${f.key}`,
              name: f.name || f.key,
              storageKey: f.key,
              isDirectory: false,
              size: f.size,
              lastModified: f.lastModified,
            });
          }
        }

        if (continuationToken) {
          setBucketRows((prev) => [...prev, ...rows]);
        } else {
          setBucketRows(rows);
        }
        setNextMarker(data.nextMarker || '');
        setIsTruncated(!!data.isTruncated);
      } catch (e: any) {
        console.error(e);
        messageApi.error(e?.info?.errorMessage || e?.message || '获取存储桶文件失败');
        setBucketRows([]);
      } finally {
        setBucketLoading(false);
      }
    },
    [messageApi],
  );

  useEffect(() => {
    if (activeTab === 'bucket') {
      fetchBucketFiles(prefixRaw);
    }
  }, [activeTab, prefixRaw, fetchBucketFiles]);

  const enterPrefix = (fullKey: string) => {
    const raw = fullKey.replace(/\/$/, '');
    setPrefixRaw(raw);
  };

  const breadcrumbItems = useMemo(() => {
    const items: { title: React.ReactNode; onClick?: () => void }[] = [
      {
        title: '根目录',
        onClick: () => setPrefixRaw(''),
      },
    ];
    if (!prefixRaw) return items;
    const parts = prefixRaw.split('/').filter(Boolean);
    let acc = '';
    for (let i = 0; i < parts.length; i++) {
      acc = i === 0 ? parts[0] : `${acc}/${parts[i]}`;
      const pathAt = acc;
      items.push({
        title: parts[i],
        onClick: () => setPrefixRaw(pathAt),
      });
    }
    return items;
  }, [prefixRaw]);

  /* —— PFS（依赖 MLP Cooker 常驻任务 mlp-cooker） —— */
  const [pfsTabLoading, setPfsTabLoading] = useState(false);
  const [mlpCookerJob, setMlpCookerJob] = useState<any | null>(null);
  const [pfsInstanceId, setPfsInstanceId] = useState('');
  const [pfsNotice, setPfsNotice] = useState<string | undefined>();
  const [initializingMlpCooker, setInitializingMlpCooker] = useState(false);
  const [pfsPrefixRaw, setPfsPrefixRaw] = useState('');
  const [pfsRows, setPfsRows] = useState<FileRow[]>([]);

  const fetchMlpCookerJob = useCallback(async (): Promise<any | null> => {
    try {
      const poolRes = await request('/api/config/ML_PLATFORM_RESOURCE_POOL_ID', {
        method: 'GET',
      });
      const poolId = poolRes?.success ? String(poolRes.data?.value || '').trim() : '';
      const resourcePoolId = poolId || 'aihc-serverless';

      const response = await request('/api/jobs', {
        method: 'POST',
        data: {
          keyword: 'mlp-cooker',
          resourcePoolId,
        },
      });

      if (response.success && response.data) {
        const jobs = response.data?.jobs || response.data?.data || [];
        const job = jobs.find((j: any) => j.name === 'mlp-cooker');
        return job || null;
      }
      return null;
    } catch (e) {
      console.error('查询 mlp-cooker 任务失败:', e);
      return null;
    }
  }, []);

  const fetchPfsFiles = useCallback(
    async (path: string) => {
      setPfsTabLoading(true);
      setPfsNotice(undefined);
      try {
        const res = await request('/api/storage/pfs/files', {
          method: 'GET',
          params: {
            path: path || '',
            ...(process.env.NODE_ENV === 'development' ? { debug: '1' } : {}),
          },
        });
        if (!res.success) {
          messageApi.error(res.message || '获取 PFS 文件列表失败');
          setPfsRows([]);
          return;
        }
        const data = res.data;
        setPfsInstanceId(data.instanceId || '');
        setPfsNotice(data.notice);

        const rows: FileRow[] = [];
        if (data.commonPrefixes && Array.isArray(data.commonPrefixes)) {
          for (const p of data.commonPrefixes) {
            rows.push({
              key: `dir-${p.key}`,
              name: p.name || p.key,
              storageKey: p.key,
              isDirectory: true,
            });
          }
        }
        if (data.files && Array.isArray(data.files)) {
          for (const f of data.files) {
            rows.push({
              key: `file-${f.key}`,
              name: f.name || f.key,
              storageKey: f.key,
              isDirectory: false,
              size: f.size,
              lastModified: f.lastModified,
            });
          }
        }
        setPfsRows(rows);
      } catch (e: any) {
        console.error(e);
        messageApi.error(e?.info?.errorMessage || e?.message || '获取 PFS 文件列表失败');
        setPfsRows([]);
      } finally {
        setPfsTabLoading(false);
      }
    },
    [messageApi],
  );

  const loadPfsTab = useCallback(async () => {
    setPfsInstanceId('');
    setPfsNotice(undefined);
    try {
      const job = await fetchMlpCookerJob();
      setMlpCookerJob(job);

      if (!job) {
        setPfsRows([]);
        setPfsTabLoading(false);
        return;
      }

      await fetchPfsFiles(pfsPrefixRaw);
    } catch (e: any) {
      console.error(e);
      messageApi.error(e?.info?.errorMessage || e?.message || '加载 PFS 页失败');
      setMlpCookerJob(null);
      setPfsRows([]);
      setPfsTabLoading(false);
    }
  }, [fetchMlpCookerJob, fetchPfsFiles, messageApi, pfsPrefixRaw]);

  const enterPfsPrefix = (fullKey: string) => {
    const raw = fullKey.replace(/\/$/, '');
    setPfsPrefixRaw(raw);
  };

  const pfsBreadcrumbItems = useMemo(() => {
    const items: { title: React.ReactNode; onClick?: () => void }[] = [
      {
        title: '根目录',
        onClick: () => setPfsPrefixRaw(''),
      },
    ];
    if (!pfsPrefixRaw) return items;
    const parts = pfsPrefixRaw.split('/').filter(Boolean);
    let acc = '';
    for (let i = 0; i < parts.length; i++) {
      acc = i === 0 ? parts[0] : `${acc}/${parts[i]}`;
      const pathAt = acc;
      items.push({
        title: parts[i],
        onClick: () => setPfsPrefixRaw(pathAt),
      });
    }
    return items;
  }, [pfsPrefixRaw]);

  /** 与队列详情页一致：默认队列 ID + 子队列对应的 resourcePoolId */
  const fetchDefaultQueueContext = useCallback(async () => {
    const queueRes = await request('/api/config/ML_PLATFORM_RESOURCE_QUEUE_ID', {
      method: 'GET',
    });
    const queueId = queueRes?.success ? String(queueRes.data?.value || '').trim() : '';
    if (!queueId) return null;

    const response = await request(`/api/resources/queues/${queueId}`, {
      method: 'GET',
    });
    if (!response.success) return null;

    const data = response.data;
    const queue = data?.queue || data || null;
    let actualQueue: any = null;
    if (queue?.children && Array.isArray(queue.children) && queue.children.length > 0) {
      actualQueue = queue.children[0];
      if (actualQueue && !actualQueue.bindingNodes && queue.bindingNodes) {
        actualQueue.bindingNodes = queue.bindingNodes;
      }
    } else {
      actualQueue = queue || null;
    }

    const resourcePoolId = actualQueue?.resourcePoolId;
    if (!resourcePoolId) return null;
    return { queueId, resourcePoolId };
  }, []);

  const handleInitializeMlpCooker = useCallback(async () => {
    setInitializingMlpCooker(true);
    try {
      const ctx = await fetchDefaultQueueContext();
      if (!ctx) {
        messageApi.error('缺少默认队列或资源池信息，请在全局配置中配置默认队列与资源池');
        return;
      }

      const taskParams = {
        name: 'mlp-cooker',
        queue: ctx.queueId,
        jobType: 'PyTorchJob',
        command: 'sleep 10000d',
        jobSpec: {
          replicas: 1,
          image: 'registry.baidubce.com/inference/aibox-ubuntu:v2.0-22.04',
          resources: [],
          envs: [],
          enableRDMA: false,
        },
        labels: [],
        datasources: [
          {
            type: 'pfs',
            name: '',
            sourcePath: '/',
            mountPath: '/data',
          },
        ],
      };

      const response = await request('/api/jobs/create', {
        method: 'POST',
        data: {
          taskParams: JSON.stringify(taskParams),
        },
      });

      if (response.success) {
        messageApi.success('mlp-cooker 任务创建成功');
        await loadPfsTab();
      } else {
        messageApi.error(response.message || '创建 mlp-cooker 任务失败');
      }
    } catch (error: any) {
      console.error('创建 mlp-cooker job 失败:', error);
      messageApi.error(
        error?.info?.errorMessage || error?.message || '创建 mlp-cooker 任务失败',
      );
    } finally {
      setInitializingMlpCooker(false);
    }
  }, [fetchDefaultQueueContext, loadPfsTab, messageApi]);

  const mlpCookerJobStatus = useMemo(
    () => getMlpCookerJobStatusInfo(mlpCookerJob?.status),
    [mlpCookerJob?.status],
  );

  const handleRestartMlpCooker = useCallback(() => {
    const jobId = String(mlpCookerJob?.jobId ?? mlpCookerJob?.id ?? '').trim();
    if (!jobId) {
      messageApi.error('无法获取任务 ID');
      return;
    }
    Modal.confirm({
      title: '确认重启 mlp-cooker 组件？',
      content:
        '将删除当前失败的任务并重新创建组件，完成后可恢复 PFS 文件浏览能力。',
      okText: '重启',
      cancelText: '取消',
      onOk: async () => {
        const delRes = await request(`/api/jobs/${encodeURIComponent(jobId)}`, {
          method: 'DELETE',
        });
        if (!delRes.success) {
          messageApi.error(delRes.message || '删除失败任务失败');
          throw new Error('delete failed');
        }
        await handleInitializeMlpCooker();
      },
    });
  }, [handleInitializeMlpCooker, messageApi, mlpCookerJob]);

  useEffect(() => {
    if (activeTab === 'pfs') {
      loadPfsTab();
    }
  }, [activeTab, loadPfsTab]);

  const handleRefresh = () => {
    if (activeTab === 'bucket') {
      fetchBucketFiles(prefixRaw);
    } else {
      loadPfsTab();
    }
  };

  const loading = activeTab === 'bucket' ? bucketLoading : pfsTabLoading;

  const bucketColumns = [
    {
      title: '名称',
      dataIndex: 'name',
      ellipsis: true,
      render: (name: string, r: FileRow) => (
        <Space>
          {r.isDirectory ? (
            <FolderOutlined style={{ color: '#faad14' }} />
          ) : (
            <FileOutlined style={{ color: '#1890ff' }} />
          )}
          {r.isDirectory ? (
            <Button type="link" size="small" style={{ padding: 0, height: 'auto' }} onClick={() => enterPrefix(r.storageKey)}>
              {name}
            </Button>
          ) : (
            <Text>{name}</Text>
          )}
        </Space>
      ),
    },
    {
      title: '类型',
      width: 100,
      render: (_: unknown, r: FileRow) =>
        r.isDirectory ? <Tag>目录</Tag> : <Tag color="blue">文件</Tag>,
    },
    {
      title: '大小',
      width: 120,
      render: (_: unknown, r: FileRow) =>
        r.isDirectory ? '-' : r.size != null ? formatSize(r.size) : '-',
    },
    {
      title: '更新时间',
      width: 200,
      render: (_: unknown, r: FileRow) =>
        r.lastModified ? new Date(r.lastModified).toLocaleString('zh-CN') : '-',
    },
  ];

  const pfsColumns = [
    {
      title: '名称',
      dataIndex: 'name',
      ellipsis: true,
      render: (name: string, r: FileRow) => (
        <Space>
          {r.isDirectory ? (
            <FolderOutlined style={{ color: '#faad14' }} />
          ) : (
            <FileOutlined style={{ color: '#1890ff' }} />
          )}
          {r.isDirectory ? (
            <Button
              type="link"
              size="small"
              style={{ padding: 0, height: 'auto' }}
              onClick={() => enterPfsPrefix(r.storageKey)}
            >
              {name}
            </Button>
          ) : (
            <Text>{name}</Text>
          )}
        </Space>
      ),
    },
    {
      title: '类型',
      width: 100,
      render: (_: unknown, r: FileRow) =>
        r.isDirectory ? <Tag>目录</Tag> : <Tag color="blue">文件</Tag>,
    },
    {
      title: '大小',
      width: 120,
      render: (_: unknown, r: FileRow) =>
        r.isDirectory ? '-' : r.size != null ? formatSize(r.size) : '-',
    },
    {
      title: '更新时间',
      width: 200,
      render: (_: unknown, r: FileRow) =>
        r.lastModified ? new Date(r.lastModified).toLocaleString('zh-CN') : '-',
    },
  ];

  return (
    <PageContainer
      header={{
        title: '存储',
        breadcrumb: {},
        extra: [
          <Button
            key="refresh"
            type="primary"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={loading}
          >
            刷新
          </Button>,
        ],
      }}
    >
      <Tabs
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k)}
        items={[
          {
            key: 'bucket',
            label: '存储桶文件',
            children: (
              <Card>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  {bucketName ? (
                    <Text type="secondary">
                      当前桶：<Text code>{bucketName}</Text>
                    </Text>
                  ) : null}
                  <Breadcrumb
                    items={breadcrumbItems.map((b, i) => ({
                      key: i,
                      title: b.onClick ? (
                        <a
                          onClick={(e) => {
                            e.preventDefault();
                            b.onClick?.();
                          }}
                        >
                          {b.title}
                        </a>
                      ) : (
                        b.title
                      ),
                    }))}
                  />
                  <Spin spinning={bucketLoading}>
                    <Table<FileRow>
                      size="small"
                      rowKey="key"
                      columns={bucketColumns}
                      dataSource={bucketRows}
                      pagination={false}
                    />
                    {isTruncated && nextMarker ? (
                      <div style={{ marginTop: 12 }}>
                        <Button
                          size="small"
                          onClick={() => fetchBucketFiles(prefixRaw, nextMarker)}
                          loading={bucketLoading}
                        >
                          加载更多
                        </Button>
                      </div>
                    ) : null}
                  </Spin>
                </Space>
              </Card>
            ),
          },
          {
            key: 'pfs',
            label: 'PFS文件',
            children: (
              <Card>
                <Spin spinning={pfsTabLoading}>
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <Text type="secondary">
                      PFS 文件浏览依赖集群内 <Text strong>MLP Cooker 组件</Text>（任务名{' '}
                      <Text code>mlp-cooker</Text>），用于挂载 PFS 并访问文件。
                    </Text>

                    {!pfsTabLoading && !mlpCookerJob ? (
                      <Alert
                        type="warning"
                        showIcon
                        message="未检测到 mlp-cooker 组件"
                        description={
                          <span>
                            可点击下方「初始化」创建组件（与队列详情中一致）；或前往{' '}
                            <Link to="/resource/queue">队列管理</Link>
                            ，打开默认队列「详情」在「MLP Cooker 组件」中操作。
                          </span>
                        }
                        action={
                          <Button
                            type="primary"
                            icon={<ThunderboltOutlined />}
                            onClick={handleInitializeMlpCooker}
                            loading={initializingMlpCooker}
                          >
                            初始化
                          </Button>
                        }
                      />
                    ) : null}

                    {!pfsTabLoading && mlpCookerJob ? (
                      <>
                        <Alert
                          type={mlpCookerJobStatus.failed ? 'error' : 'success'}
                          showIcon
                          message={
                            <Space wrap>
                              <span>
                                {mlpCookerJobStatus.failed
                                  ? '组件任务已失败'
                                  : '已检测到组件'}
                              </span>
                              <Tag color="processing">
                                {mlpCookerJob.jobId || mlpCookerJob.id || '-'}
                              </Tag>
                              {mlpCookerJob.status != null ? (
                                <Tag color={mlpCookerJobStatus.color}>
                                  {mlpCookerJobStatus.text}
                                </Tag>
                              ) : null}
                            </Space>
                          }
                          description={
                            mlpCookerJobStatus.failed
                              ? '组件处于失败状态，PFS 文件浏览可能不可用。请点击「重启组件」或前往全局配置 / 队列管理重新初始化。'
                              : '组件运行正常，可继续查看下方 PFS 实例与文件列表。'
                          }
                          action={
                            mlpCookerJobStatus.failed ? (
                              <Button
                                type="primary"
                                icon={<ReloadOutlined />}
                                onClick={handleRestartMlpCooker}
                                loading={initializingMlpCooker}
                              >
                                重启组件
                              </Button>
                            ) : undefined
                          }
                        />
                        {pfsInstanceId ? (
                          <Text type="secondary">
                            当前 PFS 实例：<Text code>{pfsInstanceId}</Text>
                          </Text>
                        ) : (
                          <Text type="warning">
                            未配置 ML_PLATFORM_RESOURCE_PFS_INSTANCE_ID，请在全局配置中填写。
                          </Text>
                        )}
                        {pfsNotice ? (
                          <Alert type="info" showIcon message={pfsNotice} />
                        ) : null}
                        <Breadcrumb
                          items={pfsBreadcrumbItems.map((b, i) => ({
                            key: i,
                            title: b.onClick ? (
                              <a
                                onClick={(e) => {
                                  e.preventDefault();
                                  b.onClick?.();
                                }}
                              >
                                {b.title}
                              </a>
                            ) : (
                              b.title
                            ),
                          }))}
                        />
                        <Table<FileRow>
                          size="small"
                          rowKey="key"
                          columns={pfsColumns}
                          dataSource={pfsRows}
                          locale={{ emptyText: '暂无文件数据' }}
                          pagination={false}
                        />
                      </>
                    ) : null}
                  </Space>
                </Spin>
              </Card>
            ),
          },
        ]}
      />
    </PageContainer>
  );
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default StorageManagement;
