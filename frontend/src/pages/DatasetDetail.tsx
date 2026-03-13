import {
  ArrowLeftOutlined,
  BranchesOutlined,
  FileOutlined,
  FolderOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { App, Button, Card, Descriptions, Input, Space, Table, Tag, Tabs } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
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
  const [activeTab, setActiveTab] = useState(() =>
    tabFromUrl === 'versions' ? 'versions' : tabFromUrl === 'files' ? 'files' : tabFromUrl === 'query' ? 'query' : 'basic',
  );
  const [isLance, setIsLance] = useState(false);
  const [lanceCheckLoading, setLanceCheckLoading] = useState(false);
  const [sqlText, setSqlText] = useState('SELECT * FROM dataset LIMIT 10');
  const [queryResult, setQueryResult] = useState<{ columns: string[]; rows: any[][] } | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);

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

  // 获取文件列表（marker 用于分页，prefix 用于进入子目录）
  const fetchFiles = useCallback(async (marker?: string, prefix?: string) => {
    if (!datasetId) return;
    setFileLoading(true);
    try {
      const params: Record<string, string> = {};
      if (marker) params.continuationToken = marker;
      if (prefix !== undefined && prefix !== '') params.prefix = prefix;

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
  }, [datasetId, messageApi]);

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
  }, [tabFromUrl]);

  useEffect(() => {
    if (activeTab === 'versions') {
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
                          <Space>
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
                      </span>
                    ),
                    children: (
                      <div>
                        <Space direction="vertical" style={{ width: '100%' }} size="middle">
                          <Input.TextArea
                            value={sqlText}
                            onChange={(e) => setSqlText(e.target.value)}
                            placeholder="SELECT * FROM dataset LIMIT 10"
                            rows={4}
                            style={{ fontFamily: 'monospace' }}
                          />
                          <Button
                            type="primary"
                            icon={<PlayCircleOutlined />}
                            onClick={runLanceQuery}
                            loading={queryLoading}
                          >
                            执行
                          </Button>
                          {queryResult && (
                            <Table
                              size="small"
                              scroll={{ x: 'max-content' }}
                              columns={queryResult.columns.map((col, i) => ({
                                title: col,
                                dataIndex: String(i),
                                key: String(i),
                                ellipsis: true,
                                render: (v: any) => (v != null ? String(v) : '-'),
                              }))}
                              dataSource={queryResult.rows.map((row, i) => ({
                                key: i,
                                ...row.reduce((acc, val, j) => ({ ...acc, [String(j)]: val }), {}),
                              }))}
                              pagination={{ pageSize: 20, showSizeChanger: true }}
                            />
                          )}
                        </Space>
                      </div>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </Card>
    </PageContainer>
  );
};

export default DatasetDetail;
