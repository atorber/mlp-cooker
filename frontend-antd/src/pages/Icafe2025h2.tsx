import {
  DownloadOutlined,
  FileTextOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import {
  Alert,
  App,
  Button,
  Col,
  Descriptions,
  Row,
  Statistic,
  Typography,
} from 'antd';
import React, { useState } from 'react';
import type { ApiResponse } from '@/services/aihc-mentor/api';
import { getIcafe2025h2 } from '@/services/aihc-mentor/api';

const { Title, Text } = Typography;

const Icafe2025h2: React.FC = () => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await getIcafe2025h2();
      setResult(response);
      if (response.success) {
        message.success('2025H2需求统计报告生成成功！');
      } else {
        message.error(response.message || '生成报告失败');
      }
    } catch (error) {
      message.error('生成过程中发生错误');
      console.error('生成错误:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      title="2025H2需求统计"
      subTitle="统计和分析2025年下半年需求数据，生成详细的需求报告"
    >
      <ProCard>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <LineChartOutlined
            style={{ fontSize: '48px', color: '#13c2c2', marginBottom: '16px' }}
          />
          <Title level={3}>需求数据分析</Title>
          <Text type="secondary">
            自动统计2025年下半年的客户需求数据，包括需求类型、状态分布、产品方向等详细信息
          </Text>
        </div>

        <div
          style={{
            textAlign: 'center',
            marginBottom: '32px',
            display: 'flex',
            justifyContent: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <Button
            onClick={() => setResult(null)}
            size="large"
            style={{ minWidth: '120px' }}
          >
            重置
          </Button>
          <Button
            type="primary"
            size="large"
            icon={<LineChartOutlined />}
            loading={loading}
            onClick={handleGenerate}
            style={{ minWidth: '160px' }}
          >
            {loading ? '生成中...' : '生成需求统计'}
          </Button>
        </div>

        {result && (
          <ProCard title="统计结果" style={{ marginTop: '24px' }}>
            <Alert
              message={result.success ? '报告生成成功' : '报告生成失败'}
              type={result.success ? 'success' : 'error'}
              showIcon
              style={{ marginBottom: '16px' }}
            />

            {result.success && (
              <>
                <Row gutter={16} style={{ marginBottom: '24px' }}>
                  <Col span={8}>
                    <Statistic
                      title="需求总数"
                      value={result.cardCount || 0}
                      prefix={<FileTextOutlined />}
                      valueStyle={{ color: '#3f8600' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="报告状态"
                      value={result.success ? '已完成' : '失败'}
                      valueStyle={{
                        color: result.success ? '#3f8600' : '#cf1322',
                      }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="文件路径"
                      value={result.filepath ? '已保存' : '未保存'}
                      valueStyle={{
                        color: result.filepath ? '#3f8600' : '#faad14',
                      }}
                    />
                  </Col>
                </Row>

                {result.filepath && (
                  <Alert
                    message="报告已保存"
                    description={`文件路径: ${result.filepath}`}
                    type="info"
                    icon={<DownloadOutlined />}
                    style={{ marginBottom: '16px' }}
                  />
                )}

                {result.content && (
                  <ProCard title="报告内容预览" size="small">
                    <div
                      style={{
                        maxHeight: '400px',
                        overflow: 'auto',
                        background: '#f5f5f5',
                        padding: '16px',
                        borderRadius: '4px',
                      }}
                    >
                      <pre
                        style={{
                          whiteSpace: 'pre-wrap',
                          fontSize: '12px',
                          margin: 0,
                        }}
                      >
                        {result.content}
                      </pre>
                    </div>
                  </ProCard>
                )}
              </>
            )}

            <Descriptions bordered column={1}>
              <Descriptions.Item label="状态">
                <Text type={result.success ? 'success' : 'danger'}>
                  {result.success ? '✅ 成功' : '❌ 失败'}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="消息">
                {result.message}
              </Descriptions.Item>
              {result.details && (
                <Descriptions.Item label="详细信息">
                  <pre
                    style={{
                      background: '#f5f5f5',
                      padding: '12px',
                      borderRadius: '4px',
                      whiteSpace: 'pre-wrap',
                      fontSize: '12px',
                    }}
                  >
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </Descriptions.Item>
              )}
            </Descriptions>
          </ProCard>
        )}
      </ProCard>
    </PageContainer>
  );
};

export default Icafe2025h2;
