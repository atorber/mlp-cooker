import {
  BugOutlined,
  CalendarOutlined,
  PlayCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProCard,
  ProForm,
  ProFormTextArea,
  ProTable,
} from '@ant-design/pro-components';
import {
  Alert,
  App,
  Button,
  Col,
  Descriptions,
  Row,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import React, { useState } from 'react';
import type { ApiResponse, IcafeDebugParams } from '@/services/aihc-mentor/api';
import { debugIcafe } from '@/services/aihc-mentor/api';

const { Title, Text } = Typography;

// 定义卡片数据类型
interface IcafeCard {
  id: string;
  title: string;
  status: string;
  type: {
    localId: number;
    name: string;
  };
  createdTime: string;
  createdUser: {
    email: string;
    id: number;
    name: string;
    username: string;
  };
  responsiblePeople: Array<{
    email: string;
    id: number;
    name: string;
    username: string;
  }>;
  properties: Array<{
    displayValue: string;
    fieldType: string;
    localId: number;
    propertyName: string;
    value: string;
  }>;
  lastModifiedTime?: string;
  resolveTime?: string;
  spaceName?: string;
}

const IcafeDebug: React.FC = () => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [cards, setCards] = useState<IcafeCard[]>([]);

  const handleDebug = async (values: IcafeDebugParams) => {
    setLoading(true);
    try {
      const response = await debugIcafe(values);
      setResult(response);

      if (response.success && response.data) {
        // 解析卡片数据
        const cardData = response.data.cards as IcafeCard[];
        setCards(cardData);
        const count = Array.isArray(cardData) ? cardData.length : 0;
        message.success(`iCafe调试执行成功！找到 ${count} 条记录`);
      } else {
        setCards([]);
        message.error(response.message || '调试执行失败');
      }
    } catch (error) {
      message.error('调试过程中发生错误');
      console.error('调试错误:', error);
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  // 获取卡片属性值的辅助函数
  const getPropertyValue = (card: IcafeCard, propertyName: string): string => {
    const property = card.properties.find(
      (p) => p.propertyName === propertyName,
    );
    return property?.displayValue || '';
  };

  // 获取状态标签颜色
  const getStatusColor = (status: string): string => {
    const statusColors: { [key: string]: string } = {
      已完成: 'success',
      处理中: 'processing',
      新建: 'default',
      转其他产品已排期: 'warning',
      产品修复待排期: 'error',
      评估中: 'blue',
    };
    return statusColors[status] || 'default';
  };

  const exampleQueries = [
    {
      title: '查询所有问题',
      query: '类型 = 客户问题',
    },
    {
      title: '查询本周新建卡片',
      query: '创建时间 > 2025-09-10',
    },
    {
      title: '查询特定状态卡片',
      query: '状态 = 处理中 AND 类型 = 客户需求',
    },
    {
      title: '查询产品方向统计',
      query: '产品方向 in (资源池,开发机)',
    },
  ];

  return (
    <PageContainer
      title="iCafe调试"
      subTitle="强大的API调试和测试功能，支持IQL查询语言"
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <ProCard>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <BugOutlined
                style={{
                  fontSize: '48px',
                  color: '#eb2f96',
                  marginBottom: '16px',
                }}
              />
              <Title level={3}>IQL查询调试</Title>
              <Text type="secondary">
                使用IQL（iCafe Query Language）查询语言进行数据调试和测试
              </Text>
            </div>

            <ProForm<IcafeDebugParams>
              onFinish={handleDebug}
              submitter={{
                render: (props, _doms) => {
                  return (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '16px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <Button
                        onClick={() => {
                          props.form?.resetFields();
                          setResult(null);
                          setCards([]);
                        }}
                        size="large"
                        style={{ minWidth: '120px' }}
                      >
                        重置
                      </Button>
                      <Button
                        type="primary"
                        loading={loading}
                        icon={<PlayCircleOutlined />}
                        onClick={() => props.form?.submit()}
                        size="large"
                        style={{ minWidth: '140px' }}
                      >
                        {loading ? '调试中...' : '执行查询'}
                      </Button>
                    </div>
                  );
                },
                submitButtonProps: false, // 禁用默认提交按钮
                resetButtonProps: false, // 禁用默认重置按钮
              }}
            >
              <ProFormTextArea
                name="iql"
                label="IQL查询语句"
                placeholder="请输入IQL查询语句，例如：类型 = 客户问题 AND 创建时间 > 2025-09-01"
                rules={[
                  { required: true, message: '请输入IQL查询语句' },
                  { min: 5, message: '查询语句至少需要5个字符' },
                ]}
                fieldProps={{
                  rows: 6,
                  showCount: true,
                  maxLength: 1000,
                }}
              />
            </ProForm>
          </ProCard>
        </Col>

        <Col xs={24} lg={8}>
          <ProCard title="查询示例" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              {exampleQueries.map((example) => (
                <div
                  key={example.title}
                  style={{
                    padding: '12px',
                    background: '#f5f5f5',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  <Text strong>{example.title}</Text>
                  <br />
                  <Text code style={{ fontSize: '12px' }}>
                    {example.query}
                  </Text>
                </div>
              ))}
            </Space>
          </ProCard>

          <ProCard
            title="IQL语法说明"
            size="small"
            style={{ marginTop: '16px' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>🔍 基本查询：</Text>
                <Text type="secondary">字段名 = 值</Text>
              </div>
              <div>
                <Text strong>🔗 逻辑运算：</Text>
                <Text type="secondary">AND, OR, NOT</Text>
              </div>
              <div>
                <Text strong>📅 时间范围：</Text>
                <Text type="secondary">创建时间 {'>'} 2025-09-01</Text>
              </div>
              <div>
                <Text strong>📋 列表查询：</Text>
                <Text type="secondary">类型 in (值1,值2)</Text>
              </div>
            </Space>
          </ProCard>
        </Col>
      </Row>

      {result && (
        <div style={{ marginTop: '24px' }}>
          {/* 统计信息卡片 */}
          <ProCard
            title="调试统计"
            size="small"
            style={{ marginBottom: '24px' }}
            bodyStyle={{ padding: '16px 24px' }}
          >
            <Alert
              message={result.success ? '查询执行成功' : '查询执行失败'}
              type={result.success ? 'success' : 'error'}
              showIcon
              style={{ marginBottom: '16px' }}
            />
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="执行消息" span={2}>
                {result.message}
              </Descriptions.Item>
              {cards.length > 0 && (
                <Descriptions.Item label="查询结果数量">
                  <Text strong style={{ color: '#1890ff' }}>
                    {cards.length} 条记录
                  </Text>
                </Descriptions.Item>
              )}
              {result.cardCount && (
                <Descriptions.Item label="总记录数">
                  <Text type="secondary">{result.cardCount} 条</Text>
                </Descriptions.Item>
              )}
            </Descriptions>
          </ProCard>

          {/* 查询结果列表 */}
          {result.success && cards.length > 0 && (
            <ProCard
              title={`查询结果 (${cards.length} 条记录)`}
              style={{ marginBottom: '24px' }}
              bodyStyle={{ padding: '0' }}
            >
              <ProTable<IcafeCard>
                dataSource={cards}
                rowKey="id"
                search={false}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) =>
                    `第 ${range[0]}-${range[1]} 条/总共 ${total} 条`,
                  style: { padding: '16px 24px' },
                }}
                columns={[
                  {
                    title: '卡片ID',
                    dataIndex: 'id',
                    width: 120,
                    render: (text) => (
                      <Text code style={{ fontSize: '12px' }}>
                        {text}
                      </Text>
                    ),
                  },
                  {
                    title: '标题',
                    dataIndex: 'title',
                    ellipsis: true,
                    render: (text, _record) => (
                      <Tooltip title={text}>
                        <Text strong style={{ fontSize: '14px' }}>
                          {text}
                        </Text>
                      </Tooltip>
                    ),
                  },
                  {
                    title: '类型',
                    dataIndex: ['type', 'name'],
                    width: 100,
                    render: (text) => <Tag color="blue">{text}</Tag>,
                  },
                  {
                    title: '状态',
                    dataIndex: 'status',
                    width: 120,
                    render: (text) => (
                      <Tag color={getStatusColor(text as string)}>{text}</Tag>
                    ),
                  },
                  {
                    title: '产品方向',
                    dataIndex: 'properties',
                    width: 120,
                    render: (_, record) => {
                      const productDirection = getPropertyValue(
                        record,
                        '产品方向',
                      );
                      return productDirection ? (
                        <Tag color="green">{productDirection}</Tag>
                      ) : (
                        '-'
                      );
                    },
                  },
                  {
                    title: '客户名称',
                    dataIndex: 'properties',
                    width: 120,
                    render: (_, record) => {
                      const customerName = getPropertyValue(record, '客户名称');
                      return customerName || '-';
                    },
                  },
                  {
                    title: '创建人',
                    dataIndex: 'createdUser',
                    width: 100,
                    render: (user) => (
                      <Tooltip title={(user as any).email}>
                        <Space>
                          <UserOutlined />
                          {(user as any).name}
                        </Space>
                      </Tooltip>
                    ),
                  },
                  {
                    title: '负责人',
                    dataIndex: 'responsiblePeople',
                    width: 100,
                    render: (people) => (
                      <Space direction="vertical" size="small">
                        {(people as any).slice(0, 2).map((person: any) => (
                          <Tooltip
                            key={person.email || person.name}
                            title={person.email}
                          >
                            <Space>
                              <UserOutlined />
                              {person.name}
                            </Space>
                          </Tooltip>
                        ))}
                        {(people as any).length > 2 && (
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            +{(people as any).length - 2} 人
                          </Text>
                        )}
                      </Space>
                    ),
                  },
                  {
                    title: '创建时间',
                    dataIndex: 'createdTime',
                    width: 120,
                    render: (text) => (
                      <Space>
                        <CalendarOutlined />
                        <Text style={{ fontSize: '12px' }}>{text}</Text>
                      </Space>
                    ),
                  },
                  {
                    title: '最后修改',
                    dataIndex: 'lastModifiedTime',
                    width: 120,
                    render: (text) =>
                      text ? (
                        <Space>
                          <CalendarOutlined />
                          <Text style={{ fontSize: '12px' }}>{text}</Text>
                        </Space>
                      ) : (
                        '-'
                      ),
                  },
                ]}
                scroll={{ x: 1200 }}
              />
            </ProCard>
          )}

          {/* 原始数据 */}
          {result.success && result.content && (
            <ProCard
              title="原始数据"
              size="small"
              style={{ marginBottom: '16px' }}
              bodyStyle={{ padding: '16px 24px' }}
            >
              <div
                style={{
                  maxHeight: '400px',
                  overflow: 'auto',
                  background: '#f5f5f5',
                  padding: '16px',
                  borderRadius: '6px',
                  border: '1px solid #d9d9d9',
                }}
              >
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    fontSize: '12px',
                    margin: 0,
                    lineHeight: '1.5',
                  }}
                >
                  {result.content}
                </pre>
              </div>
            </ProCard>
          )}
        </div>
      )}
    </PageContainer>
  );
};

export default IcafeDebug;
