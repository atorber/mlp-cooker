import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import {
  App,
  Button,
  Card,
  Descriptions,
  Drawer,
  Space,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import React, { useRef, useState, useEffect } from 'react';
import { request } from '@umijs/max';

const { Title } = Typography;

// 队列数据类型
interface Queue {
  queueId?: string;
  queueName?: string;
  resourcePoolId?: string;
  resourcePoolName?: string;
  status?: string;
  description?: string;
  quota?: {
    total?: number;
    used?: number;
    available?: number;
  };
  resources?: {
    [key: string]: {
      total?: number;
      used?: number;
      available?: number;
    };
  };
  createTime?: string;
  updateTime?: string;
}

const Resource: React.FC = () => {
  const { message: messageApi } = App.useApp();
  const proTableRef = useRef<ActionType>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedQueue, setSelectedQueue] = useState<Queue | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statistics, setStatistics] = useState<{
    totalQueues: number;
    totalResources: number;
    usedResources: number;
  }>({
    totalQueues: 0,
    totalResources: 0,
    usedResources: 0,
  });

  // 获取队列列表
  const fetchQueues = async (params: any) => {
    try {
      const response = await request('/api/resources/queues', {
        method: 'GET',
        params: {
          pageNumber: params.current || 1,
          pageSize: params.pageSize || 10,
          keyword: params.keyword,
          keywordType: params.keywordType,
          resourcePoolId: params.resourcePoolId,
        },
      });

      if (response.success) {
        // 处理响应数据格式
        const data = response.data;
        let queues: Queue[] = [];
        let total = 0;

        if (Array.isArray(data)) {
          queues = data;
          total = data.length;
        } else if (data?.queues && Array.isArray(data.queues)) {
          queues = data.queues;
          total = data.totalCount || data.total || data.queues.length;
        } else if (data?.result && Array.isArray(data.result)) {
          queues = data.result;
          total = data.total || data.result.length;
        } else if (data?.data && Array.isArray(data.data)) {
          queues = data.data;
          total = data.total || data.data.length;
        }

        // 计算统计数据
        const totalQueues = queues.length;
        let totalResources = 0;
        let usedResources = 0;

        queues.forEach((queue) => {
          if (queue.quota) {
            totalResources += queue.quota.total || 0;
            usedResources += queue.quota.used || 0;
          }
        });

        setStatistics({
          totalQueues,
          totalResources,
          usedResources,
        });

        return {
          data: queues,
          success: true,
          total: total,
        };
      } else {
        messageApi.error(response.message || '获取队列列表失败');
        return {
          data: [],
          success: false,
          total: 0,
        };
      }
    } catch (error) {
      console.error('获取队列列表失败:', error);
      messageApi.error('获取队列列表失败');
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  };

  // 获取队列详情
  const fetchQueueDetail = async (queueId: string) => {
    setDetailLoading(true);
    try {
      const response = await request(`/api/resources/queues/${queueId}`, {
        method: 'GET',
      });

      if (response.success) {
        setSelectedQueue(response.data || response.data?.queue || null);
      } else {
        messageApi.error(response.message || '获取队列详情失败');
      }
    } catch (error) {
      console.error('获取队列详情失败:', error);
      messageApi.error('获取队列详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  // 查看详情
  const handleViewDetail = async (record: Queue) => {
    const queueId = record.queueId || record.id;
    if (queueId) {
      await fetchQueueDetail(queueId);
      setDrawerVisible(true);
    }
  };

  // 刷新列表
  const handleRefresh = () => {
    proTableRef.current?.reload();
  };

  // 获取状态颜色
  const getStatusColor = (status: string | number | null | undefined) => {
    if (!status) return 'default';
    const statusStr = String(status).toLowerCase();
    if (statusStr === 'running' || statusStr === 'active' || statusStr === '正常') {
      return 'success';
    }
    if (statusStr === 'stopped' || statusStr === 'inactive' || statusStr === '停止') {
      return 'default';
    }
    if (statusStr === 'error' || statusStr === 'failed' || statusStr === '错误') {
      return 'error';
    }
    return 'processing';
  };

  // 获取状态文本
  const getStatusText = (status: string | number | null | undefined) => {
    if (!status) return '-';
    const statusStr = String(status);
    const statusMap: { [key: string]: string } = {
      running: '运行中',
      active: '活跃',
      stopped: '已停止',
      inactive: '非活跃',
      error: '错误',
      failed: '失败',
    };
    return statusMap[statusStr.toLowerCase()] || statusStr;
  };

  // 列定义
  const columns: ProColumns<Queue>[] = [
    {
      title: '队列ID',
      dataIndex: 'queueId',
      key: 'queueId',
      width: 200,
      ellipsis: true,
      render: (_text, record) => record.queueId || record.id,
    },
    {
      title: '队列名称',
      dataIndex: 'queueName',
      key: 'queueName',
      width: 200,
      ellipsis: true,
    },
    {
      title: '资源池',
      dataIndex: 'resourcePoolName',
      key: 'resourcePoolName',
      width: 200,
      ellipsis: true,
      render: (_text, record) => record.resourcePoolName || record.resourcePoolId || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: any) => {
        const statusText = getStatusText(status);
        const color = getStatusColor(status);
        return <Tag color={color}>{statusText}</Tag>;
      },
    },
    {
      title: '资源配额',
      key: 'quota',
      width: 200,
      render: (_text, record) => {
        if (record.quota) {
          const { total = 0, used = 0, available = 0 } = record.quota;
          return (
            <Space>
              <span>总计: {total}</span>
              <span>已用: {used}</span>
              <span>可用: {available}</span>
            </Space>
          );
        }
        return '-';
      },
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      key: 'updateTime',
      width: 180,
      render: (text: any) => {
        if (!text) return '-';
        try {
          const date = typeof text === 'number' ? new Date(text * 1000) : new Date(text);
          if (Number.isNaN(date.getTime())) return String(text);
          return date.toLocaleString('zh-CN');
        } catch {
          return String(text);
        }
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_text, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            查看详情
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      header={{
        title: '计算资源',
        breadcrumb: {},
      }}
    >
      {/* 统计卡片 */}
      <div style={{ marginBottom: 16 }}>
        <Card>
          <Space size="large">
            <Statistic
              title="队列总数"
              value={statistics.totalQueues}
              prefix={<ReloadOutlined />}
            />
            <Statistic
              title="总资源数"
              value={statistics.totalResources}
              prefix={<ReloadOutlined />}
            />
            <Statistic
              title="已用资源数"
              value={statistics.usedResources}
              prefix={<ReloadOutlined />}
            />
            <Statistic
              title="资源使用率"
              value={
                statistics.totalResources > 0
                  ? ((statistics.usedResources / statistics.totalResources) * 100).toFixed(2)
                  : 0
              }
              suffix="%"
            />
          </Space>
        </Card>
      </div>

      {/* 队列列表 */}
      <ProTable<Queue>
        headerTitle="队列列表"
        actionRef={proTableRef}
        rowKey={(record) => record.queueId || record.id || ''}
        search={{
          labelWidth: 'auto',
          defaultCollapsed: false,
        }}
        toolBarRender={() => [
          <Button
            key="refresh"
            type="primary"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
          >
            刷新
          </Button>,
        ]}
        request={fetchQueues}
        columns={columns}
        scroll={{ x: 1200 }}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />

      {/* 详情抽屉 */}
      <Drawer
        title="队列详情"
        width={600}
        open={drawerVisible}
        onClose={() => {
          setDrawerVisible(false);
          setSelectedQueue(null);
        }}
        loading={detailLoading}
      >
        {selectedQueue && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="队列ID">
              {selectedQueue.queueId || selectedQueue.id || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="队列名称">
              {selectedQueue.queueName || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="资源池ID">
              {selectedQueue.resourcePoolId || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="资源池名称">
              {selectedQueue.resourcePoolName || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={getStatusColor(selectedQueue.status)}>
                {getStatusText(selectedQueue.status)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="描述">
              {selectedQueue.description || '-'}
            </Descriptions.Item>
            {selectedQueue.quota && (
              <>
                <Descriptions.Item label="总配额">
                  {selectedQueue.quota.total || 0}
                </Descriptions.Item>
                <Descriptions.Item label="已使用">
                  {selectedQueue.quota.used || 0}
                </Descriptions.Item>
                <Descriptions.Item label="可用">
                  {selectedQueue.quota.available || 0}
                </Descriptions.Item>
              </>
            )}
            {selectedQueue.resources && Object.keys(selectedQueue.resources).length > 0 && (
              <Descriptions.Item label="资源详情">
                <div>
                  {Object.entries(selectedQueue.resources).map(([key, value]) => (
                    <div key={key} style={{ marginBottom: 8 }}>
                      <Title level={5}>{key}</Title>
                      <Space>
                        <span>总计: {value.total || 0}</span>
                        <span>已用: {value.used || 0}</span>
                        <span>可用: {value.available || 0}</span>
                      </Space>
                    </div>
                  ))}
                </div>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="创建时间">
              {selectedQueue.createTime
                ? new Date(selectedQueue.createTime).toLocaleString('zh-CN')
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {selectedQueue.updateTime
                ? new Date(selectedQueue.updateTime).toLocaleString('zh-CN')
                : '-'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default Resource;

