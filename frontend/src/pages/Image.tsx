import {
  DownOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ActionType } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import {
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Dropdown,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Tag,
  Tabs,
  Typography,
} from 'antd';
import type { MenuProps } from 'antd';
import React, { useRef, useState } from 'react';
import { history } from '@umijs/max';
import { request } from '@umijs/max';

const { Option } = Select;
const { TextArea } = Input;

// 镜像数据类型
interface Image {
  id: string;
  name: string;
  imageId: string;
  frameworks: string[];
  applicableScopes: string[];
  chipType: 'GPU' | 'CPU' | 'NPU';
  presetCuda: boolean;
  description: string;
  imageAddress: string;
  lastUpdateTime: string;
  status: 'online' | 'offline' | 'pending';
  type?: 'public' | 'custom'; // 镜像类型：公共镜像或自定义镜像
  icon?: string;
  introduction?: string;
  paperUrl?: string;
  codeUrl?: string;
  license?: string;
}

const Image: React.FC = () => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingImage, setEditingImage] = useState<Image | null>(null);
  const [form] = Form.useForm();
  const proTableRef = useRef<ActionType>(null);
  const [activeTab, setActiveTab] = useState<string>('public'); // 当前选中的tab：public（公共镜像）或 custom（自定义镜像）

  // 获取镜像列表
  const fetchImages = async (params: any = {}) => {
    setLoading(true);
    try {
      const response = await request('/api/images', {
        method: 'GET',
        params: {
          pageNo: params.current || params.pageNo || 1,
          pageSize: params.pageSize || 10,
          name: params.name || '',
          framework: params.framework || '',
          chipType: params.chipType || '',
          applicableScope: params.applicableScope || '',
          type: activeTab, // 根据当前选中的tab传递类型参数
        },
      });

      if (response.success) {
        const listData = response.data?.list || [];
        const total = response.data?.total || 0;

        return {
          data: listData,
          success: true,
          total: total,
        };
      } else {
        message.error(response.message || '获取镜像列表失败');
        return {
          data: [],
          success: false,
          total: 0,
        };
      }
    } catch (error: any) {
      console.error('获取镜像列表失败:', error);
      message.error(`无法连接到后端服务: ${error.message}`);
      return {
        data: [],
        success: false,
        total: 0,
      };
    } finally {
      setLoading(false);
    }
  };

  // 创建镜像
  const handleCreate = async (values: any) => {
    try {
      const response = await request('/api/images', {
        method: 'POST',
        data: {
          ...values,
          type: activeTab, // 根据当前选中的tab设置镜像类型
        },
      });

      if (response.success) {
        message.success('创建镜像成功');
        setCreateModalVisible(false);
        form.resetFields();
        proTableRef.current?.reload();
      } else {
        message.error(response.message || '创建镜像失败');
      }
    } catch (error: any) {
      console.error('创建镜像失败:', error);
      message.error(`创建镜像失败: ${error.message}`);
    }
  };

  // 编辑镜像
  const handleEdit = async (values: any) => {
    if (!editingImage) return;

    try {
      const response = await request(`/api/images/${editingImage.id}`, {
        method: 'PUT',
        data: values,
      });

      if (response.success) {
        message.success('更新镜像成功');
        setEditModalVisible(false);
        setEditingImage(null);
        form.resetFields();
        proTableRef.current?.reload();
      } else {
        message.error(response.message || '更新镜像失败');
      }
    } catch (error: any) {
      console.error('更新镜像失败:', error);
      message.error(`更新镜像失败: ${error.message}`);
    }
  };

  // 删除镜像
  const handleDelete = async (image: Image) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除镜像 "${image.name}" 吗？`,
      onOk: async () => {
        try {
          const response = await request(`/api/images/${image.id}`, {
            method: 'DELETE',
          });

          if (response.success) {
            message.success('删除镜像成功');
            proTableRef.current?.reload();
          } else {
            message.error(response.message || '删除镜像失败');
          }
        } catch (error: any) {
          console.error('删除镜像失败:', error);
          message.error(`删除镜像失败: ${error.message}`);
        }
      },
    });
  };

  // 查看镜像详情
  const handleViewImage = async (record: Image) => {
    try {
      const response = await request(`/api/images/${record.id}`, {
        method: 'GET',
      });

      if (response.success) {
        setSelectedImage(response.data);
        setDrawerVisible(true);
      } else {
        console.warn('获取镜像详情API失败，使用当前数据:', response.message);
        setSelectedImage(record);
        setDrawerVisible(true);
      }
    } catch (error: any) {
      console.error('获取镜像详情失败:', error);
      setSelectedImage(record);
      setDrawerVisible(true);
    }
  };

  // 查看镜像简介
  const handleViewIntroduction = (record: Image) => {
    history.push(`/ai-assets/image/detail/${record.id}?tab=intro`);
  };

  // 查看镜像版本
  const handleViewVersions = (record: Image) => {
    history.push(`/ai-assets/image/detail/${record.id}?tab=versions`);
  };

  // 打开编辑模态框
  const openEditModal = (image: Image) => {
    setEditingImage(image);
    form.setFieldsValue(image);
    setEditModalVisible(true);
  };

  // 切换Tab
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    // 切换Tab时重新加载数据
    proTableRef.current?.reload();
  };

  // 表格列定义
  const columns = [
    {
      title: '镜像名称 / 镜像ID',
      dataIndex: 'name',
      width: 280,
      ellipsis: true,
      render: (text: any, record: Image) => {
        const name = text || '-';
        const id = record.imageId || record.id || '';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Typography.Link
              onClick={() => handleViewImage(record)}
              style={{ display: 'block', fontWeight: 500 }}
            >
              {name}
            </Typography.Link>
            <Typography.Text
              copyable={{ text: id }}
              style={{ fontSize: 12, color: '#666' }}
            >
              {id}
            </Typography.Text>
          </div>
        );
      },
    },
    {
      title: '框架',
      dataIndex: 'frameworks',
      width: 200,
      render: (_: any, record: Image) => (
        <Space wrap>
          {record.frameworks?.map((framework: string) => (
            <Tag key={framework} color="blue">{framework}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '适用范围',
      dataIndex: 'applicableScopes',
      width: 200,
      render: (_: any, record: Image) => (
        <Space wrap>
          {record.applicableScopes?.map((scope: string) => (
            <Tag key={scope} color="purple">{scope}</Tag>
          ))}
        </Space>
      ),
    },
    // 公共镜像显示描述，自定义镜像显示芯片类型和预置CUDA
    ...(activeTab === 'public' ? [
      {
        title: '描述',
        dataIndex: 'description',
        width: 300,
        ellipsis: true,
        render: (text: any) => text || '-',
      },
    ] : [
      {
        title: '芯片类型',
        dataIndex: 'chipType',
        width: 100,
        render: (_: any, record: Image) => {
          const color = record.chipType === 'GPU' ? 'blue' : record.chipType === 'CPU' ? 'green' : 'purple';
          return <Tag color={color}>{record.chipType}</Tag>;
        },
      },
      {
        title: '预置CUDA',
        dataIndex: 'presetCuda',
        width: 100,
        render: (_: any, record: Image) => (
          <Tag color={record.presetCuda ? 'green' : 'default'}>
            {record.presetCuda ? '是' : '否'}
          </Tag>
        ),
      },
    ]),
    {
      title: '最后更新时间',
      dataIndex: 'lastUpdateTime',
      width: 150,
      render: (text: any) => (text ? new Date(text).toLocaleString() : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right' as const,
      render: (_: any, record: Image) => {
        const isPublicImage = activeTab === 'public' || record.type === 'public' || !record.type;

        const actions: { key: string; label: string; onClick: () => void; danger?: boolean }[] = [
          { key: 'detail', label: '详情', onClick: () => handleViewImage(record) },
          { key: 'intro', label: '简介', onClick: () => handleViewIntroduction(record) },
          { key: 'versions', label: '版本', onClick: () => handleViewVersions(record) },
        ];

        if (!isPublicImage) {
          actions.push({ key: 'edit', label: '编辑', onClick: () => openEditModal(record) });
          actions.push({ key: 'delete', danger: true, label: '删除', onClick: () => handleDelete(record) });
        }

        if (actions.length <= 2) {
          return (
            <Space size={4}>
              {actions.map(action => (
                <Button key={action.key} type="link" size="small" danger={action.danger} onClick={action.onClick}>
                  {action.label}
                </Button>
              ))}
            </Space>
          );
        }

        const [first, ...rest] = actions;
        const moreItems: MenuProps['items'] = rest.map((action, index) => {
          const items: any[] = [];
          if (action.danger && index > 0) {
            items.push({ type: 'divider' });
          }
          items.push({ key: action.key, label: action.label, danger: action.danger, onClick: action.onClick });
          return items;
        }).flat();

        return (
          <Space size={4}>
            <Button type="link" size="small" onClick={first.onClick}>{first.label}</Button>
            <Dropdown menu={{ items: moreItems }} trigger={['click']}>
              <Button type="link" size="small" onClick={(e) => e.preventDefault()}>
                更多 <DownOutlined />
              </Button>
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  return (
    <PageContainer
      title="镜像列表"
      subTitle="管理镜像，支持创建、查看和管理"
      extra={
        <Space>
          {/* 只有自定义镜像tab才显示创建按钮 */}
          {activeTab === 'custom' && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              创建镜像
            </Button>
          )}
          <Button
            icon={<ReloadOutlined />}
            onClick={() => proTableRef.current?.reload()}
          >
            刷新
          </Button>
        </Space>
      }
    >
      {/* 数据表格区域 */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={[
            {
              key: 'public',
              label: '公共镜像',
            },
            {
              key: 'custom',
              label: '自定义镜像',
            },
          ]}
          style={{ marginBottom: 16 }}
        />

        <ProTable<Image>
          actionRef={proTableRef}
          columns={columns}
          loading={loading}
          rowKey="id"
          pagination={{
            showQuickJumper: true,
            showSizeChanger: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条/总共 ${total} 条`,
            pageSizeOptions: ['5', '10', '20', '50'],
            defaultPageSize: 10,
          }}
          search={{
            labelWidth: 'auto',
          }}
          request={fetchImages}
          scroll={{ x: 1200 }}
          size="middle"
        />
      </Card>

      {/* 创建模态框 */}
      <Modal
            title="创建镜像"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
        >
          <Form.Item
            name="name"
            label="镜像名称"
            rules={[{ required: true, message: '请输入镜像名称' }]}
          >
            <Input placeholder="请输入镜像名称" />
          </Form.Item>

          <Form.Item
            name="frameworks"
            label="框架"
            rules={[{ required: true, message: '请选择框架' }]}
          >
            <Select
              mode="multiple"
              placeholder="请选择框架"
              options={[
                { label: 'PyTorch', value: 'PyTorch' },
                { label: 'TensorFlow', value: 'TensorFlow' },
                { label: 'DeepSpeed', value: 'DeepSpeed' },
                { label: 'PaddlePaddle', value: 'PaddlePaddle' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="applicableScopes"
            label="适用范围"
            rules={[{ required: true, message: '请选择适用范围' }]}
          >
            <Select
              mode="multiple"
              placeholder="请选择适用范围"
              options={[
                { label: '开发机', value: '开发机' },
                { label: '分布式训练', value: '分布式训练' },
                { label: '在线服务部署', value: '在线服务部署' },
              ]}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="chipType"
                label="芯片类型"
                rules={[{ required: true, message: '请选择芯片类型' }]}
              >
                <Select placeholder="请选择芯片类型">
                  <Option value="GPU">GPU</Option>
                  <Option value="CPU">CPU</Option>
                  <Option value="NPU">NPU</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="presetCuda"
                label="预置CUDA"
                valuePropName="checked"
              >
                <Select placeholder="是否预置CUDA">
                  <Option value={true}>是</Option>
                  <Option value={false}>否</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="镜像描述"
            rules={[{ required: true, message: '请输入镜像描述' }]}
          >
            <TextArea rows={4} placeholder="请输入镜像描述" />
          </Form.Item>

          <Form.Item
            name="imageAddress"
            label="镜像地址"
            rules={[{ required: true, message: '请输入镜像地址' }]}
          >
            <Input placeholder="请输入镜像地址" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setCreateModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                创建
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑模态框 */}
      <Modal
            title="编辑镜像"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingImage(null);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleEdit}
        >
          <Form.Item
            name="name"
            label="镜像名称"
            rules={[{ required: true, message: '请输入镜像名称' }]}
          >
            <Input placeholder="请输入镜像名称" />
          </Form.Item>

          <Form.Item
            name="frameworks"
            label="框架"
            rules={[{ required: true, message: '请选择框架' }]}
          >
            <Select
              mode="multiple"
              placeholder="请选择框架"
              options={[
                { label: 'PyTorch', value: 'PyTorch' },
                { label: 'TensorFlow', value: 'TensorFlow' },
                { label: 'DeepSpeed', value: 'DeepSpeed' },
                { label: 'PaddlePaddle', value: 'PaddlePaddle' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="applicableScopes"
            label="适用范围"
            rules={[{ required: true, message: '请选择适用范围' }]}
          >
            <Select
              mode="multiple"
              placeholder="请选择适用范围"
              options={[
                { label: '开发机', value: '开发机' },
                { label: '分布式训练', value: '分布式训练' },
                { label: '在线服务部署', value: '在线服务部署' },
              ]}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="chipType"
                label="芯片类型"
                rules={[{ required: true, message: '请选择芯片类型' }]}
              >
                <Select placeholder="请选择芯片类型">
                  <Option value="GPU">GPU</Option>
                  <Option value="CPU">CPU</Option>
                  <Option value="NPU">NPU</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="presetCuda"
                label="预置CUDA"
                valuePropName="checked"
              >
                <Select placeholder="是否预置CUDA">
                  <Option value={true}>是</Option>
                  <Option value={false}>否</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="镜像描述"
            rules={[{ required: true, message: '请输入镜像描述' }]}
          >
            <TextArea rows={4} placeholder="请输入镜像描述" />
          </Form.Item>

          <Form.Item
            name="imageAddress"
            label="镜像地址"
            rules={[{ required: true, message: '请输入镜像地址' }]}
          >
            <Input placeholder="请输入镜像地址" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setEditModalVisible(false);
                setEditingImage(null);
                form.resetFields();
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                更新
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 镜像详情抽屉 */}
      <Drawer
        title={`镜像详情 - ${selectedImage?.name || ''}`}
        placement="right"
        width={800}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        destroyOnClose
      >
        {selectedImage && (
          <div>
            {/* 基本信息 */}
            <Descriptions
              title="基本信息"
              bordered
              column={2}
              size="small"
              style={{ marginBottom: 24 }}
            >
              <Descriptions.Item label="镜像名称" span={2}>
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                    {selectedImage.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    ID: {selectedImage.imageId}
                  </div>
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="框架" span={1}>
                <Space wrap>
                  {selectedImage.frameworks?.map((framework) => (
                    <Tag key={framework} color="blue">{framework}</Tag>
                  ))}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="适用范围" span={1}>
                <Space wrap>
                  {selectedImage.applicableScopes?.map((scope) => (
                    <Tag key={scope} color="purple">{scope}</Tag>
                  ))}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="芯片类型" span={1}>
                <Tag color={selectedImage.chipType === 'GPU' ? 'blue' : selectedImage.chipType === 'CPU' ? 'green' : 'purple'}>
                  {selectedImage.chipType}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="预置CUDA" span={1}>
                <Tag color={selectedImage.presetCuda ? 'green' : 'default'}>
                  {selectedImage.presetCuda ? '是' : '否'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="最后更新时间" span={1}>
                {selectedImage.lastUpdateTime ? new Date(selectedImage.lastUpdateTime).toLocaleString() : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="镜像地址" span={2}>
                <Typography.Text code copyable>
                  {selectedImage.imageAddress}
                </Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label="描述" span={2}>
                <div style={{ wordBreak: 'break-all' }}>
                  {selectedImage.description}
                </div>
              </Descriptions.Item>
            </Descriptions>

            {/* 操作按钮 */}
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <Space>
                <Button
                  type="primary"
                  onClick={() => {
                    setDrawerVisible(false);
                    history.push(`/ai-assets/image/detail/${selectedImage.id}`);
                  }}
                >
                  查看详情
                </Button>
                {/* 只有自定义镜像才显示编辑和删除按钮 */}
                {selectedImage.type === 'custom' && (
                  <>
                    <Button
                      onClick={() => {
                        setDrawerVisible(false);
                        openEditModal(selectedImage);
                      }}
                    >
                      编辑
                    </Button>
                    <Button
                      danger
                      onClick={() => {
                        setDrawerVisible(false);
                        handleDelete(selectedImage);
                      }}
                    >
                      删除
                    </Button>
                  </>
                )}
              </Space>
            </div>
          </div>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default Image;
