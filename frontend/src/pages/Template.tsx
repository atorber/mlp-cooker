import {
  ReloadOutlined,
  ImportOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Col,
  Row,
  Space,
  Tag,
  Typography,
  Modal,
  Form,
  Input,
  Empty,
  Table,
  Popconfirm,
  App,
} from 'antd';
import React, { useEffect, useState } from 'react';
import { request } from '@umijs/max';

const { Paragraph } = Typography;

// 模板类型定义
interface Template {
  id: string;
  name: string;
  description?: string;
  type: 'deployment' | 'training' | 'batch-job';
  category?: string;
  tags?: string[];
  config: string; // JSON 配置
  createdAt?: string;
  updatedAt?: string;
}

const Template: React.FC = () => {
  const { message: messageApi } = App.useApp();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');

  // 获取模板列表
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await request('/api/templates', {
        method: 'GET',
      });

      if (response.success) {
        setTemplates(response.data || []);
      } else {
        messageApi.error(response.message || '获取模板列表失败');
      }
    } catch (error) {
      console.error('获取模板列表失败:', error);
      messageApi.error('获取模板列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // 处理新增/编辑
  const handleSubmit = async (values: any) => {
    try {
      const data = {
        ...values,
        config: values.config ? JSON.stringify(JSON.parse(values.config), null, 2) : '{}',
      };

      let response;
      if (editingTemplate) {
        response = await request(`/api/templates/${editingTemplate.id}`, {
          method: 'PUT',
          data,
        });
      } else {
        response = await request('/api/templates', {
          method: 'POST',
          data,
        });
      }

      if (response.success) {
        messageApi.success(editingTemplate ? '模板更新成功' : '模板创建成功');
        setModalVisible(false);
        form.resetFields();
        setEditingTemplate(null);
        fetchTemplates();
      } else {
        messageApi.error(response.message || '操作失败');
      }
    } catch (error: any) {
      console.error('操作失败:', error);
      const errorMessage = error?.info?.errorMessage || error?.message || '操作失败';
      messageApi.error(errorMessage);
    }
  };

  // 删除模板
  const handleDelete = async (id: string) => {
    try {
      const response = await request(`/api/templates/${id}`, {
        method: 'DELETE',
      });

      if (response.success) {
        messageApi.success('模板删除成功');
        fetchTemplates();
      } else {
        messageApi.error(response.message || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      messageApi.error('删除失败');
    }
  };

  // 编辑模板
  const handleEdit = (record: Template) => {
    setEditingTemplate(record);
    let config = record.config;
    try {
      // 尝试解析并格式化
      const parsed = JSON.parse(config);
      config = JSON.stringify(parsed, null, 2);
    } catch {
      // 如果解析失败，保持原样
    }
    form.setFieldsValue({
      ...record,
      config,
    });
    setModalVisible(true);
  };

  // 过滤模板
  const filteredTemplates = templates.filter((tpl) => {
    const matchesSearch =
      tpl.name.toLowerCase().includes(searchText.toLowerCase()) ||
      (tpl.description?.toLowerCase().includes(searchText.toLowerCase()));
    return matchesSearch;
  });

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

  // 获取类型文本
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

  const columns = [
    {
      title: '模板名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => (
        <Tag color={getTypeColor(type)}>{getTypeText(type)}</Tag>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => (
        <Space wrap size={[4, 4]}>
          {tags?.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: Template) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除此模板？"
            onConfirm={() => handleDelete(record.id)}
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
      title="模板管理"
      subTitle="管理应用模板配置"
      extra={
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchTemplates}
            loading={loading}
          >
            刷新
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingTemplate(null);
              form.resetFields();
              setModalVisible(true);
            }}
          >
            新增模板
          </Button>
        </Space>
      }
      content={
        <div style={{ marginTop: 16 }}>
          <Input.Search
            placeholder="搜索模板名称或描述"
            allowClear
            onSearch={(value) => setSearchText(value)}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
          />
        </div>
      }
    >
      {filteredTemplates.length === 0 && !loading ? (
        <Card>
          <Empty description="暂无模板" />
        </Card>
      ) : (
        <Table
          dataSource={filteredTemplates}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      )}

      {/* 新增/编辑模态框 */}
      <Modal
        title={editingTemplate ? '编辑模板' : '新增模板'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingTemplate(null);
        }}
        onOk={() => form.submit()}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="模板名称"
            rules={[
              { required: true, message: '请输入模板名称' },
              { max: 50, message: '模板名称不能超过50个字符' },
            ]}
          >
            <Input placeholder="请输入模板名称" />
          </Form.Item>

          <Form.Item
            name="type"
            label="类型"
            rules={[{ required: true, message: '请选择类型' }]}
          >
            <Space>
              <Tag.CheckableTag
                checked={form.getFieldValue('type') === 'deployment'}
                onChange={() => form.setFieldsValue({ type: 'deployment' })}
              >
                服务部署
              </Tag.CheckableTag>
              <Tag.CheckableTag
                checked={form.getFieldValue('type') === 'training'}
                onChange={() => form.setFieldsValue({ type: 'training' })}
              >
                训练
              </Tag.CheckableTag>
              <Tag.CheckableTag
                checked={form.getFieldValue('type') === 'batch-job'}
                onChange={() => form.setFieldsValue({ type: 'batch-job' })}
              >
                批量任务
              </Tag.CheckableTag>
            </Space>
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea rows={2} placeholder="请输入模板描述（可选）" />
          </Form.Item>

          <Form.Item
            name="tags"
            label="标签"
            tooltip="多个标签用逗号分隔"
          >
            <Input placeholder="例如：训练, PyTorch, 示例（多个标签用逗号分隔）" />
          </Form.Item>

          <Form.Item
            name="config"
            label="配置（JSON格式）"
            rules={[
              { required: true, message: '请输入配置' },
              {
                validator: (_, value) => {
                  if (!value) {
                    return Promise.resolve();
                  }
                  try {
                    JSON.parse(value);
                    return Promise.resolve();
                  } catch {
                    return Promise.reject(new Error('配置格式错误，必须是有效的 JSON 格式'));
                  }
                },
              },
            ]}
          >
            <Input.TextArea
              rows={10}
              placeholder='请输入配置（JSON格式），例如：{"key": "value"}'
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default Template;