import {
  DeleteOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  StopOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import {
  App,
  Button,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Tag,
} from 'antd';
import React, { useRef, useState } from 'react';
import { request } from '@umijs/max';

const { TextArea } = Input;

// 训练任务数据类型
interface Job {
  id?: string;
  jobId?: string;
  name?: string;
  description?: string;
  status?: string;
  resourcePoolId?: string;
  queue?: string;
  queueID?: string;
  owner?: string;
  ownerName?: string;
  createdAt?: string;
  updatedAt?: string;
  startTime?: string;
  endTime?: string;
  [key: string]: any;
}

const Training: React.FC = () => {
  const { message: messageApi } = App.useApp();
  const proTableRef = useRef<ActionType>();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createForm] = Form.useForm();
  const [detailLoading, setDetailLoading] = useState(false);

  // 获取训练任务列表
  const fetchJobs = async (params: any) => {
    try {
      const response = await request('/api/jobs', {
        method: 'POST',
        data: {
          keyword: params.keyword,
          status: params.status,
          owner: params.owner,
        },
        params: {
          resourcePoolId: params.resourcePoolId,
        },
      });

      if (response.success) {
        // 处理响应数据格式
        const data = response.data;
        let jobs: Job[] = [];
        let total = 0;

        if (Array.isArray(data)) {
          jobs = data;
          total = data.length;
        } else if (data?.jobs && Array.isArray(data.jobs)) {
          jobs = data.jobs;
          total = data.totalCount || data.total || data.jobs.length;
        } else if (data?.result && Array.isArray(data.result)) {
          jobs = data.result;
          total = data.totalCount || data.total || data.result.length;
        } else if (data?.data && Array.isArray(data.data)) {
          jobs = data.data;
          total = data.totalCount || data.total || data.data.length;
        }

        return {
          data: jobs,
          success: true,
          total: total,
        };
      } else {
        messageApi.error(response.message || '获取训练任务列表失败');
        return {
          data: [],
          success: false,
          total: 0,
        };
      }
    } catch (error) {
      console.error('获取训练任务列表失败:', error);
      messageApi.error('获取训练任务列表失败');
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  };

  // 获取训练任务详情
  const fetchJobDetail = async (jobId: string) => {
    setDetailLoading(true);
    try {
      const response = await request(`/api/jobs/${jobId}`, {
        method: 'GET',
        params: {
          needDetail: 'true',
        },
      });

      if (response.success) {
        setSelectedJob(response.data);
        setDrawerVisible(true);
      } else {
        messageApi.error(response.message || '获取训练任务详情失败');
      }
    } catch (error) {
      console.error('获取训练任务详情失败:', error);
      messageApi.error('获取训练任务详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  // 创建训练任务
  const handleCreate = async (values: any) => {
    try {
      // 构建创建训练任务的请求体（资源池ID和队列ID由后端从配置文件读取）
      const requestBody: any = {
        name: values.name,
        description: values.description || '',
      };

      // 如果有其他配置，添加到请求体（根据实际API需要添加）
      if (values.command) {
        requestBody.command = values.command;
      }
      if (values.image) {
        requestBody.image = values.image;
      }

      const response = await request('/api/jobs/create', {
        method: 'POST',
        data: requestBody,
      });

      if (response.success) {
        messageApi.success('训练任务创建成功');
        setCreateModalVisible(false);
        createForm.resetFields();
        proTableRef.current?.reload();
      } else {
        messageApi.error(response.message || '创建训练任务失败');
      }
    } catch (error: any) {
      console.error('创建训练任务失败:', error);
      const errorMessage = error?.info?.errorMessage || error?.message || '创建训练任务失败';
      messageApi.error(errorMessage);
    }
  };

  // 停止训练任务
  const handleStop = async (jobId: string) => {
    try {
      const response = await request(`/api/jobs/${jobId}/stop`, {
        method: 'POST',
      });

      if (response.success) {
        messageApi.success('训练任务停止成功');
        proTableRef.current?.reload();
      } else {
        messageApi.error(response.message || '停止训练任务失败');
      }
    } catch (error: any) {
      console.error('停止训练任务失败:', error);
      const errorMessage = error?.info?.errorMessage || error?.message || '停止训练任务失败';
      messageApi.error(errorMessage);
    }
  };

  // 删除训练任务
  const handleDelete = async (jobId: string) => {
    try {
      const response = await request(`/api/jobs/${jobId}`, {
        method: 'DELETE',
      });

      if (response.success) {
        messageApi.success('训练任务删除成功');
        proTableRef.current?.reload();
      } else {
        messageApi.error(response.message || '删除训练任务失败');
      }
    } catch (error: any) {
      console.error('删除训练任务失败:', error);
      const errorMessage = error?.info?.errorMessage || error?.message || '删除训练任务失败';
      messageApi.error(errorMessage);
    }
  };

  // 获取状态标签颜色
  const getStatusColor = (status?: string | number | null) => {
    if (!status) return 'default';
    // 确保 status 是字符串类型
    const statusStr = String(status);
    const statusLower = statusStr.toLowerCase();
    if (statusLower.includes('running') || statusLower.includes('active') || statusLower.includes('pending')) {
      return 'processing';
    }
    if (statusLower.includes('stopped') || statusLower.includes('inactive') || statusLower.includes('completed')) {
      return 'success';
    }
    if (statusLower.includes('error') || statusLower.includes('failed')) {
      return 'error';
    }
    if (statusLower.includes('creating')) {
      return 'processing';
    }
    return 'default';
  };

  // 表格列定义
  const columns: ProColumns<Job>[] = [
    {
      title: '任务ID',
      dataIndex: 'jobId',
      key: 'jobId',
      width: 200,
      ellipsis: true,
      render: (text, record) => record.jobId || record.id,
    },
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (text) => {
        if (!text && text !== 0) return '-';
        const statusStr = String(text);
        return <Tag color={getStatusColor(statusStr)}>{statusStr}</Tag>;
      },
      valueType: 'select',
      valueEnum: {
        Running: { text: '运行中', status: 'Processing' },
        Pending: { text: '等待中', status: 'Processing' },
        Stopped: { text: '已停止', status: 'Success' },
        Completed: { text: '已完成', status: 'Success' },
        Error: { text: '错误', status: 'Error' },
        Failed: { text: '失败', status: 'Error' },
      },
    },
    {
      title: '资源池ID',
      dataIndex: 'resourcePoolId',
      key: 'resourcePoolId',
      width: 150,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '队列',
      dataIndex: 'queue',
      key: 'queue',
      width: 120,
      ellipsis: true,
      render: (text, record) => text || record.queueID || '-',
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
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      hideInSearch: true,
      render: (text) => (text ? new Date(text).toLocaleString() : '-'),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      hideInSearch: true,
      render: (text) => (text ? new Date(text).toLocaleString() : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      fixed: 'right',
      render: (_: any, record: Job) => {
        const jobId = record.jobId || record.id || '';
        const status = record.status ? String(record.status).toLowerCase() : '';
        const canStop = status.includes('running') || status.includes('pending');

        return (
          <Space>
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => fetchJobDetail(jobId)}
            >
              详情
            </Button>
            {canStop && (
              <Popconfirm
                title="确定要停止这个训练任务吗？"
                onConfirm={() => handleStop(jobId)}
                okText="确定"
                cancelText="取消"
              >
                <Button type="link" icon={<StopOutlined />}>
                  停止
                </Button>
              </Popconfirm>
            )}
            <Popconfirm
              title="确定要删除这个训练任务吗？"
              onConfirm={() => handleDelete(jobId)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <PageContainer
      title="训练任务"
      subTitle="管理训练任务，支持创建、查看、停止和删除"
      extra={
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            创建任务
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
      <ProTable<Job>
        columns={columns}
        actionRef={proTableRef}
        request={fetchJobs}
        rowKey={(record) => record.jobId || record.id || ''}
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
        headerTitle="训练任务列表"
        toolBarRender={() => []}
      />

      {/* 创建训练任务模态框 */}
      <Modal
        title="创建训练任务"
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
            label="任务名称"
            rules={[
              { required: true, message: '请输入任务名称' },
            ]}
          >
            <Input placeholder="请输入任务名称" />
          </Form.Item>
          <Form.Item
            name="command"
            label="启动命令"
            rules={[{ required: true, message: '请输入启动命令' }]}
          >
            <TextArea rows={4} placeholder="请输入启动命令，例如：python train.py" />
          </Form.Item>
          <Form.Item
            name="image"
            label="镜像地址"
            rules={[{ required: true, message: '请输入镜像地址' }]}
          >
            <Input placeholder="请输入镜像地址，例如：registry.baidubce.com/your-image:tag" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea rows={4} placeholder="请输入任务描述" />
          </Form.Item>
          <Form.Item
            label="提示"
            style={{ marginBottom: 0 }}
          >
            <div style={{ color: '#999', fontSize: '12px' }}>
              资源池ID和队列ID将从系统配置中自动读取（ML_PLATFORM_RESOURCE_POOL_ID 和 ML_PLATFORM_RESOURCE_QUEUE_ID）
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* 训练任务详情抽屉 */}
      <Drawer
        title="训练任务详情"
        width={800}
        open={drawerVisible}
        onClose={() => {
          setDrawerVisible(false);
          setSelectedJob(null);
        }}
        loading={detailLoading}
      >
        {selectedJob && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="任务ID">
              {selectedJob.jobId || selectedJob.id || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="任务名称">
              {selectedJob.name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {(selectedJob.status || selectedJob.status === 0) ? (
                <Tag color={getStatusColor(selectedJob.status)}>
                  {String(selectedJob.status)}
                </Tag>
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="资源池ID">
              {selectedJob.resourcePoolId || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="队列">
              {selectedJob.queue || selectedJob.queueID || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="所有者">
              {selectedJob.ownerName || selectedJob.owner || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="描述">
              {selectedJob.description || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="开始时间">
              {selectedJob.startTime 
                ? new Date(selectedJob.startTime).toLocaleString() 
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="结束时间">
              {selectedJob.endTime 
                ? new Date(selectedJob.endTime).toLocaleString() 
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {selectedJob.createdAt 
                ? new Date(selectedJob.createdAt).toLocaleString() 
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {selectedJob.updatedAt 
                ? new Date(selectedJob.updatedAt).toLocaleString() 
                : '-'}
            </Descriptions.Item>
            {selectedJob.config && (
              <Descriptions.Item label="配置信息">
                <pre style={{ 
                  background: '#f5f5f5', 
                  padding: '12px', 
                  borderRadius: '4px',
                  maxHeight: '300px',
                  overflow: 'auto',
                }}>
                  {JSON.stringify(selectedJob.config, null, 2)}
                </pre>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default Training;
