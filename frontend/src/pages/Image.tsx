import {
  CloudOutlined,
  CloudServerOutlined,
  ClockCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  FileTextOutlined,
  BranchesOutlined,
  UpOutlined,
  DownOutlined,
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
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import React, { useEffect, useRef, useState } from 'react';
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
        data: values,
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

  // 更新状态
  const _handleStatusChange = async (image: Image, newStatus: string) => {
    try {
      const response = await request(`/api/images/${image.id}/status`, {
        method: 'PUT',
        data: { status: newStatus },
      });

      if (response.success) {
        message.success('状态更新成功');
        proTableRef.current?.reload();
      } else {
        message.error(response.message || '状态更新失败');
      }
    } catch (error: any) {
      console.error('状态更新失败:', error);
      message.error(`状态更新失败: ${error.message}`);
    }
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
    history.push(`/image/detail/${record.id}?tab=intro`);
  };

  // 查看镜像版本
  const handleViewVersions = (record: Image) => {
    history.push(`/image/detail/${record.id}?tab=versions`);
  };

  // 上架镜像
  const handleOnline = async (record: Image) => {
    Modal.confirm({
      title: '确认上架',
      content: `确定要将镜像"${record.name}"上架吗？`,
      okText: '确认上架',
      cancelText: '取消',
      okType: 'primary',
      onOk: async () => {
        try {
          const response = await request(`/api/images/${record.id}/status`, {
            method: 'PUT',
            data: { status: 'online' },
          });

          if (response.success) {
            message.success('镜像上架成功');
            proTableRef.current?.reload(); // 刷新列表
          } else {
            message.error(response.message || '镜像上架失败');
          }
        } catch (error) {
          console.error('镜像上架失败:', error);
          message.error('镜像上架失败');
        }
      },
    });
  };

  // 下架镜像
  const handleOffline = async (record: Image) => {
    Modal.confirm({
      title: '确认下架',
      content: `确定要将镜像"${record.name}"下架吗？`,
      okText: '确认下架',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          const response = await request(`/api/images/${record.id}/status`, {
            method: 'PUT',
            data: { status: 'offline' },
          });

          if (response.success) {
            message.success('镜像下架成功');
            proTableRef.current?.reload(); // 刷新列表
          } else {
            message.error(response.message || '镜像下架失败');
          }
        } catch (error) {
          console.error('镜像下架失败:', error);
          message.error('镜像下架失败');
        }
      },
    });
  };

  // 打开编辑模态框
  const openEditModal = (image: Image) => {
    setEditingImage(image);
    form.setFieldsValue(image);
    setEditModalVisible(true);
  };

  // 状态标签渲染
  const renderStatusTag = (status: string) => {
    const statusConfig = {
      online: { color: 'green', icon: <CloudOutlined />, text: '上架' },
      offline: { color: 'red', icon: <CloudServerOutlined />, text: '下架' },
      pending: { color: 'orange', icon: <ClockCircleOutlined />, text: '待上线' },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  // 表格列定义
  const columns = [
    {
      title: '镜像名称/ID',
      dataIndex: 'name',
      width: 250,
      ellipsis: true,
      copyable: true,
      render: (text: any, record: Image) => (
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{text}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{record.imageId}</div>
        </div>
      ),
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
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (_: any, record: Image) => renderStatusTag(record.status),
    },
    {
      title: '最后更新时间',
      dataIndex: 'lastUpdateTime',
      width: 150,
      render: (text: any) => (text ? new Date(text).toLocaleString() : '-'),
    },
    {
      title: '操作',
      width: 360,
      fixed: 'right' as const,
      render: (_: any, record: Image) => (
        <Space wrap>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewImage(record)}
            style={{ color: '#1890ff' }}
          >
            查看
          </Button>
          <Button
            type="text"
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => handleViewIntroduction(record)}
            style={{ color: '#52c41a' }}
          >
            简介
          </Button>
          <Button
            type="text"
            size="small"
            icon={<BranchesOutlined />}
            onClick={() => handleViewVersions(record)}
            style={{ color: '#722ed1' }}
          >
            版本
          </Button>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
            style={{ color: '#1890ff' }}
          >
            编辑
          </Button>
          {record.status === 'offline' || record.status === 'pending' ? (
            <Button
              type="text"
              size="small"
              icon={<UpOutlined />}
              onClick={() => handleOnline(record)}
              style={{ color: '#52c41a' }}
            >
              上架
            </Button>
          ) : (
            <Button
              type="text"
              size="small"
              icon={<DownOutlined />}
              onClick={() => handleOffline(record)}
              style={{ color: '#faad14' }}
            >
              下架
            </Button>
          )}
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="镜像列表"
      subTitle="管理镜像，支持创建、查看和管理"
      extra={
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            创建镜像
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
      {/* 数据表格区域 */}
      <Card>
        <div
          style={{
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
            镜像列表
          </h4>
        </div>

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
              <Descriptions.Item label="状态" span={1}>
                {renderStatusTag(selectedImage.status)}
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
                    history.push(`/image/detail/${selectedImage.id}`);
                  }}
                >
                  查看详情
                </Button>
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
              </Space>
            </div>
          </div>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default Image;
