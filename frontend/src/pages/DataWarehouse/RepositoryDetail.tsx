import { CheckCircleOutlined, ReloadOutlined, ArrowLeftOutlined, FileOutlined, FolderOutlined, PlusOutlined } from '@ant-design/icons';
import { PageContainer, ProTable, ProForm, ModalForm, ProFormText, ProFormTextArea, ProFormSelect } from '@ant-design/pro-components';
import { App, Breadcrumb, Button, Card, Col, Row, Select, Space, Tag, Typography, Tabs, Tooltip } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import { useParams, history } from '@umijs/max';
import { getBranches, listObjects, logCommits, getObjectContent, commitChanges, createBranch, getBranchDiff } from '@/services/aihc-mentor/lakefs';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import ReactMarkdown from 'react-markdown';

const { Text } = Typography;

interface LakeFSObject {
  path: string;
  path_type: 'common_prefix' | 'object';
  size_bytes?: number;
  mtime?: number;
  physical_address?: string;
  checksum?: string;
  content_type?: string;
}

const RepositoryDetail: React.FC = () => {
  const { id: repositoryId } = useParams<{ id: string }>();
  const { message: messageApi } = App.useApp();
  const fileActionRef = useRef<ActionType>(null);
  const commitActionRef = useRef<ActionType>(null);
  const branchActionRef = useRef<ActionType>(null);

  const [activeTab, setActiveTab] = useState('files');
  const [branches, setBranches] = useState<{ id: string; commit_id: string }[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>('');
  const [currentPath, setCurrentPath] = useState<string>('');
  const [loadingBranches, setLoadingBranches] = useState<boolean>(false);
  const [readmeContent, setReadmeContent] = useState<string | null>(null);
  const [hasUncommittedChanges, setHasUncommittedChanges] = useState<boolean>(false);

  const [createCommitModalVisible, setCreateCommitModalVisible] = useState<boolean>(false);
  const [createBranchModalVisible, setCreateBranchModalVisible] = useState<boolean>(false);

  // 初始化加载分支列表
  useEffect(() => {
    if (!repositoryId) return;
    const fetchBranchesData = async () => {
      setLoadingBranches(true);
      try {
        const response = await getBranches(repositoryId);
        if (response.success && response.data?.results) {
          const fetchedBranches = response.data.results;
          setBranches(fetchedBranches);
          if (fetchedBranches.length > 0) {
            // 尝试寻找 main 或 master，没有就取第一个
            const defaultBranch =
              fetchedBranches.find((b: any) => b.id === 'main' || b.id === 'master') ||
              fetchedBranches[0];
            setCurrentBranch(defaultBranch.id);
          }
        } else {
          messageApi.error(response.message || '获取分支列表失败');
        }
      } catch (error: any) {
        messageApi.error(error.message || '加载分支失败');
      } finally {
        setLoadingBranches(false);
      }
    };
    fetchBranchesData();
  }, [repositoryId, messageApi]);

  // 获取目录内容
  const fetchObjects = async (params: any) => {
    if (!repositoryId || !currentBranch) {
      return { data: [], success: true, total: 0 };
    }
    try {
      // prefix 请求需要以 / 结尾才能列出目录，除非是根目录（空字符串）
      let queryPrefix = currentPath;
      if (queryPrefix && !queryPrefix.endsWith('/')) {
        queryPrefix += '/';
      }

      const response = await listObjects(repositoryId, currentBranch, {
        prefix: queryPrefix,
        delimiter: '/',
      });

      if (response.success && response.data?.results) {
        // 尝试寻找 README.md 文件
        const readmeObj = response.data.results.find(
          (obj: any) => obj.path_type === 'object' && obj.path.toLowerCase().endsWith('readme.md')
        );

        if (readmeObj) {
          // 异步拉取 README.md 内容
          getObjectContent(repositoryId, currentBranch, { path: readmeObj.path })
            .then(res => {
              if (res.success) {
                setReadmeContent(res.data);
              } else {
                setReadmeContent(null);
              }
            })
            .catch(() => setReadmeContent(null));
        } else {
          setReadmeContent(null);
        }

        // 异步检查是否有未提交更改
        getBranchDiff(repositoryId, currentBranch)
          .then(res => {
            if (res.success && res.data?.results) {
              setHasUncommittedChanges(res.data.results.length > 0);
            } else {
              setHasUncommittedChanges(false);
            }
          })
          .catch(() => setHasUncommittedChanges(false));

        return {
          data: response.data.results,
          success: true,
          total: response.data.results.length,
        };
      } else {
        messageApi.error(response.message || '获取文件列表失败');
        return { data: [], success: false, total: 0 };
      }
    } catch (error: any) {
      console.error('获取文件列表失败:', error);
      messageApi.error(error.message || '网络或配置错误');
      return { data: [], success: false, total: 0 };
    }
  };

  // 获取提交记录
  const fetchCommits = async (params: any) => {
    if (!repositoryId || !currentBranch) {
      return { data: [], success: true, total: 0 };
    }
    try {
      const response = await logCommits(repositoryId, currentBranch, {
        amount: params.pageSize,
      });

      if (response.success && response.data?.results) {
        return {
          data: response.data.results,
          success: true,
          total: response.data.results.length, // 待处理真正的分页
        };
      } else {
        messageApi.error(response.message || '获取提交记录失败');
        return { data: [], success: false, total: 0 };
      }
    } catch (error: any) {
      console.error('获取提交记录失败:', error);
      messageApi.error(error.message || '网络或配置错误');
      return { data: [], success: false, total: 0 };
    }
  };

  // 提交更改
  const handleCommit = async (values: { message: string; metadata?: string }) => {
    if (!repositoryId || !currentBranch) return false;
    try {
      let parsedMetadata = undefined;
      if (values.metadata) {
        try {
          parsedMetadata = JSON.parse(values.metadata);
        } catch (_e) {
          messageApi.error('附加元数据必须是合法的 JSON 对象');
          return false;
        }
      }

      const response = await commitChanges(repositoryId, currentBranch, {
        message: values.message,
        metadata: parsedMetadata,
      });

      if (response.success) {
        messageApi.success('提交成功');
        setCreateCommitModalVisible(false);
        // 刷新列表和提交记录
        fileActionRef.current?.reload();
        commitActionRef.current?.reload();
        return true;
      } else {
        messageApi.error(response.message || '提交失败');
        return false;
      }
    } catch (error: any) {
      console.error('提交失败:', error);
      messageApi.error(error.message || '提交时发生异常');
      return false;
    }
  };

  // 创建新分支
  const handleCreateBranch = async (values: { name: string; source: string }) => {
    if (!repositoryId) return false;
    try {
      const response = await createBranch(repositoryId, {
        name: values.name,
        source: values.source,
      });

      if (response.success) {
        messageApi.success('分支创建成功');
        setCreateBranchModalVisible(false);
        // 刷新整个分支列表并重置当前选择为新分支
        await branchActionRef.current?.reload();
        // 重新获取分支列表数据以更新下拉框选项
        const branchesRes = await getBranches(repositoryId);
        if (branchesRes.success && branchesRes.data?.results) {
          setBranches(branchesRes.data.results);
          setCurrentBranch(values.name);
          setActiveTab('files'); // 跳转到文件TAB去浏览新分支
        }
        return true;
      } else {
        messageApi.error(response.message || '分支创建失败');
        return false;
      }
    } catch (error: any) {
      console.error('创建分支失败:', error);
      messageApi.error(error.message || '创建分支时发生异常');
      return false;
    }
  };

  // 处理进入文件夹
  const handleNavigate = (record: LakeFSObject) => {
    if (record.path_type === 'common_prefix') {
      setCurrentPath(record.path);
    } else {
      messageApi.info(`预览文件：${record.path} (暂未实现详情页)`);
    }
  };

  // 生成面包屑项目
  const generateBreadcrumbItems = () => {
    const items: any[] = [
      {
        title: <a onClick={() => setCurrentPath('')}>{repositoryId} (根目录)</a>,
      },
    ];

    if (!currentPath) return items;

    const parts = currentPath.split('/').filter(Boolean);
    let accumulatedPath = '';

    parts.forEach((part, index) => {
      accumulatedPath += part + '/';
      const isLast = index === parts.length - 1;
      const navPath = accumulatedPath; // 闭包保存当前路径

      items.push({
        title: isLast ? (
          <span>{part}</span>
        ) : (
          <a onClick={() => setCurrentPath(navPath)}>{part}</a>
        ),
      });
    });

    return items;
  };

  const fileColumns: ProColumns<LakeFSObject>[] = [
    {
      title: '名称',
      dataIndex: 'path',
      key: 'path',
      render: (_: any, record: LakeFSObject) => {
        const isFolder = record.path_type === 'common_prefix';
        // 从完整路径中提取最后的文件或目录名
        const nameParts = record.path.split('/').filter(Boolean);
        const displayName = nameParts.length > 0 ? nameParts[nameParts.length - 1] : record.path;

        return (
          <a
            onClick={() => handleNavigate(record)}
            style={{ fontWeight: isFolder ? 500 : 'normal', color: isFolder ? '#1890ff' : 'inherit' }}
          >
            {isFolder ? <FolderOutlined style={{ marginRight: 8, color: '#1890ff' }} /> : <FileOutlined style={{ marginRight: 8 }} />}
            {displayName}
          </a>
        );
      },
    },
    {
      title: '大小',
      dataIndex: 'size_bytes',
      key: 'size_bytes',
      width: 120,
      render: (val: any, record: LakeFSObject) => {
        if (record.path_type === 'common_prefix') return '-';
        if (val == null) return '-';
        const size = Number(val);
        if (size < 1024) return size + ' B';
        if (size < 1024 * 1024) return (size / 1024).toFixed(2) + ' KB';
        if (size < 1024 * 1024 * 1024) return (size / (1024 * 1024)).toFixed(2) + ' MB';
        return (size / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
      },
    },
    {
      title: '最后修改时间',
      dataIndex: 'mtime',
      key: 'mtime',
      width: 200,
      render: (val: any, record: LakeFSObject) => {
        if (record.path_type === 'common_prefix') return '-';
        if (!val) return '-';
        return new Date(val * 1000).toLocaleString('zh-CN');
      },
    },
    {
      title: '类型',
      dataIndex: 'path_type',
      key: 'path_type',
      width: 100,
      render: (val: any) => {
        return val === 'common_prefix' ? <Tag color="blue">目录</Tag> : <Tag>文件</Tag>;
      },
    },
  ];

  const commitColumns: ProColumns<any>[] = [
    {
      title: 'Commit ID',
      dataIndex: 'id',
      key: 'id',
      width: 150,
      render: (val: any) => <Tag color="blue">{val.substring(0, 8)}</Tag>,
    },
    {
      title: '提交信息',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
    },
    {
      title: '提交者',
      dataIndex: 'committer',
      key: 'committer',
      width: 150,
    },
    {
      title: '提交时间',
      dataIndex: 'creation_date',
      key: 'creation_date',
      width: 180,
      render: (val: any) => {
        if (!val) return '-';
        return new Date(val * 1000).toLocaleString('zh-CN');
      },
    },
  ];

  const branchColumns: ProColumns<any>[] = [
    {
      title: '分支名称',
      dataIndex: 'id',
      key: 'id',
      render: (val: any) => <Text strong>{val}</Text>,
    },
    {
      title: '包含提交 ID',
      dataIndex: 'commit_id',
      key: 'commit_id',
      render: (val: any) => <Text type="secondary">{val}</Text>,
    },
  ];

  return (
    <PageContainer
      title={
        <Space>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => history.push('/data-warehouse')}
          />
          {`仓库详情: ${repositoryId}`}
        </Space>
      }
      subTitle="浏览分支和文件内容"
    >
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key)}
          items={[
            {
              key: 'files',
              label: '文件 (Files)',
              children: (
                <div>
                  <div style={{ marginBottom: 16, padding: '8px 16px', background: '#fafafa', borderRadius: 4 }}>
                    <Breadcrumb items={generateBreadcrumbItems()} />
                  </div>
                  <ProTable<LakeFSObject>
                    columns={fileColumns}
                    actionRef={fileActionRef}
                    request={fetchObjects}
                    params={{ currentBranch, currentPath }}
                    rowKey="path"
                    search={false}
                    options={false}
                    pagination={false}
                    headerTitle="文件列表"
                    toolBarRender={() => [
                      <Space key="toolbar">
                        <Text strong>当前分支：</Text>
                        <Select
                          showSearch
                          style={{ width: 200 }}
                          placeholder="选择分支"
                          loading={loadingBranches}
                          value={currentBranch || undefined}
                          onChange={(val) => {
                            setCurrentBranch(val);
                            setCurrentPath('');
                          }}
                          options={branches.map((b) => ({ label: b.id, value: b.id }))}
                        />
                        <Button icon={<ReloadOutlined />} onClick={() => fileActionRef.current?.reload()}>
                          刷新
                        </Button>
                        <Tooltip title={hasUncommittedChanges ? '' : '当前分支没有待提交内容'}>
                          <span style={(!currentBranch || !hasUncommittedChanges) ? { display: 'inline-block', cursor: 'not-allowed' } : {}}>
                            <Button
                              type="primary"
                              icon={<CheckCircleOutlined />}
                              onClick={() => setCreateCommitModalVisible(true)}
                              disabled={!currentBranch || !hasUncommittedChanges}
                              style={(!currentBranch || !hasUncommittedChanges) ? { pointerEvents: 'none' } : {}}
                            >
                              提交变更
                            </Button>
                          </span>
                        </Tooltip>
                      </Space>,
                    ]}
                  />
                  {readmeContent && (
                    <Card style={{ marginTop: 16 }} title="README.md" size="small" type="inner">
                      <ReactMarkdown>{readmeContent}</ReactMarkdown>
                    </Card>
                  )}
                </div>
              ),
            },
            {
              key: 'commits',
              label: '提交 (Commits)',
              children: (
                <ProTable<any>
                  columns={commitColumns}
                  actionRef={commitActionRef}
                  request={fetchCommits}
                  params={{ currentBranch }}
                  rowKey="id"
                  search={false}
                  options={false}
                  headerTitle="提交历史"
                  toolBarRender={() => [
                    <Space key="toolbar">
                      <Text strong>当前分支：</Text>
                      <Select
                        showSearch
                        style={{ width: 200 }}
                        placeholder="选择分支"
                        loading={loadingBranches}
                        value={currentBranch || undefined}
                        onChange={(val) => setCurrentBranch(val)}
                        options={branches.map((b) => ({ label: b.id, value: b.id }))}
                      />
                      <Button icon={<ReloadOutlined />} onClick={() => commitActionRef.current?.reload()}>
                        刷新
                      </Button>
                    </Space>,
                  ]}
                />
              ),
            },
            {
              key: 'branches',
              label: '分支 (Branches)',
              children: (
                <ProTable<any>
                  columns={branchColumns}
                  actionRef={branchActionRef}
                  dataSource={branches} // 分支一般一次加载无需复杂分页
                  rowKey="id"
                  search={false}
                  options={false}
                  pagination={false}
                  headerTitle="全部历史分支"
                  toolBarRender={() => [
                    <Button
                      key="create"
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setCreateBranchModalVisible(true)}
                    >
                      新建分支
                    </Button>,
                    <Button key="refresh" icon={<ReloadOutlined />} onClick={() => branchActionRef.current?.reload()}>
                      刷新
                    </Button>,
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>

      <ModalForm
        title={`在 ${currentBranch} 分支提交变更`}
        open={createCommitModalVisible}
        onOpenChange={setCreateCommitModalVisible}
        onFinish={handleCommit}
        width={500}
      >
        <ProFormText
          name="message"
          label="提交信息 (Commit Message)"
          rules={[{ required: true, message: '请输入提交信息' }]}
          placeholder="例如: 添加了训练数据集 v1.0"
        />
        <ProFormTextArea
          name="metadata"
          label="附加元数据 (Metadata JSON) - 可选"
          placeholder='例如: {"author": "AIHC", "type": "dataset"}'
        />
      </ModalForm>

      <ModalForm
        title={`在仓库 ${repositoryId} 新建分支`}
        open={createBranchModalVisible}
        onOpenChange={setCreateBranchModalVisible}
        onFinish={handleCreateBranch}
        width={500}
      >
        <ProFormText
          name="name"
          label="新分支名称"
          rules={[
            { required: true, message: '请输入新分支的名称' },
            { pattern: /^[a-zA-Z0-9_\-]+$/, message: '名称只能包含字母、数字、下划线和中划线' }
          ]}
          placeholder="例如: dev-test, feature-v2"
        />
        <ProFormSelect
          name="source"
          label="来源分支 (Source Branch)"
          rules={[{ required: true, message: '请选择来源分支' }]}
          options={branches.map((b) => ({ label: b.id, value: b.id }))}
          initialValue={currentBranch || 'main'}
          placeholder="请选择基于哪个分支创建"
        />
      </ModalForm>
    </PageContainer>
  );
};

export default RepositoryDetail;
