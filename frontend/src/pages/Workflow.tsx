import {
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import {
  App,
  Button,
  Form,
  Input,
  Modal,
  Space,
  Tag,
  Typography,
} from 'antd';
import React, { useRef, useState } from 'react';
import { history, request } from '@umijs/max';

const { TextArea } = Input;
const { Text } = Typography;

// 工作流数据类型
interface Workflow {
  id: string;
  name: string;
  description?: string;
  type?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  publishStatus?: string;
}

const Workflow: React.FC = () => {
  const { message: messageApi } = App.useApp();
  const proTableRef = useRef<ActionType>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createForm] = Form.useForm();

  // 获取工作流列表
  const fetchWorkflows = async (params: any) => {
    try {
      const response = await request('/api/workflows', {
        method: 'GET',
        params: {
          pageNumber: params.current || 1,
          pageSize: params.pageSize || 10,
          keyword: params.keyword,
        },
      });

      if (response.success) {
        const data = response.data;
        let workflows: Workflow[] = [];
        let total = 0;

        if (Array.isArray(data)) {
          workflows = data;
          total = data.length;
        } else if (data?.workflows && Array.isArray(data.workflows)) {
          workflows = data.workflows;
          total = data.total || data.workflows.length;
        } else if (data?.result && Array.isArray(data.result)) {
          workflows = data.result;
          total = data.total || data.result.length;
        } else if (data?.data && Array.isArray(data.data)) {
          workflows = data.data;
          total = data.total || data.data.length;
        }

        return {
          data: workflows,
          success: true,
          total: total,
        };
      } else {
        messageApi.error(response.message || '获取工作流列表失败');
        return { data: [], success: false, total: 0 };
      }
    } catch (error) {
      console.error('获取工作流列表失败:', error);
      messageApi.error('获取工作流列表失败');
      return { data: [], success: false, total: 0 };
    }
  };

  // 创建工作流
  const handleCreate = async (values: any) => {
    try {
      const response = await request('/api/workflows', {
        method: 'POST',
        data: {
          name: values.name,
          description: values.description || '',
          type: values.type || 'workflow',
        },
      });

      if (response.success) {
        messageApi.success('创建工作流成功');
        setCreateModalVisible(false);
        createForm.resetFields();
        proTableRef.current?.reload();
      } else {
        messageApi.error(response.message || '创建工作流失败');
      }
    } catch (error) {
      console.error('创建工作流失败:', error);
      messageApi.error('创建工作流失败');
    }
  };

  // 删除工作流
  const handleDelete = async (workflowId: string) => {
    try {
      const response = await request(`/api/workflows/${workflowId}`, {
        method: 'DELETE',
      });

      if (response.success) {
        messageApi.success('删除工作流成功');
        proTableRef.current?.reload();
      } else {
        messageApi.error(response.message || '删除工作流失败');
      }
    } catch (error) {
      console.error('删除工作流失败:', error);
      messageApi.error('删除工作流失败');
    }
  };

  // 进入工作流编排页面
  const goToEditor = (record: Workflow) => {
    history.push(`/workflow/editor/${record.id}`);
  };

  // 表格列定义
  const columns: ProColumns<Workflow>[] = [
    {
      title: '工作流名称',
      dataIndex: 'name',
      key: 'name',
      width: 250,
      ellipsis: true,
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Link
            onClick={() => goToEditor(record)}
            style={{ fontWeight: 500 }}
          >
            {text}
          </Typography.Link>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.id}
          </Text>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (text) => (text ? <Tag>{text === 'workflow' ? '工作流' : text}</Tag> : '-'),
    },
    {
      title: '状态',
      dataIndex: 'publishStatus',
      key: 'publishStatus',
      width: 100,
      render: (text) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          published: { text: '已发布', color: 'success' },
          draft: { text: '草稿', color: 'default' },
          archiving: { text: '归档中', color: 'warning' },
        };
        const config = statusMap[String(text) || 'draft'] || { text: '草稿', color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
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
      render: (_: any, record: Workflow) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            onClick={() => goToEditor(record)}
          >
            编排
          </Button>
          <Button
            type="link"
            size="small"
            danger
            onClick={() => {
              Modal.confirm({
                title: '确定要删除这个工作流吗？',
                okText: '确定',
                okType: 'danger',
                cancelText: '取消',
                onOk: () => handleDelete(record.id),
              });
            }}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="工作流"
      subTitle="管理 AI 工作流，支持创建、编排和删除"
      extra={
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            新建工作流
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
      <ProTable<Workflow>
        columns={columns}
        actionRef={proTableRef}
        request={fetchWorkflows}
        rowKey="id"
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
        scroll={{ x: 1100 }}
        headerTitle="工作流列表"
        toolBarRender={() => []}
      />

      {/* 创建工作流模态框 */}
      <Modal
        title="新建工作流"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        onOk={() => createForm.submit()}
        width={600}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
        >
          <Form.Item
            name="name"
            label="工作流名称"
            rules={[{ required: true, message: '请输入工作流名称' }]}
          >
            <Input placeholder="请输入工作流名称" />
          </Form.Item>
          <Form.Item
            name="type"
            label="类型"
            initialValue="workflow"
          >
            <Input placeholder="workflow" disabled />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea rows={4} placeholder="请输入工作流描述" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default Workflow;
