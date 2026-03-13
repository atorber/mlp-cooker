import {
  ArrowLeftOutlined,
  BookOutlined,
  BranchesOutlined,
  CopyOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileOutlined,
  FolderOutlined,
  FullscreenOutlined,
  PlayCircleOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Alert, App, Button, Card, Col, Descriptions, Input, Modal, Row, Select, Space, Spin, Table, Tag, Tabs, Tooltip } from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { history, useParams, useSearchParams } from '@umijs/max';
import { request } from '@umijs/max';

// 文件数据类型（name 为展示用相对名，key 为完整路径用于进入子目录）
interface FileItem {
  name: string;
  key?: string;
  size?: number;
  lastModified?: string;
  etag?: string;
  isDirectory: boolean;
}

// SQL 模板（DuckDB 语法，表名为 dataset）
const SQL_TEMPLATES: { title: string; sql: string }[] = [
  {
    title: '查询近 30 天数据',
    sql: "SELECT * FROM dataset WHERE created_at >= current_date - interval '30 days' LIMIT 100",
  },
  {
    title: '英文内容抽取',
    sql: "SELECT id, REGEXP_EXTRACT(text, '[a-zA-Z]+') AS en_text FROM dataset LIMIT 100",
  },
  {
    title: '查询含有"旅游"的数据',
    sql: "SELECT * FROM dataset WHERE content LIKE '%旅游%' LIMIT 100",
  },
  {
    title: '按照指定内容分类',
    sql: "SELECT name, score, CASE WHEN score >= 90 THEN '优秀' WHEN score >= 60 THEN '及格' ELSE '不及格' END AS level FROM dataset LIMIT 100",
  },
  {
    title: '查询超过十轮的对话',
    sql: 'SELECT conversation_id, COUNT(*) AS rounds FROM dataset GROUP BY conversation_id HAVING COUNT(*) > 10',
  },
  {
    title: '查询长度大于 100 小于 1000 的数据',
    sql: 'SELECT * FROM dataset WHERE LENGTH(content) > 100 AND LENGTH(content) < 1000 LIMIT 100',
  },
];

// 支持在前端直接预览的文本格式（与后端一致）
const PREVIEW_TEXT_EXT = new Set([
  'txt', 'json', 'yaml', 'yml', 'xml', 'md', 'csv', 'log', 'conf', 'cfg', 'ini', 'env', 'properties', 'text',
]);

