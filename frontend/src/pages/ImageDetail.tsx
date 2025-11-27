import React, { useState, useEffect } from 'react';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  Tag,
  Space,
  Button,
  message,
  Typography,
  Input,
  Select,
  Card,
  Row,
  Col,
  Tabs,
  Modal,
  Form,
} from 'antd';
import {
  ArrowLeftOutlined,
  SearchOutlined,
  ReloadOutlined,
  GithubOutlined,
  FileTextOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { history, useParams, useSearchParams } from '@umijs/max';
import { request } from '@umijs/max';

const { Title, Paragraph, Text, Link } = Typography;
const { Option } = Select;

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

// 镜像版本数据类型
interface ImageVersion {
  version: string;
  imageAddress: string;
  size: string;
  pythonVersion: string;
  cudaVersion: string;
  description: string;
  createTime: string;
}

const ImageDetail: React.FC = () => {
  const params = useParams<{ id: string }>();
  const { id } = params;
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [versionLoading, setVersionLoading] = useState(false);
  const [imageDetail, setImageDetail] = useState<Image | null>(null);
  const [versions, setVersions] = useState<ImageVersion[]>([]);
  const [activeTab, setActiveTab] = useState('intro');
  const [versionModalVisible, setVersionModalVisible] = useState(false);
  const [versionForm] = Form.useForm();

  // 获取镜像详情
  const fetchImageDetail = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const response = await request(`/api/images/${id}`, {
        method: 'GET',
      });

      if (response.success) {
        setImageDetail(response.data);
      } else {
        message.error(response.message || '获取镜像详情失败');
      }
    } catch (error) {
      console.error('获取镜像详情失败:', error);
      message.error('获取镜像详情失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取镜像版本列表
  const fetchImageVersions = async () => {
    if (!id) return;

    setVersionLoading(true);
    try {
      const response = await request(`/api/images/${id}/versions`, {
        method: 'GET',
      });

      if (response.success) {
        setVersions(response.data.list || []);
      } else {
        message.error(response.message || '获取版本列表失败');
      }
    } catch (error) {
      console.error('获取版本列表失败:', error);
      message.error('获取版本列表失败');
    } finally {
      setVersionLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchImageDetail();
      fetchImageVersions();
    }
  }, [id]);

  // 处理URL参数，自动切换到指定Tab
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'intro' || tab === 'versions') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // 创建新版本
  const handleCreateVersion = async (values: any) => {
    try {
      // 自动添加镜像地址
      const versionData = {
        ...values,
        imageAddress: imageDetail?.imageAddress || '',
      };

      const response = await request(`/api/images/${id}/versions`, {
        method: 'POST',
        data: versionData,
      });

      if (response.success) {
        message.success('创建版本成功');
        setVersionModalVisible(false);
        versionForm.resetFields();
        fetchImageVersions(); // 刷新版本列表
      } else {
        message.error(response.message || '创建版本失败');
      }
    } catch (error) {
      console.error('创建版本失败:', error);
      message.error('创建版本失败');
    }
  };

  // 版本列表列定义
  const versionColumns: ProColumns<ImageVersion>[] = [
    {
      title: '版本',
      dataIndex: 'version',
      width: 400,
      ellipsis: true,
    },
    {
      title: '镜像地址',
      dataIndex: 'imageAddress',
      width: 300,
      ellipsis: true,
    },
    {
      title: '大小',
      dataIndex: 'size',
      width: 120,
    },
    {
      title: 'Python版本',
      dataIndex: 'pythonVersion',
      width: 120,
    },
    {
      title: 'CUDA版本',
      dataIndex: 'cudaVersion',
      width: 120,
    },
    {
      title: '版本描述',
      dataIndex: 'description',
      ellipsis: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 180,
      valueType: 'dateTime',
    },
  ];

  if (loading) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <div>加载中...</div>
        </div>
      </PageContainer>
    );
  }

  if (!imageDetail) {
    return (
      <PageContainer>
        <div>未找到镜像信息</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* 返回链接 */}
      <div style={{ marginBottom: 16 }}>
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => history.push('/image')}
        >
          返回 {imageDetail.name}
        </Button>
      </div>

      {/* 标题和基本信息 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          {/* 大图标 */}
          <div style={{
            width: 80,
            height: 80,
            borderRadius: 12,
            background: '#1890ff',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: 36,
            marginRight: 24,
            flexShrink: 0,
          }}>
            {imageDetail.icon || imageDetail.name.charAt(0).toUpperCase()}
          </div>

          {/* 标题和信息区域 */}
          <div style={{ flex: 1 }}>
            {/* 标题 */}
            <Title level={2} style={{ margin: 0, marginBottom: 16 }}>
              {imageDetail.name}
            </Title>

            {/* 信息行 */}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <Text code>{imageDetail.imageId}</Text>

              <Space wrap>
                {imageDetail.frameworks?.map((framework) => (
                  <Tag key={framework} color="blue">{framework}</Tag>
                ))}
              </Space>

              <Tag color={imageDetail.chipType === 'GPU' ? 'green' : imageDetail.chipType === 'CPU' ? 'green' : 'purple'}>
                {imageDetail.chipType}
              </Tag>

              {imageDetail.presetCuda && (
                <Tag color="green">预置CUDA</Tag>
              )}

              <Text type="secondary" style={{ fontSize: 12 }}>
                最后更新时间 {imageDetail.lastUpdateTime}
              </Text>
            </div>
          </div>
        </div>
      </div>

      {/* Tab切换 */}
      <div style={{ marginBottom: 24 }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'intro',
              label: '镜像简介',
            },
            {
              key: 'versions',
              label: '镜像版本',
            },
          ]}
        />
      </div>

      {/* 镜像简介Tab */}
      {activeTab === 'intro' && (
        <Card>
          {imageDetail.introduction && (
            <div style={{ marginBottom: 24 }}>
              <Paragraph style={{ whiteSpace: 'pre-wrap', fontSize: 16, lineHeight: 1.6 }}>
                {imageDetail.introduction}
              </Paragraph>
            </div>
          )}

          {/* 链接部分 */}
          {(imageDetail.paperUrl || imageDetail.codeUrl) && (
            <div style={{ marginBottom: 24 }}>
              <Space direction="vertical" size="middle">
                {imageDetail.paperUrl && (
                  <div>
                    <Space>
                      <FileTextOutlined />
                      <Text strong>论文: </Text>
                      <Link href={imageDetail.paperUrl} target="_blank">
                        {imageDetail.paperUrl}
                      </Link>
                    </Space>
                  </div>
                )}
                {imageDetail.codeUrl && (
                  <div>
                    <Space>
                      <GithubOutlined />
                      <Text strong>代码: </Text>
                      <Link href={imageDetail.codeUrl} target="_blank">
                        {imageDetail.codeUrl}
                      </Link>
                    </Space>
                  </div>
                )}
              </Space>
            </div>
          )}

          {/* BibTeX引用 */}
          {imageDetail.license && (
            <div>
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">
                  如果您使用该数据集, 请查看并遵守发布方声明的开源协议 {imageDetail.license}
                </Text>
              </div>
              <Card
                size="small"
                style={{
                  background: '#f5f5f5',
                  border: '1px solid #d9d9d9',
                  fontFamily: 'monospace'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text strong>Text</Text>
                  <Button size="small" type="link">复制</Button>
                </div>
                <pre style={{ margin: 0, fontSize: 12, lineHeight: 1.4 }}>
                  {`@inproceedings{jones25fuse,
title={Beyond Sight: Finetuning Generalist Robot Policies with Heterogeneous Sensors via Language Grounding},
author={Joshua Jones and Oier Mees and Carmelo Sferrazza and Kyle Stachowicz and Pieter Abbeel and Sergey Levine},
booktitle = {Proceedings of the IEEE International Conference on Robotics and Automation (ICRA)},
year={2025},
address = {Atlanta, USA}
}`}
                </pre>
              </Card>
            </div>
          )}
        </Card>
      )}

      {/* 镜像版本Tab */}
      {activeTab === 'versions' && (
        <Card>
          {/* 搜索栏和操作按钮 */}
          <div style={{ marginBottom: 16 }}>
            <Row gutter={16} align="middle">
              <Col>
                <Select defaultValue="名称" style={{ width: 100 }}>
                  <Option value="name">名称</Option>
                </Select>
              </Col>
              <Col flex="auto">
                <Input
                  placeholder="请输入关键字搜索"
                  suffix={<SearchOutlined />}
                />
              </Col>
              <Col>
                <Button icon={<ReloadOutlined />} />
              </Col>
              <Col>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setVersionModalVisible(true)}
                >
                  新建版本
                </Button>
              </Col>
            </Row>
          </div>

          {/* 版本列表表格 */}
          <ProTable<ImageVersion>
            rowKey="version"
            columns={versionColumns}
            dataSource={versions}
            loading={versionLoading}
            search={false}
            pagination={{
              defaultPageSize: 10,
              showSizeChanger: true,
            }}
            options={{
              reload: () => fetchImageVersions(),
            }}
          />
        </Card>
      )}

      {/* 新建版本模态框 */}
      <Modal
        title="新建版本"
        open={versionModalVisible}
        onCancel={() => {
          setVersionModalVisible(false);
          versionForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={versionForm}
          layout="vertical"
          onFinish={handleCreateVersion}
        >
          <Form.Item
            name="version"
            label="版本号"
            rules={[{ required: true, message: '请输入版本号' }]}
          >
            <Input placeholder="例如：v1.0.0" />
          </Form.Item>

          {/* 显示所属镜像的地址信息 */}
          <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
            <Text strong style={{ color: '#666' }}>所属镜像地址：</Text>
            <Text code style={{ marginLeft: 8 }}>
              {imageDetail?.imageAddress || '暂无镜像地址'}
            </Text>
          </div>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="size"
                label="大小"
                rules={[{ required: true, message: '请输入镜像大小' }]}
              >
                <Input placeholder="例如：2.5GB" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="pythonVersion"
                label="Python版本"
                rules={[{ required: true, message: '请输入Python版本' }]}
              >
                <Input placeholder="例如：3.9.0" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="cudaVersion"
                label="CUDA版本"
              >
                <Input placeholder="例如：11.8" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="createTime"
                label="创建时间"
                rules={[{ required: true, message: '请输入创建时间' }]}
              >
                <Input placeholder="例如：2025-01-15T10:30:00Z" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="版本描述"
            rules={[{ required: true, message: '请输入版本描述' }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="请输入版本描述信息"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setVersionModalVisible(false);
                versionForm.resetFields();
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                创建版本
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default ImageDetail;