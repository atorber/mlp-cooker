import {
  DatabaseOutlined,
  DownOutlined,
  EyeOutlined,
  ReloadOutlined,
  SettingOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProCard, ProTable } from '@ant-design/pro-components';
import { request } from '@umijs/max';
import {
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Dropdown,
  Modal,
  message,
  Row,
  Space,
  Statistic,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import React, { useEffect, useState } from 'react';

const { Text } = Typography;

// 地域类型定义
type Region = {
  code: string;
  name: string;
  name_en: string;
  available: boolean;
};

// 数据集类型定义
interface Dataset {
  recordId?: string;
  name: string;
  dataType: string;
  datasetFormat: string;
  datasetType: string;
  description: string;
  publisher: string;
  scene: string;
  size: string;
  sourcePath: string;
  storageInstance: string;
  storagePath: string;
  storageType: string;
  url: string;
  是否支持下载: string;
  thumb?: string;
  createTime?: string;
  updateTime?: string;
  publishStatus?: 'published' | 'unpublished' | 'unknown'; // 发布状态
}

// 已移除未使用的 SearchForm 类型定义

const PublicDatasetManage: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(false);

  // 环境切换状态
  const [useProduction, setUseProduction] = useState(false); // 环境切换：false=灰度，true=生产
  const [currentEnvironment, setCurrentEnvironment] = useState<string>('gray'); // 当前环境
  const [hasProductionConfig, setHasProductionConfig] = useState(false); // 是否有生产环境配置
  const [hasGrayConfig, setHasGrayConfig] = useState(false); // 是否有灰度环境配置
  const [selectedRegion, setSelectedRegion] = useState<string>('bj'); // 当前选中的地域
  const [availableRegions, setAvailableRegions] = useState<Region[]>([]); // 可用地域列表

  // 统计数据状态
  const [statistics, setStatistics] = useState<{
    total: number;
    published: number;
    unpublished: number;
    unknown: number;
    sceneStats: { [key: string]: number };
  }>({
    total: 0,
    published: 0,
    unpublished: 0,
    unknown: 0,
    sceneStats: {},
  });

  // 抽屉状态
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);

  // 检查环境配置
  const checkEnvironmentConfig = async () => {
    try {
      let hasGray = false;
      let hasProd = false;

      // 获取配置信息
      const configResponse = await fetch('/api/config');
      const configResult = await configResponse.json();

      if (configResult.success && configResult.data) {
        const config = configResult.data.config || configResult.data;

        // 检查灰度环境配置
        const grayHost = config.AIHC_DATASET_MANAGEMENT_HOST_GRAY;
        hasGray = !!(
          grayHost &&
          grayHost !== '' &&
          grayHost !== '********'
        );
        setHasGrayConfig(hasGray);
      }

      // 获取地域列表并检查生产环境配置
      const regionsResponse = await fetch('/api/config/regions');
      const regionsResult = await regionsResponse.json();
      
      if (regionsResult.success && regionsResult.data) {
        const regions: Region[] = regionsResult.data;
        setAvailableRegions(regions);
        
        // 检查是否有任何生产环境地域已配置
        hasProd = regions.some(r => r.available);
        
        // 如果当前选中的地域不可用，切换到第一个可用的地域
        const currentRegion = regions.find(r => r.code === selectedRegion);
        if (hasProd && (!currentRegion || !currentRegion.available)) {
          const firstAvailable = regions.find(r => r.available);
          if (firstAvailable) {
            setSelectedRegion(firstAvailable.code);
          }
        }
      }

      // 更新状态（无论API是否成功都要更新，使用计算出的值）
      setHasProductionConfig(hasProd);

      // 自动选择可用的环境
      if (!hasGray && hasProd) {
        setUseProduction(true);
        setCurrentEnvironment('production');
      } else if (hasGray) {
        setUseProduction(false);
        setCurrentEnvironment('gray');
      } else {
        message.warning('请先在系统设置中配置公共数据集管理的环境地址');
      }
    } catch (error) {
      console.error('检查环境配置失败:', error);
      setHasProductionConfig(false);
      setHasGrayConfig(false);
      setAvailableRegions([]);
      message.error('检查环境配置失败');
    }
  };

  // 计算统计数据
  const calculateStatistics = (datasets: Dataset[]) => {
    const stats = {
      total: datasets.length,
      published: 0,
      unpublished: 0,
      unknown: 0,
      sceneStats: {} as { [key: string]: number },
    };

    datasets.forEach((dataset) => {
      // 统计发布状态
      if (dataset.publishStatus === 'published') {
        stats.published++;
      } else if (dataset.publishStatus === 'unpublished') {
        stats.unpublished++;
      } else {
        stats.unknown++;
      }

      // 统计应用场景
      const scene = dataset.scene || '未分类';
      stats.sceneStats[scene] = (stats.sceneStats[scene] || 0) + 1;
    });

    setStatistics(stats);
  };

  // 获取数据集列表（从管理系统）
  const fetchDatasets = async (params?: any) => {
    setLoading(true);
    try {
      // 处理搜索参数
      const searchParams: any = {
        pageNo: params?.current || 1,
        pageSize: params?.pageSize || 1000,
      };

      // 如果有数据集名称搜索，添加到参数中
      if (params?.name) {
        searchParams.keyword = params.name;
      }

      const response = await request('/api/aihc/public-dataset-manage/list', {
        method: 'GET',
        params: {
          ...searchParams,
          useProduction,
          region: selectedRegion,
        },
      });

      if (response.success) {
        let managementDatasets = response.data || [];

        // 如果有搜索关键词，在前端进行过滤
        if (params?.name && !searchParams.keyword) {
          managementDatasets = managementDatasets.filter((dataset: Dataset) =>
            dataset.name.toLowerCase().includes(params.name.toLowerCase()),
          );
        }

        // 获取已发布的数据集列表进行匹配
        await fetchPublishedDatasets(managementDatasets);

        return {
          data: managementDatasets,
          success: true,
          total: managementDatasets.length,
        };
      } else {
        message.error(response.message || '获取数据集列表失败');
        return {
          data: [],
          success: false,
          total: 0,
        };
      }
    } catch (error) {
      console.error('获取数据集列表失败:', error);
      message.error('获取数据集列表失败');
      return {
        data: [],
        success: false,
        total: 0,
      };
    } finally {
      setLoading(false);
    }
  };

  // 获取已发布的数据集列表（从数据集列表）
  const fetchPublishedDatasets = async (managementDatasets: Dataset[]) => {
    try {
      console.log('开始获取已发布数据集列表...');
      const response = await request('/api/aihc/public-dataset/list', {
        method: 'GET',
        params: {
          pageNo: 1,
          pageSize: 1000,
          useProduction,
          region: selectedRegion,
        },
      });

      console.log('已发布数据集API响应:', response);

      if (response.success) {
        // 已发布数据集API返回的数据结构是 { data: { list: [...] } }
        const publishedDatasets = response.data?.list || [];
        console.log('已发布数据集列表:', publishedDatasets);
        console.log('管理系统数据集列表:', managementDatasets);

        // 根据名称匹配设置发布状态
        const datasetsWithStatus = managementDatasets.map((dataset) => {
          const isPublished = publishedDatasets.some((published: any) => {
            const match = published.name === dataset.name;
            if (match) {
              console.log(`数据集 "${dataset.name}" 已发布`);
            }
            return match;
          });

          const status = isPublished ? 'published' : 'unpublished';
          console.log(`数据集 "${dataset.name}" 发布状态: ${status}`);

          return {
            ...dataset,
            publishStatus: status as 'published' | 'unpublished',
          };
        });

        console.log('设置发布状态后的数据集列表:', datasetsWithStatus);
        setDatasets(datasetsWithStatus);

        // 计算统计数据
        calculateStatistics(datasetsWithStatus);
      } else {
        console.error('获取已发布数据集列表失败:', response.message);
        // 如果API调用失败，将所有数据集标记为未知
        const datasetsWithStatus = managementDatasets.map((dataset) => ({
          ...dataset,
          publishStatus: 'unknown' as const,
        }));
        setDatasets(datasetsWithStatus);

        // 计算统计数据
        calculateStatistics(datasetsWithStatus);
      }
    } catch (error) {
      console.error('获取已发布数据集列表异常:', error);
      // 如果获取失败，将所有数据集标记为未知
      const datasetsWithStatus = managementDatasets.map((dataset) => ({
        ...dataset,
        publishStatus: 'unknown' as const,
      }));
      setDatasets(datasetsWithStatus);

      // 计算统计数据
      calculateStatistics(datasetsWithStatus);
    }
  };

  // 发布数据集
  const handlePublishDataset = async (dataset: Dataset) => {
    Modal.confirm({
      title: '确认发布',
      content: `确定要发布数据集"${dataset.name}"到数据集列表吗？`,
      onOk: async () => {
        try {
          const publishData = {
            name: dataset.name,
            dataType: dataset.dataType,
            datasetFormat: dataset.datasetFormat,
            datasetType: dataset.datasetType,
            description: dataset.description,
            publisher: dataset.publisher,
            scene: dataset.scene,
            size: dataset.size,
            storageInstance: dataset.storageInstance,
            storageType: dataset.storageType,
            url: dataset.url,
            是否支持下载: dataset.是否支持下载,
            // 使用与数据集列表页面一致的 publicDataEntries 结构
            publicDataEntries: {
              version: 'v1',
              sourcePath: dataset.sourcePath || '/source/path',
              storagePath: dataset.storagePath || '/storage/path',
            },
          };

          console.log('发布数据集数据:', publishData);
          console.log('源路径:', dataset.sourcePath);
          console.log('存储路径:', dataset.storagePath);
          console.log('publicDataEntries:', publishData.publicDataEntries);

          const response = await request('/api/aihc/public-dataset/create', {
            method: 'POST',
            data: {
              ...publishData,
              useProduction,
              region: selectedRegion,
            },
          });

          if (response.success) {
            message.success('发布数据集成功');
            // 重新获取数据以更新发布状态
            fetchDatasets();
          } else {
            message.error(response.message || '发布数据集失败');
          }
        } catch (error) {
          console.error('发布数据集失败:', error);
          message.error('发布数据集失败');
        }
      },
    });
  };

  // 查看详情
  const handleViewDetail = async (recordId: string) => {
    try {
      const response = await request(
        `/api/aihc/public-dataset-manage/${recordId}`,
        {
          method: 'GET',
          params: {
            useProduction,
            region: selectedRegion,
          },
        },
      );

      if (response.success) {
        setSelectedDataset(response.data);
        setDetailDrawerVisible(true);
      } else {
        message.error(response.message || '获取数据集详情失败');
      }
    } catch (error) {
      console.error('获取数据集详情失败:', error);
      message.error('获取数据集详情失败');
    }
  };

  // 表格列定义
  const columns: ProColumns<Dataset>[] = [
    {
      title: '数据集名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      fixed: 'left',
      hideInSearch: false,
      render: (text, record) => (
        <div style={{ padding: '4px 0' }}>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>{text}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            ID: {record.recordId || '-'}
          </Text>
        </div>
      ),
    },
    {
      title: '数据类型',
      dataIndex: 'dataType',
      key: 'dataType',
      width: 120,
      hideInSearch: true,
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '发布者',
      dataIndex: 'publisher',
      key: 'publisher',
      width: 160,
      hideInSearch: true,
      render: (text) => (
        <Tag color="green">
          <Text
            ellipsis={{ tooltip: text }}
            style={{ maxWidth: '120px', display: 'inline-block' }}
          >
            {text}
          </Text>
        </Tag>
      ),
    },
    {
      title: '应用场景',
      dataIndex: 'scene',
      key: 'scene',
      width: 120,
      hideInSearch: true,
      render: (text) => <Tag color="orange">{text}</Tag>,
    },
    {
      title: '数据大小',
      dataIndex: 'size',
      key: 'size',
      width: 100,
      align: 'center',
      hideInSearch: true,
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: '存储类型',
      dataIndex: 'storageType',
      key: 'storageType',
      width: 100,
      hideInSearch: true,
      render: (text) => <Tag color="purple">{text}</Tag>,
    },
    {
      title: '支持下载',
      dataIndex: '是否支持下载',
      key: 'downloadable',
      width: 100,
      align: 'center',
      hideInSearch: true,
      render: (text) => (
        <Badge
          status={text === '是' ? 'success' : 'default'}
          text={text === '是' ? '支持' : '不支持'}
        />
      ),
    },
    {
      title: '发布状态',
      dataIndex: 'publishStatus',
      key: 'publishStatus',
      width: 120,
      align: 'center',
      hideInSearch: true,
      render: (status) => {
        let badgeStatus: 'success' | 'default' | 'warning' = 'default';
        let text = '未发布';

        if (status === 'published') {
          badgeStatus = 'success';
          text = '已发布';
        } else if (status === 'unknown') {
          badgeStatus = 'warning';
          text = '未知';
        }

        return <Badge status={badgeStatus} text={text} />;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record.recordId || '')}
            style={{ color: '#1890ff' }}
          >
            查看
          </Button>
          {record.publishStatus === 'unpublished' && (
            <Button
              type="text"
              size="small"
              icon={<UploadOutlined />}
              onClick={() => handlePublishDataset(record)}
              style={{ color: '#1890ff' }}
            >
              发布数据集
            </Button>
          )}
          {record.publishStatus === 'unknown' && (
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => fetchDatasets()}
              style={{ color: '#1890ff' }}
            >
              刷新状态
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // 组件加载时检查环境配置
  useEffect(() => {
    checkEnvironmentConfig();
  }, []);

  // 当环境或地域切换时，重新加载数据
  useEffect(() => {
    if (hasGrayConfig || hasProductionConfig) {
      fetchDatasets();
    }
  }, [useProduction, selectedRegion]);

  return (
    <PageContainer
      title="公共数据集管理"
      subTitle="管理和维护公共数据集信息"
      extra={
        <Space>
          <Space.Compact>
            <Tooltip
              title={
                !hasGrayConfig ? '请先在系统设置中配置灰度环境主机地址' : ''
              }
            >
              <Button
                type={!useProduction ? 'primary' : 'default'}
                disabled={!hasGrayConfig}
                onClick={() => {
                  if (hasGrayConfig) {
                    setUseProduction(false);
                    message.info('已切换到灰度环境');
                  }
                }}
              >
                灰度环境
              </Button>
            </Tooltip>
            <Tooltip
              title={
                !hasProductionConfig
                  ? '请先在系统设置中配置生产环境主机地址'
                  : ''
              }
            >
              <Dropdown
                disabled={!hasProductionConfig}
                menu={{
                  items: availableRegions.map((region) => ({
                    key: region.code,
                    label: (
                      <span>
                        {region.name} ({region.code.toUpperCase()})
                        {!region.available && <Tag color="red" style={{ marginLeft: 8 }}>未配置</Tag>}
                      </span>
                    ),
                    disabled: !region.available,
                    onClick: () => {
                      setSelectedRegion(region.code);
                      setUseProduction(true);
                      setCurrentEnvironment('production');
                      message.info(`已切换到生产环境 - ${region.name}`);
                    },
                  })),
                  selectedKeys: useProduction ? [selectedRegion] : [],
                }}
              >
                <Button
                  type={useProduction ? 'primary' : 'default'}
                  disabled={!hasProductionConfig}
                >
                  生产环境
                  {useProduction && availableRegions.length > 0 && (
                    <>
                      {': '}
                      {availableRegions.find(r => r.code === selectedRegion)?.name || selectedRegion.toUpperCase()}
                    </>
                  )}
                  <DownOutlined />
                </Button>
              </Dropdown>
            </Tooltip>
          </Space.Compact>
          {(!hasGrayConfig || !hasProductionConfig) && (
            <Tooltip title="配置公共数据集管理环境地址">
              <Button
                icon={<SettingOutlined />}
                onClick={() => {
                  window.location.href = '/settings';
                }}
              >
                去配置
              </Button>
            </Tooltip>
          )}
        </Space>
      }
    >
      {/* 统计面板 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={4}>
            <Statistic
              title="当前环境"
              value={currentEnvironment === 'production' ? '生产' : '灰度'}
              valueStyle={{
                fontSize: '24px',
                fontWeight: 'bold',
                color:
                  currentEnvironment === 'production' ? '#ff4d4f' : '#1890ff',
              }}
            />
            {((useProduction && !hasProductionConfig) ||
              (!useProduction && !hasGrayConfig)) && (
              <div style={{ fontSize: 12, color: '#ff4d4f', marginTop: 4 }}>
                ⚠️ 未配置
              </div>
            )}
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Statistic
              title="总数据集数"
              value={statistics.total}
              prefix={<DatabaseOutlined />}
              valueStyle={{ fontSize: '24px', fontWeight: 'bold' }}
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Statistic
              title="已发布"
              value={statistics.published}
              prefix={<DatabaseOutlined />}
              valueStyle={{
                color: '#52c41a',
                fontSize: '24px',
                fontWeight: 'bold',
              }}
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Statistic
              title="未发布"
              value={statistics.unpublished}
              prefix={<DatabaseOutlined />}
              valueStyle={{
                color: '#faad14',
                fontSize: '24px',
                fontWeight: 'bold',
              }}
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Statistic
              title="状态未知"
              value={statistics.unknown}
              prefix={<DatabaseOutlined />}
              valueStyle={{
                color: '#ff4d4f',
                fontSize: '24px',
                fontWeight: 'bold',
              }}
            />
          </Col>
        </Row>
      </Card>

      {/* 应用场景统计面板 */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
            应用场景分布
          </h4>
        </div>
        <Row gutter={[16, 16]}>
          {Object.entries(statistics.sceneStats)
            .sort(([, a], [, b]) => b - a) // 按数量降序排列
            .map(([scene, count], index) => {
              const colors = [
                '#1890ff',
                '#52c41a',
                '#faad14',
                '#f5222d',
                '#722ed1',
                '#13c2c2',
                '#eb2f96',
                '#fa8c16',
              ];
              const color = colors[index % colors.length];
              return (
                <Col xs={24} sm={12} md={8} lg={6} key={scene}>
                  <Statistic
                    title={scene}
                    value={count}
                    prefix={<DatabaseOutlined />}
                    valueStyle={{ color, fontSize: '20px', fontWeight: 'bold' }}
                  />
                </Col>
              );
            })}
        </Row>
        {Object.keys(statistics.sceneStats).length === 0 && (
          <div
            style={{ textAlign: 'center', color: '#999', padding: '20px 0' }}
          >
            暂无数据
          </div>
        )}
      </Card>

      <ProCard>
        <ProTable<Dataset>
          columns={columns}
          dataSource={datasets}
          loading={loading}
          request={fetchDatasets}
          rowKey="recordId"
          search={{
            labelWidth: 'auto',
            defaultCollapsed: false,
            optionRender: ({ searchText, resetText }, { form }) => [
              <Button
                key="search"
                type="primary"
                onClick={() => {
                  form?.submit();
                }}
              >
                {searchText}
              </Button>,
              <Button
                key="reset"
                onClick={() => {
                  form?.resetFields();
                  form?.submit();
                }}
              >
                {resetText}
              </Button>,
            ],
          }}
          pagination={{
            defaultPageSize: 1000,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条/总共 ${total} 条`,
          }}
          scroll={{ x: 1200 }}
          options={{
            reload: () => fetchDatasets(),
            density: true,
            fullScreen: true,
          }}
          toolBarRender={() => [
            <Button
              key="refresh"
              icon={<ReloadOutlined />}
              onClick={() => fetchDatasets()}
            >
              刷新
            </Button>,
          ]}
        />
      </ProCard>

      {/* 详情抽屉 */}
      <Drawer
        title="数据集详情"
        placement="right"
        width={600}
        open={detailDrawerVisible}
        onClose={() => {
          setDetailDrawerVisible(false);
          setSelectedDataset(null);
        }}
      >
        {selectedDataset && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="数据集名称">
              <Text strong>{selectedDataset.name}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="记录ID">
              {selectedDataset.recordId || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="数据类型">
              <Tag color="blue">{selectedDataset.dataType}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="数据格式">
              {selectedDataset.datasetFormat}
            </Descriptions.Item>
            <Descriptions.Item label="数据集类型">
              <Tag color="green">{selectedDataset.datasetType}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="发布者">
              <Tag color="orange">{selectedDataset.publisher}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="应用场景">
              <Tag color="purple">{selectedDataset.scene}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="数据大小">
              <Text strong>{selectedDataset.size}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="存储实例">
              {selectedDataset.storageInstance}
            </Descriptions.Item>
            <Descriptions.Item label="存储路径">
              <Text code>{selectedDataset.storagePath}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="存储类型">
              <Tag color="cyan">{selectedDataset.storageType}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="数据源URL">
              <a
                href={selectedDataset.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {selectedDataset.url}
              </a>
            </Descriptions.Item>
            <Descriptions.Item label="源路径">
              <Text code>{selectedDataset.sourcePath}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="支持下载">
              <Badge
                status={
                  selectedDataset.是否支持下载 === '是' ? 'success' : 'default'
                }
                text={selectedDataset.是否支持下载 === '是' ? '支持' : '不支持'}
              />
            </Descriptions.Item>
            <Descriptions.Item label="描述">
              {selectedDataset.description || '-'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default PublicDatasetManage;