// 格式化文件大小（目录无 size，需传入有效数字）
const formatFileSize = (bytes: number): string => {
  if (bytes == null || !Number.isFinite(Number(bytes))) return '-';
  const n = Number(bytes);
  if (n === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(n) / Math.log(k));
  return parseFloat((n / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 数据集数据类型
interface Dataset {
  id?: string;
  datasetId?: string;
  name: string;
  description?: string;
  storageType?: string;
  storageInstance?: string;
  importFormat?: string;
  owner?: string;
  visibilityScope?: string;
  createTime?: string;
  updateTime?: string;
  latestVersion?: any;
  versionEntry?: {
    storagePath?: string;
    storageBucket?: string;
    [key: string]: any;
  };
  latestVersionEntry?: {
    storagePath?: string;
    storageBucket?: string;
    [key: string]: any;
  };
}

const DatasetDetail: React.FC = () => {
  const { message: messageApi } = App.useApp();
  const params = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const datasetId = params.id || '';
  const tabFromUrl = searchParams.get('tab');
  const [detailLoading, setDetailLoading] = useState(false);
  const [versionLoading, setVersionLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [commonPrefixes, setCommonPrefixes] = useState<FileItem[]>([]);
  const [nextMarker, setNextMarker] = useState<string>('');
  const [isTruncated, setIsTruncated] = useState(false);
  const [currentPrefix, setCurrentPrefix] = useState<string>('');
  const [selectedFileVersionId, setSelectedFileVersionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(() =>
    tabFromUrl === 'versions' ? 'versions' : tabFromUrl === 'files' ? 'files' : tabFromUrl === 'query' ? 'query' : tabFromUrl === 'usage' ? 'usage' : 'basic',
  );
  const [isLance, setIsLance] = useState(false);
  const [lanceCheckLoading, setLanceCheckLoading] = useState(false);
  const [sqlText, setSqlText] = useState('SELECT * FROM dataset LIMIT 20');
  const hasAutoRunQueryRef = useRef(false);
  const [queryResult, setQueryResult] = useState<{ columns: string[]; rows: any[][] } | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [sqlTemplatesCollapsed, setSqlTemplatesCollapsed] = useState(false);
  const [resultFullscreen, setResultFullscreen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewContent, setPreviewContent] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  // 获取文件扩展名（小写）
  const getFileExt = (nameOrKey: string) => (nameOrKey || '').split('.').pop()?.toLowerCase() ?? '';

  // 下载：使用预签名 URL，按原文件名及格式下载
  const handleDownload = useCallback(
    async (record: FileItem) => {
      if (record.isDirectory || !record.key) return;
      try {
        const response = await request(`/api/datasets/${datasetId}/files/access-url`, {
          method: 'GET',
          params: { key: record.key, disposition: 'attachment' },
        });
        if (!(response as any)?.success || !(response as any)?.data?.url) {
          messageApi.error((response as any)?.message || '获取下载链接失败');
          return;
        }
        const { url, suggestedFilename } = (response as any).data;
        const filename = suggestedFilename || record.name || 'download';
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (e) {
        console.error(e);
        messageApi.error('获取下载链接失败');
      }
    },
    [datasetId, messageApi]
  );

  // 预览：仅支持 txt、json、yaml 等文本格式，在前端弹窗中展示
  const handlePreview = useCallback(
    async (record: FileItem) => {
      if (record.isDirectory || !record.key) return;
      const ext = getFileExt(record.name || record.key);
      if (!PREVIEW_TEXT_EXT.has(ext)) {
        messageApi.warning('仅支持预览 txt、json、yaml、xml、md、csv 等文本格式文件');
        return;
      }
      setPreviewOpen(true);
      setPreviewTitle(record.name || record.key.replace(/^.*\//, ''));
      setPreviewContent('');
      setPreviewLoading(true);
      try {
        const response = await request(`/api/datasets/${datasetId}/files/content`, {
          method: 'GET',
          params: { key: record.key },
        });
        if (!(response as any)?.success) {
          messageApi.error((response as any)?.message || '获取文件内容失败');
          setPreviewOpen(false);
          return;
        }
        let content = (response as any).data?.content ?? '';
        if (ext === 'json') {
          try {
            content = JSON.stringify(JSON.parse(content), null, 2);
          } catch {
            // 非合法 JSON 则原样显示
          }
        }
        setPreviewContent(content);
      } catch (e) {
        console.error(e);
        messageApi.error('获取文件内容失败');
        setPreviewOpen(false);
      } finally {
        setPreviewLoading(false);
      }
    },
    [datasetId, messageApi]
  );

  // 获取数据集详情
  const fetchDatasetDetail = useCallback(async () => {
    if (!datasetId) return;
    setDetailLoading(true);
    try {
      const response = await request(`/api/datasets/${datasetId}`, {
        method: 'GET',
      });
      if (response.success) {
        setDataset(response.data);
      } else {
        messageApi.error(response.message || '获取数据集详情失败');
      }
    } catch (error) {
      console.error('获取数据集详情失败:', error);
      messageApi.error('获取数据集详情失败');
    } finally {
      setDetailLoading(false);
    }
  }, [datasetId, messageApi]);

  // 获取版本列表
  const fetchVersions = useCallback(async () => {
    if (!datasetId) return;
    setVersionLoading(true);
    try {
      const response = await request(`/api/datasets/${datasetId}/versions`, {
        method: 'GET',
      });
      if (response.success) {
        const data = response.data;
        let versionList: any[] = [];
        if (Array.isArray(data)) {
          versionList = data;
        } else if (data?.versions && Array.isArray(data.versions)) {
          versionList = data.versions;
        } else if (data?.result && Array.isArray(data.result)) {
          versionList = data.result;
        } else if (data?.data && Array.isArray(data.data)) {
          versionList = data.data;
        } else if (data?.list && Array.isArray(data.list)) {
          versionList = data.list;
        }
        setVersions(versionList);
      } else {
        messageApi.error(response.message || '获取版本列表失败');
      }
    } catch (error) {
      console.error('获取版本列表失败:', error);
      messageApi.error('获取版本列表失败');
    } finally {
      setVersionLoading(false);
    }
  }, [datasetId, messageApi]);

  // 获取文件列表（marker 用于分页，prefix 用于进入子目录，versionId 指定版本，不传则用 selectedFileVersionId）
  const fetchFiles = useCallback(async (marker?: string, prefix?: string, versionIdOverride?: string | null) => {
    if (!datasetId) return;
    setFileLoading(true);
    try {
      const params: Record<string, string> = {};
      if (marker) params.continuationToken = marker;
      if (prefix !== undefined && prefix !== '') params.prefix = prefix;
      const versionId = versionIdOverride !== undefined ? versionIdOverride : selectedFileVersionId;
      if (versionId) params.versionId = versionId;

      const response = await request(`/api/datasets/${datasetId}/files`, {
        method: 'GET',
        params,
      });
      if (response.success) {
        const data = response.data;
        const fileList: FileItem[] = [];
        const prefixList: FileItem[] = [];

        if (data.files && Array.isArray(data.files)) {
          for (const file of data.files) {
            fileList.push({
              name: file.name,
              key: file.key,
              size: file.size,
              lastModified: file.lastModified,
              etag: file.etag,
              isDirectory: false,
            });
          }
        }

        if (data.commonPrefixes && Array.isArray(data.commonPrefixes)) {
          for (const p of data.commonPrefixes) {
            prefixList.push({
              name: p.name,
              key: p.key,
              isDirectory: true,
            });
          }
        }

        // 如果是加载更多，追加到现有列表
        if (marker) {
          setFiles((prev) => [...prev, ...fileList]);
          setCommonPrefixes((prev) => [...prev, ...prefixList]);
        } else {
          setFiles(fileList);
          setCommonPrefixes(prefixList);
        }

        setNextMarker(data.nextMarker || '');
        setIsTruncated(data.isTruncated || false);
        if (data.prefix != null) setCurrentPrefix(data.prefix);
      } else {
        messageApi.error(response.message || '获取文件列表失败');
      }
    } catch (error) {
      console.error('获取文件列表失败:', error);
      messageApi.error('获取文件列表失败');
    } finally {
      setFileLoading(false);
    }
  }, [datasetId, messageApi, selectedFileVersionId]);

  // Lance 格式检测（BOS 数据集时）
  const fetchLanceCheck = useCallback(async () => {
    if (!datasetId) return;
    setLanceCheckLoading(true);
    try {
      const response = await request(`/api/datasets/${datasetId}/lance-check`, { method: 'GET' });
      if (response.success && response.data?.isLance) {
        setIsLance(true);
      } else {
        setIsLance(false);
      }
    } catch {
      setIsLance(false);
    } finally {
      setLanceCheckLoading(false);
    }
  }, [datasetId]);

  // Lance SQL 查询
  const runLanceQuery = useCallback(async () => {
    if (!datasetId || !sqlText.trim()) {
      messageApi.warning('请输入 SQL');
      return;
    }
    setQueryLoading(true);
    setQueryResult(null);
    try {
      const response = await request(`/api/datasets/${datasetId}/query`, {
        method: 'POST',
        data: { sql: sqlText.trim() },
      });
      if (response.success && response.data) {
        setQueryResult({
          columns: response.data.columns ?? [],
          rows: response.data.rows ?? [],
        });
        if (response.data.rows?.length === 0 && !response.data.columns?.length) {
          messageApi.info('查询无结果');
        }
      } else {
        messageApi.error(response.message || response.details?.error || '查询失败');
      }
    } catch (error: any) {
      messageApi.error(error?.data?.details?.error || error?.message || '查询失败');
    } finally {
      setQueryLoading(false);
    }
  }, [datasetId, sqlText, messageApi]);

  useEffect(() => {
    fetchDatasetDetail();
  }, [fetchDatasetDetail]);

  useEffect(() => {
    if (tabFromUrl === 'versions') setActiveTab('versions');
    else if (tabFromUrl === 'files') setActiveTab('files');
    else if (tabFromUrl === 'query') setActiveTab('query');
    else if (tabFromUrl === 'usage') setActiveTab('usage');
  }, [tabFromUrl]);

  useEffect(() => {
    if (activeTab === 'versions' || activeTab === 'files') {
      fetchVersions();
    }
  }, [activeTab, fetchVersions]);

  useEffect(() => {
    if (activeTab === 'files' && dataset?.storageType === 'BOS') {
      fetchFiles();
    }
  }, [activeTab, fetchFiles, dataset]);

  // 进入详情页且当前数据集为 BOS 时，自动请求后端判断根目录是否为 Lance 格式
  useEffect(() => {
    if (dataset?.storageType === 'BOS' && datasetId) {
      fetchLanceCheck();
    } else {
      setIsLance(false);
    }
  }, [dataset?.storageType, datasetId, fetchLanceCheck]);

  // 切换数据集时重置“已自动执行”标记，以便在新数据集下打开 SQL Tab 时再执行一次
  useEffect(() => {
    hasAutoRunQueryRef.current = false;
  }, [datasetId]);

  // 打开 SQL 查询 Tab 时默认执行一次 LIMIT 20 载入数据
  useEffect(() => {
    if (activeTab !== 'query' || !isLance || !datasetId || hasAutoRunQueryRef.current) return;
    hasAutoRunQueryRef.current = true;
    runLanceQuery();
  }, [activeTab, isLance, datasetId, runLanceQuery]);

  const handleDataProcess = (record: any) => {
    const versionId = record.id || record.versionId || record.version || '';
    messageApi.info(`数据处理：版本 ${versionId}`);
  };

  const handleDataImport = (record: any) => {
    const versionId = record.id || record.versionId || record.version || '';
    messageApi.info(`数据导入：版本 ${versionId}`);
  };

  const versionColumns: ProColumns<any>[] = [
    {
      title: '版本号',
      dataIndex: 'version',
      width: 150,
    },
    {
      title: '版本ID',
      dataIndex: 'id',
      width: 200,
      ellipsis: true,
      render: (text, record) => text || record.versionId || '-',
    },
    {
      title: '源路径',
      dataIndex: 'sourcePath',
      ellipsis: true,
    },
    {
      title: '存储桶',
      dataIndex: 'storageBucket',
      width: 150,
      ellipsis: true,
    },
    {
      title: '存储路径',
      dataIndex: 'storagePath',
      ellipsis: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 180,
      render: (text: any) => (text ? new Date(String(text)).toLocaleString() : '-'),
    },
    {
      title: '创建用户',
      dataIndex: 'createUserName',
      width: 120,
      render: (text, record) => text || record.createUser || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleDataProcess(record)}>
            数据处理
          </Button>
          <Button type="link" size="small" onClick={() => handleDataImport(record)}>
            数据导入
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title={dataset?.name || '数据集详情'}
      loading={detailLoading}
      onBack={() => history.back()}
      backIcon={<ArrowLeftOutlined />}
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchDatasetDetail}>
            刷新
          </Button>
        </Space>
      }
    >
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'basic',
              label: '基本信息',
              children: (
                dataset && (
                  <Descriptions column={1} bordered>
                    <Descriptions.Item label="数据集ID">
                      {dataset.datasetId || dataset.id || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="名称">
                      {dataset.name || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="存储类型">
                      {dataset.storageType ? (
                        <Tag>{dataset.storageType}</Tag>
                      ) : (
                        '-'
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="存储实例">
                      {dataset.storageInstance || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="导入格式">
                      {dataset.importFormat ? (
                        <Tag>{dataset.importFormat}</Tag>
                      ) : (
                        '-'
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="描述">
                      {dataset.description || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="所有者">
                      {dataset.owner || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="可见范围">
                      {dataset.visibilityScope || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="创建时间">
                      {dataset.createTime
                        ? new Date(dataset.createTime).toLocaleString()
                        : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="更新时间">
                      {dataset.updateTime
                        ? new Date(dataset.updateTime).toLocaleString()
                        : '-'}
                    </Descriptions.Item>
                  </Descriptions>
                )
              ),
            },
            {
              key: 'versions',
              label: (
                <span>
                  <BranchesOutlined />
                  版本列表
                </span>
              ),
              children: (
                <ProTable
                  rowKey={(record) =>
                    record.id || record.versionId || record.version || ''
                  }
                  columns={versionColumns}
                  dataSource={versions}
                  loading={versionLoading}
                  search={false}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                  }}
                  options={false}
                  toolBarRender={() => [
                    <Button
                      key="refresh"
                      icon={<ReloadOutlined />}
                      onClick={fetchVersions}
                    >
                      刷新
                    </Button>,
                  ]}
                />
              ),
            },
            ...(dataset?.storageType === 'BOS'
              ? [
                  {
                    key: 'files',
                    label: (
                      <span>
                        <FileOutlined />
                        文件管理
                      </span>
                    ),
                    children: (
                      <div>
                        <div style={{ marginBottom: 16 }}>
                          <Space wrap>
                            <Space>
                              <span style={{ color: '#666' }}>当前版本：</span>
                              <Select
                                placeholder="选择版本（不选则使用默认）"
                                allowClear
                                style={{ minWidth: 220 }}
                                value={selectedFileVersionId !== null ? selectedFileVersionId : ''}
                                onChange={(val) => {
                                  const id = val === '' || val == null ? null : String(val);
                                  setSelectedFileVersionId(id);
                                  setCurrentPrefix('');
                                  fetchFiles(undefined, undefined, id);
                                }}
                                options={[
                                  { label: '默认版本', value: '' },
                                  ...versions.map((v: any) => ({
                                    label: String(v.version || v.versionId || v.id || '未知'),
                                    value: String(v.id || v.versionId || ''),
                                  })).filter((o: { value: string }) => o.value),
                                ]}
                                loading={versionLoading}
                              />
                            </Space>
                            <Button
                              icon={<ReloadOutlined />}
                              onClick={() => fetchFiles()}
                              loading={fileLoading}
                            >
                              刷新
                            </Button>
                            {currentPrefix && (
                              <Button
                                onClick={() => {
                                  const parts = currentPrefix.split('/').filter(Boolean);
                                  parts.pop();
                                  const parentPrefix = parts.length ? parts.join('/') + '/' : '';
                                  fetchFiles(undefined, parentPrefix);
                                }}
                              >
                                返回上级
                              </Button>
                            )}
                          </Space>
                          {currentPrefix && (
                            <div style={{ marginTop: 8, color: '#666' }}>
                              当前路径: {currentPrefix}
                            </div>
                          )}
                        </div>
                        <ProTable
                          rowKey={(record) => record.key ?? record.name}
                          columns={[
                            {
                              title: '名称',
                              dataIndex: 'name',
                              key: 'name',
                              ellipsis: true,
                              render: (text, record) => (
                                <Space>
                                  {record.isDirectory ? (
                                    <FolderOutlined style={{ color: '#faad14' }} />
                                  ) : (
                                    <FileOutlined style={{ color: '#1890ff' }} />
                                  )}
                                  <span
                                    style={{
                                      cursor: record.isDirectory ? 'pointer' : 'default',
                                      color: record.isDirectory ? '#1890ff' : 'inherit',
                                    }}
                                    onClick={() => {
                                      if (record.isDirectory && record.key) {
                                        fetchFiles(undefined, record.key);
                                      }
                                    }}
                                  >
                                    {text}
                                  </span>
                                </Space>
                              ),
                            },
                            {
                              title: '大小',
                              dataIndex: 'size',
                              key: 'size',
                              width: 120,
                              render: (text: any) => formatFileSize(Number(text)),
                            },
                            {
                              title: '修改时间',
                              dataIndex: 'lastModified',
                              key: 'lastModified',
                              width: 180,
                              render: (text: any) => {
                                if (text == null || text === '') return '-';
                                const date = new Date(String(text));
                                return Number.isNaN(date.getTime())
                                  ? '-'
                                  : date.toLocaleString('zh-CN');
                              },
                            },
                            {
                              title: '操作',
                              key: 'action',
                              width: 140,
                              fixed: 'right',
                              render: (_: any, record: FileItem) =>
                                record.isDirectory ? (
                                  '-'
                                ) : (
                                  <Space>
                                    <Button
                                      type="link"
                                      size="small"
                                      icon={<EyeOutlined />}
                                      onClick={() => handlePreview(record)}
                                    >
                                      预览
                                    </Button>
                                    <Button
                                      type="link"
                                      size="small"
                                      icon={<DownloadOutlined />}
                                      onClick={() => handleDownload(record)}
                                    >
                                      下载
                                    </Button>
                                  </Space>
                                ),
                            },
                          ]}
                          dataSource={[...commonPrefixes, ...files]}
                          loading={fileLoading}
                          search={false}
                          pagination={false}
                          options={false}
                        />
                        {isTruncated && (
                          <div style={{ marginTop: 16, textAlign: 'center' }}>
                            <Button
                              onClick={() => fetchFiles(nextMarker, currentPrefix)}
                              loading={fileLoading}
                            >
                              加载更多
                            </Button>
                          </div>
                        )}
                      </div>
                    ),
                  },
                ]
              : []),
            ...(isLance
              ? [
                  {
                    key: 'query',
                    label: (
                      <span>
                        <PlayCircleOutlined />
                        SQL查询
                        <Tooltip title="使用 SQL 控制台对数据集运行遵循 DuckDB SQL 语法的查询，支持正则表达式等标准功能。">
                          <QuestionCircleOutlined style={{ marginLeft: 6, color: '#999', cursor: 'help' }} />
                        </Tooltip>
                      </span>
                    ),
                    children: (
                      <Row gutter={16} style={{ marginTop: 0 }}>
                        <Col xs={24} md={12} lg={10}>
                          <Space direction="vertical" style={{ width: '100%' }} size="middle">
                            <div>
                              <div style={{ marginBottom: 6, fontWeight: 500 }}>SQL</div>
                              <Input.TextArea
                                value={sqlText}
                                onChange={(e) => setSqlText(e.target.value)}
                                placeholder="SELECT * FROM dataset LIMIT 20"
                                rows={8}
                                style={{ fontFamily: 'monospace', fontSize: 13 }}
                              />
                            </div>
                            <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden' }}>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '8px 12px',
                                  background: '#fafafa',
                                  borderBottom: sqlTemplatesCollapsed ? 'none' : '1px solid #f0f0f0',
                                }}
                              >
                                <span style={{ fontWeight: 500 }}>SQL模板</span>
                                <Button
                                  type="text"
                                  size="small"
                                  onClick={() => setSqlTemplatesCollapsed(!sqlTemplatesCollapsed)}
                                >
                                  {sqlTemplatesCollapsed ? '展开' : '关闭'}
                                </Button>
                              </div>
                              {!sqlTemplatesCollapsed && (
                                <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12, minWidth: 0 }}>
                                  {SQL_TEMPLATES.map((tpl, index) => (
                                    <div
                                      key={index}
                                      onClick={() => setSqlText(tpl.sql)}
                                      style={{
                                        padding: 10,
                                        borderRadius: 6,
                                        border: '1px solid #d9d9d9',
                                        cursor: 'pointer',
                                        background: '#fff',
                                        minWidth: 0,
                                        overflow: 'hidden',
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = '#722ed1';
                                        e.currentTarget.style.background = '#f9f0ff';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = '#d9d9d9';
                                        e.currentTarget.style.background = '#fff';
                                      }}
                                    >
                                      <div style={{ fontWeight: 500, marginBottom: 4, fontSize: 13 }}>{tpl.title}</div>
                                      <div style={{ fontSize: 11, color: '#666', fontFamily: 'monospace', wordBreak: 'break-all', overflowWrap: 'break-word', lineHeight: 1.4 }}>
                                        {tpl.sql}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <Space>
                              <Button onClick={() => setSqlText('SELECT * FROM dataset LIMIT 20')}>
                                重置
                              </Button>
                              <Button
                                type="primary"
                                icon={<PlayCircleOutlined />}
                                onClick={runLanceQuery}
                                loading={queryLoading}
                              >
                                开始查询
                              </Button>
                            </Space>
                          </Space>
                        </Col>
                        <Col xs={24} md={12} lg={14}>
                          <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden', minHeight: 320 }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 12px',
                                background: '#fafafa',
                                borderBottom: '1px solid #f0f0f0',
                              }}
                            >
                              <span style={{ color: '#666', fontSize: 13 }}>
                                {queryLoading ? '正在加载...' : queryResult ? `最多展示500项数据，当前共 ${queryResult.rows.length} 条` : '最多展示500项数据'}
                              </span>
                              <Space>
                                {queryResult && queryResult.rows.length > 0 && (
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={<DownloadOutlined />}
                                    onClick={() => {
                                      const cols = queryResult!.columns;
                                      const header = ['序号', ...cols].join(',');
                                      const rows = queryResult!.rows.map((row, i) => [i + 1, ...row].map((c) => (c != null ? String(c).replace(/"/g, '""') : '')).join(','));
                                      const csv = [header, ...rows].join('\n');
                                      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
                                      const url = URL.createObjectURL(blob);
                                      const a = document.createElement('a');
                                      a.href = url;
                                      a.download = `query_result_${Date.now()}.csv`;
                                      a.click();
                                      URL.revokeObjectURL(url);
                                    }}
                                  >
                                    另存为
                                  </Button>
                                )}
                                <Button
                                  type="text"
                                  size="small"
                                  icon={<FullscreenOutlined />}
                                  onClick={() => setResultFullscreen(true)}
                                />
                              </Space>
                            </div>
                            <div style={{ padding: 12, maxHeight: resultFullscreen ? 'none' : 480, overflow: 'auto', minHeight: 200 }}>
                              {queryLoading ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
                                  <Spin size="large" tip="正在查询..." />
                                </div>
                              ) : queryResult ? (
                                <Table
                                  size="small"
                                  scroll={{ x: 'max-content' }}
                                  columns={[
                                    { title: '序号', dataIndex: '__idx', key: '__idx', width: 64, render: (_: any, __: any, i: number) => i + 1 },
                                    ...queryResult.columns.map((col, i) => ({
                                      title: col,
                                      dataIndex: String(i),
                                      key: String(i),
                                      ellipsis: true,
                                      render: (v: any) => (v != null ? String(v) : '-'),
                                    })),
                                  ]}
                                  dataSource={queryResult.rows.map((row, i) => ({
                                    key: i,
                                    __idx: i + 1,
                                    ...row.reduce((acc, val, j) => ({ ...acc, [String(j)]: val }), {}),
                                  }))}
                                  pagination={{
                                    pageSize: 20,
                                    showSizeChanger: true,
                                    pageSizeOptions: ['20', '50', '100'],
                                    showTotal: (total) => `共 ${total} 条`,
                                  }}
                                />
                              ) : (
                                <div style={{ color: '#999', textAlign: 'center', padding: 48 }}>执行 SQL 后在此处查看结果</div>
                              )}
                            </div>
                          </div>
                          {resultFullscreen && queryResult && !queryLoading && (
                            <Modal
                              title="查询结果"
                              open={resultFullscreen}
                              onCancel={() => setResultFullscreen(false)}
                              footer={null}
                              width="90vw"
                              styles={{ body: { maxHeight: '80vh', overflow: 'auto' } }}
                            >
                              <Table
                                size="small"
                                scroll={{ x: 'max-content' }}
                                columns={[
                                  { title: '序号', dataIndex: '__idx', key: '__idx', width: 64, render: (_: any, __: any, i: number) => i + 1 },
                                  ...queryResult.columns.map((col, i) => ({
                                    title: col,
                                    dataIndex: String(i),
                                    key: String(i),
                                    ellipsis: true,
                                    render: (v: any) => (v != null ? String(v) : '-'),
                                  })),
                                ]}
                                dataSource={queryResult.rows.map((row, i) => ({
                                  key: i,
                                  __idx: i + 1,
                                  ...row.reduce((acc, val, j) => ({ ...acc, [String(j)]: val }), {}),
                                }))}
                                pagination={{
                                  pageSize: 20,
                                  showSizeChanger: true,
                                  pageSizeOptions: ['20', '50', '100'],
                                  showTotal: (total) => `共 ${total} 条`,
                                }}
                              />
                            </Modal>
                          )}
                        </Col>
                      </Row>
                    ),
                  },
                  {
                    key: 'usage',
                    label: (
                      <span>
                        <BookOutlined />
                        使用说明
                      </span>
                    ),
                    children: (() => {
                      const bucket = dataset?.storageInstance || 'bucket';
                      const storagePath = dataset?.versionEntry?.storagePath || dataset?.latestVersionEntry?.storagePath || 'path/to/data';
                      const s3Uri = `s3://${bucket}/${storagePath.replace(/^\//, '')}`;
                      return (
                        <div style={{ padding: '16px 0' }}>
                          <Alert
                            message="操作文档"
                            description="更多使用说明详见官方文档"
                            type="info"
                            showIcon
                            style={{ marginBottom: 16 }}
                          />
                          <Card size="small" title="1. 配置环境变量" style={{ marginBottom: 16 }}>
                            <pre style={{ background: '#f6f8fa', padding: 12, borderRadius: 6, overflow: 'auto', fontSize: 12 }}>
{`# 您可以在「访问控制」->「API 访问密钥」中创建或查看您的 api key
export AWS_ACCESS_KEY_ID=xxx
export AWS_SECRET_ACCESS_KEY=xxx
export AWS_REGION=cn-beijing
export AWS_ENDPOINT=https://s3.cn-beijing.baidubce.com`}
                            </pre>
                            <Button
                              icon={<CopyOutlined />}
                              size="small"
                              onClick={() => {
                                const text = `export AWS_ACCESS_KEY_ID=xxx
export AWS_SECRET_ACCESS_KEY=xxx
export AWS_REGION=cn-beijing
export AWS_ENDPOINT=https://s3.cn-beijing.baidubce.com`;
                                navigator.clipboard.writeText(text);
                                messageApi.success('已复制到剪贴板');
                              }}
                              style={{ marginTop: 8 }}
                            >
                              复制
                            </Button>
                          </Card>
                          <Card size="small" title="2. 读取数据" style={{ marginBottom: 16 }}>
                            <pre style={{ background: '#f6f8fa', padding: 12, borderRadius: 6, overflow: 'auto', fontSize: 12 }}>
{`import daft
from pyarrow.dataset import dataset
import pyarrow as pa

# 使用 pyarrow 读取 Lance 格式数据
ds = dataset("${s3Uri}", format=" lance")
table = ds.to_table()
df = daft.from_pydataframe(table)
df.show()`}
                            </pre>
                            <Button
                              icon={<CopyOutlined />}
                              size="small"
                              onClick={() => {
                                const text = `import daft
from pyarrow.dataset import dataset
import pyarrow as pa

# 使用 pyarrow 读取 Lance 格式数据
ds = dataset("${s3Uri}", format="lance")
table = ds.to_table()
df = daft.from_pydataframe(table)
df.show()`;
                                navigator.clipboard.writeText(text);
                                messageApi.success('已复制到剪贴板');
                              }}
                              style={{ marginTop: 8 }}
                            >
                              复制
                            </Button>
                          </Card>
                          <Card size="small" title="3. 加列" style={{ marginBottom: 16 }}>
                            <pre style={{ background: '#f6f8fa', padding: 12, borderRadius: 6, overflow: 'auto', fontSize: 12 }}>
{`import pyarrow as pa
from daft.io import IOConfig
from daft.io.lance import merge_columns
import os

# 配置 S3 连接信息
io_config = IOConfig(
    s3={
        "access_key": os.environ.get("AWS_ACCESS_KEY_ID"),
        "secret_key": os.environ.get("AWS_SECRET_ACCESS_KEY"),
        "region": os.environ.get("AWS_REGION", "cn-beijing"),
        "endpoint": os.environ.get("AWS_ENDPOINT", "https://s3.cn-beijing.baidubce.com"),
    }
)

#  此处加列逻辑非常简单，仅展示用法
def get_create_tag_new_column_func(input_col: str, output_col: str):
    def tag_new_column(batch: pa.RecordBatch) -> pa.RecordBatch:
        values = batch.column(input_col).to_pylist()
        tagged_data_list = [value + "__tag" for value in values]
        tagged_data_array = pa.array(tagged_data_list, type=pa.string())
        return pa.RecordBatch.from_arrays([tagged_data_array], names=[output_col])
    return tag_new_column

print("正在添加新列到 Lance 数据集 ...")
merge_columns(
    uri="${s3Uri}",
    io_config=io_config,
    transform=get_create_tag_new_column_func("column_name", "new_column_name"),
)
print("新列添加完成！")`}
                            </pre>
                            <Button
                              icon={<CopyOutlined />}
                              size="small"
                              onClick={() => {
                                const text = `import pyarrow as pa
from daft.io import IOConfig
from daft.io.lance import merge_columns
import os

# 配置 S3 连接信息
io_config = IOConfig(
    s3={
        "access_key": os.environ.get("AWS_ACCESS_KEY_ID"),
        "secret_key": os.environ.get("AWS_SECRET_ACCESS_KEY"),
        "region": os.environ.get("AWS_REGION", "cn-beijing"),
        "endpoint": os.environ.get("AWS_ENDPOINT", "https://s3.cn-beijing.baidubce.com"),
    }
)

def get_create_tag_new_column_func(input_col: str, output_col: str):
    def tag_new_column(batch: pa.RecordBatch) -> pa.RecordBatch:
        values = batch.column(input_col).to_pylist()
        tagged_data_list = [value + "__tag" for value in values]
        tagged_data_array = pa.array(tagged_data_list, type=pa.string())
        return pa.RecordBatch.from_arrays([tagged_data_array], names=[output_col])
    return tag_new_column

print("正在添加新列到 Lance 数据集 ...")
merge_columns(
    uri="${s3Uri}",
    io_config=io_config,
    transform=get_create_tag_new_column_func("column_name", "new_column_name"),
)
print("新列添加完成！")`;
                                navigator.clipboard.writeText(text);
                                messageApi.success('已复制到剪贴板');
                              }}
                              style={{ marginTop: 8 }}
                            >
                              复制
                            </Button>
                          </Card>
                          <Card size="small" title="4. 查看更多 Lance 信息">
                            <pre style={{ background: '#f6f8fa', padding: 12, borderRadius: 6, overflow: 'auto', fontSize: 12 }}>
{`import lance
import os

# 配置 S3 连接信息
storage_options = {
    "access_key_id": os.environ.get("AWS_ACCESS_KEY_ID"),
    "secret_access_key": os.environ.get("AWS_SECRET_ACCESS_KEY"),
    "region": os.environ.get("AWS_REGION", "cn-beijing"),
    "endpoint": os.environ.get("AWS_ENDPOINT", "https://s3.cn-beijing.baidubce.com"),
}

ds = lance.LanceDataset(
    uri="${s3Uri}",
    storage_options=storage_options,
)

# 查看 Lance 数据集的 schema 信息
print("Lance 数据集的 schema 信息如下：")
print(ds.schema)

# 查看 Lance 数据集的版本信息
print("Lance 数据集的版本信息如下：")
print(ds.versions())

# 查看 Lance 数据集的索引信息
print("Lance 数据集的索引信息如下：")
print(ds.list_indices())`}
                            </pre>
                            <Button
                              icon={<CopyOutlined />}
                              size="small"
                              onClick={() => {
                                const text = `import lance
import os

storage_options = {
    "access_key_id": os.environ.get("AWS_ACCESS_KEY_ID"),
    "secret_access_key": os.environ.get("AWS_SECRET_ACCESS_KEY"),
    "region": os.environ.get("AWS_REGION", "cn-beijing"),
    "endpoint": os.environ.get("AWS_ENDPOINT", "https://s3.cn-beijing.baidubce.com"),
}

ds = lance.LanceDataset(
    uri="${s3Uri}",
    storage_options=storage_options,
)

print(ds.schema)
print(ds.versions())
print(ds.list_indices())`;
                                navigator.clipboard.writeText(text);
                                messageApi.success('已复制到剪贴板');
                              }}
                              style={{ marginTop: 8 }}
                            >
                              复制
                            </Button>
                          </Card>
                        </div>
                      );
                    })(),
                  },
                ]
              : []),
          ]}
        />
      </Card>
      <Modal
        title={previewTitle ? `预览：${previewTitle}` : '文件预览'}
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={null}
        width="80vw"
        destroyOnClose
        styles={{ body: { maxHeight: '70vh', overflow: 'auto', background: '#fafafa' } }}
      >
        {previewLoading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>加载中...</div>
          </div>
        ) : (
          <pre
            style={{
              margin: 0,
              padding: 16,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              fontSize: 13,
              fontFamily: 'monospace',
            }}
          >
            {previewContent}
          </pre>
        )}
      </Modal>
    </PageContainer>
  );
};

export default DatasetDetail;
