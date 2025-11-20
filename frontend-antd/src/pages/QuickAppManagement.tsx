import { BugOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons';
import type { ActionType } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import {
  App,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Tag,
} from 'antd';
import React, { useRef, useState } from 'react';
import { useNavigate } from 'umi';

const { Option } = Select;
const { TextArea } = Input;

// 应用管理类型定义
type AppManagement = {
  appId: string;
  appName: string;
  serviceType: string;
  appType: string;
  imageUrl: string;
  modelStorageUrl: string;
  presetStorageUrl: string;
  startCommand: string;
  availableMachines: string[];
  excludeMachines: string[];
  modelDownloadTaskId?: string;
  datasetDownloadTaskId?: string;
  document?: string;
  shortDesc?: string;
  tags?: Array<{ tagId: number; value: string }>;
  weight?: number;
  status: string;
  ctime: number;
  mtime: number;
};

const QuickAppManagement = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [_loading, setLoading] = useState(false);
  const [_apps, setApps] = useState<AppManagement[]>([]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedApp, setSelectedApp] = useState<AppManagement | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();
  const proTableRef = useRef<ActionType>(null);

  // 服务类型选项
  const serviceTypeOptions = [
    { value: 'development', label: '开发环境' },
    { value: 'online', label: '在线服务' },
    { value: 'distributed', label: '分布式任务' },
  ];

  // 应用类型选项
  const appTypeOptions = {
    development: [
      { value: 'model_development', label: '模型开发' },
      { value: 'ai_tool', label: 'AI工具' },
    ],
    online: [
      { value: 'inference_service', label: '推理服务' },
      { value: 'api_service', label: 'API服务' },
      { value: 'web_app', label: 'Web应用' },
    ],
    distributed: [
      { value: 'training_task', label: '训练任务' },
      { value: 'data_task', label: '数据任务' },
    ],
  };

  // 机型选项
  const machineOptions = [
    { value: 'A800', label: 'A800' },
    { value: 'P800', label: 'P800' },
    { value: 'H20', label: 'H20' },
  ];

  // 获取应用管理列表
  const fetchApps = async (params: any) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/aihc/quick-app/management/list?pageNo=${params.current}&pageSize=${params.pageSize}`,
      );
      const result = await response.json();

      if (result.success) {
        setApps(result.data.list);
        return {
          data: result.data.list,
          success: true,
          total: result.data.count,
        };
      } else {
        message.error(result.message);
        return {
          data: [],
          success: false,
          total: 0,
        };
      }
    } catch (error) {
      console.error('获取应用管理列表失败:', error);
      message.error('获取应用管理列表失败');
      return {
        data: [],
        success: false,
        total: 0,
      };
    } finally {
      setLoading(false);
    }
  };

  // 创建应用
  const handleCreateApp = async (values: any) => {
    try {
      const response = await fetch('/api/aihc/quick-app/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (result.success) {
        message.success('创建应用成功');
        setCreateModalVisible(false);
        form.resetFields();
        proTableRef.current?.reload();
      } else {
        message.error(result.message);
      }
    } catch (error) {
      console.error('创建应用失败:', error);
      message.error('创建应用失败');
    }
  };

  // 查看应用详情
  const handleViewDetails = (record: AppManagement) => {
    setSelectedApp(record);
    setDrawerVisible(true);
  };

  // 开发调试
  const handleDebug = (record: AppManagement) => {
    // 在当前标签页中跳转到开发调试页面
    navigate(`/quick-app/debug/${record.appId}`);
  };

  // 获取状态标签颜色
  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      created: 'blue',
      developing: 'orange',
      testing: 'purple',
      published: 'green',
      failed: 'red',
    };
    return colorMap[status] || 'default';
  };

  // 表格列定义
  const columns = [
    {
      title: '应用名称',
      dataIndex: 'appName',
      key: 'appName',
      width: 200,
      fixed: 'left' as const,
      render: (text: any) => (
        <div style={{ padding: '4px 0' }}>
          <div style={{ fontWeight: 500, fontSize: 14 }}>{text || '-'}</div>
        </div>
      ),
    },
    {
      title: '应用ID',
      dataIndex: 'appId',
      key: 'appId',
      width: 150,
      render: (text: any) => (
        <div style={{ padding: '4px 0' }}>
          <div style={{ fontSize: 12, color: '#666' }}>{text}</div>
        </div>
      ),
    },
    {
      title: '服务类型',
      dataIndex: 'serviceType',
      key: 'serviceType',
      width: 120,
      render: (text: any) => {
        const option = serviceTypeOptions.find((opt) => opt.value === text);
        return <Tag color="blue">{option?.label || text}</Tag>;
      },
    },
    {
      title: '应用类型',
      dataIndex: 'appType',
      key: 'appType',
      width: 120,
      render: (text: any, record: AppManagement) => {
        const options =
          appTypeOptions[record.serviceType as keyof typeof appTypeOptions] ||
          [];
        const option = options.find((opt) => opt.value === text);
        return <Tag color="green">{option?.label || text}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: any) => (
        <Badge status={getStatusColor(status) as any} text={status} />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'ctime',
      key: 'ctime',
      width: 150,
      render: (ctime: any) => (
        <div style={{ padding: '4px 0', fontSize: 12, color: '#666' }}>
          {new Date(ctime * 1000).toLocaleString()}
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: AppManagement) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record)}
            style={{ color: '#1890ff' }}
          >
            查看
          </Button>
          <Button
            type="text"
            size="small"
            icon={<BugOutlined />}
            onClick={() => handleDebug(record)}
            style={{ color: '#1890ff' }}
          >
            开发调试
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      <Card>
        <ProTable<AppManagement>
          actionRef={proTableRef}
          columns={columns}
          request={fetchApps}
          rowKey="appId"
          search={false}
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条/总共 ${total} 条`,
          }}
          toolBarRender={() => [
            <Button
              key="create"
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              创建应用
            </Button>,
          ]}
          size="middle"
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 创建应用模态框 */}
      <Modal
        title="创建快速应用"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateApp}>
          <Form.Item
            name="appName"
            label="应用名称"
            rules={[{ required: true, message: '请输入应用名称' }]}
          >
            <Input placeholder="请输入应用名称" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="serviceType"
                label="服务类型"
                rules={[{ required: true, message: '请选择服务类型' }]}
              >
                <Select placeholder="请选择服务类型">
                  {serviceTypeOptions.map((option) => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="appType"
                label="应用类型"
                rules={[{ required: true, message: '请选择应用类型' }]}
              >
                <Select placeholder="请选择应用类型">
                  {serviceTypeOptions.map((option) => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="imageUrl" label="镜像地址">
            <Input placeholder="请输入Docker镜像地址" />
          </Form.Item>

          <Form.Item name="modelStorageUrl" label="模型存储地址">
            <Input placeholder="请输入模型权重BOS地址" />
          </Form.Item>

          <Form.Item name="presetStorageUrl" label="预置存储地址">
            <Input placeholder="请输入预置存储BOS地址" />
          </Form.Item>

          <Form.Item name="startCommand" label="启动命令">
            <TextArea placeholder="请输入容器启动命令" rows={3} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="availableMachines" label="可用机型">
                <Select mode="multiple" placeholder="请选择可用机型">
                  {machineOptions.map((option) => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="excludeMachines" label="排除机型">
                <Select mode="multiple" placeholder="请选择排除机型">
                  {machineOptions.map((option) => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 应用详情抽屉 */}
      <Drawer
        title={`应用详情 - ${selectedApp?.appId || ''}`}
        placement="right"
        width={800}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        {selectedApp && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="应用名称">
              {selectedApp.appName || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="应用ID">
              {selectedApp.appId}
            </Descriptions.Item>
            <Descriptions.Item label="服务类型">
              <Tag color="blue">
                {
                  serviceTypeOptions.find(
                    (opt) => opt.value === selectedApp.serviceType,
                  )?.label
                }
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="应用类型">
              <Tag color="green">
                {
                  appTypeOptions[
                    selectedApp.serviceType as keyof typeof appTypeOptions
                  ]?.find((opt) => opt.value === selectedApp.appType)?.label
                }
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Badge
                status={getStatusColor(selectedApp.status) as any}
                text={selectedApp.status}
              />
            </Descriptions.Item>
            <Descriptions.Item label="镜像地址">
              {selectedApp.imageUrl || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="模型存储地址">
              {selectedApp.modelStorageUrl || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="预置存储地址">
              {selectedApp.presetStorageUrl || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="启动命令">
              {selectedApp.startCommand || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="可用机型">
              {selectedApp.availableMachines?.map((machine) => (
                <Tag key={machine}>{machine}</Tag>
              )) || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="排除机型">
              {selectedApp.excludeMachines?.map((machine) => (
                <Tag key={machine}>{machine}</Tag>
              )) || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {new Date(selectedApp.ctime * 1000).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {new Date(selectedApp.mtime * 1000).toLocaleString()}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default QuickAppManagement;
