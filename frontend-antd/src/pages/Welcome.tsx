import {
  RocketOutlined,
  ThunderboltOutlined,
  FileDoneOutlined,
  DatabaseOutlined,
  AppstoreOutlined,
  CloudOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Button, Card, Col, Row, Space, Statistic, theme } from 'antd';
import React from 'react';

const Welcome: React.FC = () => {
  const { token } = theme.useToken();

  const features = [
    {
      title: '部署',
      description: '管理在线服务，支持创建、查看和管理',
      icon: <RocketOutlined style={{ fontSize: '24px', color: '#1890ff' }} />,
      path: '/deployment',
    },
    {
      title: '训练',
      description: '管理训练任务，支持创建、查看、停止和删除',
      icon: <ThunderboltOutlined style={{ fontSize: '24px', color: '#eb2f96' }} />,
      path: '/training',
    },
    {
      title: '任务',
      description: '查看和管理各种任务',
      icon: <FileDoneOutlined style={{ fontSize: '24px', color: '#13c2c2' }} />,
      path: '/task',
    },
    {
      title: '数据集',
      description: '管理数据集，支持创建、查看和管理',
      icon: <DatabaseOutlined style={{ fontSize: '24px', color: '#f5222d' }} />,
      path: '/dataset',
    },
    {
      title: '模型',
      description: '管理模型，支持创建、查看和管理',
      icon: <AppstoreOutlined style={{ fontSize: '24px', color: '#faad14' }} />,
      path: '/model',
    },
    {
      title: '镜像',
      description: '管理预设镜像，支持查看和管理',
      icon: <CloudOutlined style={{ fontSize: '24px', color: '#52c41a' }} />,
      path: '/preset-image',
    },
  ];

  const quickActions = [
    {
      label: '创建服务',
      path: '/deployment',
      icon: <RocketOutlined />,
    },
    {
      label: '创建训练任务',
      path: '/training',
      icon: <ThunderboltOutlined />,
    },
    {
      label: '创建数据集',
      path: '/dataset',
      icon: <DatabaseOutlined />,
    },
    {
      label: '创建模型',
      path: '/model',
      icon: <AppstoreOutlined />,
    },
  ];

  return (
    <PageContainer
      title="机器学习平台"
      subTitle="一站式机器学习平台资源管理，提升工作效率"
    >
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <ProCard>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h1
                style={{
                  fontSize: '28px',
                  marginBottom: '16px',
                  color: token.colorTextHeading,
                }}
              >
                欢迎使用机器学习平台
              </h1>
              <p
                style={{
                  fontSize: '16px',
                  color: token.colorTextSecondary,
                  marginBottom: '32px',
                }}
              >
                基于百度百舸平台构建的企业级机器学习资源管理平台，提供完整的AI模型训练、部署和管理功能
              </p>
            </div>
          </ProCard>
        </Col>

        <Col span={24}>
          <ProCard title="功能模块" extra={<Button type="link">查看全部</Button>}>
            <Row gutter={[16, 16]}>
              {features.map((feature) => (
                <Col xs={24} sm={12} md={8} lg={6} key={feature.path}>
                  <Card
                    hoverable
                    style={{ height: '100%' }}
                    styles={{ body: { padding: '20px' } }}
                    onClick={() => history.push(feature.path)}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ marginBottom: '12px' }}>{feature.icon}</div>
                      <h3 style={{ marginBottom: '8px', fontSize: '16px' }}>
                        {feature.title}
                      </h3>
                      <p
                        style={{
                          color: token.colorTextSecondary,
                          fontSize: '14px',
                        }}
                      >
                        {feature.description}
                      </p>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </ProCard>
        </Col>

        <Col xs={24} sm={12}>
          <ProCard title="平台统计">
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="服务数量"
                  value={0}
                  valueStyle={{ color: '#1890ff' }}
                  prefix={<RocketOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="训练任务"
                  value={0}
                  valueStyle={{ color: '#eb2f96' }}
                  prefix={<ThunderboltOutlined />}
                />
              </Col>
              <Col span={12} style={{ marginTop: 16 }}>
                <Statistic
                  title="数据集"
                  value={0}
                  valueStyle={{ color: '#f5222d' }}
                  prefix={<DatabaseOutlined />}
                />
              </Col>
              <Col span={12} style={{ marginTop: 16 }}>
                <Statistic
                  title="模型"
                  value={0}
                  valueStyle={{ color: '#faad14' }}
                  prefix={<AppstoreOutlined />}
                />
              </Col>
            </Row>
          </ProCard>
        </Col>

        <Col xs={24} sm={12}>
          <ProCard title="快速操作">
            <Space direction="vertical" style={{ width: '100%' }}>
              {quickActions.map((action) => (
                <Button
                  key={action.path}
                  type="default"
                  block
                  icon={action.icon}
                  onClick={() => history.push(action.path)}
                >
                  {action.label}
                </Button>
              ))}
            </Space>
          </ProCard>
        </Col>

        <Col span={24}>
          <ProCard title="平台说明">
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <h3 style={{ marginBottom: 8 }}>🔧 系统配置</h3>
                  <p style={{ color: token.colorTextSecondary, fontSize: '14px' }}>
                    在系统设置中配置机器学习平台资源参数，包括 AK/SK、资源池、队列等
                  </p>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <h3 style={{ marginBottom: 8 }}>🚀 服务部署</h3>
                  <p style={{ color: token.colorTextSecondary, fontSize: '14px' }}>
                    创建和管理在线服务，支持模型推理服务部署和管理
                  </p>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <h3 style={{ marginBottom: 8 }}>🎯 训练任务</h3>
                  <p style={{ color: token.colorTextSecondary, fontSize: '14px' }}>
                    提交和管理训练任务，支持任务监控、日志查看和停止操作
                  </p>
                </Card>
              </Col>
            </Row>
          </ProCard>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default Welcome;
