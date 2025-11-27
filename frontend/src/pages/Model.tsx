import {
  DeleteOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  BranchesOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import {
  App,
  Button,
  Card,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tag,
} from 'antd';
import React, { useRef, useState } from 'react';
import { request } from '@umijs/max';

const { TextArea } = Input;
const { Option } = Select;

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

const Model: React.FC = () => {
  const { message: messageApi } = App.useApp();
  const proTableRef = useRef<ActionType>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createForm] = Form.useForm();
  const [detailLoading, setDetailLoading] = useState(false);
  const [versionDrawerVisible, setVersionDrawerVisible] = useState(false);
  const [versionLoading, setVersionLoading] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [selectedModelName, setSelectedModelName] = useState<string>('');
  const [versions, setVersions] = useState<any[]>([]);

  // 获取模型列表
  const fetchModels = async (params: any) => {
    try {
      const response = await request('/api/models', {
        method: 'GET',
        params: {
          pageNumber: params.current || 1,
          keyword: params.keyword,
        },
      });

      if (response.success) {
        // 处理响应数据格式
        const data = response.data;
        let models: Model[] = [];
        let total = 0;

        if (Array.isArray(data)) {
          models = data;
          total = data.length;
        } else if (data?.models && Array.isArray(data.models)) {
          models = data.models;
          total = data.totalCount || data.total || data.models.length;
        } else if (data?.result && Array.isArray(data.result)) {
          models = data.result;
          total = data.totalCount || data.total || data.result.length;
        } else if (data?.data && Array.isArray(data.data)) {
          models = data.data;
          total = data.totalCount || data.total || data.data.length;
        }

        return {
          data: models,
          success: true,
          total: total,
        };
      } else {
        messageApi.error(response.message || '获取模型列表失败');
        return {
          data: [],
          success: false,
          total: 0,
        };
      }
    } catch (error) {
      console.error('获取模型列表失败:', error);
      messageApi.error('获取模型列表失败');
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  };

  // 获取模型详情
  const fetchModelDetail = async (modelId: string) => {
    setDetailLoading(true);
    try {
      const response = await request(`/api/models/${modelId}`, {
        method: 'GET',
      });

      if (response.success) {
        setSelectedModel(response.data);
        setDrawerVisible(true);
      } else {
        messageApi.error(response.message || '获取模型详情失败');
      }
    } catch (error) {
      console.error('获取模型详情失败:', error);
      messageApi.error('获取模型详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  // 创建模型
  const handleCreate = async (values: any) => {
    try {
      // 构建创建模型的请求体
      const requestBody: any = {
        name: values.name,
        description: values.description || '',
        modelFormat: values.modelFormat,
        owner: values.owner,
        visibilityScope: values.visibilityScope || 'ONLY_OWNER',
      };

      // 如果有初始版本信息，添加到请求体
      if (values.initVersionEntry) {
        requestBody.initVersionEntry = {
          source: values.initVersionEntrySource || 'UserUpload',
          storageBucket: values.storageBucket,
          storagePath: values.storagePath,
          modelMetrics: values.modelMetrics,
          description: values.versionDescription || '',
        };
      }

      const response = await request('/api/models', {
        method: 'POST',
        data: requestBody,
      });

      if (response.success) {
        messageApi.success('创建模型成功');
        setCreateModalVisible(false);
        createForm.resetFields();
        proTableRef.current?.reload();
      } else {
        messageApi.error(response.message || '创建模型失败');
      }
    } catch (error) {
      console.error('创建模型失败:', error);
      messageApi.error('创建模型失败');
    }
  };

  // 删除模型
  const handleDelete = async (modelId: string) => {
    try {
      const response = await request(`/api/models/${modelId}`, {
        method: 'DELETE',
      });

      if (response.success) {
        messageApi.success('删除模型成功');
        proTableRef.current?.reload();
      } else {
        messageApi.error(response.message || '删除模型失败');
      }
    } catch (error) {
      console.error('删除模型失败:', error);
      messageApi.error('删除模型失败');
    }
  };

  // 查看模型版本
  const handleViewVersions = async (record: Model) => {
    const modelId = record.modelId || record.id || '';
    setSelectedModelId(modelId);
    setSelectedModelName(record.name || '');
    setVersionDrawerVisible(true);
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
  };

  // 表格列定义
  const columns: ProColumns<Model>[] = [
    {
      title: '模型ID',
      dataIndex: 'modelId',
      key: 'modelId',
      width: 200,
      ellipsis: true,
      render: (_text, record) => record.modelId || record.id,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      ellipsis: true,
    },
    {
      title: '模型格式',
      dataIndex: 'modelFormat',
      key: 'modelFormat',
      width: 150,
      render: (text) => (text ? <Tag>{text}</Tag> : '-'),
    },
    {
      title: '最新版本',
      dataIndex: 'latestVersion',
      key: 'latestVersion',
      width: 120,
      render: (text) => (text ? <Tag color="blue">{text}</Tag> : '-'),
      hideInSearch: true,
    },
    {
      title: '创建来源',
      dataIndex: 'initSource',
      key: 'initSource',
      width: 120,
      render: (text) => (text ? <Tag>{text}</Tag> : '-'),
      hideInSearch: true,
    },
    {
      title: '所有者',
      dataIndex: 'ownerName',
      key: 'ownerName',
      width: 120,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      hideInSearch: true,
      render: (text) => (text ? new Date(text as any).toLocaleString() : '-'),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      hideInSearch: true,
      render: (text) => (text ? new Date(text as any).toLocaleString() : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      fixed: 'right' as const,
      render: (_: any, record: Model) => (
        <Space wrap>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => fetchModelDetail(record.modelId || record.id || '')}
            style={{ color: '#1890ff' }}
          >
            详情
          </Button>
          <Button
            type="text"
            size="small"
            icon={<BranchesOutlined />}
            onClick={() => handleViewVersions(record)}
            style={{ color: '#722ed1' }}
          >
            版本
          </Button>
          <Popconfirm
            title="确定要删除这个模型吗？"
            onConfirm={() => handleDelete(record.modelId || record.id || '')}
            okText="确定"
            cancelText="取消"
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="模型列表"
      subTitle="管理模型，支持创建、查看和管理"
      extra={
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            创建模型
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => proTableRef.current?.reload()}
          >
            刷新
          </Button>
        </Space>
      }
    >
      <ProTable<Model>
        columns={columns}
        actionRef={proTableRef}
        request={fetchModels}
        rowKey={(record) => record.modelId || record.id || ''}
        search={{
          labelWidth: 'auto',
          defaultCollapsed: false,
        }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
        dateFormatter="string"
        headerTitle="模型列表"
        toolBarRender={() => []}
      />

      {/* 创建模型模态框 */}
      <Modal
        title="创建模型"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        onOk={() => createForm.submit()}
        width={800}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
        >
          <Form.Item
            name="name"
            label="模型名称"
            rules={[
              { required: true, message: '请输入模型名称' },
              { pattern: /^[a-z][a-z0-9-]*[a-z0-9]$/, message: '模型名称必须以小写字母开头，只能包含小写字母、数字和-，必须以小写字母或数字结尾' }
            ]}
          >
            <Input placeholder="请输入模型名称" />
          </Form.Item>
          <Form.Item
            name="modelFormat"
            label="模型格式"
            rules={[{ required: true, message: '请选择模型格式' }]}
          >
            <Select placeholder="请选择模型格式">
              <Option value="HuggingFace">HuggingFace</Option>
              <Option value="MegatronCore">MegatronCore</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea rows={4} placeholder="请输入模型描述" />
          </Form.Item>
          <Form.Item
            name="visibilityScope"
            label="可见范围"
            initialValue="ONLY_OWNER"
          >
            <Select>
              <Option value="ONLY_OWNER">仅所有者可读写</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="owner"
            label="所有者（可选）"
          >
            <Input placeholder="不填写则默认为创建者" />
          </Form.Item>
          <Card title="初始版本信息（可选）" size="small" style={{ marginTop: 16 }}>
            <Form.Item
              name="initVersionEntrySource"
              label="来源"
              initialValue="UserUpload"
            >
              <Select>
                <Option value="UserUpload">用户上传</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="storageBucket"
              label="存储桶"
            >
              <Input placeholder="请输入存储桶名称" />
            </Form.Item>
            <Form.Item
              name="storagePath"
              label="存储路径"
            >
              <Input placeholder="请输入存储路径，如：/path/to/dir" />
            </Form.Item>
            <Form.Item
              name="modelMetrics"
              label="模型指标（JSON格式）"
            >
              <TextArea rows={4} placeholder='请输入JSON格式的模型指标，如：{"Results":[{"Metrics":{"loss":2.13,"lr":0.0005},"Dataset":{"DatasetId":"ds-xxx"}}]}' />
            </Form.Item>
            <Form.Item
              name="versionDescription"
              label="版本描述"
            >
              <TextArea rows={2} placeholder="请输入版本描述" />
            </Form.Item>
          </Card>
        </Form>
      </Modal>

      {/* 模型详情抽屉 */}
      <Drawer
        title="模型详情"
        width={800}
        open={drawerVisible}
        onClose={() => {
          setDrawerVisible(false);
          setSelectedModel(null);
        }}
        loading={detailLoading}
      >
        {selectedModel && (
          <>
            <Descriptions column={1} bordered>
              <Descriptions.Item label="模型ID">
                {selectedModel.modelId || selectedModel.id || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="名称">
                {selectedModel.name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="模型格式">
                {selectedModel.modelFormat ? (
                  <Tag>{selectedModel.modelFormat}</Tag>
                ) : (
                  '-'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="创建来源">
                {selectedModel.initSource ? (
                  <Tag>{selectedModel.initSource}</Tag>
                ) : (
                  '-'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="描述">
                {selectedModel.description || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="所有者">
                {selectedModel.ownerName || selectedModel.owner || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="可见范围">
                {selectedModel.visibilityScope || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="最新版本">
                {selectedModel.latestVersion || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {selectedModel.createdAt
                  ? new Date(selectedModel.createdAt).toLocaleString()
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {selectedModel.updatedAt
                  ? new Date(selectedModel.updatedAt).toLocaleString()
                  : '-'}
              </Descriptions.Item>
            </Descriptions>
            {selectedModel.versionEntry && (
              <Card title="最新版本详情" style={{ marginTop: 16 }}>
                <Descriptions column={1} bordered>
                  <Descriptions.Item label="版本号">
                    {selectedModel.versionEntry.version || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="版本ID">
                    {selectedModel.versionEntry.id || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="来源">
                    {selectedModel.versionEntry.source || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="存储桶">
                    {selectedModel.versionEntry.storageBucket || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="存储路径">
                    {selectedModel.versionEntry.storagePath || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="创建时间">
                    {selectedModel.versionEntry.createdAt
                      ? new Date(selectedModel.versionEntry.createdAt).toLocaleString()
                      : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="创建用户">
                    {selectedModel.versionEntry.createUserName || selectedModel.versionEntry.createUser || '-'}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            )}
          </>
        )}
      </Drawer>

      {/* 版本列表抽屉 */}
      <Drawer
        title={`模型版本列表 - ${selectedModelName || ''}`}
        placement="right"
        width={1000}
        open={versionDrawerVisible}
        onClose={() => {
          setVersionDrawerVisible(false);
          setVersions([]);
          setSelectedModelId('');
          setSelectedModelName('');
        }}
        loading={versionLoading}
        destroyOnClose
      >
        <ProTable
          rowKey={(record) => record.id || record.versionId || record.version || ''}
          columns={[
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
              render: (text) => text ? <Tag>{text}</Tag> : '-',
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
          ]}
          dataSource={versions}
          loading={versionLoading}
          search={false}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
          }}
          options={false}
          toolBarRender={false}
        />
      </Drawer>
    </PageContainer>
  );
};

export default Model;
