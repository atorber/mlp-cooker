import {
  EyeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import {
  App,
  Button,
  Descriptions,
  Drawer,
  Space,
  Tag,
} from 'antd';
import React, { useRef, useState } from 'react';
import { request } from '@umijs/max';

// 任务数据类型（与 Job 类似，但只显示任务类型）
interface Task {
  id?: string;
  jobId?: string;
  name?: string;
  description?: string;
  status?: string | { text?: string; value?: string; name?: string };
  resourcePoolId?: string;
  queue?: string;
  queueID?: string;
  owner?: string;
  ownerName?: string;
  userId?: string;
  createdAt?: string;
  finishedAt?: string;
  updatedAt?: string | number;
  updateTime?: string | number;
  updatedTime?: string | number;
  modifiedAt?: string | number;
  jobType?: string;
  [key: string]: any;
}

const Task: React.FC = () => {
  const { message: messageApi } = App.useApp();
  const proTableRef = useRef<ActionType>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 获取任务列表（自动过滤包含 task- 关键字的 job）
  const fetchTasks = async (params: any) => {
    try {
      // 后端会自动添加 task- 关键字过滤，前端直接传递原始关键字即可
      const response = await request('/api/tasks', {
        method: 'POST',
        data: {
          keyword: params.keyword || '',
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
        let tasks: Task[] = [];
        let total = 0;

        if (Array.isArray(data)) {
          tasks = data;
          total = data.length;
        } else if (data?.jobs && Array.isArray(data.jobs)) {
          tasks = data.jobs;
          total = data.totalCount || data.total || data.jobs.length;
        } else if (data?.result && Array.isArray(data.result)) {
          tasks = data.result;
          total = data.totalCount || data.total || data.result.length;
        } else if (data?.data && Array.isArray(data.data)) {
          tasks = data.data;
          total = data.totalCount || data.total || data.data.length;
        }

        return {
          data: tasks,
          success: true,
          total: total,
        };
      }

      // 如果响应不成功，错误消息应该已经在 errorHandler 中处理
      return {
        data: [],
        success: false,
        total: 0,
      };
    } catch (error: any) {
      console.error('获取任务列表失败:', error);
      // 错误消息应该已经在全局 errorHandler 中显示，这里只记录日志
      // 如果需要显示额外的错误信息，可以从 error.info 中获取
      const errorMessage = error?.info?.errorMessage || error?.message || '获取任务列表失败';
      if (!error?.info) {
        // 如果错误没有被全局处理器处理，则显示错误
        messageApi.error(errorMessage);
      }
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  };

  // 获取任务详情
  const fetchTaskDetail = async (jobId: string) => {
    if (!jobId) return;

    setDetailLoading(true);
    try {
      const response = await request(`/api/jobs/${jobId}`, {
        method: 'GET',
        params: {
          needDetail: 'true',
        },
      });

      if (response.success) {
        const data = response.data;
        let task: Task | null = null;

        if (data?.job) {
          task = data.job;
        } else if (data?.data) {
          task = data.data;
        } else if (typeof data === 'object') {
          task = data as Task;
        }

        setSelectedTask(task);
      }
    } catch (error) {
      console.error('获取任务详情失败:', error);
      messageApi.error('获取任务详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  // 查看任务详情
  const handleViewDetail = (task: Task) => {
    const jobId = task.jobId || task.id || '';
    if (jobId) {
      fetchTaskDetail(jobId);
      setDrawerVisible(true);
    }
  };

  // 状态文本映射
  const statusTextMap: Record<string, string> = {
    'Running': '运行中',
    'Pending': '等待中',
    'Succeeded': '成功',
    'Failed': '失败',
    'ManualTermination': '手动终止',
    'Unknown': '未知',
  };

  // 状态颜色映射
  const getStatusColor = (status: string | number | null | undefined): string => {
    if (!status) return 'default';
    const statusStr = String(status).toLowerCase();
    if (statusStr === 'running') return 'processing';
    if (statusStr === 'pending') return 'default';
    if (statusStr === 'succeeded') return 'success';
    if (statusStr === 'failed') return 'error';
    if (statusStr === 'manualtermination') return 'warning';
    return 'default';
  };

  // 解析日期
  const parseDate = (text: string | number | undefined): string => {
    if (!text) return '-';
    
    let date: Date;
    if (typeof text === 'number') {
      // Unix 时间戳（秒或毫秒）
      date = new Date(text > 10000000000 ? text : text * 1000);
    } else if (typeof text === 'string') {
      date = new Date(text);
    } else {
      return '-';
    }

    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const columns: ProColumns<Task>[] = [
    {
      title: '任务ID',
      dataIndex: 'jobId',
      key: 'jobId',
      width: 200,
      render: (_: any, record: Task) => {
        return record.jobId || record.id || '-';
      },
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
      valueEnum: {
        'Running': { text: '运行中', status: 'Processing' },
        'Pending': { text: '等待中', status: 'Default' },
        'Succeeded': { text: '成功', status: 'Success' },
        'Failed': { text: '失败', status: 'Error' },
        'ManualTermination': { text: '手动终止', status: 'Warning' },
        'Unknown': { text: '未知', status: 'Default' },
      },
      render: (_: any, record: Task) => {
        // 处理 status 可能是对象的情况
        let statusValue: string = '';
        if (typeof record.status === 'object' && record.status !== null) {
          statusValue = record.status.text || record.status.value || record.status.name || String(record.status);
        } else {
          statusValue = String(record.status || '');
        }

        const statusText = statusTextMap[statusValue] || statusValue || '未知';
        const color = getStatusColor(statusValue);

        return <Tag color={color}>{statusText}</Tag>;
      },
    },
    {
      title: '资源池',
      dataIndex: 'resourcePoolId',
      key: 'resourcePoolId',
      width: 150,
      ellipsis: true,
    },
    {
      title: '队列',
      dataIndex: 'queue',
      key: 'queue',
      width: 150,
      render: (_: any, record: Task) => {
        return record.queue || record.queueID || '-';
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (_: any, record: Task) => {
        return parseDate(record.createdAt);
      },
    },
    {
      title: '完成时间',
      dataIndex: 'finishedAt',
      key: 'finishedAt',
      width: 180,
      render: (_: any, record: Task) => {
        return parseDate(record.finishedAt);
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_: any, record: Task) => {
        return (
          <Space>
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            >
              查看详情
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <PageContainer
      title="任务管理"
      subTitle="查看和管理各种批量任务"
    >
      <ProTable<Task>
        actionRef={proTableRef}
        columns={columns}
        request={fetchTasks}
        rowKey={(record) => record.jobId || record.id || ''}
        search={{
          labelWidth: 'auto',
          defaultCollapsed: false,
        }}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
        toolBarRender={() => [
          <Button
            key="reload"
            icon={<ReloadOutlined />}
            onClick={() => {
              proTableRef.current?.reload();
            }}
          >
            刷新
          </Button>,
        ]}
        scroll={{ x: 'max-content' }}
      />

      {/* 任务详情抽屉 */}
      <Drawer
        title="任务详情"
        width={800}
        open={drawerVisible}
        onClose={() => {
          setDrawerVisible(false);
          setSelectedTask(null);
        }}
        loading={detailLoading}
      >
        {selectedTask && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="任务ID">
              {selectedTask.jobId || selectedTask.id || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="任务名称">
              {selectedTask.name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {(() => {
                let statusValue: string = '';
                if (typeof selectedTask.status === 'object' && selectedTask.status !== null) {
                  statusValue = selectedTask.status.text || selectedTask.status.value || selectedTask.status.name || String(selectedTask.status);
                } else {
                  statusValue = String(selectedTask.status || '');
                }
                const statusText = statusTextMap[statusValue] || statusValue || '未知';
                const color = getStatusColor(statusValue);
                return <Tag color={color}>{statusText}</Tag>;
              })()}
            </Descriptions.Item>
            <Descriptions.Item label="任务类型">
              {selectedTask.jobType || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="资源池ID">
              {selectedTask.resourcePoolId || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="队列">
              {selectedTask.queue || selectedTask.queueID || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="用户ID">
              {selectedTask.userId || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {parseDate(selectedTask.createdAt)}
            </Descriptions.Item>
            <Descriptions.Item label="完成时间">
              {parseDate(selectedTask.finishedAt)}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default Task;
