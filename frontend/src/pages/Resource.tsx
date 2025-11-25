import { ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { request } from '@umijs/max';
import {
  App,
  Button,
  Card,
  Descriptions,
  Progress,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
  Alert,
} from 'antd';
import React, { useEffect, useState } from 'react';

const { Title, Text } = Typography;

// 加速卡类型
interface AcceleratorCard {
  acceleratorCount: string;
  acceleratorType: string;
  acceleratorDescription: string;
}

// 资源信息
interface ResourceInfo {
  milliCPUcores?: string;
  cpuCores?: string;
  memoryGi?: string;
  acceleratorCardList?: AcceleratorCard[];
}

// 队列详情类型
interface QueueDetail {
  queueId?: string;
  queueName?: string;
  queueType?: string;
  resourcePoolId?: string;
  createdAt?: string;
  updatedAt?: string;
  parentQueue?: string;
  opened?: boolean;
  reclaimable?: boolean;
  preemptable?: boolean;
  disableOversell?: boolean;
  queueingStrategy?: string;
  requeueTimeout?: number;
  enableVGPU?: boolean;
  capability?: ResourceInfo;
  deserved?: ResourceInfo;
  allocated?: ResourceInfo;
  guarantee?: ResourceInfo;
  maxDeservedForSubqueue?: ResourceInfo;
  maxGuaranteeForSubqueue?: ResourceInfo;
  children?: QueueDetail[];
  runningJobs?: number;
  bindingNodes?: Array<{
    machineSpec?: string;
    nodeNameList?: string[];
    count?: number;
    acceleratorType?: string;
  }>;
}

// 资源池详情类型
interface ResourcePoolDetail {
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
  associatedResources?: Array<{
    provider?: string;
    id?: string;
  }>;
  network?: {
    mode?: string;
    master?: {
      vpcId?: string;
      vpcCidr?: string;
      region?: string;
    };
    nodes?: {
      vpcId?: string;
      subnetIds?: string[];
      region?: string;
    };
    pods?: {
      vpcId?: string;
      subnetCidr?: string;
      region?: string;
    };
    clusterIPCidr?: string;
  };
  bindingStorages?: Array<{
    provider?: string;
    id?: string;
  }>;
  bindingMonitor?: Array<{
    provider?: string;
    id?: string;
  }>;
  [key: string]: any;
}

const Resource: React.FC = () => {
  const { message: messageApi } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [actualQueueDetail, setActualQueueDetail] =
    useState<QueueDetail | null>(null); // 实际显示的队列（可能是children中的第一个）
  const [resourcePoolDetail, setResourcePoolDetail] =
    useState<ResourcePoolDetail | null>(null);
  const [resourcePoolLoading, setResourcePoolLoading] = useState(false);
  const [configQueueId, setConfigQueueId] = useState<string>('');
  const [mlpCookerJob, setMlpCookerJob] = useState<any | null>(null);
  const [mlpCookerJobLoading, setMlpCookerJobLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);

  // 获取配置中的队列ID
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await request(
          '/api/config/ML_PLATFORM_RESOURCE_QUEUE_ID',
          {
            method: 'GET',
          },
        );
        if (response.success && response.data?.value) {
          setConfigQueueId(response.data.value);
        }
      } catch (error) {
        console.error('获取配置失败:', error);
      }
    };
    fetchConfig();
  }, []);

  // 获取队列详情
  const fetchQueueDetail = async () => {
    if (!configQueueId) {
      messageApi.warning('请先在系统设置中配置 ML_PLATFORM_RESOURCE_QUEUE_ID');
      return;
    }

    setLoading(true);
    try {
      const response = await request(`/api/resources/queues/${configQueueId}`, {
        method: 'GET',
      });

      if (response.success) {
        const data = response.data;
        // 处理响应数据格式
        const queue = data?.queue || data || null;

        // 仅使用children[0]的信息做统计和展示
        let actualQueue: QueueDetail | null = null;
        if (
          queue?.children &&
          Array.isArray(queue.children) &&
          queue.children.length > 0
        ) {
          // 直接使用children[0]作为实际队列
          actualQueue = queue.children[0];
          // 保留父队列的bindingNodes（如果子队列没有）
          if (actualQueue && !actualQueue.bindingNodes && queue.bindingNodes) {
            actualQueue.bindingNodes = queue.bindingNodes;
          }
        } else {
          // 如果没有children，使用原队列
          actualQueue = queue || null;
        }

        setActualQueueDetail(actualQueue); // 实际显示的队列

        // 如果队列有资源池ID，获取资源池详情
        if (actualQueue?.resourcePoolId) {
          fetchResourcePoolDetail(actualQueue.resourcePoolId);
        }
      } else {
        messageApi.error(response.message || '获取队列详情失败');
      }
    } catch (error: any) {
      console.error('获取队列详情失败:', error);
      messageApi.error(error?.message || '获取队列详情失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取资源池详情
  const fetchResourcePoolDetail = async (resourcePoolId: string) => {
    if (!resourcePoolId) {
      return;
    }

    setResourcePoolLoading(true);
    try {
      const response = await request(`/api/resources/pools/${resourcePoolId}`, {
        method: 'GET',
      });

      if (response.success) {
        const data = response.data;
        // 处理响应数据格式：直接使用 data，因为后端已经处理过了
        const pool = data || null;
        setResourcePoolDetail(pool);
      } else {
        console.error('获取资源池详情失败:', response.message);
        // 资源池详情获取失败不影响主流程，只记录错误
      }
    } catch (error: any) {
      console.error('获取资源池详情失败:', error);
      // 资源池详情获取失败不影响主流程，只记录错误
    } finally {
      setResourcePoolLoading(false);
    }
  };

  // 组件加载时获取队列详情
  useEffect(() => {
    if (configQueueId) {
      fetchQueueDetail();
      fetchMlpCookerJob();
    }
  }, [configQueueId]);

  // 查询 mlp-cooker job
  const fetchMlpCookerJob = async () => {
    if (!configQueueId) {
      return;
    }

    setMlpCookerJobLoading(true);
    try {
      const response = await request('/api/jobs', {
        method: 'POST',
        data: {
          keyword: 'mlp-cooker',
        },
      });

      if (response.success && response.data) {
        // 查找名称为 mlp-cooker 的 job
        const jobs = response.data?.jobs || response.data?.data || [];
        const job = jobs.find((j: any) => j.name === 'mlp-cooker');
        setMlpCookerJob(job || null);
      } else {
        setMlpCookerJob(null);
      }
    } catch (error: any) {
      console.error('查询 mlp-cooker job 失败:', error);
      setMlpCookerJob(null);
    } finally {
      setMlpCookerJobLoading(false);
    }
  };

  // 初始化 mlp-cooker job
  const handleInitializeMlpCooker = async () => {
    setInitializing(true);
    try {
      // 从配置文件读取资源池ID和队列ID（需要从队列详情中获取）
      if (!actualQueueDetail?.resourcePoolId || !configQueueId) {
        messageApi.error('缺少必要的配置信息，无法创建任务');
        return;
      }

      // 构建任务参数
      const taskParams = {
        name: 'mlp-cooker',
        queue: configQueueId,
        jobType: 'PyTorchJob',
        command: 'sleep 10000d',
        jobSpec: {
          replicas: 1,
          image: 'registry.baidubce.com/inference/aibox-ubuntu:v2.0-22.04',
          resources: [],
          envs: [],
          enableRDMA: false,
        },
        labels: [],
        datasources: [
          {
            type: 'pfs',
            name: '', // 后端会自动填充 PFS 实例 ID
            sourcePath: '/',
            mountPath: '/data',
          },
        ],
      };

      const response = await request('/api/jobs/create', {
        method: 'POST',
        data: {
          taskParams: JSON.stringify(taskParams),
        },
      });

      if (response.success) {
        messageApi.success('mlp-cooker 任务创建成功');
        // 重新查询 job 列表
        await fetchMlpCookerJob();
      } else {
        messageApi.error(response.message || '创建 mlp-cooker 任务失败');
      }
    } catch (error: any) {
      console.error('创建 mlp-cooker job 失败:', error);
      const errorMessage =
        error?.info?.errorMessage || error?.message || '创建 mlp-cooker 任务失败';
      messageApi.error(errorMessage);
    } finally {
      setInitializing(false);
    }
  };

  // 刷新
  const handleRefresh = () => {
    fetchQueueDetail();
    fetchMlpCookerJob();
  };

  // 计算加速卡使用率
  const calculateUsageRate = (allocated?: string, deserved?: string) => {
    const allocatedNum = parseFloat(allocated || '0');
    const deservedNum = parseFloat(deserved || '0');
    if (deservedNum === 0) return 0;
    return Math.min((allocatedNum / deservedNum) * 100, 100);
  };

  // 渲染加速卡信息表格
  const renderAcceleratorTable = (
    title: string,
    capability?: ResourceInfo,
    deserved?: ResourceInfo,
    allocated?: ResourceInfo,
  ) => {
    if (!capability?.acceleratorCardList?.length) {
      return null;
    }

    const columns = [
      {
        title: '加速卡类型',
        dataIndex: 'acceleratorType',
        key: 'acceleratorType',
        width: 200,
      },
      {
        title: '资源描述',
        dataIndex: 'acceleratorDescription',
        key: 'acceleratorDescription',
        width: 250,
      },
      {
        title: '总容量',
        key: 'capability',
        width: 120,
        render: (_: any, _record: AcceleratorCard, index: number) => {
          const capabilityCard = capability?.acceleratorCardList?.[index];
          return capabilityCard?.acceleratorCount || '-';
        },
      },
      {
        title: '应得配额',
        key: 'deserved',
        width: 120,
        render: (_: any, _record: AcceleratorCard, index: number) => {
          const deservedCard = deserved?.acceleratorCardList?.[index];
          return deservedCard?.acceleratorCount || '-';
        },
      },
      {
        title: '分配量',
        key: 'allocated',
        width: 120,
        render: (_: any, _record: AcceleratorCard, index: number) => {
          const allocatedCard = allocated?.acceleratorCardList?.[index];
          return allocatedCard?.acceleratorCount || '-';
        },
      },
      {
        title: '使用率',
        key: 'usage',
        width: 200,
        render: (_: any, _record: AcceleratorCard, index: number) => {
          const deservedCard = deserved?.acceleratorCardList?.[index];
          const allocatedCard = allocated?.acceleratorCardList?.[index];
          const usageRate = calculateUsageRate(
            allocatedCard?.acceleratorCount,
            deservedCard?.acceleratorCount,
          );
          return (
            <Progress
              percent={usageRate}
              status={
                usageRate >= 90
                  ? 'exception'
                  : usageRate >= 70
                    ? 'active'
                    : 'success'
              }
              format={(percent) => `${percent?.toFixed(1)}%`}
            />
          );
        },
      },
    ];

    return (
      <div style={{ marginTop: 16 }}>
        <Title level={5}>{title}</Title>
        <Table
          columns={columns}
          dataSource={capability.acceleratorCardList}
          rowKey={(record, index) => `${record.acceleratorType}-${index}`}
          pagination={false}
          size="small"
        />
      </div>
    );
  };

  // 计算统计信息（仅使用children[0]的信息）
  const statistics = React.useMemo(() => {
    // 仅使用实际显示的队列（children[0]）信息
    const targetQueue = actualQueueDetail;
    if (!targetQueue) {
      return {
        totalAccelerators: 0,
        allocatedAccelerators: 0,
        availableAccelerators: 0,
        totalCpuCores: 0,
        allocatedCpuCores: 0,
        availableCpuCores: 0,
        totalMemoryGi: 0,
        allocatedMemoryGi: 0,
        availableMemoryGi: 0,
        totalRunningJobs: 0,
      };
    }

    const calculateAccelerators = (cardList?: AcceleratorCard[]) => {
      if (!cardList || cardList.length === 0) return 0;
      return cardList.reduce(
        (sum, card) => sum + parseFloat(card.acceleratorCount || '0'),
        0,
      );
    };

    const parseCpu = (cpu?: string | number) => {
      if (!cpu) return 0;
      return typeof cpu === 'string' ? parseFloat(cpu) : cpu;
    };

    const parseMemory = (memory?: string | number) => {
      if (!memory) return 0;
      if (typeof memory === 'string') {
        const num = parseFloat(memory);
        // 如果数值很大，可能是以字节为单位，转换为GB
        if (num > 1000000) {
          return num / (1024 * 1024 * 1024); // 转换为GB
        }
        return num;
      }
      return memory;
    };

    // 仅计算当前队列（children[0]）的资源
    let totalAccelerators = 0;
    let allocatedAccelerators = 0;
    let totalCpuCores = 0;
    let allocatedCpuCores = 0;
    let totalMemoryGi = 0;
    let allocatedMemoryGi = 0;
    const totalRunningJobs = targetQueue.runningJobs || 0;

    if (targetQueue.deserved) {
      if (targetQueue.deserved.acceleratorCardList) {
        totalAccelerators = calculateAccelerators(
          targetQueue.deserved.acceleratorCardList,
        );
      }
      if (targetQueue.deserved.cpuCores !== undefined) {
        totalCpuCores = parseCpu(targetQueue.deserved.cpuCores);
      } else if (targetQueue.deserved.milliCPUcores !== undefined) {
        totalCpuCores = parseCpu(targetQueue.deserved.milliCPUcores) / 1000;
      }
      if (targetQueue.deserved.memoryGi !== undefined) {
        totalMemoryGi = parseMemory(targetQueue.deserved.memoryGi);
      }
    }

    if (targetQueue.allocated) {
      if (
        targetQueue.allocated.acceleratorCardList &&
        targetQueue.allocated.acceleratorCardList.length > 0
      ) {
        allocatedAccelerators = calculateAccelerators(
          targetQueue.allocated.acceleratorCardList,
        );
      }
      if (targetQueue.allocated.cpuCores !== undefined) {
        allocatedCpuCores = parseCpu(targetQueue.allocated.cpuCores);
      } else if (targetQueue.allocated.milliCPUcores !== undefined) {
        allocatedCpuCores =
          parseCpu(targetQueue.allocated.milliCPUcores) / 1000;
      }
      if (targetQueue.allocated.memoryGi !== undefined) {
        allocatedMemoryGi = parseMemory(targetQueue.allocated.memoryGi);
      }
    }

    return {
      totalAccelerators,
      allocatedAccelerators,
      availableAccelerators: totalAccelerators - allocatedAccelerators,
      totalCpuCores,
      allocatedCpuCores,
      availableCpuCores: totalCpuCores - allocatedCpuCores,
      totalMemoryGi,
      allocatedMemoryGi,
      availableMemoryGi: totalMemoryGi - allocatedMemoryGi,
      totalRunningJobs,
    };
  }, [actualQueueDetail]);

  return (
    <PageContainer
      header={{
        title: '计算资源',
        breadcrumb: {},
        extra: [
          <Button
            key="refresh"
            type="primary"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={loading}
          >
            刷新
          </Button>,
        ],
      }}
    >
      {!configQueueId ? (
        <Card>
          <Text type="warning">
            请先在系统设置中配置 ML_PLATFORM_RESOURCE_QUEUE_ID
          </Text>
        </Card>
      ) : (
        <Spin spinning={loading}>
          {actualQueueDetail ? (
            <>
              {/* mlp-cooker 初始化卡片 */}
              <Card style={{ marginBottom: 16 }}>
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <Title level={5} style={{ margin: 0 }}>
                    MLP Cooker 常驻任务
                  </Title>
                  <Spin spinning={mlpCookerJobLoading}>
                    {mlpCookerJob ? (
                      <Alert
                        message={
                          <Space direction="vertical" size="small" style={{ width: '100%' }}>
                            <div>
                              <Text strong>任务名称：</Text>
                              <Text>{mlpCookerJob.name || '-'}</Text>
                            </div>
                            <div>
                              <Text strong>任务ID：</Text>
                              <Text code>{mlpCookerJob.jobId || mlpCookerJob.id || '-'}</Text>
                            </div>
                            <div>
                              <Text strong>任务状态：</Text>
                              {(() => {
                                const status = mlpCookerJob.status
                                  ? String(mlpCookerJob.status).toLowerCase()
                                  : '';
                                const statusTextMap: Record<string, string> = {
                                  running: '运行中',
                                  pending: '等待中',
                                  stopped: '已停止',
                                  completed: '已完成',
                                  manualtermination: '手动终止',
                                  error: '错误',
                                  failed: '失败',
                                };
                                const displayText =
                                  statusTextMap[status] ||
                                  mlpCookerJob.status ||
                                  '未知';
                                const color =
                                  status === 'running'
                                    ? 'success'
                                    : status === 'pending'
                                      ? 'warning'
                                      : status === 'stopped' ||
                                          status === 'completed'
                                        ? 'default'
                                        : status === 'error' ||
                                            status === 'failed'
                                          ? 'error'
                                          : 'default';
                                return <Tag color={color}>{displayText}</Tag>;
                              })()}
                            </div>
                            {mlpCookerJob.createdAt && (
                              <div>
                                <Text strong>创建时间：</Text>
                                <Text>
                                  {new Date(mlpCookerJob.createdAt).toLocaleString('zh-CN')}
                                </Text>
                              </div>
                            )}
                          </Space>
                        }
                        type="info"
                        showIcon
                        description="这是一个常驻任务，用于通过 WebShell 连接集群。"
                      />
                    ) : (
                      <Alert
                        message="未找到 mlp-cooker 任务"
                        description="点击下方按钮初始化一个常驻任务，该任务将运行 sleep 10000d 命令，用于后续通过 WebShell 连接集群。"
                        type="warning"
                        showIcon
                        action={
                          <Button
                            type="primary"
                            icon={<ThunderboltOutlined />}
                            onClick={handleInitializeMlpCooker}
                            loading={initializing}
                          >
                            初始化
                          </Button>
                        }
                      />
                    )}
                  </Spin>
                </Space>
              </Card>

              {/* 统计卡片 */}
              <Card style={{ marginBottom: 16 }}>
                <Space size="large">
                  <Statistic
                    title="队列名称"
                    value={actualQueueDetail?.queueName || '-'}
                  />
                  <Statistic
                    title="队列ID"
                    value={actualQueueDetail?.queueId || '-'}
                  />
                  <Statistic
                    title="队列类型"
                    value={actualQueueDetail?.queueType || '-'}
                  />
                  <Statistic
                    title="状态"
                    value={
                      actualQueueDetail?.opened
                        ? '开启'
                        : '关闭'
                    }
                    valueStyle={{
                      color: actualQueueDetail?.opened
                        ? '#3f8600'
                        : '#cf1322',
                    }}
                  />
                  {statistics.totalRunningJobs > 0 && (
                    <Statistic
                      title="运行中任务"
                      value={actualQueueDetail?.runningJobs || 0}
                      prefix={<ReloadOutlined />}
                    />
                  )}
                </Space>
              </Card>

              {/* 资源统计 */}
              <Card style={{ marginBottom: 16 }}>
                <Title level={4}>资源统计</Title>

                {/* 加速卡统计 */}
                <div style={{ marginTop: 16 }}>
                  <Title level={5}>加速卡</Title>
                  <Space size="large" style={{ marginTop: 8 }}>
                    <Statistic
                      title="总量"
                      value={statistics.totalAccelerators.toFixed(2)}
                      suffix="张"
                    />
                    <Statistic
                      title="分配量"
                      value={statistics.allocatedAccelerators.toFixed(2)}
                      suffix="张"
                    />
                    <Statistic
                      title="最大可用量"
                      value={statistics.availableAccelerators.toFixed(2)}
                      suffix="张"
                    />
                    <Statistic
                      title="使用率"
                      value={
                        statistics.totalAccelerators > 0
                          ? (
                              (statistics.allocatedAccelerators /
                                statistics.totalAccelerators) *
                              100
                            ).toFixed(2)
                          : 0
                      }
                      suffix="%"
                      valueStyle={{
                        color:
                          statistics.totalAccelerators > 0 &&
                          (statistics.allocatedAccelerators /
                            statistics.totalAccelerators) *
                            100 >=
                            90
                            ? '#cf1322'
                            : statistics.totalAccelerators > 0 &&
                                (statistics.allocatedAccelerators /
                                  statistics.totalAccelerators) *
                                  100 >=
                                  70
                              ? '#faad14'
                              : '#3f8600',
                      }}
                    />
                  </Space>
                </div>

                {/* CPU统计 */}
                <div style={{ marginTop: 24 }}>
                  <Title level={5}>CPU</Title>
                  <Space size="large" style={{ marginTop: 8 }}>
                    <Statistic
                      title="总量"
                      value={statistics.totalCpuCores.toFixed(2)}
                      suffix="核"
                    />
                    <Statistic
                      title="分配量"
                      value={statistics.allocatedCpuCores.toFixed(2)}
                      suffix="核"
                    />
                    <Statistic
                      title="最大可用量"
                      value={statistics.availableCpuCores.toFixed(2)}
                      suffix="核"
                    />
                    <Statistic
                      title="使用率"
                      value={
                        statistics.totalCpuCores > 0
                          ? (
                              (statistics.allocatedCpuCores /
                                statistics.totalCpuCores) *
                              100
                            ).toFixed(2)
                          : 0
                      }
                      suffix="%"
                      valueStyle={{
                        color:
                          statistics.totalCpuCores > 0 &&
                          (statistics.allocatedCpuCores /
                            statistics.totalCpuCores) *
                            100 >=
                            90
                            ? '#cf1322'
                            : statistics.totalCpuCores > 0 &&
                                (statistics.allocatedCpuCores /
                                  statistics.totalCpuCores) *
                                  100 >=
                                  70
                              ? '#faad14'
                              : '#3f8600',
                      }}
                    />
                  </Space>
                </div>

                {/* 内存统计 */}
                <div style={{ marginTop: 24 }}>
                  <Title level={5}>内存</Title>
                  <Space size="large" style={{ marginTop: 8 }}>
                    <Statistic
                      title="总量"
                      value={statistics.totalMemoryGi.toFixed(2)}
                      suffix="GB"
                    />
                    <Statistic
                      title="分配量"
                      value={statistics.allocatedMemoryGi.toFixed(2)}
                      suffix="GB"
                    />
                    <Statistic
                      title="最大可用量"
                      value={statistics.availableMemoryGi.toFixed(2)}
                      suffix="GB"
                    />
                    <Statistic
                      title="使用率"
                      value={
                        statistics.totalMemoryGi > 0
                          ? (
                              (statistics.allocatedMemoryGi /
                                statistics.totalMemoryGi) *
                              100
                            ).toFixed(2)
                          : 0
                      }
                      suffix="%"
                      valueStyle={{
                        color:
                          statistics.totalMemoryGi > 0 &&
                          (statistics.allocatedMemoryGi /
                            statistics.totalMemoryGi) *
                            100 >=
                            90
                            ? '#cf1322'
                            : statistics.totalMemoryGi > 0 &&
                                (statistics.allocatedMemoryGi /
                                  statistics.totalMemoryGi) *
                                  100 >=
                                  70
                              ? '#faad14'
                              : '#3f8600',
                      }}
                    />
                  </Space>
                </div>
              </Card>

              {/* 队列基本信息 */}
              <Card style={{ marginBottom: 16 }}>
                <Title level={4}>队列基本信息</Title>
                <Descriptions column={2} bordered style={{ marginTop: 16 }}>
                  <Descriptions.Item label="队列ID">
                    {actualQueueDetail?.queueId || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="队列名称">
                    {actualQueueDetail?.queueName || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="队列类型">
                    {actualQueueDetail?.queueType || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="资源池ID">
                    {actualQueueDetail?.resourcePoolId || '-'}
                  </Descriptions.Item>
                  {actualQueueDetail?.parentQueue && (
                    <Descriptions.Item label="父队列">
                      {actualQueueDetail?.parentQueue}
                    </Descriptions.Item>
                  )}
                  {actualQueueDetail?.runningJobs !==
                    undefined && (
                    <Descriptions.Item label="运行中任务数">
                      {actualQueueDetail?.runningJobs}
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="状态">
                    <Tag
                      color={
                        actualQueueDetail?.opened
                          ? 'success'
                          : 'default'
                      }
                    >
                      {actualQueueDetail?.opened
                        ? '开启'
                        : '关闭'}
                    </Tag>
                  </Descriptions.Item>
                  {actualQueueDetail?.reclaimable !==
                    undefined && (
                    <Descriptions.Item label="可回收">
                      <Tag
                        color={
                          actualQueueDetail?.reclaimable
                            ? 'success'
                            : 'default'
                        }
                      >
                        {actualQueueDetail?.reclaimable
                          ? '是'
                          : '否'}
                      </Tag>
                    </Descriptions.Item>
                  )}
                  {actualQueueDetail?.preemptable !==
                    undefined && (
                    <Descriptions.Item label="可抢占">
                      <Tag
                        color={
                          actualQueueDetail?.preemptable
                            ? 'warning'
                            : 'default'
                        }
                      >
                        {actualQueueDetail?.preemptable
                          ? '是'
                          : '否'}
                      </Tag>
                    </Descriptions.Item>
                  )}
                  {actualQueueDetail?.disableOversell !==
                    undefined && (
                    <Descriptions.Item label="禁用超卖">
                      <Tag
                        color={
                          !actualQueueDetail?.disableOversell
                            ? 'success'
                            : 'default'
                        }
                      >
                        {!actualQueueDetail?.disableOversell
                          ? '允许'
                          : '禁止'}
                      </Tag>
                    </Descriptions.Item>
                  )}
                  {actualQueueDetail?.queueingStrategy && (
                    <Descriptions.Item label="调度策略">
                      {actualQueueDetail?.queueingStrategy}
                    </Descriptions.Item>
                  )}
                  {actualQueueDetail?.requeueTimeout !==
                    undefined && (
                    <Descriptions.Item label="重入队超时">
                      {actualQueueDetail?.requeueTimeout}
                    </Descriptions.Item>
                  )}
                  {actualQueueDetail?.enableVGPU !==
                    undefined && (
                    <Descriptions.Item label="支持vGPU">
                      <Tag
                        color={
                          actualQueueDetail?.enableVGPU
                            ? 'success'
                            : 'default'
                        }
                      >
                        {actualQueueDetail?.enableVGPU
                          ? '是'
                          : '否'}
                      </Tag>
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="创建时间">
                    {actualQueueDetail?.createdAt
                      ? new Date(
                          actualQueueDetail?.createdAt ?? '',
                        ).toLocaleString('zh-CN')
                      : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="更新时间">
                    {actualQueueDetail?.updatedAt
                      ? new Date(
                          actualQueueDetail?.updatedAt ?? '',
                        ).toLocaleString('zh-CN')
                      : '-'}
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              {/* 绑定节点信息 */}
              {actualQueueDetail?.bindingNodes &&
                (actualQueueDetail?.bindingNodes?.length ||
                  0) > 0 && (
                  <Card style={{ marginBottom: 16 }}>
                    <Title level={4}>绑定节点信息</Title>
                    <Table
                      columns={[
                        {
                          title: '机器规格',
                          dataIndex: 'machineSpec',
                          key: 'machineSpec',
                        },
                        {
                          title: '加速卡类型',
                          dataIndex: 'acceleratorType',
                          key: 'acceleratorType',
                        },
                        {
                          title: '节点数量',
                          dataIndex: 'count',
                          key: 'count',
                        },
                        {
                          title: '节点列表',
                          dataIndex: 'nodeNameList',
                          key: 'nodeNameList',
                          render: (nodeNameList: string[] | undefined) => {
                            if (!nodeNameList || nodeNameList.length === 0)
                              return '-';
                            return (
                              <Space wrap>
                                {nodeNameList.map((node) => (
                                  <Tag key={node} color="blue">
                                    {node}
                                  </Tag>
                                ))}
                              </Space>
                            );
                          },
                        },
                      ]}
                      dataSource={
                        actualQueueDetail?.bindingNodes || []
                      }
                      rowKey={(record, index) =>
                        `${record.machineSpec}-${index}`
                      }
                      pagination={false}
                      size="small"
                    />
                  </Card>
                )}

              {/* 资源详情 */}
              <Card style={{ marginBottom: 16 }}>
                <Title level={4}>资源详情</Title>

                {/* CPU和内存信息 */}
                {(actualQueueDetail?.capability ||
                  actualQueueDetail?.deserved ||
                  actualQueueDetail?.allocated) && (
                  <div style={{ marginTop: 16 }}>
                    <Title level={5}>CPU和内存</Title>
                    <Descriptions column={2} bordered style={{ marginTop: 8 }}>
                      <Descriptions.Item label="CPU总容量（核）">
                        {actualQueueDetail?.capability
                          ?.cpuCores ||
                          (actualQueueDetail?.capability
                            ?.milliCPUcores
                            ? (
                                parseFloat(
                                  String(
                                    actualQueueDetail?.capability
                                      ?.milliCPUcores ?? '',
                                  ),
                                ) / 1000
                              ).toFixed(2)
                            : '-')}
                      </Descriptions.Item>
                      <Descriptions.Item label="CPU应得配额（核）">
                        {actualQueueDetail?.deserved
                          ?.cpuCores ||
                          (actualQueueDetail?.deserved
                            ?.milliCPUcores
                            ? (
                                parseFloat(
                                  String(
                                    actualQueueDetail?.deserved
                                      ?.milliCPUcores ?? '',
                                  ),
                                ) / 1000
                              ).toFixed(2)
                            : '-')}
                      </Descriptions.Item>
                      <Descriptions.Item label="CPU已分配（核）">
                        {actualQueueDetail?.allocated
                          ?.cpuCores ||
                          (actualQueueDetail?.allocated
                            ?.milliCPUcores
                            ? (
                                parseFloat(
                                  String(
                                    actualQueueDetail?.allocated
                                      ?.milliCPUcores ?? '',
                                  ),
                                ) / 1000
                              ).toFixed(2)
                            : '-') ||
                          '0'}
                      </Descriptions.Item>
                      <Descriptions.Item label="CPU可用（核）">
                        {(() => {
                          const deservedNum =
                            actualQueueDetail?.deserved?.cpuCores
                              ? parseFloat(String(actualQueueDetail.deserved.cpuCores))
                              : actualQueueDetail?.deserved?.milliCPUcores
                                ? parseFloat(
                                    String(actualQueueDetail.deserved.milliCPUcores),
                                  ) / 1000
                                : 0;
                          const allocatedNum =
                            actualQueueDetail?.allocated?.cpuCores
                              ? parseFloat(String(actualQueueDetail.allocated.cpuCores))
                              : actualQueueDetail?.allocated?.milliCPUcores
                                ? parseFloat(
                                    String(
                                      actualQueueDetail.allocated?.milliCPUcores || '0',
                                    ),
                                  ) / 1000
                                : 0;
                          return deservedNum > 0
                            ? (deservedNum - allocatedNum).toFixed(2)
                            : '-';
                        })()}
                      </Descriptions.Item>
                      <Descriptions.Item label="内存总容量（GB）">
                        {actualQueueDetail?.capability
                          ?.memoryGi
                          ? (() => {
                              const memoryGi = actualQueueDetail
                                ?.capability?.memoryGi;
                              if (!memoryGi) return '-';
                              if (typeof memoryGi === 'number') {
                                return (memoryGi as number).toFixed(2);
                              }
                              const num = parseFloat(String(memoryGi));
                              if (Number.isNaN(num)) return '-';
                              return num > 1000000
                                ? (num / (1024 * 1024 * 1024)).toFixed(2)
                                : num.toFixed(2);
                            })()
                          : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="内存应得配额（GB）">
                        {actualQueueDetail?.deserved?.memoryGi
                          ? (() => {
                              const memoryGi = actualQueueDetail
                                ?.deserved?.memoryGi;
                              if (!memoryGi) return '-';
                              if (typeof memoryGi === 'number') {
                                return (memoryGi as number).toFixed(2);
                              }
                              const num = parseFloat(String(memoryGi));
                              return Number.isNaN(num) ? '-' : num.toFixed(2);
                            })()
                          : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="内存已分配（GB）">
                        {actualQueueDetail?.allocated?.memoryGi
                          ? (() => {
                              const memoryGi = actualQueueDetail
                                ?.allocated?.memoryGi;
                              if (!memoryGi) return '0';
                              if (typeof memoryGi === 'number') {
                                return (memoryGi as number).toFixed(2);
                              }
                              const num = parseFloat(String(memoryGi));
                              return Number.isNaN(num) ? '0' : num.toFixed(2);
                            })()
                          : '0'}
                      </Descriptions.Item>
                      <Descriptions.Item label="内存可用（GB）">
                        {(() => {
                          const deserved = actualQueueDetail?.deserved?.memoryGi
                            ? typeof actualQueueDetail.deserved.memoryGi === 'number'
                              ? actualQueueDetail.deserved.memoryGi
                              : parseFloat(String(actualQueueDetail.deserved.memoryGi))
                            : 0;
                          const allocated = actualQueueDetail?.allocated?.memoryGi
                            ? typeof actualQueueDetail.allocated?.memoryGi === 'number'
                              ? actualQueueDetail.allocated.memoryGi
                              : parseFloat(
                                  String(actualQueueDetail.allocated?.memoryGi || '0'),
                                )
                            : 0;
                          return deserved > 0
                            ? (deserved - allocated).toFixed(2)
                            : '-';
                        })()}
                      </Descriptions.Item>
                    </Descriptions>
                  </div>
                )}

                {/* 加速卡详情 */}
                {renderAcceleratorTable(
                  '加速卡资源情况',
                  actualQueueDetail?.capability,
                  actualQueueDetail?.deserved,
                  actualQueueDetail?.allocated,
                )}
              </Card>

              {/* 资源池信息 */}
              {actualQueueDetail?.resourcePoolId && (
                <Card>
                  <Spin spinning={resourcePoolLoading}>
                    <Title level={4}>资源池信息</Title>
                    {resourcePoolDetail ? (
                      <>
                        <Descriptions
                          column={2}
                          bordered
                          style={{ marginTop: 16 }}
                        >
                          <Descriptions.Item label="资源池ID">
                            {resourcePoolDetail.resourcePoolId || '-'}
                          </Descriptions.Item>
                          <Descriptions.Item label="资源池名称">
                            {resourcePoolDetail.name || '-'}
                          </Descriptions.Item>
                          <Descriptions.Item label="资源池类型">
                            {resourcePoolDetail.type || '-'}
                          </Descriptions.Item>
                          <Descriptions.Item label="状态">
                            {resourcePoolDetail.phase ? (
                              <Tag
                                color={
                                  resourcePoolDetail.phase === 'running'
                                    ? 'success'
                                    : 'default'
                                }
                              >
                                {resourcePoolDetail.phase === 'running'
                                  ? '运行中'
                                  : resourcePoolDetail.phase}
                              </Tag>
                            ) : (
                              '-'
                            )}
                          </Descriptions.Item>
                          {resourcePoolDetail.description && (
                            <Descriptions.Item label="描述" span={2}>
                              {resourcePoolDetail.description}
                            </Descriptions.Item>
                          )}
                          {resourcePoolDetail.region && (
                            <Descriptions.Item label="区域">
                              {resourcePoolDetail.region}
                            </Descriptions.Item>
                          )}
                          {resourcePoolDetail.createdAt && (
                            <Descriptions.Item label="创建时间">
                              {new Date(
                                resourcePoolDetail.createdAt,
                              ).toLocaleString('zh-CN')}
                            </Descriptions.Item>
                          )}
                          {resourcePoolDetail.updatedAt && (
                            <Descriptions.Item label="更新时间">
                              {new Date(
                                resourcePoolDetail.updatedAt,
                              ).toLocaleString('zh-CN')}
                            </Descriptions.Item>
                          )}
                        </Descriptions>

                        {/* 配置信息 */}
                        {resourcePoolDetail.configuration && (
                          <div style={{ marginTop: 16 }}>
                            <Title level={5}>配置信息</Title>
                            <Descriptions
                              column={2}
                              bordered
                              style={{ marginTop: 8 }}
                            >
                              <Descriptions.Item label="公开暴露">
                                <Tag
                                  color={
                                    resourcePoolDetail.configuration
                                      .exposedPublic
                                      ? 'success'
                                      : 'default'
                                  }
                                >
                                  {resourcePoolDetail.configuration
                                    .exposedPublic
                                    ? '是'
                                    : '否'}
                                </Tag>
                              </Descriptions.Item>
                              <Descriptions.Item label="禁止删除">
                                <Tag
                                  color={
                                    resourcePoolDetail.configuration
                                      .forbidDelete
                                      ? 'warning'
                                      : 'default'
                                  }
                                >
                                  {resourcePoolDetail.configuration.forbidDelete
                                    ? '是'
                                    : '否'}
                                </Tag>
                              </Descriptions.Item>
                              <Descriptions.Item label="启用调度器">
                                <Tag
                                  color={
                                    resourcePoolDetail.configuration
                                      .deschedulerEnabled
                                      ? 'success'
                                      : 'default'
                                  }
                                >
                                  {resourcePoolDetail.configuration
                                    .deschedulerEnabled
                                    ? '是'
                                    : '否'}
                                </Tag>
                              </Descriptions.Item>
                              <Descriptions.Item label="统一调度器">
                                <Tag
                                  color={
                                    resourcePoolDetail.configuration
                                      .unifiedSchedulerEnabled
                                      ? 'success'
                                      : 'default'
                                  }
                                >
                                  {resourcePoolDetail.configuration
                                    .unifiedSchedulerEnabled
                                    ? '是'
                                    : '否'}
                                </Tag>
                              </Descriptions.Item>
                              <Descriptions.Item label="数据集权限">
                                <Tag
                                  color={
                                    resourcePoolDetail.configuration
                                      .datasetPermissionEnabled
                                      ? 'success'
                                      : 'default'
                                  }
                                >
                                  {resourcePoolDetail.configuration
                                    .datasetPermissionEnabled
                                    ? '是'
                                    : '否'}
                                </Tag>
                              </Descriptions.Item>
                              <Descriptions.Item label="存储卷权限">
                                <Tag
                                  color={
                                    resourcePoolDetail.configuration
                                      .volumePermissionEnabled
                                      ? 'success'
                                      : 'default'
                                  }
                                >
                                  {resourcePoolDetail.configuration
                                    .volumePermissionEnabled
                                    ? '是'
                                    : '否'}
                                </Tag>
                              </Descriptions.Item>
                              <Descriptions.Item label="镜像无认证拉取">
                                <Tag
                                  color={
                                    resourcePoolDetail.configuration
                                      .imageNoAuthPullEnabled
                                      ? 'success'
                                      : 'default'
                                  }
                                >
                                  {resourcePoolDetail.configuration
                                    .imageNoAuthPullEnabled
                                    ? '是'
                                    : '否'}
                                </Tag>
                              </Descriptions.Item>
                              <Descriptions.Item label="公网推理服务">
                                <Tag
                                  color={
                                    resourcePoolDetail.configuration
                                      .publicNetInferenceServiceEnable
                                      ? 'success'
                                      : 'default'
                                  }
                                >
                                  {resourcePoolDetail.configuration
                                    .publicNetInferenceServiceEnable
                                    ? '是'
                                    : '否'}
                                </Tag>
                              </Descriptions.Item>
                            </Descriptions>
                          </div>
                        )}

                        {/* 关联资源 */}
                        {resourcePoolDetail.associatedResources &&
                          resourcePoolDetail.associatedResources.length > 0 && (
                            <div style={{ marginTop: 16 }}>
                              <Title level={5}>关联资源</Title>
                              <Space wrap style={{ marginTop: 8 }}>
                                {resourcePoolDetail.associatedResources.map(
                                  (resource) => (
                                    <Tag key={`${resource.provider}-${resource.id}`} color="blue">
                                      {resource.provider}: {resource.id}
                                    </Tag>
                                  ),
                                )}
                              </Space>
                            </div>
                          )}

                        {/* 网络配置 */}
                        {resourcePoolDetail.network && (
                          <div style={{ marginTop: 16 }}>
                            <Title level={5}>网络配置</Title>
                            <Descriptions
                              column={2}
                              bordered
                              style={{ marginTop: 8 }}
                            >
                              <Descriptions.Item label="网络模式">
                                {resourcePoolDetail.network.mode || '-'}
                              </Descriptions.Item>
                              <Descriptions.Item label="集群IP CIDR">
                                {resourcePoolDetail.network.clusterIPCidr ||
                                  '-'}
                              </Descriptions.Item>
                              {resourcePoolDetail.network.master && (
                                <>
                                  <Descriptions.Item label="Master VPC ID">
                                    {resourcePoolDetail.network.master.vpcId ||
                                      '-'}
                                  </Descriptions.Item>
                                  <Descriptions.Item label="Master VPC CIDR">
                                    {resourcePoolDetail.network.master
                                      .vpcCidr || '-'}
                                  </Descriptions.Item>
                                </>
                              )}
                              {resourcePoolDetail.network.nodes?.subnetIds && (
                                <Descriptions.Item label="节点子网ID" span={2}>
                                  {resourcePoolDetail.network.nodes.subnetIds.join(
                                    ', ',
                                  ) || '-'}
                                </Descriptions.Item>
                              )}
                              {resourcePoolDetail.network.pods && (
                                <>
                                  <Descriptions.Item label="Pods VPC ID">
                                    {resourcePoolDetail.network.pods.vpcId ||
                                      '-'}
                                  </Descriptions.Item>
                                  <Descriptions.Item label="Pods 子网CIDR">
                                    {resourcePoolDetail.network.pods
                                      .subnetCidr || '-'}
                                  </Descriptions.Item>
                                </>
                              )}
                            </Descriptions>
                          </div>
                        )}

                        {/* 绑定存储 */}
                        {resourcePoolDetail.bindingStorages &&
                          resourcePoolDetail.bindingStorages.length > 0 && (
                            <div style={{ marginTop: 16 }}>
                              <Title level={5}>绑定存储</Title>
                              <Space wrap style={{ marginTop: 8 }}>
                                {resourcePoolDetail.bindingStorages.map(
                                  (storage) => (
                                    <Tag key={`${storage.provider}-${storage.id}`} color="green">
                                      {storage.provider}: {storage.id}
                                    </Tag>
                                  ),
                                )}
                              </Space>
                            </div>
                          )}

                        {/* 绑定监控 */}
                        {resourcePoolDetail.bindingMonitor &&
                          resourcePoolDetail.bindingMonitor.length > 0 && (
                            <div style={{ marginTop: 16 }}>
                              <Title level={5}>绑定监控</Title>
                              <Space wrap style={{ marginTop: 8 }}>
                                {resourcePoolDetail.bindingMonitor.map(
                                  (monitor) => (
                                    <Tag key={`${monitor.provider}-${monitor.id}`} color="orange">
                                      {monitor.provider}: {monitor.id}
                                    </Tag>
                                  ),
                                )}
                              </Space>
                            </div>
                          )}
                      </>
                    ) : !resourcePoolLoading ? (
                      <Text style={{ marginTop: 16, display: 'block' }}>
                        暂无资源池信息
                      </Text>
                    ) : null}
                  </Spin>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <Text>暂无队列信息</Text>
            </Card>
          )}
        </Spin>
      )}
    </PageContainer>
  );
};

export default Resource;
