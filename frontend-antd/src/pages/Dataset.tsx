import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  PlusOutlined,
  ReloadOutlined,
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
  Space,
  Tag,
  Tabs,
  message,
} from 'antd';
import React, { useRef, useState } from 'react';
import { request } from '@umijs/max';

const { TextArea } = Input;

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

const Dataset: React.FC = () => {
  const { message: messageApi } = App.useApp();
  const proTableRef = useRef<ActionType>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createForm] = Form.useForm();
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeStorageType, setActiveStorageType] = useState<string>('BOS'); // 当前选择的存储类型：BOS 或 PFS

  // 获取数据集列表
  const fetchDatasets = async (params: any) => {
    try {
      const response = await request('/api/datasets', {
        method: 'GET',
        params: {
          pageNumber: params.current || 1,
          pageSize: params.pageSize || 10,
          keyword: params.keyword,
          storageType: activeStorageType, // 使用当前选择的存储类型
          storageInstances: params.storageInstances,
          importFormat: params.importFormat,
        },
      });

      if (response.success) {
        // 处理响应数据格式
        const data = response.data;
        let datasets: Dataset[] = [];
        let total = 0;

        if (Array.isArray(data)) {
          datasets = data;
          total = data.length;
        } else if (data?.datasets && Array.isArray(data.datasets)) {
          datasets = data.datasets;
          total = data.total || data.datasets.length;
        } else if (data?.result && Array.isArray(data.result)) {
          datasets = data.result;
          total = data.total || data.result.length;
        } else if (data?.data && Array.isArray(data.data)) {
          datasets = data.data;
          total = data.total || data.data.length;
        }

        return {
          data: datasets,
          success: true,
          total: total,
        };
      } else {
        messageApi.error(response.message || '获取数据集列表失败');
        return {
          data: [],
          success: false,
          total: 0,
        };
      }
    } catch (error) {
      console.error('获取数据集列表失败:', error);
      messageApi.error('获取数据集列表失败');
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  };

  // 获取数据集详情
  const fetchDatasetDetail = async (datasetId: string) => {
    setDetailLoading(true);
    try {
      const response = await request(`/api/datasets/${datasetId}`, {
        method: 'GET',
      });

      if (response.success) {
        setSelectedDataset(response.data);
        setDrawerVisible(true);
      } else {
        messageApi.error(response.message || '获取数据集详情失败');
      }
    } catch (error) {
      console.error('获取数据集详情失败:', error);
      messageApi.error('获取数据集详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  // 创建数据集
  const handleCreate = async (values: any) => {
    try {
      const response = await request('/api/datasets', {
        method: 'POST',
        data: values,
      });

      if (response.success) {
        messageApi.success('创建数据集成功');
        setCreateModalVisible(false);
        createForm.resetFields();
        proTableRef.current?.reload();
      } else {
        messageApi.error(response.message || '创建数据集失败');
      }
    } catch (error) {
      console.error('创建数据集失败:', error);
      messageApi.error('创建数据集失败');
    }
  };

  // 删除数据集
  const handleDelete = async (datasetId: string) => {
    try {
      const response = await request(`/api/datasets/${datasetId}`, {
        method: 'DELETE',
      });

      if (response.success) {
        messageApi.success('删除数据集成功');
        proTableRef.current?.reload();
      } else {
        messageApi.error(response.message || '删除数据集失败');
      }
    } catch (error) {
      console.error('删除数据集失败:', error);
      messageApi.error('删除数据集失败');
    }
  };

  // 表格列定义
  const columns: ProColumns<Dataset>[] = [
    {
      title: '数据集ID',
      dataIndex: 'datasetId',
      key: 'datasetId',
      width: 200,
      ellipsis: true,
      render: (text, record) => record.datasetId || record.id,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      ellipsis: true,
    },
    {
      title: '存储类型',
      dataIndex: 'storageType',
      key: 'storageType',
      width: 120,
      hideInSearch: true, // 隐藏搜索，使用Tab来过滤
      render: (text) => (text ? <Tag>{text}</Tag> : '-'),
    },
    {
      title: '存储实例',
      dataIndex: 'storageInstance',
      key: 'storageInstance',
      width: 150,
      ellipsis: true,
    },
    {
      title: '导入格式',
      dataIndex: 'importFormat',
      key: 'importFormat',
      width: 120,
      render: (text) => (text ? <Tag>{text}</Tag> : '-'),
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
      dataIndex: 'createTime',
      key: 'createTime',
      width: 180,
      hideInSearch: true,
      render: (text) => (text ? new Date(text).toLocaleString() : '-'),
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      key: 'updateTime',
      width: 180,
      hideInSearch: true,
      render: (text) => (text ? new Date(text).toLocaleString() : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_: any, record: Dataset) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => fetchDatasetDetail(record.datasetId || record.id || '')}
          >
            详情
          </Button>
          <Popconfirm
            title="确定要删除这个数据集吗？"
            onConfirm={() => handleDelete(record.datasetId || record.id || '')}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 处理存储类型Tab切换
  const handleStorageTypeChange = (storageType: string) => {
    setActiveStorageType(storageType);
    // 切换Tab时重新加载数据
    proTableRef.current?.reload();
  };

  return (
    <PageContainer
      title="数据集列表"
      subTitle="管理数据集，支持创建、查看和管理"
      extra={
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            创建数据集
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
      <Card>
        <Tabs
          activeKey={activeStorageType}
          onChange={handleStorageTypeChange}
          items={[
            {
              key: 'BOS',
              label: 'BOS存储',
            },
            {
              key: 'PFS',
              label: 'PFS存储',
            },
          ]}
          style={{ marginBottom: 16 }}
        />
        <ProTable<Dataset>
          columns={columns}
          actionRef={proTableRef}
          request={fetchDatasets}
          rowKey={(record) => record.datasetId || record.id || ''}
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
          headerTitle="数据集列表"
          toolBarRender={() => []}
        />
      </Card>

      {/* 创建数据集模态框 */}
      <Modal
        title="创建数据集"
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
            label="数据集名称"
            rules={[{ required: true, message: '请输入数据集名称' }]}
          >
            <Input placeholder="请输入数据集名称" />
          </Form.Item>
          <Form.Item
            name="storageType"
            label="存储类型"
            rules={[{ required: true, message: '请选择存储类型' }]}
          >
            <Input placeholder="如：BOS、PFS" />
          </Form.Item>
          <Form.Item
            name="storageInstance"
            label="存储实例"
            rules={[{ required: true, message: '请输入存储实例' }]}
          >
            <Input placeholder="请输入存储实例" />
          </Form.Item>
          <Form.Item
            name="importFormat"
            label="导入格式"
            rules={[{ required: true, message: '请选择导入格式' }]}
          >
            <Input placeholder="如：FILE、FOLDER" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea rows={4} placeholder="请输入数据集描述" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 数据集详情抽屉 */}
      <Drawer
        title="数据集详情"
        width={800}
        open={drawerVisible}
        onClose={() => {
          setDrawerVisible(false);
          setSelectedDataset(null);
        }}
        loading={detailLoading}
      >
        {selectedDataset && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="数据集ID">
              {selectedDataset.datasetId || selectedDataset.id || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="名称">
              {selectedDataset.name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="存储类型">
              {selectedDataset.storageType ? (
                <Tag>{selectedDataset.storageType}</Tag>
              ) : (
                '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="存储实例">
              {selectedDataset.storageInstance || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="导入格式">
              {selectedDataset.importFormat ? (
                <Tag>{selectedDataset.importFormat}</Tag>
              ) : (
                '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="描述">
              {selectedDataset.description || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="所有者">
              {selectedDataset.owner || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="可见范围">
              {selectedDataset.visibilityScope || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {selectedDataset.createTime
                ? new Date(selectedDataset.createTime).toLocaleString()
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {selectedDataset.updateTime
                ? new Date(selectedDataset.updateTime).toLocaleString()
                : '-'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default Dataset;
