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
  Checkbox,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Row,
  Select,
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
  const [onlyRunning, setOnlyRunning] = useState(false);
  const [selectedAccTypes, setSelectedAccTypes] = useState<string[]>([]);
  const [poolAccelerators, setPoolAccelerators] = useState<Record<string, string[]>>({});

  useEffect(() => {
    request('/api/config/ML_PLATFORM_RESOURCE_POOL_ID', { method: 'GET' })
      .then((res) => {
        if (res?.success) {
          setConfigPoolId(res.data?.value || '');
        }
      })
      .catch(() => {});
  }, []);

  const fetchAcceleratorsForAllPools = useCallback(async (poolsList: ResourcePool[]) => {
    if (!poolsList || poolsList.length === 0) return;

    try {
      // 并发获取每个资源池的队列详情
      const results = await Promise.allSettled(
        poolsList.map(async (pool) => {
          if (!pool.resourcePoolId) return null;
          const response = await request('/api/resources/queues', {
            method: 'GET',
            params: {
              resourcePoolId: pool.resourcePoolId,
              pageSize: 1000,
              pageNumber: 1,
              includeDetails: 'true',
            },
          });
          if (response.success) {
            return { poolId: pool.resourcePoolId, data: response.data };
          }
          return null;
        }),
      );

      const accMap: Record<string, Set<string>> = {};
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          const { poolId, data } = result.value;
          let queues: any[] = [];
          if (Array.isArray(data)) {
            queues = data;
          } else if (data?.queues && Array.isArray(data.queues)) {
            queues = data.queues;
          } else if (data?.data && Array.isArray(data.data)) {
            queues = data.data;
          } else if (data?.result && Array.isArray(data.result)) {
            queues = data.result;
          }

          queues.forEach((q: any) => {
            const detail = q.detail || q;
            const accList = detail?.deserved?.acceleratorCardList || [];
            if (accList.length > 0) {
              if (!accMap[poolId]) accMap[poolId] = new Set();
              accList.forEach((acc: any) => {
                if (acc.acceleratorType) {
                  accMap[poolId].add(acc.acceleratorType);
                }
              });
            }
          });
        }
      });

      const finalMap: Record<string, string[]> = {};
      Object.entries(accMap).forEach(([poolId, accSet]) => {
        finalMap[poolId] = Array.from(accSet);
      });
      setPoolAccelerators(finalMap);
    } catch (error) {
      console.error('批量获取加速卡信息失败:', error);
    }
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

        const validPools = list.filter((p: any) => p.resourcePoolId);
        setPools(validPools);
        fetchAcceleratorsForAllPools(validPools);
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
  }, [messageApi, fetchAcceleratorsForAllPools]);

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
            {/* Slot 1: Description */}
            <div style={{ minHeight: 44, marginBottom: 12 }}>
              <Paragraph
                type="secondary"
                ellipsis={{ rows: 2 }}
                style={{ margin: 0, fontSize: 13 }}
              >
                {pool.description || '-'}
              </Paragraph>
            </div>

            {/* Slot 2: Node Count */}
            <div style={{ marginBottom: 8 }}>
              <ClusterOutlined style={{ color: '#8c8c8c', marginRight: 4 }} />
              <Text type="secondary" style={{ fontSize: 13 }}>
                节点数：
              </Text>
              <Text strong style={{ fontSize: 13 }}>{nodeCount}</Text>
            </div>

            {/* Slot 3: Accelerators */}
            <div style={{ minHeight: 54, marginBottom: 12 }}>
              {pool.resourcePoolId && poolAccelerators[pool.resourcePoolId]?.length > 0 ? (
                <>
                  <div style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 12, marginBottom: 4 }}>加速卡：</div>
                  <Space wrap size={4}>
                    {poolAccelerators[pool.resourcePoolId].map((type) => (
                      <Tag key={type} color="purple">
                        {type}
                      </Tag>
                    ))}
                  </Space>
                </>
              ) : (
                <div style={{ color: '#bfbfbf', fontSize: 12, fontStyle: 'italic', marginTop: 4 }}>暂无加速卡</div>
              )}
            </div>

            {/* Slot 4: Extra Metadata (Storage/Monitor) */}
            <div style={{ minHeight: 32, display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {storageCount > 0 && (
                <Tag color="green">存储 {storageCount}</Tag>
              )}
              {monitorCount > 0 && (
                <Tag color="orange">监控 {monitorCount}</Tag>
              )}
            </div>

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

  const renderDefaultPoolSection = () => {
    if (!configPoolId) return null;

    const defaultPool = pools.find((p) => p.resourcePoolId === configPoolId);

    if (!defaultPool) {
      return (
        <Card style={{ marginBottom: 24, borderRadius: 8, border: '1px solid #ffa39e', background: '#fff2f0' }}>
          <Space size={16}>
            <CloudServerOutlined style={{ fontSize: 32, color: '#ff4d4f' }} />
            <div>
              <div style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 12, marginBottom: 4 }}>
                默认资源池 (ML_PLATFORM_RESOURCE_POOL_ID)
              </div>
              <Text strong style={{ fontSize: 16 }}>{configPoolId}</Text>
              <Tag color="error" style={{ marginLeft: 8 }}>配置异常: 资源池不存在</Tag>
            </div>
          </Space>
        </Card>
      );
    }

    const phase = defaultPool.phase || '';
    const nodeCount = defaultPool.associatedResources?.length || 0;

    return (
      <Card
        style={{
          marginBottom: 24,
          background: 'linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%)',
          border: '1px solid #91d5ff',
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        }}
        styles={{ body: { padding: '16px 24px' } }}
      >
        <Row align="middle" gutter={24}>
          <Col>
            <CloudServerOutlined style={{ fontSize: 40, color: '#1890ff' }} />
          </Col>
          <Col flex={1}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                当前默认资源池 (ML_PLATFORM_RESOURCE_POOL_ID)
              </Text>
            </div>
            <Space align="center" size={12}>
              <Title level={4} style={{ margin: 0 }}>
                {defaultPool.name || defaultPool.resourcePoolId}
              </Title>
              <Tag color={phaseColorMap[phase] || 'default'}>
                {phaseTextMap[phase] || phase || '-'}
              </Tag>
              <Text type="secondary" style={{ fontSize: 13 }}>ID: {defaultPool.resourcePoolId}</Text>
            </Space>
          </Col>
          <Col>
            <Space size={32}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 12, marginBottom: 4 }}>节点数量</div>
                <div style={{ fontSize: 20, fontWeight: 500 }}>{nodeCount}</div>
              </div>
              {defaultPool.resourcePoolId && poolAccelerators[defaultPool.resourcePoolId]?.length > 0 && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 12, marginBottom: 4 }}>加速卡类型</div>
                  <Space wrap size={4} style={{ justifyContent: 'center' }}>
                    {poolAccelerators[defaultPool.resourcePoolId].map((type) => (
                      <Tag key={type} color="purple" style={{ margin: 0 }}>
                        {type}
                      </Tag>
                    ))}
                  </Space>
                </div>
              )}
              <Button
                type="primary"
                ghost
                icon={<EyeOutlined />}
                onClick={() => handleViewDetail(defaultPool)}
              >
                详情
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>
    );
  };

  return (
    <PageContainer
      header={{
        title: '资源池',
        breadcrumb: {},
        extra: [
          <Select
            key="accTypes"
            mode="multiple"
            placeholder="加速卡类型筛选"
            allowClear
            style={{ minWidth: 200 }}
            value={selectedAccTypes}
            onChange={setSelectedAccTypes}
            options={Array.from(new Set(Object.values(poolAccelerators).flat())).map((type) => ({
              label: type,
              value: type,
            }))}
          />,
          <Checkbox
            key="onlyRunning"
            checked={onlyRunning}
            onChange={(e) => setOnlyRunning(e.target.checked)}
          >
            仅运行中
          </Checkbox>,
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
        {renderDefaultPoolSection()}
        {pools.length > 0 ? (
          <Row gutter={[16, 16]} align="stretch">
            {pools
              .filter((p) => !onlyRunning || p.phase === 'running')
              .filter((p) => {
                if (selectedAccTypes.length === 0) return true;
                const poolAccs = poolAccelerators[p.resourcePoolId || ''] || [];
                return selectedAccTypes.some((type) => poolAccs.includes(type));
              })
              .map(renderPoolCard)}
          </Row>
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
