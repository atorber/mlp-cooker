import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  DownOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  PageContainer,
  ProForm,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProTable,
} from '@ant-design/pro-components';
import {
  App,
  Badge,
  Button,
  Card,
  Descriptions,
  Drawer,
  Dropdown,
  Modal,
  Progress,
  Space,
  Tag,
  Tooltip,
} from 'antd';
import type { MenuProps } from 'antd';
import React, { useEffect, useState } from 'react';

// 任务类型定义
type DownloadTask = {
  taskId: string;
  jobId?: string;
  jobName?: string;
  aihcStatus?: string; // AIHC 任务状态
  type: string;
  source: string;
  sourceUrl: string;
  datasetName: string;
  description?: string;
  targetPath: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  progress: number;
  totalSize: number;
  downloadedSize: number;
  errorMessage?: string;
  ctime: number;
  mtime: number;
  startTime?: number;
  endTime?: number;
};

// 数据源类型
type DataSource = {
  value: string;
  label: string;
  description: string;
  urlExample: string;
};

const PublicDatasetDownload: React.FC = () => {
  const { message: messageApi } = App.useApp();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<DownloadTask | null>(null);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [form] = ProForm.useForm();
  const actionRef = React.useRef<ActionType>(null);
  const [parsing, setParsing] = useState(false);
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  // 用于临时存储从 AIHC 查询到的状态（不持久化）
  const [aihcStatusMap, setAihcStatusMap] = useState<Record<string, string>>(
    {},
  );

  // 加载支持的数据源
  useEffect(() => {
    fetchDataSources();
  }, []);

  // 自动查询任务状态（针对有 jobId 的任务）
  useEffect(() => {
    // 过滤出需要查询的任务
    // 排除已停止(ManualTermination)和失联(DISCONNECTED)状态的任务
    const tasksToUpdate = tasks.filter((task) => {
      if (!task.jobId) return false;

      // 获取当前的 AIHC 状态
      const aihcStatus = aihcStatusMap[task.taskId];

      // 如果状态是已停止或失联，不再查询
      if (aihcStatus === 'ManualTermination' || aihcStatus === 'DISCONNECTED') {
        return false;
      }

      // 其他情况都查询
      return true;
    });

    if (tasksToUpdate.length === 0) return;

    // 查询这些任务的状态
    const fetchJobStatuses = async () => {
      let _hasUpdate = false;
      const newStatusMap: Record<string, string> = { ...aihcStatusMap };

      // 使用 Promise.all 并发查询所有任务，即使某些失败也不影响其他任务
      const statusPromises = tasksToUpdate.map(async (task) => {
        try {
          const response = await fetch(
            `/api/public-dataset/download/tasks/${task.taskId}/job-status`,
          );
          const result = await response.json();

          if (result.success && result.data) {
            const aihcStatus = result.data.aihcStatus;
            // 将 AIHC 状态存储到内存映射中（不持久化）
            if (aihcStatus) {
              newStatusMap[task.taskId] = aihcStatus;
              console.log(`✅ 任务 ${task.taskId} AIHC状态: ${aihcStatus}`);
              return true; // 表示有更新
            }
          } else if (!result.success) {
            // 任务查询失败（可能已被删除），标记为失联状态
            console.warn(
              `⚠️ 任务 ${task.taskId} 查询失败: ${result.message || '未知错误'}`,
            );

            // 设置为失联状态
            newStatusMap[task.taskId] = 'DISCONNECTED';

            // 如果是 Job not found 错误
            if (result.message?.includes('not found')) {
              console.log(`任务 ${task.taskId} 的 Job 已被删除，标记为失联`);
            }

            return true; // 表示有更新，需要刷新显示
          }
          return false;
        } catch (error) {
          console.error(`❌ 查询任务 ${task.taskId} 状态异常:`, error);
          // 即使出错也继续查询其他任务
          return false;
        }
      });

      // 等待所有查询完成
      const results = await Promise.all(statusPromises);
      _hasUpdate = results.some((r) => r === true);

      // 更新 AIHC 状态映射
      setAihcStatusMap(newStatusMap);

      // 注意：不刷新任务列表，只更新状态映射
      // 状态变化会自动触发组件重新渲染显示最新状态
      // 避免频繁刷新任务列表
    };

    // 页面加载时立即查询一次
    fetchJobStatuses();

    // 设置定时刷新（每 15 秒查询一次）
    const interval = setInterval(fetchJobStatuses, 15000);

    // 清理定时器
    return () => clearInterval(interval);
  }, [tasks.length]); // 只在任务数量变化时重新设置定时器

  const fetchDataSources = async () => {
    try {
      const response = await fetch('/api/public-dataset/download/sources');
      const result = await response.json();
      if (result.success) {
        setDataSources(result.data);
      }
    } catch (error) {
      console.error('获取数据源列表失败:', error);
    }
  };

  // 创建下载任务
  const handleCreateTask = async (values: any) => {
    try {
      const response = await fetch('/api/public-dataset/download/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (result.success) {
        messageApi.success('创建下载任务成功');
        setCreateModalVisible(false);
        form.resetFields();
        actionRef.current?.reload();
      } else {
        messageApi.error(result.message || '创建下载任务失败');
      }
    } catch (error) {
      console.error('创建下载任务失败:', error);
      messageApi.error('创建下载任务失败');
    }
  };

  // 删除任务
  const handleDeleteTask = async (taskId: string) => {
    try {
      const response = await fetch(
        `/api/public-dataset/download/tasks/${taskId}`,
        {
          method: 'DELETE',
        },
      );

      const result = await response.json();

      if (result.success) {
        messageApi.success('删除任务成功');
        actionRef.current?.reload();
      } else {
        messageApi.error(result.message || '删除任务失败');
      }
    } catch (error) {
      console.error('删除任务失败:', error);
      messageApi.error('删除任务失败');
    }
  };

  // 复制任务
  const handleCopyTask = (task: DownloadTask) => {
    // 打开创建任务Modal
    setCreateModalVisible(true);

    // 使用 setTimeout 确保 Modal 完全打开后再设置表单值
    setTimeout(() => {
      form.setFieldsValue({
        datasetName: task.datasetName,
        source: task.source,
        sourceUrl: task.sourceUrl,
        description: task.description,
        targetPath: task.targetPath,
      });

      messageApi.info('已复制任务信息，请修改后提交');
    }, 100);
  };

  // 查看任务详情
  const handleViewDetail = (task: DownloadTask) => {
    setSelectedTask(task);
    setDetailDrawerVisible(true);
  };

  // 解析数据集URL
  const handleParseUrl = async (url: string) => {
    if (!url || !url.trim()) {
      messageApi.warning('请先输入数据集地址');
      return;
    }

    setParsing(true);
    try {
      const response = await fetch('/api/public-dataset/download/parse-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      const result = await response.json();

      if (result.success) {
        const parsed = result.data;

        // 自动填充表单
        form.setFieldsValue({
          source: parsed.source,
          datasetName: parsed.datasetName,
          targetPath: parsed.targetPath,
          sourceUrl: url.trim(),
        });

        messageApi.success('URL解析成功');
      } else {
        messageApi.error(result.message || 'URL解析失败');
      }
    } catch (error) {
      console.error('解析URL失败:', error);
      messageApi.error('解析URL失败');
    } finally {
      setParsing(false);
    }
  };

  // 获取状态标签
  const getStatusTag = (task: DownloadTask) => {
    // 如果有 jobId，优先从内存映射中获取 AIHC 状态
    const aihcStatus = task.jobId ? aihcStatusMap[task.taskId] : undefined;
    const displayStatus = aihcStatus || task.status;

    const aihcStatusConfig = {
      // AIHC 官方状态
      Created: {
        color: 'default',
        icon: <ClockCircleOutlined />,
        text: '排队中',
      },
      Scheduled: {
        color: 'processing',
        icon: <SyncOutlined />,
        text: '调度中',
      },
      Running: {
        color: 'processing',
        icon: <SyncOutlined spin />,
        text: '运行中',
      },
      Stopping: {
        color: 'warning',
        icon: <ClockCircleOutlined />,
        text: '停止中',
      },
      ManualTermination: {
        color: 'default',
        icon: <CloseCircleOutlined />,
        text: '已停止',
      },
      Restarting: {
        color: 'warning',
        icon: <ReloadOutlined />,
        text: '重启中',
      },
      Succeeded: {
        color: 'success',
        icon: <CheckCircleOutlined />,
        text: '成功',
      },
      Failed: { color: 'error', icon: <CloseCircleOutlined />, text: '失败' },
      // 失联状态（查询失败）
      DISCONNECTED: {
        color: 'magenta',
        icon: <ExclamationCircleOutlined />,
        text: '失联',
      },
      // 本地状态（无 jobId 时）
      pending: {
        color: 'default',
        icon: <ClockCircleOutlined />,
        text: '等待中',
      },
      downloading: {
        color: 'processing',
        icon: <SyncOutlined spin />,
        text: '下载中',
      },
      completed: {
        color: 'success',
        icon: <CheckCircleOutlined />,
        text: '已完成',
      },
      failed: { color: 'error', icon: <CloseCircleOutlined />, text: '失败' },
      // 兜底
      unknown: {
        color: 'default',
        icon: <ClockCircleOutlined />,
        text: '未知',
      },
    };

    const config =
      aihcStatusConfig[displayStatus as keyof typeof aihcStatusConfig] ||
      aihcStatusConfig.unknown;
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  // 获取状态进度条状态
  const _getProgressStatus = (
    task: DownloadTask,
  ): 'success' | 'exception' | 'active' | 'normal' => {
    const aihcStatus = task.jobId ? aihcStatusMap[task.taskId] : undefined;
    const displayStatus = aihcStatus || task.status;

    if (displayStatus === 'Succeeded' || displayStatus === 'completed') {
      return 'success';
    } else if (
      displayStatus === 'Failed' ||
      displayStatus === 'failed' ||
      displayStatus === 'ManualTermination' ||
      displayStatus === 'DISCONNECTED'
    ) {
      return 'exception';
    } else if (
      displayStatus === 'Running' ||
      displayStatus === 'Scheduled' ||
      displayStatus === 'downloading'
    ) {
      return 'active';
    }
    return 'normal';
  };

  // 获取数据源标签
  const getSourceBadge = (source: string) => {
    const sourceConfig = {
      huggingface: { color: '#ff6f00', text: 'HuggingFace' },
      modelscope: { color: '#1890ff', text: 'ModelScope' },
      github: { color: '#24292e', text: 'GitHub' },
      custom: { color: '#52c41a', text: '自定义' },
    };

    const config = sourceConfig[source as keyof typeof sourceConfig] || {
      color: 'default',
      text: source,
    };
    return <Badge color={config.color} text={config.text} />;
  };

  // 表格列定义
  const columns: ProColumns<DownloadTask>[] = [
    {
      title: '数据集名称',
      dataIndex: 'datasetName',
      key: 'datasetName',
      width: 200,
      ellipsis: true,
      render: (text: any) => <strong>{text}</strong>,
    },
    {
      title: '数据源',
      dataIndex: 'source',
      key: 'source',
      width: 120,
      render: (_, record) => getSourceBadge(record.source),
    },
    {
      title: '源地址',
      dataIndex: 'sourceUrl',
      key: 'sourceUrl',
      width: 300,
      ellipsis: true,
      render: (_, record) => (
        <Tooltip title={record.sourceUrl}>
          <a href={record.sourceUrl} target="_blank" rel="noopener noreferrer">
            {record.sourceUrl}
          </a>
        </Tooltip>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (_, record: DownloadTask) => getStatusTag(record),
    },
    {
      title: '创建时间',
      dataIndex: 'ctime',
      key: 'ctime',
      width: 160,
      render: (_, record: DownloadTask) => new Date(record.ctime).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right',
      render: (_, record: DownloadTask) => {
        const moreItems: MenuProps['items'] = [
          { key: 'copy', label: '复制', onClick: () => handleCopyTask(record) },
          { type: 'divider' },
          { key: 'delete', danger: true, label: '删除', onClick: () => {
            Modal.confirm({ title: '确定要删除这个任务吗？', okText: '确定', okType: 'danger', cancelText: '取消', onOk: () => handleDeleteTask(record.taskId) });
          }},
        ];
        return (
          <Space size={4}>
            <Button type="link" size="small" onClick={() => handleViewDetail(record)}>详情</Button>
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
    <PageContainer
      title="公开数据集下载"
      subTitle="从 HuggingFace、ModelScope 等开源社区下载公开数据集"
      extra={[
        <Button
          key="create"
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalVisible(true)}
        >
          创建下载任务
        </Button>,
      ]}
    >
      <ProTable<DownloadTask>
        columns={columns}
        actionRef={actionRef}
        request={async (params) => {
          try {
            const response = await fetch(
              `/api/public-dataset/download/tasks?page=${params.current || 1}&pageSize=${params.pageSize || 10}`,
            );
            const result = await response.json();

            if (result.success) {
              // 保存任务列表到状态，用于自动查询状态
              setTasks(result.data.tasks);

              return {
                data: result.data.tasks,
                total: result.data.total,
                success: true,
              };
            } else {
              messageApi.error('获取任务列表失败');
              return {
                data: [],
                total: 0,
                success: false,
              };
            }
          } catch (error) {
            console.error('获取任务列表失败:', error);
            return {
              data: [],
              total: 0,
              success: false,
            };
          }
        }}
        rowKey="taskId"
        search={false}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
        dateFormatter="string"
        headerTitle="下载任务列表"
        toolBarRender={() => [
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => actionRef.current?.reload()}
          >
            刷新
          </Button>,
        ]}
      />

      {/* 创建下载任务模态框 */}
      <Modal
        title="创建数据集下载任务"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={700}
      >
        <ProForm
          form={form}
          onFinish={handleCreateTask}
          submitter={{
            searchConfig: {
              submitText: '创建任务',
            },
            resetButtonProps: {
              style: { display: 'none' },
            },
          }}
        >
          {/* URL自动解析区域 */}
          <Card
            size="small"
            style={{ marginBottom: 16, background: '#f5f5f5' }}
            title="📎 快速创建"
          >
            <ProFormText
              name="datasetUrl"
              label="数据集地址"
              placeholder="粘贴 HuggingFace、ModelScope 或 GitHub 数据集地址，自动解析"
              fieldProps={{
                addonAfter: (
                  <Button
                    type="primary"
                    loading={parsing}
                    onClick={() => {
                      const url = form.getFieldValue('datasetUrl');
                      handleParseUrl(url);
                    }}
                  >
                    解析
                  </Button>
                ),
              }}
              extra={
                <div style={{ color: '#999', fontSize: 12 }}>
                  💡 支持的格式示例：
                  <br />• HuggingFace:
                  https://huggingface.co/datasets/nvidia/PhysicalAI-SmartSpaces
                  <br />• ModelScope:
                  https://www.modelscope.cn/datasets/Alibaba-DT/SKYLENAGE-ReasoningMATH
                  <br />• GitHub: https://github.com/owner/repo
                </div>
              }
            />
          </Card>

          <ProFormText
            name="datasetName"
            label="数据集名称"
            placeholder="自动解析或手动输入"
            rules={[{ required: true, message: '请输入数据集名称' }]}
          />

          <ProFormSelect
            name="source"
            label="数据源"
            options={dataSources.map((s) => ({
              label: s.label,
              value: s.value,
            }))}
            rules={[{ required: true, message: '请选择数据源' }]}
            placeholder="自动解析或手动选择"
          />

          <ProFormText
            name="sourceUrl"
            label="源地址"
            placeholder="自动解析或手动输入"
            rules={[{ required: true, message: '请输入数据集源地址' }]}
          />

          <ProFormTextArea
            name="description"
            label="描述"
            placeholder="请输入数据集描述（可选）"
            fieldProps={{
              rows: 3,
            }}
          />

          <ProFormText
            name="targetPath"
            label="目标路径"
            placeholder="留空则自动生成路径"
          />
        </ProForm>
      </Modal>

      {/* 任务详情抽屉 */}
      <Drawer
        title="任务详情"
        open={detailDrawerVisible}
        onClose={() => setDetailDrawerVisible(false)}
        width={720}
      >
        {selectedTask && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="任务ID" span={2}>
              {selectedTask.taskId}
            </Descriptions.Item>
            {selectedTask.jobId && (
              <Descriptions.Item label="AIHC Job ID" span={2}>
                <code>{selectedTask.jobId}</code>
              </Descriptions.Item>
            )}
            {selectedTask.jobName && (
              <Descriptions.Item label="Job 名称" span={2}>
                {selectedTask.jobName}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="数据集名称" span={2}>
              <strong>{selectedTask.datasetName}</strong>
            </Descriptions.Item>
            <Descriptions.Item label="数据源">
              {getSourceBadge(selectedTask.source)}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {getStatusTag(selectedTask)}
            </Descriptions.Item>
            {selectedTask.jobId && aihcStatusMap[selectedTask.taskId] && (
              <Descriptions.Item label="AIHC 状态" span={2}>
                <Tag color="blue">{aihcStatusMap[selectedTask.taskId]}</Tag>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="源地址" span={2}>
              <a
                href={selectedTask.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {selectedTask.sourceUrl}
              </a>
            </Descriptions.Item>
            <Descriptions.Item label="目标路径" span={2}>
              <code>{selectedTask.targetPath}</code>
            </Descriptions.Item>
            {selectedTask.description && (
              <Descriptions.Item label="描述" span={2}>
                {selectedTask.description}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="下载进度">
              <Progress
                percent={selectedTask.progress}
                status={
                  selectedTask.status === 'completed'
                    ? 'success'
                    : selectedTask.status === 'failed'
                      ? 'exception'
                      : selectedTask.status === 'downloading'
                        ? 'active'
                        : 'normal'
                }
              />
            </Descriptions.Item>
            <Descriptions.Item label="文件大小">
              {selectedTask.totalSize > 0
                ? `${(selectedTask.downloadedSize / 1024 / 1024).toFixed(2)} MB / ${(selectedTask.totalSize / 1024 / 1024).toFixed(2)} MB`
                : '未知'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {new Date(selectedTask.ctime).toLocaleString('zh-CN')}
            </Descriptions.Item>
            <Descriptions.Item label="最后更新">
              {new Date(selectedTask.mtime).toLocaleString('zh-CN')}
            </Descriptions.Item>
            {selectedTask.startTime && (
              <Descriptions.Item label="开始时间">
                {new Date(selectedTask.startTime).toLocaleString('zh-CN')}
              </Descriptions.Item>
            )}
            {selectedTask.endTime && (
              <Descriptions.Item label="完成时间">
                {new Date(selectedTask.endTime).toLocaleString('zh-CN')}
              </Descriptions.Item>
            )}
            {selectedTask.errorMessage && (
              <Descriptions.Item label="错误信息" span={2}>
                <Tag color="error">{selectedTask.errorMessage}</Tag>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Drawer>

      {/* 页面说明卡片 */}
      <Card style={{ marginBottom: 16 }} size="small">
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <strong>支持的数据源：</strong>
          </div>
          <Space wrap>
            {dataSources.map((source) => (
              <Tag key={source.value} color="blue">
                {source.label}
              </Tag>
            ))}
          </Space>
          <div style={{ color: '#999', fontSize: 12 }}>
            💡
            提示：创建下载任务后，任务将在后台执行。您可以刷新列表查看最新进度。
          </div>
        </Space>
      </Card>
    </PageContainer>
  );
};

export default PublicDatasetDownload;
