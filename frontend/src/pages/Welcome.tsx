import {
  RocketOutlined,
  ThunderboltOutlined,
  FileDoneOutlined,
  DatabaseOutlined,
  AppstoreOutlined,
  CloudOutlined,
  ClusterOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Button, Card, Col, Row, Space, Statistic, theme, Spin } from 'antd';
import React, { useState, useEffect } from 'react';
import { request } from '@umijs/max';

const Welcome: React.FC = () => {
  const { token } = theme.useToken();
  const [statistics, setStatistics] = useState({
    serviceCount: 0,
    jobCount: 0,
    datasetCount: 0,
    modelCount: 0,
  });
  const [resourceStatistics, setResourceStatistics] = useState({
    totalAccelerators: 0,
    allocatedAccelerators: 0,
    totalCpuCores: 0,
    allocatedCpuCores: 0,
    totalMemoryGi: 0,
    allocatedMemoryGi: 0,
    runningJobs: 0,
  });
  const [loading, setLoading] = useState(false);
  const [resourceLoading, setResourceLoading] = useState(false);

  // 获取平台统计数据
  useEffect(() => {
    const fetchStatistics = async () => {
      setLoading(true);
      try {
        // 并行获取所有统计数据
        const [servicesRes, jobsRes, datasetsRes, modelsRes] = await Promise.allSettled([
          // 获取服务数量（使用较大的pageSize确保获取到totalCount，但实际只需要总数）
          request('/api/services', {
            method: 'GET',
            params: {
              pageNumber: 1,
              pageSize: 1000, // 使用较大的pageSize，但主要依赖totalCount
            },
          }),
          // 获取训练任务数量（POST请求，使用配置中的默认资源池ID）
          request('/api/jobs', {
            method: 'POST',
            data: {}, // 空body，使用默认配置的resourcePoolId和queueId
            params: {}, // 不传resourcePoolId，后端会使用配置文件中的默认值
          }),
          // 获取数据集数量（分别获取BOS和PFS，然后合并）
          Promise.all([
            request('/api/datasets', {
              method: 'GET',
              params: {
                pageNumber: 1,
                pageSize: 1,
                storageType: 'BOS',
              },
            }),
            request('/api/datasets', {
              method: 'GET',
              params: {
                pageNumber: 1,
                pageSize: 1,
                storageType: 'PFS',
              },
            }),
          ]).then(([bosRes, pfsRes]) => {
            // 合并BOS和PFS的数据集数量
            const bosTotal = bosRes?.success ? (bosRes.data?.totalCount || bosRes.data?.total || (Array.isArray(bosRes.data?.datasets) ? bosRes.data.datasets.length : 0) || 0) : 0;
            const pfsTotal = pfsRes?.success ? (pfsRes.data?.totalCount || pfsRes.data?.total || (Array.isArray(pfsRes.data?.datasets) ? pfsRes.data.datasets.length : 0) || 0) : 0;
            return {
              success: true,
              data: {
                totalCount: bosTotal + pfsTotal,
                total: bosTotal + pfsTotal,
              },
            };
          }),
          // 获取模型数量
          request('/api/models', {
            method: 'GET',
            params: {
              pageNumber: 1,
              pageSize: 1,
            },
          }),
        ]);

        // 处理服务数量
        if (servicesRes.status === 'fulfilled' && servicesRes.value?.success) {
          const data = servicesRes.value.data;
          let serviceTotal = 0;
          // 按照部署页面的逻辑处理数据格式
          if (Array.isArray(data)) {
            serviceTotal = data.length;
          } else if (data?.services && Array.isArray(data.services)) {
            // 优先使用totalCount或total，否则使用数组长度
            serviceTotal = data.totalCount || data.total || data.services.length;
          } else if (data?.result && Array.isArray(data.result)) {
            serviceTotal = data.totalCount || data.total || data.result.length;
          } else if (data?.data && Array.isArray(data.data)) {
            serviceTotal = data.totalCount || data.total || data.data.length;
          } else if (data?.totalCount !== undefined) {
            serviceTotal = data.totalCount;
          } else if (data?.total !== undefined) {
            serviceTotal = data.total;
          }
          setStatistics((prev) => ({ ...prev, serviceCount: serviceTotal }));
        } else if (servicesRes.status === 'rejected') {
          console.error('获取服务数量失败:', servicesRes.reason);
        }

        // 处理训练任务数量
        if (jobsRes.status === 'fulfilled' && jobsRes.value?.success) {
          const data = jobsRes.value.data;
          let jobTotal = 0;
          if (Array.isArray(data)) {
            jobTotal = data.length;
          } else if (data?.totalCount !== undefined) {
            jobTotal = data.totalCount;
          } else if (data?.total !== undefined) {
            jobTotal = data.total;
          } else if (Array.isArray(data?.jobs)) {
            jobTotal = data.jobs.length;
          } else if (Array.isArray(data?.data)) {
            jobTotal = data.data.length;
          }
          setStatistics((prev) => ({ ...prev, jobCount: jobTotal }));
        }

        // 处理数据集数量
        if (datasetsRes.status === 'fulfilled' && datasetsRes.value?.success) {
          const datasetTotal = datasetsRes.value.data?.totalCount || datasetsRes.value.data?.total || 0;
          setStatistics((prev) => ({ ...prev, datasetCount: datasetTotal }));
        }

        // 处理模型数量
        if (modelsRes.status === 'fulfilled' && modelsRes.value?.success) {
          const data = modelsRes.value.data;
          let modelTotal = 0;
          if (Array.isArray(data)) {
            modelTotal = data.length;
          } else if (data?.totalCount !== undefined) {
            modelTotal = data.totalCount;
          } else if (data?.total !== undefined) {
            modelTotal = data.total;
          } else if (Array.isArray(data?.models)) {
            modelTotal = data.models.length;
          } else if (Array.isArray(data?.data)) {
            modelTotal = data.data.length;
          }
          setStatistics((prev) => ({ ...prev, modelCount: modelTotal }));
        }
      } catch (error) {
        console.error('获取统计数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
    fetchResourceStatistics();
  }, []);

  // 获取计算资源统计数据
  const fetchResourceStatistics = async () => {
    setResourceLoading(true);
    try {
      // 先获取配置的队列ID
      const configRes = await request('/api/config/ML_PLATFORM_RESOURCE_QUEUE_ID', {
        method: 'GET',
      });

      if (!configRes?.success || !configRes?.data?.value) {
        console.log('未配置队列ID，跳过计算资源统计');
        setResourceLoading(false);
        return;
      }

      const configQueueId = configRes.data.value;

      // 获取队列详情
      const queueRes = await request(`/api/resources/queues/${configQueueId}`, {
        method: 'GET',
      });

      if (queueRes?.success) {
        const data = queueRes.data;
        const queue = data?.queue || data || null;

        // 仅使用children[0]的信息做统计
        let actualQueue = null;
        if (
          queue?.children &&
          Array.isArray(queue.children) &&
          queue.children.length > 0
        ) {
          actualQueue = queue.children[0];
        } else {
          actualQueue = queue || null;
        }

        if (actualQueue) {
          // 计算加速卡统计
          const calculateAccelerators = (cardList: any[]) => {
            if (!cardList || cardList.length === 0) return 0;
            return cardList.reduce((sum, card) => sum + parseFloat(card.acceleratorCount || '0'), 0);
          };

          const parseCpu = (cpu: string | number | undefined) => {
            if (!cpu) return 0;
            return typeof cpu === 'string' ? parseFloat(cpu) : cpu;
          };

          const parseMemory = (memory: string | number | undefined) => {
            if (!memory) return 0;
            if (typeof memory === 'string') {
              const num = parseFloat(memory);
              if (num > 1000000) {
                return num / (1024 * 1024 * 1024);
              }
              return num;
            }
            return memory;
          };

          let totalAccelerators = 0;
          let allocatedAccelerators = 0;
          let totalCpuCores = 0;
          let allocatedCpuCores = 0;
          let totalMemoryGi = 0;
          let allocatedMemoryGi = 0;
          const runningJobs = actualQueue.runningJobs || 0;

          // 计算资源统计
          if (actualQueue.deserved) {
            if (actualQueue.deserved.acceleratorCardList) {
              totalAccelerators = calculateAccelerators(actualQueue.deserved.acceleratorCardList);
            }
            if (actualQueue.deserved.cpuCores !== undefined) {
              totalCpuCores = parseCpu(actualQueue.deserved.cpuCores);
            } else if (actualQueue.deserved.milliCPUcores !== undefined) {
              totalCpuCores = parseCpu(actualQueue.deserved.milliCPUcores) / 1000;
            }
            if (actualQueue.deserved.memoryGi !== undefined) {
              totalMemoryGi = parseMemory(actualQueue.deserved.memoryGi);
            }
          }

          if (actualQueue.allocated) {
            if (actualQueue.allocated.acceleratorCardList && actualQueue.allocated.acceleratorCardList.length > 0) {
              allocatedAccelerators = calculateAccelerators(actualQueue.allocated.acceleratorCardList);
            }
            if (actualQueue.allocated.cpuCores !== undefined) {
              allocatedCpuCores = parseCpu(actualQueue.allocated.cpuCores);
            } else if (actualQueue.allocated.milliCPUcores !== undefined) {
              allocatedCpuCores = parseCpu(actualQueue.allocated.milliCPUcores) / 1000;
            }
            if (actualQueue.allocated.memoryGi !== undefined) {
              allocatedMemoryGi = parseMemory(actualQueue.allocated.memoryGi);
            }
          }

          setResourceStatistics({
            totalAccelerators,
            allocatedAccelerators,
            totalCpuCores,
            allocatedCpuCores,
            totalMemoryGi,
            allocatedMemoryGi,
            runningJobs,
          });
        }
      }
    } catch (error) {
      console.error('获取计算资源统计失败:', error);
    } finally {
      setResourceLoading(false);
    }
  };

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
      path: '/image',
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

      <Col xs={24} sm={12}>
          <ProCard title="平台统计" style={{ height: '100%' }}>
            <Spin spinning={loading}>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="服务数量"
                    value={statistics.serviceCount}
                    valueStyle={{ color: '#1890ff' }}
                    prefix={<RocketOutlined />}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="训练任务"
                    value={statistics.jobCount}
                    valueStyle={{ color: '#eb2f96' }}
                    prefix={<ThunderboltOutlined />}
                  />
                </Col>
                <Col span={12} style={{ marginTop: 16 }}>
                  <Statistic
                    title="数据集"
                    value={statistics.datasetCount}
                    valueStyle={{ color: '#f5222d' }}
                    prefix={<DatabaseOutlined />}
                  />
                </Col>
                <Col span={12} style={{ marginTop: 16 }}>
                  <Statistic
                    title="模型"
                    value={statistics.modelCount}
                    valueStyle={{ color: '#faad14' }}
                    prefix={<AppstoreOutlined />}
                  />
                </Col>
              </Row>
            </Spin>
          </ProCard>
        </Col>

        <Col xs={24} sm={12}>
          <ProCard
            title="计算资源"
            style={{ height: '100%' }}
            extra={
              <Button
                type="link"
                onClick={() => history.push('/resource/queue')}
                icon={<ClusterOutlined />}
              >
                查看详情
              </Button>
            }
          >
            <Spin spinning={resourceLoading}>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="加速卡总量"
                    value={resourceStatistics.totalAccelerators.toFixed(1)}
                    suffix="张"
                    valueStyle={{ color: '#722ed1' }}
                    prefix={<ClusterOutlined />}
                  />
                  <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: 4, minHeight: '18px' }}>
                    {resourceStatistics.totalAccelerators > 0
                      ? `已分配: ${resourceStatistics.allocatedAccelerators.toFixed(1)} 张`
                      : '\u00A0'}
                  </div>
                </Col>
                <Col span={12}>
                  <Statistic
                    title="CPU总量"
                    value={resourceStatistics.totalCpuCores.toFixed(1)}
                    suffix="核"
                    valueStyle={{ color: '#13c2c2' }}
                  />
                  <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: 4, minHeight: '18px' }}>
                    {resourceStatistics.totalCpuCores > 0
                      ? `已分配: ${resourceStatistics.allocatedCpuCores.toFixed(1)} 核`
                      : '\u00A0'}
                  </div>
                </Col>
                <Col span={12} style={{ marginTop: 16 }}>
                  <Statistic
                    title="内存总量"
                    value={resourceStatistics.totalMemoryGi.toFixed(1)}
                    suffix="GB"
                    valueStyle={{ color: '#52c41a' }}
                  />
                  <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: 4, minHeight: '18px' }}>
                    {resourceStatistics.totalMemoryGi > 0
                      ? `已分配: ${resourceStatistics.allocatedMemoryGi.toFixed(1)} GB`
                      : '\u00A0'}
                  </div>
                </Col>
                <Col span={12} style={{ marginTop: 16 }}>
                  <Statistic
                    title="运行中任务"
                    value={resourceStatistics.runningJobs}
                    valueStyle={{ color: '#fa8c16' }}
                    prefix={<ThunderboltOutlined />}
                  />
                  <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: 4, minHeight: '18px' }}>
                    {'\u00A0'}
                  </div>
                </Col>
              </Row>
            </Spin>
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
