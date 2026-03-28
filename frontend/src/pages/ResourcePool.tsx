import {
  CheckCircleFilled,
  CheckOutlined,
  CloudServerOutlined,
  ClusterOutlined,
  EyeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { request } from '@umijs/max';
import {
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { updateConfig } from '@/services/aihc-mentor/api';

const { Title, Text, Paragraph } = Typography;

interface ResourcePool {
  resourcePoolId?: string;
  name?: string;
  type?: string;
  description?: string;
  phase?: string;
  region?: string;
  createdAt?: string;
  updatedAt?: string;
  configuration?: {
    exposedPublic?: boolean;
    forbidDelete?: boolean;
    deschedulerEnabled?: boolean;
    unifiedSchedulerEnabled?: boolean;
    datasetPermissionEnabled?: boolean;
    volumePermissionEnabled?: boolean;
    imageNoAuthPullEnabled?: boolean;
    publicNetInferenceServiceEnable?: boolean;
  };
  associatedResources?: Array<{ provider?: string; id?: string }>;
  bindingStorages?: Array<{ provider?: string; id?: string }>;
  bindingMonitor?: Array<{ provider?: string; id?: string }>;
  network?: {
    mode?: string;
    master?: { vpcId?: string; vpcCidr?: string; region?: string };
    nodes?: { vpcId?: string; subnetIds?: string[]; region?: string };
    pods?: { vpcId?: string; subnetCidr?: string; region?: string };
    clusterIPCidr?: string;
  };
  [key: string]: any;
}

interface QueueItem {
  queueId?: string;
  queueName?: string;
  queueType?: string;
  parentQueue?: string;
  opened?: boolean;
  runningJobs?: number;
  deserved?: {
    cpuCores?: string;
    milliCPUcores?: string;
    memoryGi?: string;
    acceleratorCardList?: Array<{
      acceleratorCount: string;
      acceleratorType: string;
    }>;
  };
  createdAt?: string;
}

const phaseColorMap: Record<string, string> = {
  running: 'success',
  creating: 'processing',
  deleting: 'warning',
  error: 'error',
};

const phaseTextMap: Record<string, string> = {
  running: '运行中',
  creating: '创建中',
  deleting: '删除中',
  error: '异常',
};

const ResourcePoolPage: React.FC = () => {
  const { message: messageApi } = App.useApp();
  const [pools, setPools] = useState<ResourcePool[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedPool, setSelectedPool] = useState<ResourcePool | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [configPoolId, setConfigPoolId] = useState<string>('');

  useEffect(() => {
    request('/api/config/ML_PLATFORM_RESOURCE_POOL_ID', { method: 'GET' })
      .then((res) => {
        if (res?.success) {
          setConfigPoolId(res.data?.value || '');
        }
      })
      .catch(() => {});
  }, []);

  const fetchPools = useCallback(async () => {
    setLoading(true);
    try {
      const response = await request('/api/resources/pools', {
        method: 'GET',
        params: {
          resourcePoolType: 'dedicatedV2',
          pageSize: 100,
          pageNumber: 1,
        },
      });

      if (response.success) {
        let list: any[] = [];
        const data = response.data;

        if (Array.isArray(data)) {
          list = data;
        } else if (data?.resourcePools && Array.isArray(data.resourcePools)) {
          list = data.resourcePools;
        } else if (data?.data && Array.isArray(data.data)) {
          list = data.data;
        } else if (data?.result && Array.isArray(data.result)) {
          list = data.result;
        } else if (data?.items && Array.isArray(data.items)) {
          list = data.items;
        }

        setPools(list.filter((p: any) => p.resourcePoolId));
      } else {
        messageApi.error(response.message || '获取资源池列表失败');
        setPools([]);
      }
    } catch (error: any) {
      console.error('获取资源池列表失败:', error);
      messageApi.error(
        error?.info?.errorMessage || error?.message || '获取资源池列表失败',
      );
      setPools([]);
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  const fetchPoolDetail = async (poolId: string) => {
    setDetailLoading(true);
    try {
      const response = await request(`/api/resources/pools/${poolId}`, {
        method: 'GET',
      });
      if (response.success) {
        setSelectedPool(response.data || null);
      } else {
        messageApi.error(response.message || '获取资源池详情失败');
      }
    } catch (error: any) {
      console.error('获取资源池详情失败:', error);
      messageApi.error(
        error?.info?.errorMessage || error?.message || '获取资源池详情失败',
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const handleViewDetail = (record: ResourcePool) => {
    setDrawerVisible(true);
    if (record.resourcePoolId) {
      fetchPoolDetail(record.resourcePoolId);
      fetchQueueList(record.resourcePoolId);
    }
  };

  const [queueList, setQueueList] = useState<QueueItem[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);

  const fetchQueueList = async (resourcePoolId: string) => {
    setQueueLoading(true);
    try {
      const response = await request('/api/resources/queues', {
        method: 'GET',
        params: {
          resourcePoolId,
          pageSize: 1000,
          pageNumber: 1,
        },
      });

      if (response.success) {
        let queues: any[] = [];
        const data = response.data;

        if (Array.isArray(data)) {
          queues = data;
        } else if (data?.queues && Array.isArray(data.queues)) {
          queues = data.queues;
        } else if (data?.data && Array.isArray(data.data)) {
          queues = data.data;
        } else if (data?.result && Array.isArray(data.result)) {
          queues = data.result;
        }

        const childQueues: QueueItem[] = [];
        queues.forEach((queue: any) => {
          if (queue.children && Array.isArray(queue.children) && queue.children.length > 0) {
            queue.children.forEach((child: any) => {
              if (child.queueId) {
                childQueues.push(child);
              }
            });
          }
        });

        setQueueList(childQueues);
      } else {
        setQueueList([]);
      }
    } catch {
      setQueueList([]);
    } finally {
      setQueueLoading(false);
    }
  };

  const [settingDefault, setSettingDefault] = useState<string>('');

  const handleSetDefault = async (poolId: string) => {
    setSettingDefault(poolId);
    try {
      const response = await updateConfig({
        config: { ML_PLATFORM_RESOURCE_POOL_ID: poolId },
      });
      if (response.success) {
        messageApi.success('已设为默认资源池');
        setConfigPoolId(poolId);
      } else {
        messageApi.error(response.message || '设置失败');
      }
    } catch (error: any) {
      console.error('设置默认资源池失败:', error);
      messageApi.error(
        error?.info?.errorMessage || error?.message || '设置默认资源池失败',
      );
    } finally {
      setSettingDefault('');
    }
  };

  const renderConfigTag = (value?: boolean) => (
    <Tag color={value ? 'success' : 'default'}>{value ? '是' : '否'}</Tag>
  );

  const renderPoolCard = (pool: ResourcePool) => {
    const phase = pool.phase || '';
    const storageCount = pool.bindingStorages?.length || 0;
    const monitorCount = pool.bindingMonitor?.length || 0;
    const nodeCount = pool.associatedResources?.length || 0;
    const isActive = !!(configPoolId && pool.resourcePoolId === configPoolId);

    return (
      <Col xs={24} sm={12} lg={8} xl={6} key={pool.resourcePoolId}>
        <Card
          hoverable
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderColor: isActive ? '#1890ff' : undefined,
            borderWidth: isActive ? 2 : undefined,
            boxShadow: isActive
              ? '0 2px 8px rgba(24, 144, 255, 0.25)'
              : undefined,
          }}
          styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column' } }}
          actions={[
            <Button
              key="detail"
              type="link"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(pool)}
            >
              详情
            </Button>,
            isActive ? (
              <Button key="default" type="link" disabled icon={<CheckCircleFilled />}>
                默认
              </Button>
            ) : (
              <Button
                key="set-default"
                type="link"
                icon={<CheckOutlined />}
                loading={settingDefault === pool.resourcePoolId}
                onClick={() => pool.resourcePoolId && handleSetDefault(pool.resourcePoolId)}
              >
                设为默认
              </Button>
            ),
          ]}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <CloudServerOutlined
              style={{ fontSize: 32, color: '#1890ff', flexShrink: 0, marginTop: 2 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text
                  strong
                  style={{
                    fontSize: 16,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                    minWidth: 0,
                  }}
                  title={pool.name || pool.resourcePoolId}
                >
                  {pool.name || pool.resourcePoolId}
                </Text>
                <Tag color={phaseColorMap[phase] || 'default'} style={{ flexShrink: 0 }}>
                  {phaseTextMap[phase] || phase || '-'}
                </Tag>
                {isActive && (
                  <Tag icon={<CheckCircleFilled />} color="blue" style={{ flexShrink: 0 }}>
                    当前使用
                  </Tag>
                )}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'rgba(0, 0, 0, 0.45)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={pool.resourcePoolId}
              >
                {pool.resourcePoolId}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Paragraph
              type="secondary"
              ellipsis={{ rows: 2 }}
              style={{ marginBottom: 12, minHeight: 44 }}
            >
              {pool.description || '-'}
            </Paragraph>

            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <div>
                <ClusterOutlined style={{ color: '#8c8c8c', marginRight: 4 }} />
                <Text type="secondary" style={{ fontSize: 13 }}>
                  节点数：
                </Text>
                <Text style={{ fontSize: 13 }}>{nodeCount}</Text>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                {storageCount > 0 && (
                  <Tag color="green">存储 {storageCount}</Tag>
                )}
                {monitorCount > 0 && (
                  <Tag color="orange">监控 {monitorCount}</Tag>
                )}
              </div>
            </Space>

            <Text
              type="secondary"
              style={{ fontSize: 12, display: 'block', marginTop: 'auto', paddingTop: 12 }}
            >
              创建于{' '}
              {pool.createdAt
                ? new Date(pool.createdAt).toLocaleString('zh-CN')
                : '-'}
            </Text>
          </div>
        </Card>
      </Col>
    );
  };

  return (
    <PageContainer
      header={{
        title: '资源池',
        breadcrumb: {},
        extra: [
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={fetchPools}
            loading={loading}
          >
            刷新
          </Button>,
        ],
      }}
    >
      <Spin spinning={loading}>
        {pools.length > 0 ? (
          <Row gutter={[16, 16]} align="stretch">{pools.map(renderPoolCard)}</Row>
        ) : !loading ? (
          <Empty description="暂无资源池" />
        ) : null}
      </Spin>

      <Drawer
        title={selectedPool?.name || '资源池详情'}
        width={720}
        open={drawerVisible}
        onClose={() => {
          setDrawerVisible(false);
          setSelectedPool(null);
          setQueueList([]);
        }}
      >
        <Spin spinning={detailLoading}>
          {selectedPool ? (
            <>
              <Title level={5}>基本信息</Title>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="资源池ID">
                  {selectedPool.resourcePoolId || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="名称">
                  {selectedPool.name || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="类型">
                  {selectedPool.type || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag
                    color={
                      phaseColorMap[selectedPool.phase || ''] || 'default'
                    }
                  >
                    {phaseTextMap[selectedPool.phase || ''] ||
                      selectedPool.phase ||
                      '-'}
                  </Tag>
                </Descriptions.Item>
                {selectedPool.description && (
                  <Descriptions.Item label="描述" span={2}>
                    {selectedPool.description}
                  </Descriptions.Item>
                )}
                {selectedPool.region && (
                  <Descriptions.Item label="区域">
                    {selectedPool.region}
                  </Descriptions.Item>
                )}
                {selectedPool.createdAt && (
                  <Descriptions.Item label="创建时间">
                    {new Date(selectedPool.createdAt).toLocaleString('zh-CN')}
                  </Descriptions.Item>
                )}
                {selectedPool.updatedAt && (
                  <Descriptions.Item label="更新时间">
                    {new Date(selectedPool.updatedAt).toLocaleString('zh-CN')}
                  </Descriptions.Item>
                )}
              </Descriptions>

              {selectedPool.configuration && (
                <div style={{ marginTop: 24 }}>
                  <Title level={5}>配置信息</Title>
                  <Descriptions column={2} bordered size="small">
                    <Descriptions.Item label="公开暴露">
                      {renderConfigTag(
                        selectedPool.configuration.exposedPublic,
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="禁止删除">
                      {renderConfigTag(
                        selectedPool.configuration.forbidDelete,
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="启用调度器">
                      {renderConfigTag(
                        selectedPool.configuration.deschedulerEnabled,
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="统一调度器">
                      {renderConfigTag(
                        selectedPool.configuration.unifiedSchedulerEnabled,
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="数据集权限">
                      {renderConfigTag(
                        selectedPool.configuration.datasetPermissionEnabled,
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="存储卷权限">
                      {renderConfigTag(
                        selectedPool.configuration.volumePermissionEnabled,
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="镜像无认证拉取">
                      {renderConfigTag(
                        selectedPool.configuration.imageNoAuthPullEnabled,
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="公网推理服务">
                      {renderConfigTag(
                        selectedPool.configuration
                          .publicNetInferenceServiceEnable,
                      )}
                    </Descriptions.Item>
                  </Descriptions>
                </div>
              )}

              {selectedPool.associatedResources &&
                selectedPool.associatedResources.length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <Title level={5}>关联资源</Title>
                    <Space wrap>
                      {selectedPool.associatedResources.map((r) => (
                        <Tag key={`${r.provider}-${r.id}`} color="blue">
                          {r.provider}: {r.id}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                )}

              {selectedPool.network && (
                <div style={{ marginTop: 24 }}>
                  <Title level={5}>网络配置</Title>
                  <Descriptions column={2} bordered size="small">
                    <Descriptions.Item label="网络模式">
                      {selectedPool.network.mode || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="集群IP CIDR">
                      {selectedPool.network.clusterIPCidr || '-'}
                    </Descriptions.Item>
                    {selectedPool.network.master && (
                      <>
                        <Descriptions.Item label="Master VPC ID">
                          {selectedPool.network.master.vpcId || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Master VPC CIDR">
                          {selectedPool.network.master.vpcCidr || '-'}
                        </Descriptions.Item>
                      </>
                    )}
                    {selectedPool.network.nodes?.subnetIds && (
                      <Descriptions.Item label="节点子网ID" span={2}>
                        {selectedPool.network.nodes.subnetIds.join(', ') ||
                          '-'}
                      </Descriptions.Item>
                    )}
                    {selectedPool.network.pods && (
                      <>
                        <Descriptions.Item label="Pods VPC ID">
                          {selectedPool.network.pods.vpcId || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Pods 子网CIDR">
                          {selectedPool.network.pods.subnetCidr || '-'}
                        </Descriptions.Item>
                      </>
                    )}
                  </Descriptions>
                </div>
              )}

              {selectedPool.bindingStorages &&
                selectedPool.bindingStorages.length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <Title level={5}>绑定存储</Title>
                    <Space wrap>
                      {selectedPool.bindingStorages.map((s) => (
                        <Tag key={`${s.provider}-${s.id}`} color="green">
                          {s.provider}: {s.id}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                )}

              {selectedPool.bindingMonitor &&
                selectedPool.bindingMonitor.length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <Title level={5}>绑定监控</Title>
                    <Space wrap>
                      {selectedPool.bindingMonitor.map((m) => (
                        <Tag key={`${m.provider}-${m.id}`} color="orange">
                          {m.provider}: {m.id}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                )}

              <div style={{ marginTop: 24 }}>
                <Title level={5}>队列列表</Title>
                <Table<QueueItem>
                  loading={queueLoading}
                  dataSource={queueList}
                  rowKey={(r) => r.queueId || `q-${Math.random()}`}
                  size="small"
                  pagination={false}
                  locale={{ emptyText: '暂无队列' }}
                  columns={[
                    {
                      title: '队列',
                      dataIndex: 'queueName',
                      width: 200,
                      render: (_: string, record: QueueItem) => (
                        <div>
                          <div>{record.queueName || '-'}</div>
                          <Text type="secondary" style={{ fontSize: 12 }}>{record.queueId || '-'}</Text>
                        </div>
                      ),
                    },
                    {
                      title: '类型',
                      dataIndex: 'queueType',
                      width: 80,
                      render: (type: string) => {
                        const map: Record<string, string> = { Physical: '物理', Elastic: '弹性' };
                        return (
                          <Tag color={type === 'Elastic' ? 'blue' : 'default'}>
                            {map[type] || type || '-'}
                          </Tag>
                        );
                      },
                    },
                    {
                      title: '状态',
                      dataIndex: 'opened',
                      width: 70,
                      render: (opened: boolean) => (
                        <Tag color={opened ? 'success' : 'default'}>
                          {opened ? '开启' : '关闭'}
                        </Tag>
                      ),
                    },
                    {
                      title: '运行任务',
                      dataIndex: 'runningJobs',
                      width: 80,
                      render: (count: number | undefined) => count ?? 0,
                    },
                    {
                      title: '加速卡',
                      width: 140,
                      render: (_: any, record: QueueItem) => {
                        if (!record.deserved?.acceleratorCardList?.length) return '-';
                        return (
                          <Space wrap size={4}>
                            {record.deserved.acceleratorCardList.map((card, i) => (
                              <Tag key={i} color="purple">
                                {card.acceleratorType}: {card.acceleratorCount}
                              </Tag>
                            ))}
                          </Space>
                        );
                      },
                    },
                  ]}
                />
              </div>
            </>
          ) : !detailLoading ? (
            <Text>暂无资源池信息</Text>
          ) : null}
        </Spin>
      </Drawer>
    </PageContainer>
  );
};

export default ResourcePoolPage;
