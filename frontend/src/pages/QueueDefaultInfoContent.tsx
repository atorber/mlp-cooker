import { ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import React from 'react';

const { Title, Text } = Typography;

export interface AcceleratorCardItem {
  acceleratorCount: string;
  acceleratorType: string;
  acceleratorDescription: string;
}

export interface ResourceInfoItem {
  milliCPUcores?: string;
  cpuCores?: string;
  memoryGi?: string | number;
  acceleratorCardList?: AcceleratorCardItem[];
}

export interface QueueDetailPanel {
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
  capability?: ResourceInfoItem;
  deserved?: ResourceInfoItem;
  allocated?: ResourceInfoItem;
  runningJobs?: number;
  bindingNodes?: Array<{
    machineSpec?: string;
    nodeNameList?: string[];
    count?: number;
    acceleratorType?: string;
  }>;
}

export type QueueResourceStatistics = {
  totalAccelerators: number;
  allocatedAccelerators: number;
  availableAccelerators: number;
  totalCpuCores: number;
  allocatedCpuCores: number;
  availableCpuCores: number;
  totalMemoryGi: number;
  allocatedMemoryGi: number;
  availableMemoryGi: number;
  totalRunningJobs: number;
};

/** 与 Resource 页内 renderAcceleratorTable 签名对齐（结构兼容即可） */
export type RenderAcceleratorTableFn = (
  title: string,
  capability?: ResourceInfoItem | undefined,
  deserved?: ResourceInfoItem | undefined,
  allocated?: ResourceInfoItem | undefined,
) => React.ReactElement | null;

export type QueueDefaultInfoContentProps = {
  queue: QueueDetailPanel;
  stats: QueueResourceStatistics;
  showMlpCookerJob: boolean;
  renderAcceleratorTable: RenderAcceleratorTableFn;
  mlpCookerJob: any | null;
  mlpCookerJobLoading: boolean;
  initializing: boolean;
  onInitializeMlpCooker: () => void;
};

export const QueueDefaultInfoContent: React.FC<QueueDefaultInfoContentProps> = ({
  queue,
  stats,
  showMlpCookerJob,
  renderAcceleratorTable,
  mlpCookerJob,
  mlpCookerJobLoading,
  initializing,
  onInitializeMlpCooker,
}) => (
  <>
    {showMlpCookerJob && (
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Title level={5} style={{ margin: 0 }}>
            MLP Cooker 组件
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
                          statusTextMap[status] || mlpCookerJob.status || '未知';
                        const color =
                          status === 'running'
                            ? 'success'
                            : status === 'pending'
                              ? 'warning'
                              : status === 'stopped' || status === 'completed'
                                ? 'default'
                                : status === 'error' || status === 'failed'
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
                description="这是一个组件，用于通过 WebShell 连接集群。"
              />
            ) : (
              <Alert
                message="未找到 mlp-cooker 任务"
                description="点击下方按钮初始化一个组件，该组件将运行 sleep 10000d 命令，用于后续通过 WebShell 连接集群。"
                type="warning"
                showIcon
                action={
                  <Button
                    type="primary"
                    icon={<ThunderboltOutlined />}
                    onClick={onInitializeMlpCooker}
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
    )}

    <Card style={{ marginBottom: 16 }}>
      <Space size="large" wrap>
        <Statistic title="队列名称" value={queue.queueName || '-'} />
        <Statistic title="队列ID" value={queue.queueId || '-'} />
        <Statistic title="队列类型" value={queue.queueType || '-'} />
        <Statistic
          title="状态"
          value={queue.opened ? '开启' : '关闭'}
          valueStyle={{
            color: queue.opened ? '#3f8600' : '#cf1322',
          }}
        />
        {stats.totalRunningJobs > 0 && (
          <Statistic
            title="运行中任务"
            value={queue.runningJobs || 0}
            prefix={<ReloadOutlined />}
          />
        )}
      </Space>
    </Card>

    <Card style={{ marginBottom: 16 }}>
      <Title level={4}>资源统计</Title>
      <div style={{ marginTop: 16 }}>
        <Title level={5}>加速卡</Title>
        <Space size="large" style={{ marginTop: 8 }} wrap>
          <Statistic title="总量" value={stats.totalAccelerators.toFixed(2)} suffix="张" />
          <Statistic title="分配量" value={stats.allocatedAccelerators.toFixed(2)} suffix="张" />
          <Statistic title="最大可用量" value={stats.availableAccelerators.toFixed(2)} suffix="张" />
          <Statistic
            title="使用率"
            value={
              stats.totalAccelerators > 0
                ? ((stats.allocatedAccelerators / stats.totalAccelerators) * 100).toFixed(2)
                : 0
            }
            suffix="%"
            valueStyle={{
              color:
                stats.totalAccelerators > 0 &&
                (stats.allocatedAccelerators / stats.totalAccelerators) * 100 >= 90
                  ? '#cf1322'
                  : stats.totalAccelerators > 0 &&
                      (stats.allocatedAccelerators / stats.totalAccelerators) * 100 >= 70
                    ? '#faad14'
                    : '#3f8600',
            }}
          />
        </Space>
      </div>
      <div style={{ marginTop: 24 }}>
        <Title level={5}>CPU</Title>
        <Space size="large" style={{ marginTop: 8 }} wrap>
          <Statistic title="总量" value={stats.totalCpuCores.toFixed(2)} suffix="核" />
          <Statistic title="分配量" value={stats.allocatedCpuCores.toFixed(2)} suffix="核" />
          <Statistic title="最大可用量" value={stats.availableCpuCores.toFixed(2)} suffix="核" />
          <Statistic
            title="使用率"
            value={
              stats.totalCpuCores > 0
                ? ((stats.allocatedCpuCores / stats.totalCpuCores) * 100).toFixed(2)
                : 0
            }
            suffix="%"
            valueStyle={{
              color:
                stats.totalCpuCores > 0 &&
                (stats.allocatedCpuCores / stats.totalCpuCores) * 100 >= 90
                  ? '#cf1322'
                  : stats.totalCpuCores > 0 &&
                      (stats.allocatedCpuCores / stats.totalCpuCores) * 100 >= 70
                    ? '#faad14'
                    : '#3f8600',
            }}
          />
        </Space>
      </div>
      <div style={{ marginTop: 24 }}>
        <Title level={5}>内存</Title>
        <Space size="large" style={{ marginTop: 8 }} wrap>
          <Statistic title="总量" value={stats.totalMemoryGi.toFixed(2)} suffix="GB" />
          <Statistic title="分配量" value={stats.allocatedMemoryGi.toFixed(2)} suffix="GB" />
          <Statistic title="最大可用量" value={stats.availableMemoryGi.toFixed(2)} suffix="GB" />
          <Statistic
            title="使用率"
            value={
              stats.totalMemoryGi > 0
                ? ((stats.allocatedMemoryGi / stats.totalMemoryGi) * 100).toFixed(2)
                : 0
            }
            suffix="%"
            valueStyle={{
              color:
                stats.totalMemoryGi > 0 &&
                (stats.allocatedMemoryGi / stats.totalMemoryGi) * 100 >= 90
                  ? '#cf1322'
                  : stats.totalMemoryGi > 0 &&
                      (stats.allocatedMemoryGi / stats.totalMemoryGi) * 100 >= 70
                    ? '#faad14'
                    : '#3f8600',
            }}
          />
        </Space>
      </div>
    </Card>

    <Card style={{ marginBottom: 16 }}>
      <Title level={4}>队列基本信息</Title>
      <Descriptions column={2} bordered style={{ marginTop: 16 }}>
        <Descriptions.Item label="队列ID">{queue.queueId || '-'}</Descriptions.Item>
        <Descriptions.Item label="队列名称">{queue.queueName || '-'}</Descriptions.Item>
        <Descriptions.Item label="队列类型">{queue.queueType || '-'}</Descriptions.Item>
        <Descriptions.Item label="资源池ID">{queue.resourcePoolId || '-'}</Descriptions.Item>
        {queue.parentQueue && (
          <Descriptions.Item label="父队列">{queue.parentQueue}</Descriptions.Item>
        )}
        {queue.runningJobs !== undefined && (
          <Descriptions.Item label="运行中任务数">{queue.runningJobs}</Descriptions.Item>
        )}
        <Descriptions.Item label="状态">
          <Tag color={queue.opened ? 'success' : 'default'}>
            {queue.opened ? '开启' : '关闭'}
          </Tag>
        </Descriptions.Item>
        {queue.reclaimable !== undefined && (
          <Descriptions.Item label="可回收">
            <Tag color={queue.reclaimable ? 'success' : 'default'}>
              {queue.reclaimable ? '是' : '否'}
            </Tag>
          </Descriptions.Item>
        )}
        {queue.preemptable !== undefined && (
          <Descriptions.Item label="可抢占">
            <Tag color={queue.preemptable ? 'warning' : 'default'}>
              {queue.preemptable ? '是' : '否'}
            </Tag>
          </Descriptions.Item>
        )}
        {queue.disableOversell !== undefined && (
          <Descriptions.Item label="禁用超卖">
            <Tag color={!queue.disableOversell ? 'success' : 'default'}>
              {!queue.disableOversell ? '允许' : '禁止'}
            </Tag>
          </Descriptions.Item>
        )}
        {queue.queueingStrategy && (
          <Descriptions.Item label="调度策略">{queue.queueingStrategy}</Descriptions.Item>
        )}
        {queue.requeueTimeout !== undefined && (
          <Descriptions.Item label="重入队超时">{queue.requeueTimeout}</Descriptions.Item>
        )}
        {queue.enableVGPU !== undefined && (
          <Descriptions.Item label="支持vGPU">
            <Tag color={queue.enableVGPU ? 'success' : 'default'}>
              {queue.enableVGPU ? '是' : '否'}
            </Tag>
          </Descriptions.Item>
        )}
        <Descriptions.Item label="创建时间">
          {queue.createdAt
            ? new Date(queue.createdAt).toLocaleString('zh-CN')
            : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="更新时间">
          {queue.updatedAt
            ? new Date(queue.updatedAt).toLocaleString('zh-CN')
            : '-'}
        </Descriptions.Item>
      </Descriptions>
    </Card>

    {queue.bindingNodes && queue.bindingNodes.length > 0 && (
      <Card style={{ marginBottom: 16 }}>
        <Title level={4}>绑定节点信息</Title>
        <Table
          columns={[
            { title: '机器规格', dataIndex: 'machineSpec', key: 'machineSpec' },
            { title: '加速卡类型', dataIndex: 'acceleratorType', key: 'acceleratorType' },
            { title: '节点数量', dataIndex: 'count', key: 'count' },
            {
              title: '节点列表',
              dataIndex: 'nodeNameList',
              key: 'nodeNameList',
              render: (nodeNameList: string[] | undefined) => {
                if (!nodeNameList || nodeNameList.length === 0) return '-';
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
          dataSource={queue.bindingNodes}
          rowKey={(record) =>
            `${record.machineSpec || ''}-${record.acceleratorType || ''}-${record.count || 0}`
          }
          pagination={false}
          size="small"
        />
      </Card>
    )}

    <Card style={{ marginBottom: 16 }}>
      <Title level={4}>资源详情</Title>
      {(queue.capability || queue.deserved || queue.allocated) && (
        <div style={{ marginTop: 16 }}>
          <Title level={5}>CPU和内存</Title>
          <Descriptions column={2} bordered style={{ marginTop: 8 }}>
            <Descriptions.Item label="CPU总容量（核）">
              {queue.capability?.cpuCores ||
                (queue.capability?.milliCPUcores
                  ? (
                      parseFloat(String(queue.capability.milliCPUcores)) / 1000
                    ).toFixed(2)
                  : '-')}
            </Descriptions.Item>
            <Descriptions.Item label="CPU应得配额（核）">
              {queue.deserved?.cpuCores ||
                (queue.deserved?.milliCPUcores
                  ? (
                      parseFloat(String(queue.deserved.milliCPUcores)) / 1000
                    ).toFixed(2)
                  : '-')}
            </Descriptions.Item>
            <Descriptions.Item label="CPU已分配（核）">
              {queue.allocated?.cpuCores ||
                (queue.allocated?.milliCPUcores
                  ? (
                      parseFloat(String(queue.allocated.milliCPUcores)) / 1000
                    ).toFixed(2)
                  : '-') ||
                '0'}
            </Descriptions.Item>
            <Descriptions.Item label="CPU可用（核）">
              {(() => {
                const deservedNum = queue.deserved?.cpuCores
                  ? parseFloat(String(queue.deserved.cpuCores))
                  : queue.deserved?.milliCPUcores
                    ? parseFloat(String(queue.deserved.milliCPUcores)) / 1000
                    : 0;
                const allocatedNum = queue.allocated?.cpuCores
                  ? parseFloat(String(queue.allocated.cpuCores))
                  : queue.allocated?.milliCPUcores
                    ? parseFloat(String(queue.allocated.milliCPUcores || '0')) / 1000
                    : 0;
                return deservedNum > 0 ? (deservedNum - allocatedNum).toFixed(2) : '-';
              })()}
            </Descriptions.Item>
            <Descriptions.Item label="内存总容量（GB）">
              {queue.capability?.memoryGi
                ? (() => {
                    const memoryGi = queue.capability.memoryGi;
                    if (typeof memoryGi === 'number') return memoryGi.toFixed(2);
                    const num = parseFloat(String(memoryGi));
                    if (Number.isNaN(num)) return '-';
                    return num > 1000000
                      ? (num / (1024 * 1024 * 1024)).toFixed(2)
                      : num.toFixed(2);
                  })()
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="内存应得配额（GB）">
              {queue.deserved?.memoryGi
                ? (() => {
                    const memoryGi = queue.deserved.memoryGi;
                    if (typeof memoryGi === 'number') return memoryGi.toFixed(2);
                    const num = parseFloat(String(memoryGi));
                    return Number.isNaN(num) ? '-' : num.toFixed(2);
                  })()
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="内存已分配（GB）">
              {queue.allocated?.memoryGi
                ? (() => {
                    const memoryGi = queue.allocated.memoryGi;
                    if (typeof memoryGi === 'number') return memoryGi.toFixed(2);
                    const num = parseFloat(String(memoryGi));
                    return Number.isNaN(num) ? '0' : num.toFixed(2);
                  })()
                : '0'}
            </Descriptions.Item>
            <Descriptions.Item label="内存可用（GB）">
              {(() => {
                const deserved = queue.deserved?.memoryGi
                  ? typeof queue.deserved.memoryGi === 'number'
                    ? queue.deserved.memoryGi
                    : parseFloat(String(queue.deserved.memoryGi))
                  : 0;
                const allocated = queue.allocated?.memoryGi
                  ? typeof queue.allocated.memoryGi === 'number'
                    ? queue.allocated.memoryGi
                    : parseFloat(String(queue.allocated.memoryGi || '0'))
                  : 0;
                return deserved > 0 ? (deserved - allocated).toFixed(2) : '-';
              })()}
            </Descriptions.Item>
          </Descriptions>
        </div>
      )}
      {renderAcceleratorTable(
        '加速卡资源情况',
        queue.capability,
        queue.deserved,
        queue.allocated,
      )}
    </Card>
  </>
);
