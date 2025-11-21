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
  const proTableRef = useRef<ActionType>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createForm] = Form.useForm();
  const [detailLoading, setDetailLoading] = useState(false);
  const [envVariables, setEnvVariables] = useState<Array<{ name: string; value: string; placeholder?: string }>>([]);

  // 获取服务状态（批量）
  const fetchServicesStatus = async (services: Service[]): Promise<Service[]> => {
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
      // 构建查询参数
      const queryParams: any = {
        pageNumber: params.current || 1,
        pageSize: params.pageSize || 10,
        orderBy: params.orderBy || 'createdAt',
        order: params.order || 'desc',
      };

      // 添加搜索参数
      if (params.serviceId) {
        queryParams.serviceId = params.serviceId;
      }
      if (params.name) {
        queryParams.serviceName = params.name;
      }
      // 如果提供了keyword，也传递给后端（后端会同时搜索ID和名称）
      if (params.keyword) {
        queryParams.keyword = params.keyword;
      }

      const response = await request('/api/services', {
        method: 'GET',
        params: queryParams,
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

  // 提取所有 envs 变量（无论是否有值）
  const extractEnvVariables = (taskParams: any): Array<{ name: string; value: string; placeholder?: string }> => {
    const envVars: Array<{ name: string; value: string; placeholder?: string }> = [];

    if (!taskParams || typeof taskParams !== 'object') {
      return envVars;
    }

    // 检查 jobSpec.envs
    const envs = taskParams.jobSpec?.envs || taskParams.envs || [];
    if (Array.isArray(envs)) {
      envs.forEach((env: any) => {
        if (env && typeof env === 'object' && env.name) {
          const value = env.value || '';
          envVars.push({
            name: env.name,
            value: value,
            placeholder: `请输入 ${env.name} 的值`,
          });
        }
      });
    }

    return envVars;
  };

  // 更新 taskParams 中的 envs 值（双向联动）
  const updateEnvInTaskParams = (taskParams: any, envName: string, envValue: string): any => {
    if (!taskParams || typeof taskParams !== 'object') {
      return taskParams;
    }

    // 深拷贝避免修改原对象
    const result = JSON.parse(JSON.stringify(taskParams));

    // 更新 jobSpec.envs
    if (result.jobSpec?.envs && Array.isArray(result.jobSpec.envs)) {
      result.jobSpec.envs = result.jobSpec.envs.map((env: any) => {
        if (env && typeof env === 'object' && env.name === envName) {
          return {
            ...env,
            value: envValue,
          };
        }
        return env;
      });
    }

    // 更新根级别的 envs
    if (result.envs && Array.isArray(result.envs)) {
      result.envs = result.envs.map((env: any) => {
        if (env && typeof env === 'object' && env.name === envName) {
          return {
            ...env,
            value: envValue,
          };
        }
        return env;
      });
    }

    return result;
  };

  // 创建服务
  const handleCreate = async (values: any) => {
    try {
      // 验证 taskParams 是否是有效的 JSON
      let taskParams: any;
      if (typeof values.taskParams === 'string') {
        try {
          taskParams = JSON.parse(values.taskParams);
        } catch (_parseError) {
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
      if (values.command?.trim()) {
        taskParams.command = values.command.trim();
      }

      // envs 值已经在表单 onValuesChange 中实时更新到 taskParams 了，这里不需要再次处理

      // 发送请求，只传递 taskParams 字段
      // 后端会自动从配置文件读取 resourcePoolId 和 queueID
      const response = await request('/api/services', {
        method: 'POST',
        data: {
          taskParams: JSON.stringify(taskParams),
        },
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
      render: (text, _record) => {
        // 优先显示资源池名称，其次显示资源池ID
        return text || '-';
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
          const timestamp = typeof text === 'number' ? text * 1000 : (typeof text === 'string' ? text : String(text));
          const date = new Date(timestamp);
          if (Number.isNaN(date.getTime())) return '-';
          return date.toLocaleString('zh-CN');
        } catch (_e) {
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
          const timestamp = typeof text === 'number' ? text * 1000 : (typeof text === 'string' ? text : String(text));
          const date = new Date(timestamp);
          if (Number.isNaN(date.getTime())) return '-';
          return date.toLocaleString('zh-CN');
        } catch (_e) {
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
          setEnvVariables([]);
        }}
        onOk={() => createForm.submit()}
        width={900}
        afterOpenChange={(open) => {
          // 当模态框打开时，从初始的 taskParams 中提取 envs 并初始化输入框
          if (open) {
            // 延迟执行，确保表单已初始化
            setTimeout(() => {
              const initialTaskParams = createForm.getFieldValue('taskParams');
              if (initialTaskParams) {
                try {
                  let taskParams: any;
                  if (typeof initialTaskParams === 'string') {
                    taskParams = JSON.parse(initialTaskParams);
                  } else if (typeof initialTaskParams === 'object') {
                    taskParams = initialTaskParams;
                  } else {
                    return;
                  }

                  const envVars = extractEnvVariables(taskParams);
                  setEnvVariables(envVars);

                  // 从 taskParams 中提取 env 的值，初始化环境变量输入框
                  const envInitialValues: Record<string, string> = {};
                  envVars.forEach((envVar) => {
                    envInitialValues[`env_${envVar.name}`] = envVar.value || '';
                  });

                  if (Object.keys(envInitialValues).length > 0) {
                    createForm.setFieldsValue(envInitialValues);
                  }
                } catch (_e) {
                  // 忽略错误
                }
              }
            }, 100);
          } else {
            // 关闭时清空状态
            setEnvVariables([]);
          }
        }}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
          onValuesChange={(changedValues, allValues) => {
            // 当 taskParams 改变时，提取 envs 变量并更新环境变量输入框（双向联动）
            if (changedValues.taskParams !== undefined) {
              try {
                let taskParams: any;
                if (typeof changedValues.taskParams === 'string') {
                  taskParams = JSON.parse(changedValues.taskParams);
                } else if (typeof changedValues.taskParams === 'object') {
                  taskParams = changedValues.taskParams;
                } else {
                  return;
                }

                const envVars = extractEnvVariables(taskParams);
                setEnvVariables(envVars);

                // 从 taskParams 中提取 env 的值，更新所有环境变量输入框
                const envValues: Record<string, string> = {};
                envVars.forEach((envVar) => {
                  envValues[`env_${envVar.name}`] = envVar.value || '';
                });

                // 批量更新环境变量输入框的值（避免触发循环更新）
                if (Object.keys(envValues).length > 0) {
                  // 使用 setTimeout 避免在 onValuesChange 中直接 setFieldsValue 导致的循环更新
                  setTimeout(() => {
                    createForm.setFieldsValue(envValues);
                  }, 0);
                }
              } catch (_e) {
                // JSON 解析失败时，清空 env 变量列表
                setEnvVariables([]);
              }
            }

            // 当 env 输入框改变时，实时更新 taskParams 中的值（双向联动）
            Object.keys(changedValues).forEach((key) => {
              if (key.startsWith('env_')) {
                const envName = key.replace('env_', '');
                const envValue = changedValues[key] ?? '';

                try {
                  const currentTaskParams = allValues.taskParams;
                  let taskParams: any;
                  if (typeof currentTaskParams === 'string') {
                    taskParams = JSON.parse(currentTaskParams);
                  } else if (typeof currentTaskParams === 'object') {
                    taskParams = currentTaskParams;
                  } else {
                    return;
                  }

                  // 更新 taskParams 中的 envs 值
                  const updatedTaskParams = updateEnvInTaskParams(taskParams, envName, envValue);

                  // 更新表单中的 taskParams 字段（避免触发循环更新）
                  setTimeout(() => {
                    createForm.setFieldsValue({
                      taskParams: JSON.stringify(updatedTaskParams, null, 2),
                    });
                  }, 0);

                  // 更新 envVariables 状态
                  setEnvVariables((prev) =>
                    prev.map((envVar) =>
                      envVar.name === envName ? { ...envVar, value: envValue } : envVar
                    )
                  );
                } catch (_e) {
                  // 忽略错误
                }
              }
            });
          }}
        >
          <Form.Item
            name="command"
            label="启动命令"
            tooltip="如果填写了启动命令，将替换任务参数中的 command 字段"
          >
            <TextArea
              rows={3}
              placeholder="请输入启动命令，例如：sleep 1d 或 python serve.py"
            />
          </Form.Item>
          {envVariables.length > 0 && (
            <Form.Item
              label="环境变量"
              tooltip="以下环境变量可以修改，修改后会实时同步到任务参数的 envs 中"
            >
              {envVariables.map((envVar) => (
                <Form.Item
                  key={envVar.name}
                  name={`env_${envVar.name}`}
                  label={envVar.name}
                  style={{ marginBottom: 16 }}
                >
                  <Input
                    placeholder={envVar.placeholder || `请输入 ${envVar.name} 的值`}
                  />
                </Form.Item>
              ))}
            </Form.Item>
          )}
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
                  } catch (_e) {
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
  "name": "test-service",
  "command": "sleep 1d",
  "replicas": 1,
  "resourceSpec": {
    "cpus": 2,
    "memory": 4
  }
}

注意：如果上面填写了启动命令，任务参数中的 command 字段将被启动命令替换
注意：任务参数中的 envs 会显示为输入框，修改时会实时同步到任务参数中`}
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
              <div>• 任务参数中的 envs 会显示为输入框，修改时会实时同步到任务参数中</div>
              <div>• 资源池ID和队列ID将从系统配置中自动读取（ML_PLATFORM_RESOURCE_POOL_ID 和 ML_PLATFORM_RESOURCE_QUEUE_ID）</div>
              <div>• queue 字段会自动设置为配置文件中的队列ID</div>
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
              {selectedService.resourcePoolId || '-'}
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
                      return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN');
                    } catch (_e) {
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
                      return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN');
                    } catch (_e) {
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
