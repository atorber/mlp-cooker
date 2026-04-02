import {
  DownOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { ActionType } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { request } from '@umijs/max';
import {
  App,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Form,
  Dropdown,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Tag,
} from 'antd';
import type { MenuProps } from 'antd';
import React, { useEffect, useRef, useState } from 'react';

const { Option } = Select;

// 开发机类型定义
type DevInstance = {
  id: string;
  name: string;
  status: number;
  statusReason?: string;
  creator: string;
  queueName: string;
  resourcePoolId: string;
  resourcePoolName: string;
  imageUrl: string;
  resources: {
    cpus: number;
    memory: number;
    shmSize: number;
    acceleratorCount: number;
    acceleratorType: string;
  };
  createdAt: number;
  updatedAt: number;
};

// 常见加速卡类型（供用户选择）
const ACCELERATOR_TYPES = [
  { label: '无 (CPU机器)', value: '' },
  { label: 'NVIDIA vGPU', value: 'nvidia.com/vgpu' },
  { label: 'NVIDIA GPU (A100/A800等)', value: 'nvidia.com/gpu' },
  { label: '昆仑芯 XPU', value: 'kunlunxin.com/xpu' },
  { label: '昇腾 NPU', value: 'huawei.com/npu' },
  { label: 'RTX 4090', value: 'baidu.com/rtx_4090_cgpu' },
];

const DevMachine = () => {
  const { message } = App.useApp();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<DevInstance | null>(
    null,
  );
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();
  const proTableRef = useRef<ActionType>(null);
  
  // 资源池与队列状态
  const [resourcePools, setResourcePools] = useState<any[]>([]);
  const [queues, setQueues] = useState<any[]>([]);

  // 获取各种元数据（建表单时使用）
  useEffect(() => {
    request('/api/resources/pools', { method: 'GET' }).then((res) => {
      if (res.success && res.data) {
        let list = [];
        if (Array.isArray(res.data)) list = res.data;
        else if (Array.isArray(res.data.resourcePools)) list = res.data.resourcePools;
        else if (Array.isArray(res.data.list)) list = res.data.list;
        setResourcePools(list);
      }
    });
  }, []);

  // 当选择的资源池变化时，请求对应的队列列表
  const selectedPoolId = Form.useWatch('resourcePoolId', form);
  useEffect(() => {
    if (selectedPoolId) {
      request('/api/resources/queues', {
        method: 'GET',
        params: { resourcePoolId: selectedPoolId, includeDetails: 'true' },
      }).then((res) => {
        if (res.success && res.data) {
          let list = [];
          if (Array.isArray(res.data)) list = res.data;
          else if (Array.isArray(res.data.queues)) list = res.data.queues;
          else if (Array.isArray(res.data.list)) list = res.data.list;
          setQueues(list);
        } else {
          setQueues([]);
        }
      });
    } else {
      setQueues([]);
    }
  }, [selectedPoolId]);

  // 获取开发机列表
  const fetchInstances = async (params: any) => {
    try {
      const result = await request('/api/dev-instances', {
        method: 'POST',
        data: {
          pageNo: params.current,
          pageSize: params.pageSize,
        },
      });

      if (result.success) {
        return {
          data: result.data.list,
          success: true,
          total: result.data.count,
        };
      } else {
        message.error(result.message || '获取开发机列表失败');
        return { data: [], success: false, total: 0 };
      }
    } catch (error) {
      console.error('Fetch error:', error);
      message.error('获取开发机列表失败');
      return { data: [], success: false, total: 0 };
    }
  };

  // 创建开发机
  const handleCreate = async (values: any) => {
    try {
      // 组装参数
      const payload = {
        name: values.name,
        desc: values.desc,
        image: values.image,
        resourcePoolId: values.resourcePoolId,
        queueName: values.queueName,
        resources: {
          cpu: values.cpu,
          memory: values.memory,
          shmSize: values.shmSize,
          acceleratorCount: values.acceleratorCount,
          acceleratorType: values.acceleratorType,
        },
      };

      const result = await request('/api/dev-instances/create', {
        method: 'POST',
        data: payload,
      });

      if (result.success) {
        message.success('创建开发机成功');
        setCreateModalVisible(false);
        form.resetFields();
        proTableRef.current?.reload();
      } else {
        message.error(result.message || result.error || '创建开发机失败');
      }
    } catch (error) {
      console.error('Create error:', error);
      message.error('创建开发机网络请求失败');
    }
  };

  // 停止开发机
  const handleStop = async (id: string) => {
    try {
      const result = await request(`/api/dev-instances/${id}/stop`, {
        method: 'POST',
      });
      if (result.success) {
        message.success('已发送停止指令');
        proTableRef.current?.reload();
      } else {
        message.error(result.message || '停止失败');
      }
    } catch (e) {
      message.error('请求失败');
    }
  };

  // 删除开发机
  const handleDelete = async (id: string) => {
    try {
      const result = await request(`/api/dev-instances/${id}`, {
        method: 'DELETE',
      });
      if (result.success) {
        message.success('已删除开发机');
        proTableRef.current?.reload();
      } else {
        message.error(result.message || '删除失败');
      }
    } catch (e) {
      message.error('请求失败');
    }
  };

  // 获取状态标签
  const getStatusBadge = (status: number, reason?: string) => {
    // 简单映射: 3=运行中, 其他=变动中/已停止
    if (status === 3) return <Badge status="success" text="运行中" />;
    return <Badge status="default" text={`状态码: ${status} ${reason || ''}`} />;
  };

  const columns = [
    {
      title: '实例名称 / ID',
      dataIndex: 'name',
      key: 'name',
      width: 250,
      render: (dom: any, record: DevInstance) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.name}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{record.id}</div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (dom: any, record: DevInstance) =>
        getStatusBadge(record.status, record.statusReason),
    },
    {
      title: '资源规格',
      key: 'resources',
      width: 200,
      render: (_: any, record: DevInstance) => {
        const { cpus, memory, acceleratorCount, acceleratorType } =
          record.resources || {};
        const isGpu = acceleratorCount > 0;
        return (
          <Space direction="vertical" size={2}>
            <Tag color="geekblue">{cpus}C {memory}G</Tag>
            {isGpu && (
              <Tag color="purple">
                {acceleratorCount} * {acceleratorType.split('/').pop() || 'GPU'}
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: '位置 / 环境',
      key: 'env',
      width: 250,
      render: (_: any, record: DevInstance) => (
        <Space direction="vertical" size={2}>
          <div style={{ fontSize: 13 }}>
            [队列] {record.queueName}
          </div>
          <div style={{ fontSize: 12, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 230 }} title={record.imageUrl}>
            {record.imageUrl?.split('/').pop()}
          </div>
        </Space>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (dom: any, record: DevInstance) => (
        <span style={{ fontSize: 13, color: '#666' }}>
          {new Date(record.createdAt * 1000).toLocaleString()}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right' as const,
      render: (_: any, record: DevInstance) => {
        const canStop = record.status === 3 || record.status === 19;
        const canWebTerminal = record.status === 3;

        // Build list of functional actions
        const actions: { key: string; label: string; onClick: () => void; danger?: boolean; type?: 'divider' }[] = [
          { key: 'detail', label: '详情', onClick: () => { setSelectedInstance(record); setDrawerVisible(true); } },
        ];

        if (canWebTerminal) {
          actions.push({ key: 'terminal', label: 'Web终端', onClick: () => {
            window.open(`https://aihc.console.bce.baidu.com/aihc/development/instance/dev-machine/${record.id}?region=bj`, '_blank');
          }});
        }

        if (canStop) {
          actions.push({ key: 'stop', label: '停止', onClick: () => {
            Modal.confirm({ title: '确定停止该开发机?', okText: '确定', cancelText: '取消', onOk: () => handleStop(record.id) });
          }});
        }

        actions.push({ key: 'delete', label: '删除', danger: true, onClick: () => {
          Modal.confirm({ title: '此操作不可逆，确定删除该开发机?', okText: '确定', okType: 'danger', cancelText: '取消', onOk: () => handleDelete(record.id) });
        }});

        if (actions.length <= 2) {
          return (
            <Space size={4}>
              {actions.map(action => (
                <Button key={action.key} type="link" size="small" danger={action.danger} onClick={action.onClick}>
                  {action.label}
                </Button>
              ))}
            </Space>
          );
        }

        const [first, ...rest] = actions;
        const moreItems: MenuProps['items'] = rest.map((action, index) => {
          const items: any[] = [];
          // Add divider before 'delete' (which is always the last)
          if (action.key === 'delete' && index > 0) {
            items.push({ type: 'divider' });
          }
          items.push({ key: action.key, label: action.label, danger: action.danger, onClick: action.onClick });
          return items;
        }).flat();

        return (
          <Space size={4}>
            <Button type="link" size="small" onClick={first.onClick}>{first.label}</Button>
            <Dropdown menu={{ items: moreItems }} trigger={['click']}>
              <Button type="link" size="small" onClick={(e) => e.preventDefault()}>
                更多 <DownOutlined />
              </Button>
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  return (
    <PageContainer>
      <Card>
        <ProTable<DevInstance>
          actionRef={proTableRef}
          rowKey="id"
          search={false}
          request={fetchInstances}
          columns={columns}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1100 }}
          toolBarRender={() => [
            <Button
              key="create"
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                form.resetFields();
                // 默认值
                form.setFieldsValue({
                  cpu: 4,
                  memory: 16,
                  shmSize: 8,
                  acceleratorCount: 0,
                  acceleratorType: '',
                });
                setCreateModalVisible(true);
              }}
            >
              新建开发机
            </Button>,
          ]}
        />
      </Card>

      <Modal
        title="创建开发机"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={() => form.submit()}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="name"
            label="实例名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="输入仅包含小写字母、数字和连字符的名称" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="resourcePoolId"
                label="资源池"
                rules={[{ required: true, message: '请选择资源池' }]}
              >
                <Select placeholder="请选择分配资源的集群池">
                  {resourcePools.map((pool: any) => (
                    <Option key={pool.resourcePoolId} value={pool.resourcePoolId}>
                      {pool.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="queueName"
                label="资源队列"
                rules={[{ required: true, message: '请选择队列' }]}
              >
                <Select placeholder="请选择队列名称">
                  {queues.map((q: any) => (
                    <Option key={q.name} value={q.name}>
                      {q.name} (余卡: {q.quota?.accelerator?.free || 0})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="image" label="镜像地址 (Image URL)" rules={[{ required: true, message: '镜像地址不能为空' }]}>
            <Input placeholder="例如: ccr-registry.baidubce.com/aihc/aibox-pytorch:v1.0" />
          </Form.Item>

          <div style={{ background: '#fafafa', padding: 16, marginBottom: 16, borderRadius: 8 }}>
            <h4>💻 计算资源规格</h4>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="cpu" label="CPU内核心数 (C)">
                  <InputNumber style={{ width: '100%' }} min={1} max={256} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="memory" label="内存大小 (GB)">
                  <InputNumber style={{ width: '100%' }} min={2} max={1024} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="shmSize" label="共享内存 (GB)">
                  <InputNumber style={{ width: '100%' }} min={1} max={512} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={16}>
                <Form.Item name="acceleratorType" label="加速卡类型">
                  <Select>
                    {ACCELERATOR_TYPES.map(a => (
                      <Option key={a.value} value={a.value}>{a.label}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="acceleratorCount" label="加速卡数量">
                  <InputNumber style={{ width: '100%' }} min={0} max={8} />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <Form.Item name="desc" label="备注说明">
            <Input.TextArea placeholder="可选补充说明" rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="开发机详情"
        width={600}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        {selectedInstance && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="实例ID">{selectedInstance.id}</Descriptions.Item>
            <Descriptions.Item label="实例名称">{selectedInstance.name}</Descriptions.Item>
            <Descriptions.Item label="当前状态">
              {getStatusBadge(selectedInstance.status, selectedInstance.statusReason)}
            </Descriptions.Item>
            <Descriptions.Item label="创建者">{selectedInstance.creator}</Descriptions.Item>
            <Descriptions.Item label="资源池">
              {selectedInstance.resourcePoolName} ({selectedInstance.resourcePoolId})
            </Descriptions.Item>
            <Descriptions.Item label="所属队列">{selectedInstance.queueName}</Descriptions.Item>
            <Descriptions.Item label="镜像路径">
               <div style={{ wordBreak: 'break-all' }}>{selectedInstance.imageUrl}</div>
            </Descriptions.Item>
            <Descriptions.Item label="分配 CPU">{selectedInstance.resources?.cpus} 核</Descriptions.Item>
            <Descriptions.Item label="分配 内存">{selectedInstance.resources?.memory} GB</Descriptions.Item>
            <Descriptions.Item label="共享内存 (shm)">{selectedInstance.resources?.shmSize} GB</Descriptions.Item>
            <Descriptions.Item label="加速卡配置">
              {selectedInstance.resources?.acceleratorCount > 0
                ? `${selectedInstance.resources.acceleratorCount} 块 - ${selectedInstance.resources.acceleratorType}`
                : '无GPU'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {new Date(selectedInstance.createdAt * 1000).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="最后更新">
              {new Date(selectedInstance.updatedAt * 1000).toLocaleString()}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default DevMachine;
