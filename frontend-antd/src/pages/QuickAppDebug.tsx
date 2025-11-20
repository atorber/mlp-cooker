import {
  ArrowLeftOutlined,
  CopyOutlined,
  DatabaseOutlined,
  DownloadOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  PlayCircleOutlined,
  SettingOutlined,
  BuildOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProCard,
  ProDescriptions,
} from '@ant-design/pro-components';
import {
  Alert,
  App,
  Badge,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
} from 'antd';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'umi';

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

// 下载任务类型定义
type DownloadTask = {
  taskId: string;
  type: 'model_download' | 'dataset_download';
  source: string;
  sourceUrl: string;
  key: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  bosUrl: string;
  ctime: number;
  progress?: number;
  errorMessage?: string;
};

// 测试任务类型定义
type TestTask = {
  testId: string;
  appId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  ctime: number;
  progress?: number;
  errorMessage?: string;
  results?: any;
};

type ImageBuildTask = {
  buildId: string;
  appId: string;
  imageName: string;
  imageTag: string;
  dockerfilePath: string;
  buildContext: string;
  status: 'pending' | 'building' | 'completed' | 'failed';
  progress: number;
  ctime: number;
  mtime: number;
  logs?: string;
  imageUrl?: string;
};

const QuickAppDebug = () => {
  const { message } = App.useApp();
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [app, setApp] = useState<AppManagement | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [downloadTasks, setDownloadTasks] = useState<DownloadTask[]>([]);
  const [testTasks, setTestTasks] = useState<TestTask[]>([]);
  const [downloadModalVisible, setDownloadModalVisible] = useState(false);
  const [imageBuildTasks, setImageBuildTasks] = useState<ImageBuildTask[]>([]);
  const [imageBuildModalVisible, setImageBuildModalVisible] = useState(false);

  // 编辑相关状态
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm] = Form.useForm();
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [downloadForm] = Form.useForm();
  const [testForm] = Form.useForm();
  const [imageBuildForm] = Form.useForm();

  // 下载任务类型状态
  const [downloadTaskType, setDownloadTaskType] = useState<'model' | 'dataset'>(
    'model',
  );

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

  // 下载来源选项
  const downloadSourceOptions = [
    { value: 'HuggingFace', label: 'HuggingFace' },
    { value: 'ModelScope', label: 'ModelScope' },
  ];

  // 机型选项
  const machineOptions = [
    { value: 'A800', label: 'A800' },
    { value: 'P800', label: 'P800' },
    { value: 'H20', label: 'H20' },
  ];

  // 获取应用详情
  const fetchAppDetail = async () => {
    if (!appId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/aihc/quick-app/detail/${appId}`);
      const result = await response.json();

      if (result.success) {
        setApp(result.data);
      } else {
        message.error(result.message);
      }
    } catch (error) {
      console.error('获取应用详情失败:', error);
      message.error('获取应用详情失败');
    } finally {
      setLoading(false);
    }
  };

  // 编辑应用
  const handleEditApp = () => {
    if (!app) return;
    editForm.setFieldsValue(app);
    setEditModalVisible(true);
  };

  // 更新应用
  const handleUpdateApp = async (values: any) => {
    if (!app) return;

    try {
      const response = await fetch(`/api/aihc/quick-app/update/${app.appId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (result.success) {
        message.success('更新应用成功');
        setEditModalVisible(false);
        editForm.resetFields();
        // 重新获取应用详情
        fetchAppDetail();
      } else {
        message.error(result.message);
      }
    } catch (error) {
      console.error('更新应用失败:', error);
      message.error('更新应用失败');
    }
  };

  // 获取下载任务列表
  const fetchDownloadTasks = async () => {
    try {
      const response = await fetch('/api/aihc/quick-app/download/tasks');
      const result = await response.json();

      if (result.success) {
        setDownloadTasks(result.data || []);
      }
    } catch (error) {
      console.error('获取下载任务失败:', error);
    }
  };

  // 获取测试任务列表
  const fetchTestTasks = async () => {
    try {
      const response = await fetch(`/api/aihc/quick-app/test/tasks/${appId}`);
      const result = await response.json();

      if (result.success) {
        setTestTasks(result.data || []);
      }
    } catch (error) {
      console.error('获取测试任务失败:', error);
    }
  };

  // 获取镜像制作任务
  const fetchImageBuildTasks = async () => {
    try {
      const response = await fetch(
        `/api/aihc/quick-app/image-build/tasks/${appId}`,
      );
      const result = await response.json();

      if (result.success) {
        setImageBuildTasks(result.data || []);
      }
    } catch (error) {
      console.error('获取镜像制作任务失败:', error);
    }
  };

  // 创建模型下载任务
  const handleCreateModelDownloadTask = async (values: any) => {
    if (!appId) return;

    try {
      const response = await fetch('/api/aihc/quick-app/download/model', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...values,
          type: 'model',
        }),
      });

      const result = await response.json();

      if (result.success) {
        message.success('创建模型下载任务成功');
        setDownloadModalVisible(false);
        downloadForm.resetFields();
        fetchDownloadTasks();
      } else {
        message.error(result.message);
      }
    } catch (error) {
      console.error('创建模型下载任务失败:', error);
      message.error('创建模型下载任务失败');
    }
  };

  // 创建数据集下载任务
  const handleCreateDatasetDownloadTask = async (values: any) => {
    if (!appId) return;

    try {
      const response = await fetch('/api/aihc/quick-app/download/dataset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...values,
          type: 'dataset',
        }),
      });

      const result = await response.json();

      if (result.success) {
        message.success('创建数据集下载任务成功');
        setDownloadModalVisible(false);
        downloadForm.resetFields();
        fetchDownloadTasks();
      } else {
        message.error(result.message);
      }
    } catch (error) {
      console.error('创建数据集下载任务失败:', error);
      message.error('创建数据集下载任务失败');
    }
  };

  // 打开下载任务模态框
  const handleOpenDownloadModal = (type: 'model' | 'dataset') => {
    setDownloadTaskType(type);
    setDownloadModalVisible(true);
  };

  // 创建镜像制作任务
  const handleCreateImageBuildTask = async (values: any) => {
    if (!appId) return;

    try {
      const response = await fetch('/api/aihc/quick-app/image-build/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...values,
          appId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        message.success('创建镜像制作任务成功');
        setImageBuildModalVisible(false);
        imageBuildForm.resetFields();
        fetchImageBuildTasks();
      } else {
        message.error(result.message);
      }
    } catch (error) {
      console.error('创建镜像制作任务失败:', error);
      message.error('创建镜像制作任务失败');
    }
  };

  // 发起测试
  const handleStartTest = async (values: any) => {
    if (!appId) return;

    try {
      const response = await fetch(`/api/aihc/quick-app/test/${appId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (result.success) {
        message.success('发起测试成功');
        setTestModalVisible(false);
        testForm.resetFields();
        fetchTestTasks();
      } else {
        message.error(result.message);
      }
    } catch (error) {
      console.error('发起测试失败:', error);
      message.error('发起测试失败');
    }
  };

  useEffect(() => {
    fetchAppDetail();
    fetchDownloadTasks();
    fetchTestTasks();
    fetchImageBuildTasks();
  }, [appId]);

  // 获取状态标签颜色
  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      pending: 'orange',
      running: 'blue',
      completed: 'green',
      failed: 'red',
      created: 'blue',
      developing: 'orange',
      testing: 'purple',
      published: 'green',
    };
    return colorMap[status] || 'default';
  };

  // 下载任务列定义
  const downloadTaskColumns = [
    {
      title: '任务ID',
      dataIndex: 'taskId',
      key: 'taskId',
      width: 200,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => (
        <Tag color={type === 'model_download' ? 'blue' : 'green'}>
          {type === 'model_download' ? '模型下载' : '数据集下载'}
        </Tag>
      ),
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 100,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string, record: DownloadTask) => (
        <Space>
          <Badge status={getStatusColor(status) as any} text={status} />
          {record.progress !== undefined && (
            <Progress
              percent={record.progress}
              size="small"
              style={{ width: 60 }}
            />
          )}
        </Space>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'ctime',
      key: 'ctime',
      width: 150,
      render: (ctime: number) => new Date(ctime * 1000).toLocaleString(),
    },
  ];

  // 测试任务列定义
  const testTaskColumns = [
    {
      title: '测试ID',
      dataIndex: 'testId',
      key: 'testId',
      width: 200,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string, record: TestTask) => (
        <Space>
          <Badge status={getStatusColor(status) as any} text={status} />
          {record.progress !== undefined && (
            <Progress
              percent={record.progress}
              size="small"
              style={{ width: 60 }}
            />
          )}
        </Space>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'ctime',
      key: 'ctime',
      width: 150,
      render: (ctime: number) => new Date(ctime * 1000).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: TestTask) => (
        <Button
          type="link"
          size="small"
          onClick={() => {
            // 查看测试结果
            Modal.info({
              title: '测试结果',
              content: <pre>{JSON.stringify(record.results, null, 2)}</pre>,
              width: 600,
            });
          }}
        >
          查看结果
        </Button>
      ),
    },
  ];

  // 镜像制作任务列定义
  const imageBuildTaskColumns = [
    {
      title: '构建ID',
      dataIndex: 'buildId',
      key: 'buildId',
      width: 200,
    },
    {
      title: '镜像名称',
      dataIndex: 'imageName',
      key: 'imageName',
      width: 150,
      render: (text: string, record: ImageBuildTask) => (
        <Space>
          <span>{text}</span>
          <Tag color="blue">{record.imageTag}</Tag>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string, _record: ImageBuildTask) => (
        <Space>
          <Badge
            status={
              status === 'completed'
                ? 'success'
                : status === 'building'
                  ? 'processing'
                  : status === 'failed'
                    ? 'error'
                    : 'default'
            }
          />
          <span style={{ color: getStatusColor(status) }}>
            {status === 'pending'
              ? '等待中'
              : status === 'building'
                ? '构建中'
                : status === 'completed'
                  ? '已完成'
                  : '失败'}
          </span>
        </Space>
      ),
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 150,
      render: (progress: number) => (
        <Progress percent={progress || 0} size="small" />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'ctime',
      key: 'ctime',
      width: 150,
      render: (ctime: number) => new Date(ctime * 1000).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: ImageBuildTask) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => {
              // 查看构建日志
              Modal.info({
                title: '构建日志',
                content: record.logs || '暂无日志',
                width: 800,
              });
            }}
          >
            查看日志
          </Button>
          {record.imageUrl && (
            <Button
              type="link"
              size="small"
              onClick={() => window.open(record.imageUrl, '_blank')}
            >
              查看镜像
            </Button>
          )}
        </Space>
      ),
    },
  ];

  if (!app) {
    return (
      <PageContainer loading={loading}>
        <Card>
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <ExclamationCircleOutlined
              style={{ fontSize: 48, color: '#faad14' }}
            />
            <p style={{ marginTop: 16, fontSize: 16 }}>应用不存在或加载失败</p>
            <Button
              type="primary"
              onClick={() => navigate('/quick-app/management')}
            >
              返回应用管理
            </Button>
          </div>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={`应用开发调试 - ${app.appName}`}
      extra={[
        <Button
          key="back"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/quick-app/management')}
        >
          返回应用管理
        </Button>,
      ]}
    >
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'basic',
              label: '基本信息',
              children: (
                <>
                  <ProCard
                    title="应用配置"
                    type="inner"
                    extra={
                      <Button
                        type="primary"
                        icon={<EditOutlined />}
                        onClick={handleEditApp}
                      >
                        编辑
                      </Button>
                    }
                  >
                    <ProDescriptions
                      column={2}
                      dataSource={app}
                      columns={[
                        {
                          title: '应用名称',
                          dataIndex: 'appName',
                          copyable: true,
                        },
                        {
                          title: '应用ID',
                          dataIndex: 'appId',
                          copyable: true,
                        },
                        {
                          title: '服务类型',
                          dataIndex: 'serviceType',
                          render: (text) => {
                            const option = serviceTypeOptions.find(
                              (opt) => opt.value === text,
                            );
                            return (
                              <Tag color="blue">{option?.label || text}</Tag>
                            );
                          },
                        },
                        {
                          title: '应用类型',
                          dataIndex: 'appType',
                          render: (text) => {
                            const options =
                              appTypeOptions[
                                app.serviceType as keyof typeof appTypeOptions
                              ] || [];
                            const option = options.find(
                              (opt) => opt.value === text,
                            );
                            return (
                              <Tag color="green">{option?.label || text}</Tag>
                            );
                          },
                        },
                        {
                          title: '镜像地址',
                          dataIndex: 'imageUrl',
                          copyable: true,
                        },
                        {
                          title: '模型存储地址',
                          dataIndex: 'modelStorageUrl',
                          copyable: true,
                        },
                        {
                          title: '预置存储地址',
                          dataIndex: 'presetStorageUrl',
                          copyable: true,
                        },
                        {
                          title: '启动命令',
                          dataIndex: 'startCommand',
                          copyable: true,
                        },
                        {
                          title: '可用机型',
                          dataIndex: 'availableMachines',
                          render: (machines) => (
                            <Space>
                              {Array.isArray(machines)
                                ? machines.map((machine) => (
                                    <Tag key={machine}>{machine}</Tag>
                                  ))
                                : '-'}
                            </Space>
                          ),
                        },
                        {
                          title: '排除机型',
                          dataIndex: 'excludeMachines',
                          render: (machines) => (
                            <Space>
                              {Array.isArray(machines)
                                ? machines.map((machine) => (
                                    <Tag key={machine}>{machine}</Tag>
                                  ))
                                : '-'}
                            </Space>
                          ),
                        },
                      ]}
                    />
                  </ProCard>

                  <ProCard
                    title="基本信息"
                    type="inner"
                    style={{ marginTop: 16 }}
                  >
                    <ProDescriptions
                      column={2}
                      dataSource={app}
                      columns={[
                        {
                          title: '文档链接',
                          dataIndex: 'document',
                          copyable: true,
                        },
                        {
                          title: '简介',
                          dataIndex: 'shortDesc',
                          span: 2,
                        },
                        {
                          title: '标签',
                          dataIndex: 'tags',
                          render: (tags) => (
                            <Space>
                              {Array.isArray(tags)
                                ? tags.map((tag) => (
                                    <Tag key={tag.tagId}>{tag.value}</Tag>
                                  ))
                                : '-'}
                            </Space>
                          ),
                        },
                        {
                          title: '排序号',
                          dataIndex: 'weight',
                        },
                        {
                          title: '创建时间',
                          dataIndex: 'ctime',
                          render: (ctime) =>
                            new Date(Number(ctime) * 1000).toLocaleString(),
                        },
                        {
                          title: '更新时间',
                          dataIndex: 'mtime',
                          render: (mtime) =>
                            new Date(Number(mtime) * 1000).toLocaleString(),
                        },
                      ]}
                    />
                  </ProCard>
                </>
              ),
            },
            {
              key: 'model',
              label: '下载模型',
              children: (
                <ProCard
                  title="模型下载任务"
                  extra={
                    <Button
                      type="primary"
                      icon={<DownloadOutlined />}
                      onClick={() => handleOpenDownloadModal('model')}
                    >
                      创建模型下载任务
                    </Button>
                  }
                >
                  <Table
                    columns={downloadTaskColumns}
                    dataSource={downloadTasks.filter(
                      (task) => task.type === 'model_download',
                    )}
                    rowKey="taskId"
                    pagination={false}
                    size="small"
                  />
                </ProCard>
              ),
            },
            {
              key: 'dataset',
              label: '下载数据集',
              children: (
                <ProCard
                  title="数据集下载任务"
                  extra={
                    <Button
                      type="primary"
                      icon={<DatabaseOutlined />}
                      onClick={() => handleOpenDownloadModal('dataset')}
                    >
                      创建数据集下载任务
                    </Button>
                  }
                >
                  <Table
                    columns={downloadTaskColumns}
                    dataSource={downloadTasks.filter(
                      (task) => task.type === 'dataset_download',
                    )}
                    rowKey="taskId"
                    pagination={false}
                    size="small"
                  />
                </ProCard>
              ),
            },
            {
              key: 'image-build',
              label: '镜像制作',
              children: (
                <ProCard
                  title="镜像制作任务"
                  extra={
                    <Button
                      type="primary"
                      icon={<BuildOutlined />}
                      onClick={() => setImageBuildModalVisible(true)}
                    >
                      创建镜像制作任务
                    </Button>
                  }
                >
                  <Table
                    columns={imageBuildTaskColumns}
                    dataSource={imageBuildTasks}
                    rowKey="buildId"
                    pagination={false}
                    size="small"
                  />
                </ProCard>
              ),
            },
            {
              key: 'template',
              label: '模板配置',
              children: (
                <ProCard
                  title="应用模板配置"
                  extra={
                    <Space>
                      <Button
                        icon={<CopyOutlined />}
                        onClick={() => {
                          if (app) {
                            const templateJson = JSON.stringify(app, null, 2);
                            navigator.clipboard
                              .writeText(templateJson)
                              .then(() => {
                                message.success('模板配置已复制到剪贴板');
                              })
                              .catch(() => {
                                message.error('复制失败');
                              });
                          }
                        }}
                      >
                        复制模板
                      </Button>
                      <Button
                        type="primary"
                        icon={<SettingOutlined />}
                        onClick={() => {
                          // 可以添加编辑模板的功能
                          message.info('编辑模板功能待开发');
                        }}
                      >
                        编辑模板
                      </Button>
                    </Space>
                  }
                >
                  <Alert
                    message="应用模板信息"
                    description="以下是当前应用的完整配置信息，可用于模板生成和部署。"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  <div
                    style={{
                      background: '#f5f5f5',
                      padding: 16,
                      borderRadius: 6,
                      border: '1px solid #d9d9d9',
                      maxHeight: '600px',
                      overflow: 'auto',
                    }}
                  >
                    <pre
                      style={{
                        margin: 0,
                        fontSize: 12,
                        lineHeight: '1.5',
                        color: '#333',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {app ? JSON.stringify(app, null, 2) : '暂无应用数据'}
                    </pre>
                  </div>
                </ProCard>
              ),
            },
            {
              key: 'test',
              label: '测试',
              children: (
                <ProCard
                  title="测试任务"
                  extra={
                    <Button
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      onClick={() => setTestModalVisible(true)}
                    >
                      发起测试
                    </Button>
                  }
                >
                  <Table
                    columns={testTaskColumns}
                    dataSource={testTasks}
                    rowKey="testId"
                    pagination={false}
                    size="small"
                  />
                </ProCard>
              ),
            },
          ]}
        />
      </Card>

      {/* 创建下载任务模态框 */}
      <Modal
        title={
          downloadTaskType === 'model'
            ? '创建模型下载任务'
            : '创建数据集下载任务'
        }
        open={downloadModalVisible}
        onCancel={() => {
          setDownloadModalVisible(false);
          downloadForm.resetFields();
        }}
        onOk={() => downloadForm.submit()}
        width={600}
      >
        <Form
          form={downloadForm}
          layout="vertical"
          onFinish={
            downloadTaskType === 'model'
              ? handleCreateModelDownloadTask
              : handleCreateDatasetDownloadTask
          }
        >
          <Form.Item
            name="type"
            label="任务类型"
            initialValue={
              downloadTaskType === 'model' ? '模型权重下载' : '数据集下载'
            }
          >
            <Input
              disabled
              value={
                downloadTaskType === 'model' ? '模型权重下载' : '数据集下载'
              }
            />
          </Form.Item>

          <Form.Item
            name="source"
            label="来源"
            rules={[{ required: true, message: '请选择来源' }]}
          >
            <Select placeholder="请选择来源">
              {downloadSourceOptions.map((option) => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="sourceUrl"
            label="源地址"
            rules={[{ required: true, message: '请输入源地址' }]}
          >
            <Input placeholder="请输入社区访问地址" />
          </Form.Item>

          <Form.Item name="key" label="密钥">
            <Input placeholder="访问源地址需要密钥时填写" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 发起测试模态框 */}
      <Modal
        title="发起应用测试"
        open={testModalVisible}
        onCancel={() => {
          setTestModalVisible(false);
          testForm.resetFields();
        }}
        onOk={() => testForm.submit()}
        width={600}
      >
        <Form form={testForm} layout="vertical" onFinish={handleStartTest}>
          <Alert
            message="测试说明"
            description="测试将基于当前应用配置生成模板并调用相关接口进行验证。"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Form.Item
            name="testType"
            label="测试类型"
            rules={[{ required: true, message: '请选择测试类型' }]}
          >
            <Select placeholder="请选择测试类型">
              <Option value="basic">基础功能测试</Option>
              <Option value="performance">性能测试</Option>
              <Option value="integration">集成测试</Option>
            </Select>
          </Form.Item>

          <Form.Item name="description" label="测试描述">
            <TextArea placeholder="请输入测试描述" rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑应用模态框 */}
      <Modal
        title="编辑应用"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
        }}
        onOk={() => editForm.submit()}
        width={800}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdateApp}>
          <Form.Item
            name="appName"
            label="应用名称"
            rules={[{ required: true, message: '请输入应用名称' }]}
          >
            <Input placeholder="请输入应用名称" />
          </Form.Item>

          <Form.Item name="imageUrl" label="镜像地址">
            <Input placeholder="请输入镜像地址" />
          </Form.Item>

          <Form.Item name="modelStorageUrl" label="模型存储地址">
            <Input placeholder="请输入模型存储地址" />
          </Form.Item>

          <Form.Item name="presetStorageUrl" label="预设存储地址">
            <Input placeholder="请输入预设存储地址" />
          </Form.Item>

          <Form.Item name="startCommand" label="启动命令">
            <TextArea placeholder="请输入启动命令" rows={3} />
          </Form.Item>

          <Form.Item name="availableMachines" label="可用机器">
            <Select
              mode="multiple"
              placeholder="请选择可用机器"
              options={machineOptions}
            />
          </Form.Item>

          <Form.Item name="excludeMachines" label="排除机器">
            <Select
              mode="multiple"
              placeholder="请选择排除机器"
              options={machineOptions}
            />
          </Form.Item>

          <Form.Item name="document" label="文档链接">
            <Input placeholder="请输入文档链接" />
          </Form.Item>

          <Form.Item name="shortDesc" label="简短描述">
            <TextArea placeholder="请输入简短描述" rows={3} />
          </Form.Item>

          <Form.Item name="weight" label="权重">
            <InputNumber
              placeholder="请输入权重"
              min={0}
              max={100}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 创建镜像制作任务模态框 */}
      <Modal
        title="创建镜像制作任务"
        open={imageBuildModalVisible}
        onCancel={() => {
          setImageBuildModalVisible(false);
          imageBuildForm.resetFields();
        }}
        onOk={() => imageBuildForm.submit()}
        width={800}
      >
        <Form
          form={imageBuildForm}
          layout="vertical"
          onFinish={handleCreateImageBuildTask}
        >
          <Form.Item
            name="imageName"
            label="镜像名称"
            rules={[{ required: true, message: '请输入镜像名称' }]}
          >
            <Input placeholder="例如: my-app" />
          </Form.Item>

          <Form.Item
            name="imageTag"
            label="镜像标签"
            rules={[{ required: true, message: '请输入镜像标签' }]}
          >
            <Input placeholder="例如: v1.0.0" />
          </Form.Item>

          <Form.Item
            name="dockerfilePath"
            label="Dockerfile路径"
            rules={[{ required: true, message: '请输入Dockerfile路径' }]}
          >
            <Input placeholder="例如: ./Dockerfile" />
          </Form.Item>

          <Form.Item
            name="buildContext"
            label="构建上下文"
            rules={[{ required: true, message: '请输入构建上下文' }]}
          >
            <Input placeholder="例如: ." />
          </Form.Item>

          <Form.Item name="description" label="构建描述">
            <TextArea placeholder="请输入构建描述" rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default QuickAppDebug;
