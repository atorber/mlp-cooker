import {
  CheckCircleFilled,
  CheckOutlined,
  EyeOutlined,
  PartitionOutlined,
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
  Progress,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import React, { useEffect, useState } from 'react';
import { updateConfig } from '@/services/aihc-mentor/api';
import {
  QueueDefaultInfoContent,
  type QueueResourceStatistics,
  type RenderAcceleratorTableFn,
} from './QueueDefaultInfoContent';

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

function computeQueueStatistics(
  targetQueue: QueueDetail | null,
): QueueResourceStatistics {
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
}

const Resource: React.FC = () => {
  const { message: messageApi } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [actualQueueDetail, setActualQueueDetail] =
    useState<QueueDetail | null>(null); // 实际显示的队列（可能是children中的第一个）
  const [configQueueId, setConfigQueueId] = useState<string>('');
  const [mlpCookerJob, setMlpCookerJob] = useState<any | null>(null);
  const [mlpCookerJobLoading, setMlpCookerJobLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [queueList, setQueueList] = useState<QueueDetail[]>([]);
  const [queueListLoading, setQueueListLoading] = useState(false);
  const [queueDetailDrawerOpen, setQueueDetailDrawerOpen] = useState(false);
  const [queueRowDetail, setQueueRowDetail] = useState<QueueDetail | null>(null);
  const [queueRowDetailLoading, setQueueRowDetailLoading] = useState(false);
  const [settingDefaultQueueId, setSettingDefaultQueueId] = useState('');
  const [onlyWithAcc, setOnlyWithAcc] = useState(false);

  // 配置相关状态
  const [resourceConfig, setResourceConfig] = useState({
    resourcePoolId: '',
    queueId: '',
    pfsInstanceId: '',
  });
  const [configLoading, setConfigLoading] = useState(true); // 配置加载状态

  // 加载资源配置（资源池 / 默认队列 / PFS 来自配置接口，队列列表依赖资源池 ID）
  const loadResourceConfig = async () => {
    setConfigLoading(true);
    try {
      const [resourcePoolRes, queueRes, pfsRes] = await Promise.all([
        request('/api/config/ML_PLATFORM_RESOURCE_POOL_ID', { method: 'GET' }),
        request('/api/config/ML_PLATFORM_RESOURCE_QUEUE_ID', { method: 'GET' }),
        request('/api/config/ML_PLATFORM_RESOURCE_PFS_INSTANCE_ID', { method: 'GET' }),
      ]);

      const resourcePoolId = resourcePoolRes?.success ? resourcePoolRes.data?.value || '' : '';
      const queueId = queueRes?.success ? queueRes.data?.value || '' : '';
      const pfsInstanceId = pfsRes?.success ? pfsRes.data?.value || '' : '';

      const newConfig = {
        resourcePoolId,
        queueId,
        pfsInstanceId,
      };

      setResourceConfig(newConfig);
      setConfigQueueId(queueId);

      if (resourcePoolId) {
        await fetchQueueList(resourcePoolId);
      } else {
        setQueueList([]);
      }
      return newConfig;
    } catch (error) {
      console.error('加载资源配置失败:', error);
      return undefined;
    } finally {
      setConfigLoading(false);
    }
  };

  useEffect(() => {
    loadResourceConfig();
  }, []);

  // 获取队列详情（可选传入 queueId，用于刚设为默认后立即拉取）
  const fetchQueueDetail = async (overrideQueueId?: string) => {
    const targetQueueId = overrideQueueId ?? configQueueId;
    if (!targetQueueId) {
      messageApi.warning('请先在系统设置中配置 ML_PLATFORM_RESOURCE_QUEUE_ID');
      return;
    }

    setLoading(true);
    try {
      const response = await request(`/api/resources/queues/${targetQueueId}`, {
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

        if (actualQueue?.resourcePoolId) {
          fetchQueueList(actualQueue.resourcePoolId);
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

  // 获取队列列表
  const fetchQueueList = async (resourcePoolId: string) => {
    if (!resourcePoolId) {
      setQueueList([]);
      return;
    }

    setQueueListLoading(true);
    try {
      const response = await request('/api/resources/queues', {
        method: 'GET',
        params: {
          // resourcePoolId: 'aihc-serverless',
          resourcePoolId: resourcePoolId,
          pageSize: 1000, // 使用较大的 pageSize 以获取更多队列
          pageNumber: 1,
        },
      });

      if (response.success) {
        // 处理响应数据格式
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

        // 只提取子队列，不展示父队列
        const childQueues: QueueDetail[] = [];
        queues.forEach((queue: any) => {
          // 只添加所有子队列，不添加父队列
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
        messageApi.error(response.message || '获取队列列表失败');
        setQueueList([]);
      }
    } catch (error: any) {
      console.error('获取队列列表失败:', error);
      const errorMessage = error?.info?.errorMessage || error?.message || '获取队列列表失败';
      messageApi.error(errorMessage);
      setQueueList([]);
    } finally {
      setQueueListLoading(false);
    }
  };

  const openQueueRowDetail = async (queueId: string) => {
    setQueueDetailDrawerOpen(true);
    setQueueRowDetail(null);
    setQueueRowDetailLoading(true);
    try {
      const response = await request(`/api/resources/queues/${queueId}`, {
        method: 'GET',
      });
      if (response.success) {
        const data = response.data;
        const queue = data?.queue || data || null;
        let actualQueue: QueueDetail | null = null;
        if (
          queue?.children &&
          Array.isArray(queue.children) &&
          queue.children.length > 0
        ) {
          actualQueue = queue.children[0];
          if (actualQueue && !actualQueue.bindingNodes && queue.bindingNodes) {
            actualQueue.bindingNodes = queue.bindingNodes;
          }
        } else {
          actualQueue = queue || null;
        }
        setQueueRowDetail(actualQueue);
      } else {
        messageApi.error(response.message || '获取队列详情失败');
      }
    } catch (error: any) {
      console.error('获取队列详情失败:', error);
      messageApi.error(error?.message || '获取队列详情失败');
    } finally {
      setQueueRowDetailLoading(false);
    }
  };

  const handleSetDefaultQueue = async (queueId: string) => {
    setSettingDefaultQueueId(queueId);
    try {
      const response = await updateConfig({
        config: { ML_PLATFORM_RESOURCE_QUEUE_ID: queueId } as any,
      });
      if (response.success) {
        messageApi.success('已设为默认队列');
        setResourceConfig((prev) => ({ ...prev, queueId }));
        setConfigQueueId(queueId);
        await fetchQueueDetail(queueId);
      } else {
        messageApi.error(response.message || '设置失败');
      }
    } catch (error: any) {
      console.error('设置默认队列失败:', error);
      messageApi.error(
        error?.info?.errorMessage || error?.message || '设置默认队列失败',
      );
    } finally {
      setSettingDefaultQueueId('');
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
          resourcePoolId: 'aihc-serverless',
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

  const handleRefresh = async () => {
    const cfg = await loadResourceConfig();
    if (cfg?.queueId) {
      fetchQueueDetail(cfg.queueId);
    fetchMlpCookerJob();
    }
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
          rowKey={(record) => `${record.acceleratorType}-${record.acceleratorDescription || ''}`}
          pagination={false}
          size="small"
        />
      </div>
    );
  };

  const defaultQueueStatistics = React.useMemo(
    () => computeQueueStatistics(actualQueueDetail),
    [actualQueueDetail],
  );

  const renderDefaultQueueSection = () => {
    if (!configQueueId) return null;

    if (!actualQueueDetail) {
      return (
        <Card
          style={{
            marginBottom: 24,
            borderRadius: 8,
            border: '1px solid #ffd666',
            background: '#fffbe6',
          }}
          styles={{ body: { padding: '16px 24px' } }}
        >
          <Space size={16}>
            <PartitionOutlined style={{ fontSize: 32, color: '#faad14' }} />
            <div>
              <div style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 12, marginBottom: 4 }}>
                默认队列 (ML_PLATFORM_RESOURCE_QUEUE_ID)
              </div>
              <Text strong style={{ fontSize: 16 }}>
                {configQueueId}
              </Text>
              <Tag color="warning" style={{ marginLeft: 8 }}>
                正在加载队列详情或 ID 不存在
              </Tag>
            </div>
          </Space>
        </Card>
      );
    }

    const stats = defaultQueueStatistics;

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
            <PartitionOutlined style={{ fontSize: 40, color: '#1890ff' }} />
          </Col>
          <Col flex={1}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                当前默认队列 (ML_PLATFORM_RESOURCE_QUEUE_ID)
              </Text>
            </div>
            <Space align="center" size={12}>
              <Title level={4} style={{ margin: 0 }}>
                {actualQueueDetail.queueName || actualQueueDetail.queueId}
              </Title>
              <Tag color={actualQueueDetail.opened ? 'success' : 'default'}>
                {actualQueueDetail.opened ? '已开启' : '已关闭'}
              </Tag>
              <Text type="secondary" style={{ fontSize: 13 }}>
                所属资源池: {actualQueueDetail.resourcePoolId || '-'}
              </Text>
            </Space>
          </Col>
          <Col>
            <Space size={32}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 12, marginBottom: 4 }}>
                  加速卡配额
                </div>
                <div style={{ fontSize: 20, fontWeight: 500, color: '#722ed1' }}>
                  {stats.totalAccelerators}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 12, marginBottom: 4 }}>
                  CPU 配额
                </div>
                <div style={{ fontSize: 20, fontWeight: 500 }}>
                  {stats.totalCpuCores.toFixed(1)}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 12, marginBottom: 4 }}>
                  内存配额 (GB)
                </div>
                <div style={{ fontSize: 20, fontWeight: 500 }}>
                  {stats.totalMemoryGi.toFixed(1)}
                </div>
              </div>
              <Button
                type="primary"
                ghost
                icon={<EyeOutlined />}
                onClick={() => openQueueRowDetail(actualQueueDetail.queueId || '')}
              >
                详情
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>
    );
  };

  const drawerQueueStatistics = React.useMemo(
    () => computeQueueStatistics(queueRowDetail),
    [queueRowDetail],
  );

  return (
    <PageContainer
      header={{
        title: '队列管理',
        breadcrumb: {},
        extra: [
          <Checkbox
            key="onlyWithAcc"
            checked={onlyWithAcc}
            onChange={(e) => setOnlyWithAcc(e.target.checked)}
          >
            仅显示有加速卡
          </Checkbox>,
          <Button
            key="refresh"
            type="primary"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={loading || queueListLoading || configLoading}
          >
            刷新
          </Button>,
        ],
      }}
    >
      {configLoading ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Spin tip="加载配置中..." />
        </div>
      ) : !resourceConfig.resourcePoolId ? (
        <Card>
          <Text type="warning">
            未配置默认资源池。请在「资源池」页面将目标资源池设为默认，或配置 ML_PLATFORM_RESOURCE_POOL_ID。
          </Text>
        </Card>
      ) : (
        <>
          {renderDefaultQueueSection()}
          <Card>
            <Spin spinning={queueListLoading}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              当前资源池（{resourceConfig.resourcePoolId}）下的所有队列
              </Text>
              {queueList.length > 0 ? (
                <Table
                  columns={[
                    {
                    title: '队列',
                      dataIndex: 'queueName',
                    key: 'queue',
                    width: 240,
                    render: (_: string, record: QueueDetail) => (
                      <div>
                        <div>{record.queueName || '-'}</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {record.queueId || '-'}
                        </Text>
                      </div>
                    ),
                    },
                    {
                      title: '队列类型',
                      dataIndex: 'queueType',
                      key: 'queueType',
                      width: 120,
                      render: (type: string) => {
                        const typeMap: Record<string, string> = {
                          Physical: '物理队列',
                          Elastic: '弹性队列',
                        };
                        return (
                          <Tag color={type === 'Elastic' ? 'blue' : 'default'}>
                            {typeMap[type] || type || '-'}
                          </Tag>
                        );
                      },
                    },
                    {
                      title: '状态',
                      dataIndex: 'opened',
                      key: 'opened',
                      width: 100,
                      render: (opened: boolean) => (
                        <Tag color={opened ? 'success' : 'default'}>
                          {opened ? '开启' : '关闭'}
                        </Tag>
                      ),
                    },
                    {
                      title: '运行中任务',
                      dataIndex: 'runningJobs',
                      key: 'runningJobs',
                      width: 120,
                      render: (count: number | undefined) => count || 0,
                    },
                    {
                      title: 'CPU配额',
                      key: 'cpu',
                    width: 120,
                      render: (_: any, record: QueueDetail) => {
                        const cpu = record.deserved?.cpuCores
                          ? parseFloat(String(record.deserved.cpuCores)).toFixed(2)
                          : record.deserved?.milliCPUcores
                            ? (parseFloat(String(record.deserved.milliCPUcores)) / 1000).toFixed(2)
                            : '0';
                        return `${cpu} 核`;
                      },
                    },
                    {
                      title: '内存配额',
                      key: 'memory',
                    width: 120,
                      render: (_: any, record: QueueDetail) => {
                        const memory = record.deserved?.memoryGi
                          ? parseFloat(String(record.deserved.memoryGi)).toFixed(2)
                          : '0';
                        return `${memory} GB`;
                      },
                    },
                    {
                      title: '加速卡',
                      key: 'accelerators',
                      width: 200,
                      render: (_: any, record: QueueDetail) => {
                        if (!record.deserved?.acceleratorCardList?.length) {
                          return '-';
                        }
                        return (
                          <Space wrap size="small">
                            {record.deserved.acceleratorCardList.map((card, index) => (
                              <Tag key={index} color="purple">
                                {card.acceleratorType}: {card.acceleratorCount}
                              </Tag>
                            ))}
                          </Space>
                        );
                      },
                    },
                    {
                      title: '创建时间',
                      dataIndex: 'createdAt',
                      key: 'createdAt',
                      width: 180,
                      render: (text: string) =>
                        text ? new Date(text).toLocaleString('zh-CN') : '-',
                    },
                  {
                    title: '操作',
                    key: 'actions',
                    width: 160,
                    fixed: 'right',
                    render: (_: unknown, record: QueueDetail) => {
                      const qid = record.queueId;
                      if (!qid) return '-';
                      const isDefault = qid === configQueueId;
                      return (
                        <Space size={4}>
                          <Button
                            type="link"
                            size="small"
                            onClick={() => openQueueRowDetail(qid)}
                          >
                            详情
                          </Button>
                          {isDefault ? (
                            <Button type="link" size="small" disabled>默认</Button>
                          ) : (
                            <Button
                              type="link"
                              size="small"
                              loading={settingDefaultQueueId === qid}
                              onClick={() => handleSetDefaultQueue(qid)}
                            >
                              设为默认
                            </Button>
                          )}
                        </Space>
                      );
                    },
                  },
                  ]}
                  dataSource={queueList.filter(
                    (q) =>
                      !onlyWithAcc ||
                      (q.deserved?.acceleratorCardList?.length ?? 0) > 0,
                  )}
                  rowKey={(record) => record.queueId || `queue-${Math.random()}`}
                  pagination={{
                    defaultPageSize: 100,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50', '100', '200'],
                    showTotal: (total) => `共 ${total} 条队列`,
                  }}
                  size="small"
                scroll={{ x: 1220 }}
                />
              ) : !queueListLoading ? (
              <Text type="secondary">暂无队列数据</Text>
              ) : null}
            </Spin>
          </Card>
        </>
      )}

      <Drawer
        title={queueRowDetail?.queueName || '队列详情'}
        width={960}
        open={queueDetailDrawerOpen}
        onClose={() => {
          setQueueDetailDrawerOpen(false);
          setQueueRowDetail(null);
        }}
      >
        <Spin spinning={queueRowDetailLoading}>
          {queueRowDetail ? (
            <QueueDefaultInfoContent
              queue={queueRowDetail}
              stats={drawerQueueStatistics}
              showMlpCookerJob={queueRowDetail.queueId === configQueueId}
              renderAcceleratorTable={
                renderAcceleratorTable as RenderAcceleratorTableFn
              }
              mlpCookerJob={mlpCookerJob}
              mlpCookerJobLoading={mlpCookerJobLoading}
              initializing={initializing}
              onInitializeMlpCooker={handleInitializeMlpCooker}
            />
          ) : !queueRowDetailLoading ? (
            <Text type="secondary">暂无数据</Text>
          ) : null}
        </Spin>
      </Drawer>
    </PageContainer>
  );
};

export default Resource;
