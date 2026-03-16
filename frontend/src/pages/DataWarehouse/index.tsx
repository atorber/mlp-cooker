import {
  EyeOutlined,
  ReloadOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { App, Button, Space, Tag, Typography, Card, Descriptions, Modal, Form, Input } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import { getRepositories } from '@/services/aihc-mentor/lakefs';
import { getConfig } from '@/services/aihc-mentor/api';
import { history } from '@umijs/max';

const { Paragraph } = Typography;

// LakeFS 仓库类型
interface Repository {
  id: string;
  creation_date: number;
  default_branch: string;
  storage_namespace: string;
}

const DataWarehouse: React.FC = () => {
  const { message: messageApi } = App.useApp();
  const actionRef = useRef<ActionType>(null);
  const [lakefsConfig, setLakefsConfig] = useState({
    endpoint: '',
    accessKey: '',
    secretKey: '',
  });

  // 获取 LakeFS 配置信息以展示给用户
  useEffect(() => {
    const fetchSystemConfig = async () => {
      try {
        const res = await getConfig();
        if (res.success && res.data?.config) {
          const cfg: Record<string, string> = res.data.config as any;
          setLakefsConfig({
            endpoint: cfg.LAKEFS_ENDPOINT || '未配置',
            accessKey: cfg.LAKEFS_ACCESS_KEY_ID || '未配置',
            secretKey: cfg.LAKEFS_SECRET_ACCESS_KEY || '未配置',
          });
        }
      } catch (error) {
        console.error('获取系统配置失败:', error);
      }
    };
    fetchSystemConfig();
  }, []);

  // 获取仓库列表
  const fetchRepositories = async (params: any) => {
    try {
      const response = await getRepositories({
        prefix: params.keyword, // 用于搜索
        // 这里暂时省略复杂的分页，如果有需要可以通过 after 参数传递游标
      });

      if (response.success) {
        // response.data 是 LakeFS 的原生响应，包含 results 和 pagination
        const results = response.data?.results || [];
        return {
          data: results,
          success: true,
          total: results.length,
        };
      } else {
        messageApi.error(response.message || '获取仓库列表失败');
        return {
          data: [],
          success: false,
          total: 0,
        };
      }
    } catch (error: any) {
      console.error('获取仓库列表失败:', error);
      messageApi.error(error.message || '加载失败，请检查系统设置中的 LakeFS 凭证是否正确');
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  };

  // 跳转到仓库详情页
  const goToRepositoryDetail = (record: Repository) => {
    history.push(`/data-warehouse/repository/${record.id}`);
  };

  const columns: ProColumns<Repository>[] = [
    {
      title: '仓库名称 (ID)',
      dataIndex: 'id',
      key: 'id',
      width: 200,
      render: (_: any, record: Repository) => (
        <Typography.Link
          onClick={() => goToRepositoryDetail(record)}
          style={{ fontWeight: 500 }}
        >
          <FolderOpenOutlined style={{ marginRight: 8 }} />
          {record.id}
        </Typography.Link>
      ),
    },
    {
      title: '默认分支',
      dataIndex: 'default_branch',
      key: 'default_branch',
      width: 150,
      hideInSearch: true,
      render: (text: React.ReactNode) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '存储命名空间 (Storage Namespace)',
      dataIndex: 'storage_namespace',
      key: 'storage_namespace',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '创建时间',
      dataIndex: 'creation_date',
      key: 'creation_date',
      width: 180,
      hideInSearch: true,
      render: (val: any) => {
        if (!val) return '-';
        // LakeFS 返回的 creation_date 可能是 Unix 时间戳 (秒)
        const date = new Date(val * 1000);
        return date.toLocaleString('zh-CN');
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      hideInSearch: true,
      render: (_: any, record: Repository) => (
        <Space wrap>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => goToRepositoryDetail(record)}
            style={{ color: '#1890ff' }}
          >
            浏览文件
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="数据仓库"
      subTitle="管理您的 LakeFS 仓库列表"
    >
      <Card style={{ marginBottom: 16 }} title="LakeFS 连接信息" size="small">
        <Descriptions column={1} size="small">
          <Descriptions.Item label="接入地址 (Endpoint)">
            <Paragraph copyable style={{ marginBottom: 0 }}>
              {lakefsConfig.endpoint}
            </Paragraph>
          </Descriptions.Item>
          <Descriptions.Item label="访问密钥 (Access Key)">
            <Paragraph copyable style={{ marginBottom: 0 }}>
              {lakefsConfig.accessKey}
            </Paragraph>
          </Descriptions.Item>
          <Descriptions.Item label="私有密钥 (Secret Key)">
            <Paragraph copyable={{ text: lakefsConfig.secretKey }} style={{ marginBottom: 0 }}>
              {lakefsConfig.secretKey ? '********' : '未配置'}
            </Paragraph>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <ProTable<Repository>
        columns={columns}
        actionRef={actionRef}
        request={fetchRepositories}
        rowKey="id"
        search={{
          labelWidth: 'auto',
          defaultCollapsed: false,
        }}
        options={{
          reload: false,
          density: true,
          setting: true,
        }}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
        }}
        headerTitle="Repositories"
      />
    </PageContainer>
  );
};

export default DataWarehouse;
