import {
  DownOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import {
  App,
  Button,
  Card,
  Dropdown,
  Form,
  Input,
  Modal,
  Space,
  Tag,
  Tabs,
  Typography,
} from 'antd';
import type { MenuProps } from 'antd';
import React, { useRef, useState, useEffect } from 'react';
import { history, request } from '@umijs/max';
import { createRepository, getRepositories } from '@/services/aihc-mentor/lakefs';


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
  ownerName?: string;
  visibilityScope?: string;
  createdAt?: string;
  updatedAt?: string;
  latestVersion?: any;
}

const Dataset: React.FC = () => {
  const { message: messageApi } = App.useApp();
  const proTableRef = useRef<ActionType>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createForm] = Form.useForm();
  const [activeStorageType, setActiveStorageType] = useState<string>('BOS'); // 当前选择的存储类型：BOS 或 PFS

  // 创建仓库相关的状态
  const [repoModalVisible, setRepoModalVisible] = useState(false);
  const [repoForm] = Form.useForm();
  const [submittingRepo, setSubmittingRepo] = useState(false);
  const [existingRepos, setExistingRepos] = useState<Set<string>>(new Set());

  // 独立获取已存在的 LakeFS 仓库，由于数量可能较多，可以不阻塞 Dataset 列表的加载
  const fetchExistingRepos = async () => {
    try {
      // 在实际生产中如果仓库过百可能需要处理分页（after 游标），这里假设前1000条足够涵盖大部分业务场景
      const response = await getRepositories({ amount: 1000 });
      if (response.success && response.data?.results) {
        const ids = response.data.results.map((r: any) => r.id);
        setExistingRepos(new Set(ids));
      }
    } catch (error) {
      console.error('获取现有仓库列表失败，创建仓库按钮的防冲突检查可能失效', error);
    }
  };

  useEffect(() => {
    fetchExistingRepos();
  }, []);

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
          total = data.totalCount || data.total || data.datasets.length;
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

  // 跳转数据集详情页
  const goToDetail = (record: Dataset, tab?: 'versions') => {
    const id = record.datasetId || record.id || '';
    if (tab) {
      history.push(`/ai-assets/dataset/detail/${id}?tab=${tab}`);
    } else {
      history.push(`/ai-assets/dataset/detail/${id}`);
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

  // 处理创建 LakeFS 仓库
  const handleCreateRepo = async (values: any) => {
    setSubmittingRepo(true);
    try {
      const response = await createRepository({
        id: values.id,
        defaultBranch: values.defaultBranch,
        storageNamespace: values.storageNamespace,
      });

      if (response.success) {
        messageApi.success('创建数据仓库成功');
        setRepoModalVisible(false);
        repoForm.resetFields();
        // 重新拉取已存在仓库，以刷新按钮状态
        fetchExistingRepos();
      } else {
        messageApi.error(response.message || '创建数据仓库失败');
      }
    } catch (error: any) {
      console.error('创建仓库出错:', error);
      messageApi.error(error?.info?.errorMessage || error.message || '创建数据仓库异常');
    } finally {
      setSubmittingRepo(false);
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
      title: '名称 / 数据集ID',
      dataIndex: 'name',
      key: 'name_id',
      width: 280,
      ellipsis: true,
      render: (_: any, record: Dataset) => {
        const id = record.datasetId || record.id || '';
        const name = record.name || '-';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Typography.Link
              onClick={() => goToDetail(record)}
              style={{ display: 'block', fontWeight: 500 }}
            >
              {name}
            </Typography.Link>
            <Typography.Text
              copyable={{ text: id }}
              style={{ fontSize: 12, color: '#666' }}
            >
              {id}
            </Typography.Text>
          </div>
        );
      },
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
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      hideInSearch: true,
      render: (text: any) => (text ? new Date(String(text)).toLocaleString('zh-CN') : '-'),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      hideInSearch: true,
      render: (text: any) => (text ? new Date(String(text)).toLocaleString('zh-CN') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right' as const,
      render: (_: any, record: Dataset) => {
        const datasetId = record.datasetId || record.id || '';

        const actions: { key: string; label: string; onClick: () => void; danger?: boolean }[] = [
          { key: 'detail', label: '详情', onClick: () => goToDetail(record) },
          { key: 'versions', label: '版本', onClick: () => goToDetail(record, 'versions') },
        ];

        if (record.storageType === 'BOS') {
          const safeRepoId = (record.name || '').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '');
          const hasRepo = existingRepos.has(safeRepoId);
          if (!hasRepo) {
            actions.push({
              key: 'createRepo',
              label: '创建仓库',
              onClick: () => {
                repoForm.setFieldsValue({
                  id: safeRepoId,
                  storageNamespace: `s3://${record.storageInstance}/lakefs/${safeRepoId}/`,
                  defaultBranch: 'main',
                });
                setRepoModalVisible(true);
              },
            });
          }
        }

        actions.push({
          key: 'delete',
          danger: true,
          label: '删除',
          onClick: () => {
            Modal.confirm({
              title: '确定要删除这个数据集吗？',
              okText: '确定',
              okType: 'danger',
              cancelText: '取消',
              onOk: () => handleDelete(datasetId),
            });
          },
        });

        if (actions.length <= 2) {
          return (
            <Space size={4}>
              {actions.map(action => (
                <Button key={action.key} type="link" size="small" danger={action.danger} onClick={action.onClick}>
                  {action.label}
                </Button>
              ))}
            </Space>
          );
        }

        const [first, ...rest] = actions;
        const moreItems: MenuProps['items'] = rest.map((action, index) => {
          const items: any[] = [];
          if (action.danger && index > 0) {
            items.push({ type: 'divider' });
          }
          items.push({ key: action.key, label: action.label, danger: action.danger, onClick: action.onClick });
          return items;
        }).flat();

        return (
          <Space size={4}>
            <Button type="link" size="small" onClick={first.onClick}>{first.label}</Button>
            <Dropdown menu={{ items: moreItems }} trigger={['click']}>
              <Button type="link" size="small" onClick={(e) => e.preventDefault()}>
                更多 <DownOutlined />
              </Button>
            </Dropdown>
          </Space>
        );
      },
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
          scroll={{ x: 1300 }}
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

      {/* 创建数据仓库模态框 */}
      <Modal
        title="基于当前数据集创建 LakeFS 仓库"
        open={repoModalVisible}
        onCancel={() => {
          setRepoModalVisible(false);
          repoForm.resetFields();
        }}
        onOk={() => repoForm.submit()}
        confirmLoading={submittingRepo}
        destroyOnClose
      >
        <Form
          form={repoForm}
          layout="vertical"
          onFinish={handleCreateRepo}
        >
          <Form.Item
            name="id"
            label="仓库名称 (Repository ID)"
            rules={[
              { required: true, message: '请输入仓库名称' },
              { pattern: /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/, message: '由小写字母、数字、连字符构成，以字母或数字起止' }
            ]}
          >
            <Input disabled placeholder="例如: my-new-repo" />
          </Form.Item>
          <Form.Item
            name="storageNamespace"
            label="存储命名空间 (Storage Namespace)"
            rules={[{ required: true, message: '系统未能获取到 BOS 桶信息' }]}
            tooltip="底层存储路径，由系统基于关联的 BOS 桶和仓库名自动映射，无需编辑"
          >
            <Input disabled placeholder="例如: s3://bucket/lakefs/repository/" />
          </Form.Item>
          <Form.Item
            name="defaultBranch"
            label="默认分支 (Default Branch)"
            rules={[{ required: true, message: '请输入默认分支名称' }]}
          >
            <Input placeholder="输入默认分支，如 main 或 master" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default Dataset;
