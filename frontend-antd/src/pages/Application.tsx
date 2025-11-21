import {
  ReloadOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import {
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Row,
  Space,
  Tag,
  Typography,
  Modal,
  Form,
  Input,
  Empty,
  Tooltip,
  Radio,
} from 'antd';
import React, { useEffect, useState } from 'react';
import { request, history } from '@umijs/max';

const { TextArea } = Input;
const { Paragraph } = Typography;

// 应用模板类型定义
interface Application {
  id: string;
  name: string;
  description?: string;
  type: 'deployment' | 'training' | 'batch-job'; // 应用类型：服务部署、训练、批量任务
  categoryType?: 'model' | 'task' | 'tool'; // 分类标签：模型、任务、工具
  category?: string; // 分类
  tags?: string[]; // 标签
  icon?: string; // 图标
  thumbnail?: string; // 缩略图
  // 多个模板，每个操作对应一个模板
  templates?: {
    [key: string]: {
      // 任务参数模板
      taskParams: any; // JSON 对象
      command?: string; // 启动命令（可选）
      // 加速卡配置：支持的卡型号及其所需数量
      accelerators?: {
        [acceleratorType: string]: number; // key: 加速卡型号，value: 所需数量
      };
    };
  };
  // 向后兼容：如果只有单个模板，可以使用 template
  template?: {
    taskParams: any;
    command?: string;
    accelerators?: {
      [acceleratorType: string]: number;
    };
  };
  actions?: Array<{
    // 支持的操作
    type: 'deploy' | 'train' | 'create-job'; // 部署、训练、创建任务
    label: string;
    description?: string;
    templateKey?: string; // 指向 templates 中的某个模板，如果不指定则使用操作类型作为 key
  }>;
  [key: string]: any;
}

const Application: React.FC = () => {
  const { message: messageApi } = App.useApp();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionType, setActionType] = useState<'deploy' | 'train' | 'create-job' | null>(null);
  const [actionForm] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // 获取应用模板列表
  const fetchApps = async () => {
    setLoading(true);
    try {
      const response = await request('/api/apps', {
        method: 'GET',
      });

      if (response.success) {
        setApps(response.data || []);
      } else {
        messageApi.error(response.message || '获取应用模板列表失败');
      }
    } catch (error) {
      console.error('获取应用模板列表失败:', error);
      messageApi.error('获取应用模板列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);


  // 获取类型标签颜色
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'deployment':
        return 'blue';
      case 'training':
        return 'magenta';
      case 'batch-job':
        return 'cyan';
      default:
        return 'default';
    }
  };

  // 获取类型文本（旧的，用于兼容）
  const getTypeText = (type: string) => {
    switch (type) {
      case 'deployment':
        return '服务部署';
      case 'training':
        return '训练';
      case 'batch-job':
        return '批量任务';
      default:
        return type;
    }
  };

  // 获取分类标签文本（模型、任务、工具）
  const getCategoryTypeText = (app: Application): string => {
    // 如果明确指定了 categoryType，使用它
    if (app.categoryType) {
      switch (app.categoryType) {
        case 'model':
          return '模型';
        case 'task':
          return '任务';
        case 'tool':
          return '工具';
        default:
          return app.categoryType;
      }
    }

    // 否则根据 type 推断
    switch (app.type) {
      case 'training':
        return '模型'; // 训练任务默认归类为模型
      case 'deployment':
      case 'batch-job':
        return '任务'; // 部署和批量任务归类为任务
      default:
        return '任务';
    }
  };

  // 获取分类标签颜色
  const getCategoryTypeColor = (app: Application): string => {
    const categoryType = app.categoryType || (app.type === 'training' ? 'model' : 'task');
    switch (categoryType) {
      case 'model':
        return 'purple'; // 模型使用紫色
      case 'task':
        return 'blue'; // 任务使用蓝色
      case 'tool':
        return 'green'; // 工具使用绿色
      default:
        return 'default';
    }
  };

  // 处理操作
  const handleAction = async (app: Application, actionType: 'deploy' | 'train' | 'create-job', actionConfig?: { templateKey?: string }) => {
    setSelectedApp(app);
    setActionType(actionType);
    setActionModalVisible(true);

    // 根据 templateKey 或 actionType 查找对应的模板
    let template: any = null;

    if (app.templates) {
      // 如果有多个模板，根据 templateKey 或 actionType 查找
      const templateKey = actionConfig?.templateKey || actionType;
      template = app.templates[templateKey];
    } else if (app.template) {
      // 向后兼容：如果只有单个模板
      template = app.template;
    }

    // 初始化表单值
    const initialValues: any = {
      command: template?.command || '',
      taskParams: JSON.stringify(template?.taskParams || {}, null, 2),
    };
    actionForm.setFieldsValue(initialValues);
  };

  // 提交操作
  const handleSubmitAction = async (values: any) => {
    if (!selectedApp || !actionType) return;

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

      let response: any;
      let successMessage = '';

      switch (actionType) {
        case 'deploy':
          // 调用部署服务接口
          response = await request('/api/services', {
            method: 'POST',
            data: {
              taskParams: JSON.stringify(taskParams),
            },
          });
          successMessage = '服务部署成功';
          break;
        case 'train':
          // 调用训练任务接口
          response = await request('/api/jobs/create', {
            method: 'POST',
            data: {
              taskParams: JSON.stringify(taskParams),
            },
          });
          successMessage = '训练任务创建成功';
          break;
        case 'create-job':
          // 调用创建任务接口（使用训练任务接口，因为都是 createJob）
          response = await request('/api/jobs/create', {
            method: 'POST',
            data: {
              taskParams: JSON.stringify(taskParams),
            },
          });
          successMessage = '任务创建成功';
          break;
        default:
          return;
      }

      if (response.success) {
        messageApi.success(successMessage);
        setActionModalVisible(false);
        actionForm.resetFields();
        // 跳转到对应页面
        if (actionType === 'deploy') {
          history.push('/deployment');
        } else if (actionType === 'train' || actionType === 'create-job') {
          history.push('/training');
        }
      } else {
        messageApi.error(response.message || '操作失败');
      }
    } catch (error: any) {
      console.error('操作失败:', error);
      const errorMessage = error?.info?.errorMessage || error?.message || '操作失败';
      messageApi.error(errorMessage);
    }
  };

  // 查看应用详情
  const handleViewDetail = (app: Application) => {
    setSelectedApp(app);
    setDrawerVisible(true);
  };

  // 过滤应用
  const filteredApps = apps.filter((app) => {
    const matchesSearch =
      app.name.toLowerCase().includes(searchText.toLowerCase()) ||
      (app.description?.toLowerCase().includes(searchText.toLowerCase()));

    let appCategory = 'task';
    if (app.categoryType) {
      appCategory = app.categoryType;
    } else {
      if (app.type === 'training') appCategory = 'model';
      else appCategory = 'task';
    }

    const matchesCategory = categoryFilter === 'all' || appCategory === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  return (
    <PageContainer
      title="应用模板"
      subTitle="服务部署、训练、批量任务等应用模板"
      extra={
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchApps}
            loading={loading}
          >
            刷新
          </Button>
        </Space>
      }
      content={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <Radio.Group
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="all">全部</Radio.Button>
            <Radio.Button value="model">模型</Radio.Button>
            <Radio.Button value="task">任务</Radio.Button>
            <Radio.Button value="tool">工具</Radio.Button>
          </Radio.Group>
          <Input.Search
            placeholder="搜索应用名称或描述"
            allowClear
            onSearch={(value) => setSearchText(value)}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
          />
        </div>
      }
    >
      {filteredApps.length === 0 && !loading ? (
        <Card>
          <Empty description="暂无应用模板" />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {filteredApps.map((app) => (
            <Col xs={24} sm={12} md={8} lg={6} key={app.id}>
              <Card
                hoverable
                style={{ height: '100%' }}
                cover={
                  app.thumbnail ? (
                    <img
                      alt={app.name}
                      src={app.thumbnail}
                      style={{ height: 120, objectFit: 'cover' }}
                    />
                  ) : null
                }
                actions={
                  (app.actions || []).map((action) => {
                    // Find the template for this action
                    const templateKey = action.templateKey || action.type;
                    const template = app.templates?.[templateKey] || app.template;
                    const accelerators = template?.accelerators;
                    const acceleratorInfo = accelerators && Object.entries(accelerators);
                    const hasAccelerators = acceleratorInfo && acceleratorInfo.length > 0;

                    return (
                      <div key={action.type} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '2px 0' }}>
                        <Button
                          type="link"
                          size="small"
                          onClick={() => handleAction(app, action.type, { templateKey: action.templateKey })}
                          style={{ padding: 0, height: '20px', lineHeight: '20px' }}
                        >
                          {action.label}
                        </Button>
                        {hasAccelerators && (
                          <Tooltip title={
                            <div style={{ fontSize: '12px' }}>
                              {acceleratorInfo.map(([accType, count]) => (
                                <div key={accType}>{accType}: {count}</div>
                              ))}
                            </div>
                          }>
                            <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 6, fontSize: '10px', color: '#fa8c16', lineHeight: '12px', cursor: 'help', textAlign: 'left' }}>
                              {acceleratorInfo.map(([accType, count]) => {
                                const name = accType.split('/').pop();
                                return (
                                  <div key={accType}>
                                    {name}{count > 0 ? `*${count}` : ''}
                                  </div>
                                );
                              })}
                            </div>
                          </Tooltip>
                        )}
                      </div>
                    );
                  })
                }
              >
                <Card.Meta
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{app.name}</span>
                      <Space>
                        <Tag color={getCategoryTypeColor(app)}>{getCategoryTypeText(app)}</Tag>
                        <Button
                          type="text"
                          icon={<RightOutlined />}
                          onClick={() => handleViewDetail(app)}
                          style={{ padding: 0, minWidth: 'auto' }}
                          size="small"
                        />
                      </Space>
                    </div>
                  }
                  description={
                    <Paragraph
                      ellipsis={{ rows: 2 }}
                      style={{ marginBottom: 0, minHeight: 44 }}
                    >
                      {app.description || '暂无描述'}
                    </Paragraph>
                  }
                />
                {app.tags && app.tags.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <Space wrap size={[4, 4]}>
                      {app.tags.map((tag) => (
                        <Tag key={tag}>
                          {tag}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                )}

              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* 应用详情抽屉 */}
      <Drawer
        title={`应用详情 - ${selectedApp?.name || ''}`}
        width={800}
        open={drawerVisible}
        onClose={() => {
          setDrawerVisible(false);
          setSelectedApp(null);
        }}
      >
        {selectedApp && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="应用ID">{selectedApp.id}</Descriptions.Item>
            <Descriptions.Item label="应用名称">{selectedApp.name}</Descriptions.Item>
            <Descriptions.Item label="应用类型">
              <Tag color={getTypeColor(selectedApp.type)}>
                {getTypeText(selectedApp.type)}
              </Tag>
            </Descriptions.Item>
            {selectedApp.category && (
              <Descriptions.Item label="分类">{selectedApp.category}</Descriptions.Item>
            )}
            {selectedApp.description && (
              <Descriptions.Item label="描述">{selectedApp.description}</Descriptions.Item>
            )}
            {selectedApp.tags && selectedApp.tags.length > 0 && (
              <Descriptions.Item label="标签">
                <Space wrap>
                  {selectedApp.tags.map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </Space>
              </Descriptions.Item>
            )}
            {selectedApp.templates && Object.keys(selectedApp.templates).length > 0 && (
              <Descriptions.Item label="模板配置">
                {Object.entries(selectedApp.templates).map(([key, template]: [string, any]) => (
                  <div key={key} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ fontWeight: 500, marginBottom: 8 }}>模板: {key}</div>
                    {template.accelerators && Object.keys(template.accelerators).length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ fontWeight: 500 }}>支持的加速卡: </span>
                        <Space wrap size={[8, 4]}>
                          {Object.entries(template.accelerators).map((entry) => {
                            const [accType, count] = entry as [string, number];
                            return (
                              <Tag key={accType} color="blue">
                                {accType}: {count} 卡
                              </Tag>
                            );
                          })}
                        </Space>
                      </div>
                    )}
                    {template.command && (
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ fontWeight: 500 }}>启动命令: </span>
                        <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: '2px' }}>
                          {template.command}
                        </code>
                      </div>
                    )}
                    <div style={{ marginTop: 8 }}>
                      <span style={{ fontWeight: 500 }}>任务参数: </span>
                      <pre
                        style={{
                          background: '#f5f5f5',
                          padding: '12px',
                          borderRadius: '4px',
                          maxHeight: '300px',
                          overflow: 'auto',
                          marginTop: 8,
                          marginBottom: 0,
                        }}
                      >
                        {JSON.stringify(template.taskParams, null, 2)}
                      </pre>
                    </div>
                  </div>
                ))}
              </Descriptions.Item>
            )}
            {selectedApp.template && !selectedApp.templates && (
              <>
                <Descriptions.Item label="启动命令">
                  {selectedApp.template.command || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="任务参数">
                  <pre
                    style={{
                      background: '#f5f5f5',
                      padding: '12px',
                      borderRadius: '4px',
                      maxHeight: '400px',
                      overflow: 'auto',
                    }}
                  >
                    {JSON.stringify(selectedApp.template.taskParams, null, 2)}
                  </pre>
                </Descriptions.Item>
              </>
            )}
          </Descriptions>
        )}
      </Drawer>

      {/* 操作模态框（部署/训练/创建任务） */}
      <Modal
        title={
          actionType === 'deploy'
            ? '部署服务'
            : actionType === 'train'
              ? '创建训练任务'
              : '创建任务'
        }
        open={actionModalVisible}
        onCancel={() => {
          setActionModalVisible(false);
          actionForm.resetFields();
          setActionType(null);
        }}
        onOk={() => actionForm.submit()}
        width={900}
      >
        <Form
          form={actionForm}
          layout="vertical"
          onFinish={handleSubmitAction}
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
              placeholder="请输入任务参数（JSON格式）"
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default Application;

