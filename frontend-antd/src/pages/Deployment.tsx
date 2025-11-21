import {
  DeleteOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
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

// 服务数据类型
interface Service {
  id?: string;
  serviceId?: string;
  name?: string;
  description?: string;
  status?: string | number; // 状态：字符串或数字（1=部署中, 2=运行中, 3=未运行, 4=异常）
  statusText?: string; // 状态文本（中文）
  resourcePoolId?: string;
  resourcePoolName?: string;
  resourcePool?: any;
  queueName?: string;
  owner?: string;
  ownerName?: string;
  creator?: string; // 创建者
  createdAt?: string | number; // Unix时间戳（秒级）或ISO字符串
  updatedAt?: string | number; // Unix时间戳（秒级）或ISO字符串
  endpoints?: any;
  replicas?: number;
  availableIns?: number; // 可用实例数
  totalIns?: number; // 总实例数
  reason?: string; // 异常信息
  resourceSpec?: {
    cpus?: number;
    memory?: number;
    acceleratorCount?: number;
    acceleratorType?: string;
  };
  [key: string]: any;
}

const Deployment: React.FC = () => {
  const { message: messageApi } = App.useApp();
  const proTableRef = useRef<ActionType>();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createForm] = Form.useForm();
  const [detailLoading, setDetailLoading] = useState(false);

  // 获取服务状态（批量）
  const fetchServicesStatus = async (services: Service[]): Promise<void> => {
    try {
      // 并发获取所有服务的状态
      const statusPromises = services.map(async (service) => {
        try {
          const serviceId = service.id || service.serviceId;
          if (!serviceId) return service;

          const statusResponse = await request(`/api/services/${serviceId}/status`, {
            method: 'GET',
          });

          if (statusResponse.success && statusResponse.data) {
            const statusData = statusResponse.data;
            const status = statusData.status; // 1=部署中, 2=运行中, 3=未运行, 4=异常
            const statusTextMap: Record<number, string> = {
              1: '部署中',
              2: '运行中',
              3: '未运行',
              4: '异常',
            };

            return {
              ...service,
              status,
              statusText: statusTextMap[status] || '未知',
              availableIns: statusData.availableIns,
              totalIns: statusData.totalIns,
              reason: statusData.reason,
            };
          }
          return service;
        } catch (error) {
          console.error(`获取服务 ${service.id} 状态失败:`, error);
          return service;
        }
      });

      return Promise.all(statusPromises) as any;
    } catch (error) {
      console.error('批量获取服务状态失败:', error);
      return services;
    }
  };

  // 获取服务列表
  const fetchServices = async (params: any) => {
    try {
      const response = await request('/api/services', {
        method: 'GET',
        params: {
          pageNumber: params.current || 1,
          pageSize: params.pageSize || 10,
          orderBy: params.orderBy || 'createdAt',
          order: params.order || 'desc',
        },
      });

      if (response.success) {
        // 处理响应数据格式
        const data = response.data;
        let services: Service[] = [];
        let total = 0;

        if (Array.isArray(data)) {
          services = data;
          total = data.length;
        } else if (data?.services && Array.isArray(data.services)) {
          services = data.services;
          total = data.totalCount || data.total || data.services.length;
        } else if (data?.result && Array.isArray(data.result)) {
          services = data.result;
          total = data.totalCount || data.total || data.result.length;
        } else if (data?.data && Array.isArray(data.data)) {
          services = data.data;
          total = data.totalCount || data.total || data.data.length;
        }

        // 获取服务状态
        const servicesWithStatus = await fetchServicesStatus(services);

        return {
          data: servicesWithStatus || services,
          success: true,
          total: total,
        };
      } else {
        messageApi.error(response.message || '获取服务列表失败');
        return {
          data: [],
          success: false,
          total: 0,
        };
      }
    } catch (error) {
      console.error('获取服务列表失败:', error);
      messageApi.error('获取服务列表失败');
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  };

  // 获取服务详情
  const fetchServiceDetail = async (serviceId: string) => {
    setDetailLoading(true);
    try {
      // 并行获取服务详情和状态
      const [detailResponse, statusResponse] = await Promise.all([
        request(`/api/services/${serviceId}`, {
          method: 'GET',
        }),
        request(`/api/services/${serviceId}/status`, {
          method: 'GET',
        }).catch(() => null), // 状态获取失败不影响详情显示
      ]);

      if (detailResponse.success) {
        let serviceData = detailResponse.data;

        // 如果成功获取状态，合并状态信息
        if (statusResponse?.success && statusResponse.data) {
          const statusData = statusResponse.data;
          const status = statusData.status;
          const statusTextMap: Record<number, string> = {
            1: '部署中',
            2: '运行中',
            3: '未运行',
            4: '异常',
          };

          serviceData = {
            ...serviceData,
            status,
            statusText: statusTextMap[status] || '未知',
            availableIns: statusData.availableIns,
            totalIns: statusData.totalIns,
            reason: statusData.reason,
          };
        }

        setSelectedService(serviceData);
        setDrawerVisible(true);
      } else {
        messageApi.error(detailResponse.message || '获取服务详情失败');
      }
    } catch (error) {
      console.error('获取服务详情失败:', error);
      messageApi.error('获取服务详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  // 创建服务
  const handleCreate = async (values: any) => {
    try {
      // 构建创建服务的请求体（资源池ID和队列ID由后端从配置文件读取）
      const requestBody: any = {
        name: values.name,
        description: values.description || '',
      };

      // 如果有其他配置，添加到请求体
      if (values.replicas) {
        requestBody.replicas = Number(values.replicas);
      }

      const response = await request('/api/services', {
        method: 'POST',
        data: requestBody,
      });

      if (response.success) {
        messageApi.success('服务创建成功');
        setCreateModalVisible(false);
        createForm.resetFields();
        proTableRef.current?.reload();
      } else {
        messageApi.error(response.message || '创建服务失败');
      }
    } catch (error: any) {
      console.error('创建服务失败:', error);
      const errorMessage = error?.info?.errorMessage || error?.message || '创建服务失败';
      messageApi.error(errorMessage);
    }
  };

  // 删除服务
  const handleDelete = async (serviceId: string) => {
    try {
      const response = await request(`/api/services/${serviceId}`, {
        method: 'DELETE',
      });

      if (response.success) {
        messageApi.success('服务删除成功');
        proTableRef.current?.reload();
      } else {
        messageApi.error(response.message || '删除服务失败');
      }
    } catch (error: any) {
      console.error('删除服务失败:', error);
      const errorMessage = error?.info?.errorMessage || error?.message || '删除服务失败';
      messageApi.error(errorMessage);
    }
  };

  // 获取状态标签颜色
  const getStatusColor = (status?: string | number | null) => {
    if (!status) return 'default';
    // 确保 status 是字符串类型
    const statusStr = String(status);
    const statusLower = statusStr.toLowerCase();
    if (statusLower.includes('running') || statusLower.includes('active')) {
      return 'success';
    }
    if (statusLower.includes('stopped') || statusLower.includes('inactive')) {
      return 'default';
    }
    if (statusLower.includes('error') || statusLower.includes('failed')) {
      return 'error';
    }
    if (statusLower.includes('pending') || statusLower.includes('creating')) {
      return 'processing';
    }
    return 'default';
  };

  // 表格列定义
  const columns: ProColumns<Service>[] = [
    {
      title: '服务ID',
      dataIndex: 'id',
      key: 'id',
      width: 200,
      ellipsis: true,
      render: (text, record) => text || record.serviceId || record.id || '-',
    },
    {
      title: '服务名称',
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
      hideInSearch: true,
      render: (text, record) => {
        // status 可能是数字（1=部署中, 2=运行中, 3=未运行, 4=异常）或字符串
        let statusValue: any = text || record.status;
        
        // 如果状态是对象，尝试提取
        if (statusValue && typeof statusValue === 'object') {
          statusValue = record.status || statusValue.text || statusValue.value || statusValue.name || null;
        }
        
        if (!statusValue && statusValue !== 0) return '-';
        
        // 状态值映射：1=部署中, 2=运行中, 3=未运行, 4=异常
        const statusNum = typeof statusValue === 'number' ? statusValue : parseInt(String(statusValue), 10);
        const statusTextMap: Record<number, string> = {
          1: '部署中',
          2: '运行中',
          3: '未运行',
          4: '异常',
        };
        
        const displayText = record.statusText || statusTextMap[statusNum] || String(statusValue);
        const statusColorMap: Record<number, string> = {
          1: 'processing', // 部署中 - 蓝色
          2: 'success',    // 运行中 - 绿色
          3: 'default',    // 未运行 - 灰色
          4: 'error',      // 异常 - 红色
        };
        
        const color = statusColorMap[statusNum] || 'default';
        return <Tag color={color}>{displayText}</Tag>;
      },
    },
    {
      title: '资源池',
      dataIndex: 'resourcePoolId',
      key: 'resourcePoolId',
      width: 150,
      ellipsis: true,
      render: (text, record) => {
        // 优先显示资源池名称，其次显示资源池ID
        return record.resourcePoolName || text || '-';
      },
      hideInSearch: true,
    },
    {
      title: '队列',
      dataIndex: 'queueName',
      key: 'queueName',
      width: 120,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '副本数',
      dataIndex: 'replicas',
      key: 'replicas',
      width: 100,
      hideInSearch: true,
      render: (text) => (text !== undefined ? text : '-'),
    },
    {
      title: '创建者',
      dataIndex: 'creator',
      key: 'creator',
      width: 120,
      ellipsis: true,
      render: (text, record) => {
        // 优先使用creator，其次使用ownerName或owner
        return text || record.ownerName || record.owner || '-';
      },
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
      render: (text) => {
        if (!text) return '-';
        try {
          // 如果是Unix时间戳（秒级），需要乘以1000转换为毫秒
          // 如果是字符串，直接解析
          const timestamp = typeof text === 'number' ? text * 1000 : text;
          const date = new Date(timestamp);
          if (isNaN(date.getTime())) return '-';
          return date.toLocaleString('zh-CN');
        } catch (e) {
          return '-';
        }
      },
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      hideInSearch: true,
      render: (text) => {
        if (!text) return '-';
        try {
          // 如果是Unix时间戳（秒级），需要乘以1000转换为毫秒
          // 如果是字符串，直接解析
          const timestamp = typeof text === 'number' ? text * 1000 : text;
          const date = new Date(timestamp);
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
      width: 180,
      fixed: 'right',
      render: (_: any, record: Service) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => fetchServiceDetail(record.serviceId || record.id || '')}
          >
            详情
          </Button>
          <Popconfirm
            title="确定要删除这个服务吗？"
            onConfirm={() => handleDelete(record.serviceId || record.id || '')}
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

  return (
    <PageContainer
      title="服务部署"
      subTitle="管理在线服务，支持创建、查看和管理"
      extra={
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            创建服务
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
      <ProTable<Service>
        columns={columns}
        actionRef={proTableRef}
        request={fetchServices}
        rowKey={(record) => record.serviceId || record.id || ''}
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
        headerTitle="服务列表"
        toolBarRender={() => []}
      />

      {/* 创建服务模态框 */}
      <Modal
        title="创建服务"
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
            label="服务名称"
            rules={[
              { required: true, message: '请输入服务名称' },
            ]}
          >
            <Input placeholder="请输入服务名称" />
          </Form.Item>
          <Form.Item
            name="replicas"
            label="副本数"
            initialValue={1}
          >
            <Input type="number" min={1} placeholder="请输入副本数，默认为1" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea rows={4} placeholder="请输入服务描述" />
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

      {/* 服务详情抽屉 */}
      <Drawer
        title="服务详情"
        width={800}
        open={drawerVisible}
        onClose={() => {
          setDrawerVisible(false);
          setSelectedService(null);
        }}
        loading={detailLoading}
      >
        {selectedService && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="服务ID">
              {selectedService.id || selectedService.serviceId || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="服务名称">
              {selectedService.name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {selectedService.status ? (
                (() => {
                  let statusValue: any = selectedService.status;
                  if (statusValue && typeof statusValue === 'object') {
                    statusValue = statusValue.text || statusValue.value || statusValue.name || null;
                  }
                  if (!statusValue && statusValue !== 0) return '-';
                  const statusStr = String(statusValue);
                  const statusTextMap: Record<string, string> = {
                    Running: '运行中',
                    Stopped: '已停止',
                    Creating: '创建中',
                    Error: '错误',
                  };
                  const displayText = statusTextMap[statusStr] || statusStr;
                  return <Tag color={getStatusColor(statusStr)}>{displayText}</Tag>;
                })()
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="资源池">
              {selectedService.resourcePoolName || selectedService.resourcePoolId || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="队列名称">
              {selectedService.queueName || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="副本数">
              {selectedService.replicas !== undefined ? selectedService.replicas : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="创建者">
              {selectedService.creator || selectedService.ownerName || selectedService.owner || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="描述">
              {selectedService.description || '-'}
            </Descriptions.Item>
            {selectedService.endpoints && (
              <Descriptions.Item label="访问端点">
                {typeof selectedService.endpoints === 'string' 
                  ? selectedService.endpoints 
                  : JSON.stringify(selectedService.endpoints, null, 2)}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="创建时间">
              {selectedService.createdAt 
                ? (() => {
                    try {
                      const timestamp = typeof selectedService.createdAt === 'number' 
                        ? selectedService.createdAt * 1000 
                        : selectedService.createdAt;
                      const date = new Date(timestamp);
                      return isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN');
                    } catch (e) {
                      return '-';
                    }
                  })()
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {selectedService.updatedAt 
                ? (() => {
                    try {
                      const timestamp = typeof selectedService.updatedAt === 'number' 
                        ? selectedService.updatedAt * 1000 
                        : selectedService.updatedAt;
                      const date = new Date(timestamp);
                      return isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN');
                    } catch (e) {
                      return '-';
                    }
                  })()
                : '-'}
            </Descriptions.Item>
            {selectedService.config && (
              <Descriptions.Item label="配置信息">
                <pre style={{ 
                  background: '#f5f5f5', 
                  padding: '12px', 
                  borderRadius: '4px',
                  maxHeight: '300px',
                  overflow: 'auto',
                }}>
                  {JSON.stringify(selectedService.config, null, 2)}
                </pre>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default Deployment;
