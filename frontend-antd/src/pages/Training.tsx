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
  status?: string; // 状态是字符串，如 "Running", "ManualTermination"
  resourcePoolId?: string;
  queue?: string;
  queueID?: string;
  owner?: string;
  ownerName?: string;
  userId?: string; // 用户ID
  createdAt?: string; // ISO 8601格式，如 "2025-11-20T14:13:56Z"
  finishedAt?: string; // 完成时间，ISO 8601格式，可能为空字符串 ""
  updatedAt?: string | number;
  updateTime?: string | number;
  updatedTime?: string | number;
  modifiedAt?: string | number;
  startTime?: string | number;
  endTime?: string | number;
  labels?: Array<{ key: string; value: string }>; // 标签数组，可能包含用户名信息
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
      // 验证 taskParams 是否是有效的 JSON
      let taskParams: any;
      if (typeof values.taskParams === 'string') {
        try {
          taskParams = JSON.parse(values.taskParams);
        } catch (parseError) {
          messageApi.error('任务参数格式错误，必须是有效的 JSON 格式');
          return;
        }
      } else if (typeof values.taskParams === 'object') {
        taskParams = values.taskParams;
      } else {
        messageApi.error('任务参数格式错误');
        return;
      }

      // 如果启动命令不为空，则替换任务参数中的 command 值
      if (values.command && values.command.trim()) {
        taskParams.command = values.command.trim();
      }

      // 发送请求，只传递 taskParams 字段
      // 后端会自动从配置文件读取 resourcePoolId 和 queueID
      const response = await request('/api/jobs/create', {
        method: 'POST',
        data: {
          taskParams: JSON.stringify(taskParams),
        },
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
    const statusStr = String(status).toLowerCase();
    
    // 运行中状态
    if (statusStr === 'running' || statusStr.includes('running') || statusStr === 'pending') {
      return 'processing';
    }
    
    // 已完成/已停止状态
    if (statusStr === 'completed' || statusStr === 'stopped' || statusStr === 'manualtermination' || statusStr.includes('termination')) {
      return 'success';
    }
    
    // 错误状态
    if (statusStr === 'error' || statusStr === 'failed' || statusStr.includes('error') || statusStr.includes('failed')) {
      return 'error';
    }
    
    // 创建中状态
    if (statusStr === 'creating' || statusStr.includes('creating')) {
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
      valueType: 'select',
      valueEnum: {
        Running: { text: '运行中', status: 'Processing' },
        Pending: { text: '等待中', status: 'Processing' },
        Stopped: { text: '已停止', status: 'Success' },
        Completed: { text: '已完成', status: 'Success' },
        ManualTermination: { text: '手动终止', status: 'Success' },
        Error: { text: '错误', status: 'Error' },
        Failed: { text: '失败', status: 'Error' },
      },
      render: (text, record) => {
        // status 可能是字符串或对象（ProTable 的 valueEnum 可能会转换）
        let statusValue: any = text || record.status;
        
        // 如果是对象，尝试提取状态值
        if (statusValue && typeof statusValue === 'object') {
          // valueEnum 返回的对象可能是 { text: '运行中', status: 'Processing' } 格式
          // 或者需要从 record.status 中获取原始值
          statusValue = record.status || statusValue.text || statusValue.value || statusValue.name || null;
        }
        
        if (!statusValue) return '-';
        
        // 确保是字符串类型
        const statusStr = String(statusValue);
        
        // 状态文本映射
        const statusTextMap: Record<string, string> = {
          Running: '运行中',
          Pending: '等待中',
          Stopped: '已停止',
          Completed: '已完成',
          ManualTermination: '手动终止',
          Error: '错误',
          Failed: '失败',
        };
        
        const displayText = statusTextMap[statusStr] || statusStr;
        return <Tag color={getStatusColor(statusStr)}>{displayText}</Tag>;
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
      dataIndex: 'userId',
      key: 'userId',
      width: 120,
      ellipsis: true,
      render: (text, record) => {
        // 优先从 labels 中提取用户名，其次使用 userId
        if (record.labels && Array.isArray(record.labels)) {
          const usernameLabel = record.labels.find(
            (label: any) => label.key === 'aihc.baidubce.com/username'
          );
          if (usernameLabel?.value) {
            return usernameLabel.value;
          }
        }
        return text || record.ownerName || record.owner || '-';
      },
      hideInSearch: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      hideInSearch: true,
      render: (text) => {
        if (!text) return '-';
        try {
          const date = new Date(text);
          if (isNaN(date.getTime())) return '-';
          return date.toLocaleString('zh-CN');
        } catch (e) {
          return '-';
        }
      },
    },
    {
      title: '更新时间',
      dataIndex: 'finishedAt',
      key: 'finishedAt',
      width: 180,
      hideInSearch: true,
      render: (text) => {
        // finishedAt 是完成时间，ISO 8601格式，可能为空字符串 ""
        if (!text || text === '') return '-';
        try {
          const date = new Date(text);
          if (isNaN(date.getTime())) return '-';
          return date.toLocaleString('zh-CN');
        } catch (e) {
          return '-';
        }
      },
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
        width={900}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
        >
          <Form.Item
            name="command"
            label="启动命令"
            tooltip="如果填写了启动命令，将替换任务参数中的 command 字段"
          >
            <TextArea
              rows={3}
              placeholder="请输入启动命令，例如：sleep 1d 或 python train.py"
            />
          </Form.Item>
          <Form.Item
            name="taskParams"
            label="任务参数（JSON格式）"
            rules={[
              { required: true, message: '请输入任务参数' },
              {
                validator: (_, value) => {
                  if (!value) {
                    return Promise.resolve();
                  }
                  try {
                    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
                    if (typeof parsed !== 'object' || parsed === null) {
                      return Promise.reject(new Error('任务参数必须是有效的 JSON 对象'));
                    }
                    return Promise.resolve();
                  } catch (e) {
                    return Promise.reject(new Error('任务参数格式错误，必须是有效的 JSON 格式'));
                  }
                },
              },
            ]}
          >
            <TextArea
              rows={15}
              placeholder={`请输入任务参数（JSON格式），例如：
{
  "name": "test-job",
  "command": "sleep 1d",
  "jobType": "PyTorchJob",
  "jobSpec": {
    "replicas": 1,
    "image": "registry.baidubce.com/aihc-aiak/aiak-megatron:ubuntu20.04-cu11.8-torch1.14.0-py38_v1.2.7.12_release",
    "resources": [],
    "envs": [
      {
        "name": "NCCL_DEBUG",
        "value": "DEBUG"
      }
    ],
    "enableRDMA": true
  }
}

注意：如果上面填写了启动命令，任务参数中的 command 字段将被启动命令替换`}
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>
          <Form.Item
            label="提示"
            style={{ marginBottom: 0 }}
          >
            <div style={{ color: '#999', fontSize: '12px' }}>
              <div>• 任务参数必须以 JSON 格式填写，可以是 JSON 对象或 JSON 字符串</div>
              <div>• 如果填写了启动命令，将自动替换任务参数中的 command 字段</div>
              <div>• 资源池ID和队列ID将从系统配置中自动读取（ML_PLATFORM_RESOURCE_POOL_ID 和 ML_PLATFORM_RESOURCE_QUEUE_ID）</div>
              <div>• queue 字段会自动设置为配置文件中的队列ID</div>
              <div>• 如果 datasources 中包含 type='pfs' 的数据源，会自动填充默认的 PFS 实例ID和路径</div>
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
              {selectedJob.status ? (
                <Tag color={getStatusColor(selectedJob.status)}>{selectedJob.status}</Tag>
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="资源池ID">
              {selectedJob.resourcePoolId || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="队列">
              {selectedJob.queue || selectedJob.queueID || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="所有者">
              {(() => {
                // 优先从 labels 中提取用户名
                if (selectedJob.labels && Array.isArray(selectedJob.labels)) {
                  const usernameLabel = selectedJob.labels.find(
                    (label: any) => label.key === 'aihc.baidubce.com/username'
                  );
                  if (usernameLabel?.value) {
                    return usernameLabel.value;
                  }
                }
                return selectedJob.userId || selectedJob.ownerName || selectedJob.owner || '-';
              })()}
            </Descriptions.Item>
            <Descriptions.Item label="描述">
              {selectedJob.description || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="任务类型">
              {selectedJob.jobType || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {selectedJob.createdAt 
                ? (() => {
                    try {
                      const date = new Date(selectedJob.createdAt);
                      return isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN');
                    } catch (e) {
                      return '-';
                    }
                  })()
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="完成时间">
              {selectedJob.finishedAt && selectedJob.finishedAt !== ''
                ? (() => {
                    try {
                      const date = new Date(selectedJob.finishedAt);
                      return isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN');
                    } catch (e) {
                      return '-';
                    }
                  })()
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
