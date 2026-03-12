import {
  ArrowLeftOutlined,
  BranchesOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { App, Button, Card, Descriptions, Space, Tag, Tabs } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { history, useParams, useSearchParams } from '@umijs/max';
import { request } from '@umijs/max';

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
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState(() =>
    tabFromUrl === 'versions' ? 'versions' : 'basic',
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

  useEffect(() => {
    fetchDatasetDetail();
  }, [fetchDatasetDetail]);

  useEffect(() => {
    if (tabFromUrl === 'versions') {
      setActiveTab('versions');
    }
  }, [tabFromUrl]);

  useEffect(() => {
    if (activeTab === 'versions') {
      fetchVersions();
    }
  }, [activeTab, fetchVersions]);

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
      render: (text) => (text ? new Date(text).toLocaleString() : '-'),
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
          ]}
        />
      </Card>
    </PageContainer>
  );
};

export default DatasetDetail;
