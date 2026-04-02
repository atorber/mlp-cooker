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

// 模型数据类型
interface Model {
  id?: string;
  modelId?: string;
  name: string;
  description?: string;
  modelFormat?: string;
  owner?: string;
  ownerName?: string;
  visibilityScope?: string;
  initSource?: string;
  latestVersion?: string;
  latestVersionId?: string;
  createdAt?: string;
  updatedAt?: string;
  versionEntry?: any;
}

const ModelDetail: React.FC = () => {
  const { message: messageApi } = App.useApp();
  const params = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const modelId = params.id || '';
  const tabFromUrl = searchParams.get('tab');
  const [detailLoading, setDetailLoading] = useState(false);
  const [versionLoading, setVersionLoading] = useState(false);
  const [model, setModel] = useState<Model | null>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState(() =>
    tabFromUrl === 'versions' ? 'versions' : 'basic',
  );

  // 获取模型详情
  const fetchModelDetail = useCallback(async () => {
    if (!modelId) return;
    setDetailLoading(true);
    try {
      const response = await request(`/api/models/${modelId}`, {
        method: 'GET',
      });
      if (response.success) {
        setModel(response.data);
      } else {
        messageApi.error(response.message || '获取模型详情失败');
      }
    } catch (error) {
      console.error('获取模型详情失败:', error);
      messageApi.error('获取模型详情失败');
    } finally {
      setDetailLoading(false);
    }
  }, [modelId, messageApi]);

  // 获取版本列表
  const fetchVersions = useCallback(async () => {
    if (!modelId) return;
    setVersionLoading(true);
    try {
      const response = await request(`/api/models/${modelId}/versions`, {
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
  }, [modelId, messageApi]);

  useEffect(() => {
    fetchModelDetail();
  }, [fetchModelDetail]);

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
      title: '来源',
      dataIndex: 'source',
      width: 150,
      render: (text) => (text ? <Tag>{text}</Tag> : '-'),
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
      render: (text: any) => (text ? new Date(String(text)).toLocaleString('zh-CN') : '-'),
    },
    {
      title: '创建用户',
      dataIndex: 'createUserName',
      width: 120,
      render: (text, record) => text || record.createUser || '-',
    },
  ];

  return (
    <PageContainer
      title={model?.name || '模型详情'}
      loading={detailLoading}
      onBack={() => history.back()}
      backIcon={<ArrowLeftOutlined />}
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchModelDetail}>
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
                model && (
                  <Descriptions column={1} bordered>
                    <Descriptions.Item label="模型ID">
                      {model.modelId || model.id || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="名称">
                      {model.name || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="模型格式">
                      {model.modelFormat ? (
                        <Tag>{model.modelFormat}</Tag>
                      ) : (
                        '-'
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="创建来源">
                      {model.initSource ? (
                        <Tag>{model.initSource}</Tag>
                      ) : (
                        '-'
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="描述">
                      {model.description || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="所有者">
                      {model.ownerName || model.owner || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="可见范围">
                      {model.visibilityScope || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="最新版本">
                      {model.latestVersion || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="创建时间">
                      {model.createdAt
                        ? new Date(model.createdAt).toLocaleString('zh-CN')
                        : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="更新时间">
                      {model.updatedAt
                        ? new Date(model.updatedAt).toLocaleString('zh-CN')
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
            ...(model?.versionEntry
              ? [
                  {
                    key: 'latestVersion',
                    label: '最新版本详情',
                    children: (
                      <Descriptions column={1} bordered>
                        <Descriptions.Item label="版本号">
                          {model.versionEntry.version || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="版本ID">
                          {model.versionEntry.id || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="来源">
                          {model.versionEntry.source || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="存储桶">
                          {model.versionEntry.storageBucket || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="存储路径">
                          {model.versionEntry.storagePath || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="创建时间">
                          {model.versionEntry.createdAt
                            ? new Date(model.versionEntry.createdAt).toLocaleString('zh-CN')
                            : '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="创建用户">
                          {model.versionEntry.createUserName ||
                            model.versionEntry.createUser ||
                            '-'}
                        </Descriptions.Item>
                      </Descriptions>
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

export default ModelDetail;
