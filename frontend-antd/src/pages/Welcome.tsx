import {
  BarChartOutlined,
  BugOutlined,
  CalendarOutlined,
  EditOutlined,
  FileTextOutlined,
  KeyOutlined,
  LineChartOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Button, Card, Col, Row, Space, Statistic, theme } from 'antd';
import React from 'react';

const Welcome: React.FC = () => {
  const { token } = theme.useToken();

  const features = [
    {
      title: '上周问题统计',
      description: '统计和分析上周的客户问题数据',
      icon: <BarChartOutlined style={{ fontSize: '24px', color: '#1890ff' }} />,
      path: '/icafe-lastweek',
    },
        {
      title: 'iCafe调试',
      description: '强大的API调试和测试功能',
      icon: <BugOutlined style={{ fontSize: '24px', color: '#eb2f96' }} />,
      path: '/icafe-debug',
    },
        {
      title: '2025H2需求统计',
      description: '统计2025年下半年需求数据',
      icon: (
        <LineChartOutlined style={{ fontSize: '24px', color: '#13c2c2' }} />
      ),
      path: '/icafe-2025h2',
    },
    {
      title: '每日报告',
      description: '生成和管理每日工作报告',
      icon: <CalendarOutlined style={{ fontSize: '24px', color: '#f5222d' }} />,
      path: '/daily-report',
    },
    {
      title: '主查询',
      description: '执行各种数据查询和分析',
      icon: <SearchOutlined style={{ fontSize: '24px', color: '#faad14' }} />,
      path: '/main-query',
    },
  ];

  return (
    <PageContainer
      title="AIHC-MENTOR 智能助手"
      subTitle="一站式 AI 辅助开发工具平台，提升工作效率，简化复杂任务"
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
                欢迎使用 AIHC-MENTOR 智能助手
              </h1>
              <p
                style={{
                  fontSize: '16px',
                  color: token.colorTextSecondary,
                  marginBottom: '32px',
                }}
              >
                基于 Ant Design Pro
                构建的企业级中后台应用，提供完整的AI辅助开发工具集
              </p>
            </div>
          </ProCard>
        </Col>

        <Col span={24}>
          <ProCard
            title="功能概览"
            extra={<Button type="link">查看全部</Button>}
          >
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
          <ProCard title="系统统计">
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="总功能数"
                  value={8}
                  valueStyle={{ color: '#3f8600' }}
                  prefix="📊"
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="API接口"
                  value={8}
                  valueStyle={{ color: '#cf1322' }}
                  prefix="🔗"
                />
              </Col>
            </Row>
          </ProCard>
        </Col>

        <Col xs={24} sm={12}>
          <ProCard title="快速操作">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                type="primary"
                block
                icon={<BarChartOutlined />}
                onClick={() => history.push('/icafe-lastweek')}
              >
                生成问题统计报告
              </Button>
                          </Space>
          </ProCard>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default Welcome;
