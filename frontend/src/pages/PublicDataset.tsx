import {
  CloudUploadOutlined,
  DatabaseOutlined,
  DownOutlined,
  EyeOutlined,
  FileTextOutlined,
  PlusOutlined,
  ReloadOutlined,
  SettingOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { ActionType } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import {
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Drawer,
  Dropdown,
  Form,
  Input,
  Modal,
  Progress,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Upload,
} from 'antd';
import React, { useEffect, useRef, useState } from 'react';

// 数据集类型定义
type DatasetItem = {
  id: string;
  datasetId?: string;
  name: string;
  scene: string;
  size: string;
  datasetType: string;
  dataType: string;
  storageType: string;
  storageInstance: string;
  datasetFormat: string;
  publisher: string;
  description: string;
  url?: string;
  publicDataEntries?: Array<{
    id: number;
    datasetId: string;
    version: string;
    sourcePath: string;
    storagePath: string;
    updatedTime: string;
  }>;
  createTime?: string;
  updateTime?: string;
  createdTime?: string;
  updatedTime?: string;
};

// 地域类型定义
type Region = {
  code: string;
  name: string;
  name_en: string;
  available: boolean;
};

const PublicDataset = () => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<{ [key: string]: number }>({
    total: 0,
  });
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<DatasetItem | null>(
    null,
  );
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [versionModalVisible, setVersionModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<
    'idle' | 'uploading' | 'preview' | 'processing' | 'completed' | 'error'
  >('idle');
  const [importResults, setImportResults] = useState<any[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedDatasets, setParsedDatasets] = useState<any[]>([]);
  const [fileParseError, setFileParseError] = useState<string>('');
  const [useProduction, setUseProduction] = useState(false); // 环境切换：false=灰度，true=生产
  const [currentEnvironment, setCurrentEnvironment] = useState<string>('gray'); // 当前环境
  const [hasProductionConfig, setHasProductionConfig] = useState(false); // 是否有生产环境配置
  const [hasGrayConfig, setHasGrayConfig] = useState(false); // 是否有灰度环境配置
  const [selectedRegion, setSelectedRegion] = useState<string>('bj'); // 当前选中的地域
  const [availableRegions, setAvailableRegions] = useState<Region[]>([]); // 可用地域列表
  const [form] = Form.useForm();
  const [versionForm] = Form.useForm();
  const proTableRef = useRef<ActionType>(null);

  // 检查环境配置
  const checkEnvironmentConfig = async () => {
    try {
      let hasGray = false;
      let hasProd = false;

      // 获取配置信息
      const configResponse = await fetch('/api/config');
      const configResult = await configResponse.json();

      if (configResult.success && configResult.data) {
        // 注意：配置数据在 data.config 下，不是直接在 data 下
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
        // 如果灰度未配置但生产已配置，自动切换到生产
        setUseProduction(true);
        setCurrentEnvironment('production');
      } else if (hasGray) {
        // 如果灰度已配置，默认使用灰度
        setUseProduction(false);
        setCurrentEnvironment('gray');
      } else {
        // 都未配置，显示警告
        message.warning('请先在系统设置中配置公共数据集管理的环境地址');
      }
    } catch (error) {
      console.error('检查环境配置失败:', error);
      // 默认都禁用
      setHasProductionConfig(false);
      setHasGrayConfig(false);
      setAvailableRegions([]);
      message.error('检查环境配置失败');
    }
  };

  // 获取统计数据（使用后端返回的统计信息）
  const fetchStatistics = async () => {
    try {
      const response = await fetch(
        `/api/aihc/public-dataset/list?pageNo=1&pageSize=10&KeywordType=name&keyword=&includeStatistics=true&useProduction=${useProduction}&region=${selectedRegion}`,
      );
      const result = await response.json();

      if (result.success && result.data?.statistics) {
        setStatistics(result.data.statistics);
      } else {
        // 如果后端没有返回统计信息，使用默认值
        setStatistics({
          total: result.data?.total || 0,
        });
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
    }
  };

  // 获取数据集列表
  const fetchDatasets = async (params: any = {}) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        pageNo: params.current || params.pageNo || 1,
        pageSize: params.pageSize || 10,
        KeywordType: params.keywordType || 'name',
        keyword: params.keyword || '',
        useProduction: String(useProduction),
        region: selectedRegion,
      });

      const response = await fetch(
        `/api/aihc/public-dataset/list?${queryParams}`,
      );
      const result = await response.json();

      if (result.success) {
        // 处理API返回的list为null的情况
        const listData = result.data?.list || [];
        const safeListData = Array.isArray(listData) ? listData : [];

        // 映射字段名以匹配前端期望的格式
        const mappedData = safeListData.map((item: any) => ({
          ...item,
          id: item.datasetId, // 映射datasetId到id
          createTime: item.createdTime, // 映射createdTime到createTime
          updateTime: item.updatedTime, // 映射updatedTime到updateTime
          datasetFormat: item.datasetFormat || 'unknown', // 添加默认格式
        }));

        const total = result.data?.total || 0;

        return {
          data: mappedData,
          success: true,
          total: total,
        };
      } else {
        console.error('API调用失败:', result.message);
        message.error(`获取数据集列表失败: ${result.message}`);
        return {
          data: [],
          success: false,
          total: 0,
        };
      }
    } catch (error: any) {
      console.error('获取数据集列表失败:', error);
      message.error(`无法连接到后端服务: ${error.message}`);
      return {
        data: [],
        success: false,
        total: 0,
      };
    } finally {
      setLoading(false);
    }
  };

  // 组件加载时检查环境配置并获取统计数据
  useEffect(() => {
    checkEnvironmentConfig();
  }, []);

  // 当环境或地域切换时，重新获取统计数据和刷新列表
  useEffect(() => {
    if (proTableRef.current) {
      fetchStatistics();
      proTableRef.current.reload();
    }
  }, [useProduction, selectedRegion]);

  // 创建数据集
  const handleCreateDataset = async (values: any) => {
    try {
      const response = await fetch('/api/aihc/public-dataset/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...values,
          useProduction,
          region: selectedRegion,
        }),
      });

      const result = await response.json();

      if (result.success) {
        message.success('数据集创建成功');
        setCreateModalVisible(false);
        form.resetFields();
        // 更新统计数据
        fetchStatistics();
        // ProTable会自动刷新，不需要手动调用fetchDatasets
      } else {
        console.error('创建数据集API失败:', result.message);
        message.error(`创建数据集失败: ${result.message}`);
      }
    } catch (error: any) {
      console.error('创建数据集失败:', error);
      message.error(`创建数据集失败: ${error.message}`);
    }
  };

  // 创建数据集版本
  const handleCreateVersion = async (values: any) => {
    if (!selectedDataset) return;

    try {
      const response = await fetch('/api/aihc/public-dataset/version', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          datasetID: selectedDataset.id,
          PublicDataEntries: values,
          useProduction,
          region: selectedRegion,
        }),
      });

      const result = await response.json();

      if (result.success) {
        message.success('数据集版本创建成功');
        setVersionModalVisible(false);
        versionForm.resetFields();
        fetchDatasets();
      } else {
        console.error('创建数据集版本API失败:', result.message);
        message.error(`创建数据集版本失败: ${result.message}`);

        // 更新数据集信息
        const updatedDataset = {
          ...selectedDataset,
          publicDataEntries: values,
          updateTime: new Date().toLocaleString(),
        };
        setSelectedDataset(updatedDataset);
        // ProTable会自动管理数据，不需要手动更新
      }
    } catch (error: any) {
      console.error('创建数据集版本失败:', error);
      message.error(`创建数据集版本失败: ${error.message}`);
    }
  };

  // 查看数据集详情
  const handleViewDataset = async (record: DatasetItem) => {
    try {
      const response = await fetch(
        `/api/aihc/public-dataset/${record.id}?useProduction=${useProduction}&region=${selectedRegion}`,
      );
      const result = await response.json();

      if (result.success) {
        setSelectedDataset(result.data);
        setDrawerVisible(true);
      } else {
        // 如果API失败，使用当前记录数据
        console.warn('获取数据集详情API失败，使用当前数据:', result.message);
        setSelectedDataset(record);
        setDrawerVisible(true);
      }
    } catch (error: any) {
      console.error('获取数据集详情失败:', error);
      // 使用当前记录数据
      setSelectedDataset(record);
      setDrawerVisible(true);
    }
  };

  // 处理CSV文件上传和解析
  const handleCsvUpload = async (file: File) => {
    setImportStatus('uploading');
    setImportProgress(0);
    setImportResults([]);
    setFileParseError('');
    setUploadedFile(file);

    try {
      // 读取CSV文件
      const text = await file.text();
      const lines = text.split('\n').filter((line) => line.trim());

      if (lines.length < 2) {
        const errorMsg = 'CSV文件格式错误：至少需要包含标题行和数据行';
        setFileParseError(errorMsg);
        setImportStatus('error');
        return;
      }

      // 解析CSV标题
      const headers = lines[0]
        .split(',')
        .map((h) => h.trim().replace(/"/g, ''));
      const requiredHeaders = [
        'name',
        'scene',
        'dataType',
        'datasetType',
        'datasetFormat',
        'publisher',
        'description',
      ];
      const missingHeaders = requiredHeaders.filter(
        (h) => !headers.includes(h),
      );

      if (missingHeaders.length > 0) {
        const errorMsg = `CSV文件缺少必需列: ${missingHeaders.join(', ')}`;
        setFileParseError(errorMsg);
        setImportStatus('error');
        return;
      }

      // 解析数据行
      const datasets = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i]
          .split(',')
          .map((v) => v.trim().replace(/"/g, ''));
        if (values.length !== headers.length) {
          console.warn(`第${i + 1}行数据列数不匹配，跳过`);
          continue;
        }

        const dataset: any = {};
        headers.forEach((header, index) => {
          dataset[header] = values[index];
        });

        // 设置默认值
        dataset.storageType = dataset.storageType || 's3';
        dataset.storageInstance = dataset.storageInstance || 'example-instance';
        dataset.url = dataset.url || 'https://example.com/dataset';
        dataset.publicDataEntries = {
          version: 'v1',
          sourcePath: dataset.sourcePath || '/source/path',
          storagePath: dataset.storagePath || '/storage/path',
        };

        datasets.push(dataset);
        setImportProgress(Math.round((i / (lines.length - 1)) * 100));
      }

      setParsedDatasets(datasets);
      setImportStatus('preview');
      setImportProgress(100);

      message.success(
        `文件解析成功！共解析到 ${datasets.length} 个数据集，请确认后开始导入。`,
      );
    } catch (error: any) {
      const errorMsg = `文件解析失败: ${error.message}`;
      setFileParseError(errorMsg);
      setImportStatus('error');
    }
  };

  // 开始批量导入数据集
  const startBatchImport = async () => {
    if (parsedDatasets.length === 0) {
      message.error('没有可导入的数据集');
      return;
    }

    setImportStatus('processing');
    setImportProgress(0);

    try {
      // 批量创建数据集
      const results = [];
      for (let i = 0; i < parsedDatasets.length; i++) {
        try {
          const response = await fetch('/api/aihc/public-dataset/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...parsedDatasets[i],
              useProduction,
              region: selectedRegion,
            }),
          });

          const result = await response.json();
          results.push({
            index: i + 1,
            name: parsedDatasets[i].name,
            success: result.success,
            message: result.success ? '创建成功' : result.message,
            data: result.data,
          });

          setImportProgress(
            Math.round(((i + 1) / parsedDatasets.length) * 100),
          );
        } catch (error) {
          results.push({
            index: i + 1,
            name: parsedDatasets[i].name,
            success: false,
            message: `创建失败: ${(error as any).message}`,
            data: null,
          });
        }
      }

      setImportResults(results);
      setImportStatus('completed');
      setImportProgress(100);

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.length - successCount;

      message.success(
        `批量导入完成！成功: ${successCount}，失败: ${failCount}`,
      );

      // 更新统计数据
      fetchStatistics();
      // 刷新列表
      proTableRef.current?.reload();
    } catch (error: any) {
      console.error('批量导入失败:', error);
      message.error(`批量导入失败: ${error.message}`);
      setImportStatus('error');
    }
  };

  // 重置导入状态
  const resetImportStatus = () => {
    setImportStatus('idle');
    setImportProgress(0);
    setImportResults([]);
    setUploadedFile(null);
    setParsedDatasets([]);
    setFileParseError('');
  };

  // 表格列定义
  const columns = [
    {
      title: '数据集名称/ID',
      dataIndex: 'name',
      width: 250,
      ellipsis: true,
      copyable: true,
      render: (text: any, record: DatasetItem) => (
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{text}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{record.id}</div>
        </div>
      ),
    },
    {
      title: '数据类型',
      dataIndex: 'dataType',
      width: 100,
      render: (text: any) => <Tag color="green">{text}</Tag>,
    },
    {
      title: '场景',
      dataIndex: 'scene',
      width: 120,
      render: (text: any) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '大小',
      dataIndex: 'size',
      width: 100,
    },
    {
      title: '发布方',
      dataIndex: 'publisher',
      width: 120,
    },
    {
      title: '最后上传时间',
      dataIndex: 'updateTime',
      width: 150,
      render: (text: any) => (text ? new Date(text).toLocaleString() : '-'),
    },
    {
      title: '操作',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: DatasetItem) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDataset(record)}
            style={{ color: '#1890ff' }}
          >
            查看
          </Button>
          <Button
            type="text"
            size="small"
            icon={<CloudUploadOutlined />}
            onClick={() => {
              setSelectedDataset(record);
              setVersionModalVisible(true);
            }}
            style={{ color: '#1890ff' }}
          >
            创建版本
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="公共数据集列表"
      subTitle="查看AIHC公共数据集，支持创建、查看和版本管理"
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
      {/* 统计区域 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
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
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="总数据集数"
              value={statistics.total}
              prefix={<DatabaseOutlined />}
              valueStyle={{ fontSize: '24px', fontWeight: 'bold' }}
            />
          </Col>
          {Object.entries(statistics)
            .filter(([key]) => key !== 'total')
            .map(([dataType, count], index) => {
              const colors = [
                '#1890ff',
                '#52c41a',
                '#faad14',
                '#f5222d',
                '#722ed1',
                '#13c2c2',
              ];
              const color = colors[index % colors.length];
              return (
                <Col xs={24} sm={12} md={6} key={dataType}>
                  <Statistic
                    title={`${dataType}数据集`}
                    value={count}
                    prefix={<DatabaseOutlined />}
                    valueStyle={{ color, fontSize: '24px', fontWeight: 'bold' }}
                  />
                </Col>
              );
            })}
        </Row>
      </Card>

      {/* 数据表格区域 */}
      <Card>
        <div
          style={{
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
            数据集列表
          </h4>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              创建数据集
            </Button>
            <Button
              type="default"
              icon={<UploadOutlined />}
              onClick={() => setImportModalVisible(true)}
            >
              批量导入
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => proTableRef.current?.reload()}
            >
              刷新
            </Button>
          </Space>
        </div>

        <ProTable<DatasetItem>
          actionRef={proTableRef}
          columns={columns}
          loading={loading}
          rowKey="id"
          pagination={{
            showQuickJumper: true,
            showSizeChanger: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条/总共 ${total} 条`,
            pageSizeOptions: ['5', '10', '20', '50'],
            defaultPageSize: 10,
          }}
          search={false}
          request={fetchDatasets}
          scroll={{ x: 1200 }}
          size="middle"
        />
      </Card>

      {/* 创建数据集模态框 */}
      <Modal
        title="创建公共数据集"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateDataset}>
          <Form.Item
            name="name"
            label="数据集名称"
            rules={[{ required: true, message: '请输入数据集名称' }]}
          >
            <Input placeholder="请输入数据集名称" />
          </Form.Item>

          <Form.Item
            name="scene"
            label="应用场景"
            rules={[{ required: true, message: '请输入应用场景' }]}
          >
            <Input placeholder="如: Image Classification, Object Detection, Text Classification" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="dataType"
                label="数据类型"
                rules={[{ required: true, message: '请输入数据类型' }]}
              >
                <Input placeholder="如: image, text, audio, video" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="size"
                label="数据集大小"
                rules={[{ required: true, message: '请输入数据集大小' }]}
              >
                <Input placeholder="如: 500MB, 1GB" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="datasetType"
                label="数据集类型"
                rules={[{ required: true, message: '请输入数据集类型' }]}
              >
                <Input placeholder="如: public, private" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="datasetFormat"
                label="数据格式"
                rules={[{ required: true, message: '请输入数据格式' }]}
              >
                <Input placeholder="如: folder, zip, tar" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="publisher"
            label="发布者"
            rules={[{ required: true, message: '请输入发布者' }]}
          >
            <Input placeholder="请输入发布者姓名" />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
            rules={[{ required: true, message: '请输入数据集描述' }]}
          >
            <Input.TextArea rows={3} placeholder="请输入数据集描述" />
          </Form.Item>

          <Form.Item name="url" label="数据集URL">
            <Input placeholder="请输入数据集访问URL（可选）" />
          </Form.Item>

          <Divider>存储配置</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="storageType"
                label="存储类型"
                rules={[{ required: true, message: '请输入存储类型' }]}
              >
                <Input placeholder="如: s3, oss, local" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="storageInstance"
                label="存储实例"
                rules={[{ required: true, message: '请输入存储实例' }]}
              >
                <Input placeholder="请输入存储实例名称" />
              </Form.Item>
            </Col>
          </Row>

          <Divider>公共数据条目</Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name={['publicDataEntries', 'version']}
                label="版本"
                rules={[{ required: true, message: '请输入版本' }]}
              >
                <Input placeholder="如: v1" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={['publicDataEntries', 'sourcePath']}
                label="源路径"
                rules={[{ required: true, message: '请输入源路径' }]}
              >
                <Input placeholder="如: /source/path" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={['publicDataEntries', 'storagePath']}
                label="存储路径"
                rules={[{ required: true, message: '请输入存储路径' }]}
              >
                <Input placeholder="如: /storage/path" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setCreateModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                创建
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 创建版本模态框 */}
      <Modal
        title="创建数据集版本"
        open={versionModalVisible}
        onCancel={() => {
          setVersionModalVisible(false);
          versionForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={versionForm}
          layout="vertical"
          onFinish={handleCreateVersion}
        >
          <Form.Item
            name="version"
            label="版本号"
            rules={[{ required: true, message: '请输入版本号' }]}
          >
            <Input placeholder="如: v1.0, v2.0" />
          </Form.Item>

          <Form.Item
            name="sourcePath"
            label="源路径"
            rules={[{ required: true, message: '请输入源路径' }]}
          >
            <Input placeholder="如: /path/to/source" />
          </Form.Item>

          <Form.Item
            name="storagePath"
            label="存储路径"
            rules={[{ required: true, message: '请输入存储路径' }]}
          >
            <Input placeholder="如: /path/to/storage" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setVersionModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                创建版本
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 批量导入Modal */}
      <Modal
        title="批量导入数据集"
        open={importModalVisible}
        onCancel={() => {
          setImportModalVisible(false);
          resetImportStatus();
        }}
        footer={null}
        width={800}
      >
        <div style={{ marginBottom: 16 }}>
          <h4>CSV文件格式要求</h4>
          <p>请确保CSV文件包含以下必需列：</p>
          <ul>
            <li>
              <strong>name</strong> - 数据集名称
            </li>
            <li>
              <strong>scene</strong> - 应用场景
            </li>
            <li>
              <strong>dataType</strong> - 数据类型 (image/text/other)
            </li>
            <li>
              <strong>datasetType</strong> - 数据集类型 (public/private)
            </li>
            <li>
              <strong>datasetFormat</strong> - 数据集格式 (folder/file)
            </li>
            <li>
              <strong>publisher</strong> - 发布方
            </li>
            <li>
              <strong>description</strong> - 描述
            </li>
          </ul>
          <p>可选列：</p>
          <ul>
            <li>
              <strong>size</strong> - 数据集大小
            </li>
            <li>
              <strong>storageType</strong> - 存储类型 (默认: s3)
            </li>
            <li>
              <strong>storageInstance</strong> - 存储实例 (默认:
              example-instance)
            </li>
            <li>
              <strong>url</strong> - 数据集URL
            </li>
            <li>
              <strong>sourcePath</strong> - 源路径
            </li>
            <li>
              <strong>storagePath</strong> - 存储路径
            </li>
          </ul>
        </div>

        <Upload.Dragger
          accept=".csv"
          beforeUpload={(file) => {
            handleCsvUpload(file);
            return false; // 阻止自动上传
          }}
          showUploadList={false}
          disabled={
            importStatus === 'uploading' || importStatus === 'processing'
          }
        >
          <p className="ant-upload-drag-icon">
            <FileTextOutlined style={{ fontSize: 48, color: '#1890ff' }} />
          </p>
          <p className="ant-upload-text">
            {importStatus === 'idle'
              ? '点击或拖拽CSV文件到此区域上传'
              : importStatus === 'uploading'
                ? '正在解析文件...'
                : importStatus === 'preview'
                  ? '文件解析完成，请确认导入'
                  : importStatus === 'processing'
                    ? '正在创建数据集...'
                    : importStatus === 'completed'
                      ? '导入完成！'
                      : '上传失败'}
          </p>
          <p className="ant-upload-hint">支持单个或批量上传，仅支持CSV格式</p>
        </Upload.Dragger>

        {/* 文件解析错误显示 */}
        {fileParseError && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              backgroundColor: '#fff2f0',
              border: '1px solid #ffccc7',
              borderRadius: 6,
            }}
          >
            <p style={{ color: '#ff4d4f', margin: 0 }}>
              <strong>解析错误：</strong>
              {fileParseError}
            </p>
          </div>
        )}

        {/* 文件预览区域 */}
        {importStatus === 'preview' && parsedDatasets.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h4>文件预览 - 共 {parsedDatasets.length} 个数据集</h4>
            <div style={{ marginBottom: 12 }}>
              <strong>文件名：</strong>
              {uploadedFile?.name}
            </div>
            <Table
              dataSource={parsedDatasets.slice(0, 10)} // 只显示前10条
              columns={[
                {
                  title: '序号',
                  dataIndex: 'index',
                  width: 60,
                  render: (_, __, index) => index + 1,
                },
                {
                  title: '数据集名称',
                  dataIndex: 'name',
                  ellipsis: true,
                },
                {
                  title: '应用场景',
                  dataIndex: 'scene',
                  ellipsis: true,
                },
                {
                  title: '数据类型',
                  dataIndex: 'dataType',
                  width: 80,
                },
                {
                  title: '数据集类型',
                  dataIndex: 'datasetType',
                  width: 100,
                },
                {
                  title: '发布方',
                  dataIndex: 'publisher',
                  ellipsis: true,
                },
              ]}
              pagination={false}
              size="small"
              scroll={{ y: 200 }}
            />
            {parsedDatasets.length > 10 && (
              <p style={{ marginTop: 8, color: '#666', fontSize: '12px' }}>
                仅显示前10条记录，实际将导入 {parsedDatasets.length} 个数据集
              </p>
            )}
          </div>
        )}

        {/* 进度条 */}
        {(importStatus === 'uploading' || importStatus === 'processing') && (
          <div style={{ marginTop: 16 }}>
            <Progress
              percent={importProgress}
              format={(percent) => `${percent}%`}
            />
          </div>
        )}

        {importResults.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h4>导入结果</h4>
            <Table
              dataSource={importResults}
              columns={[
                {
                  title: '序号',
                  dataIndex: 'index',
                  width: 60,
                },
                {
                  title: '数据集名称',
                  dataIndex: 'name',
                  ellipsis: true,
                },
                {
                  title: '状态',
                  dataIndex: 'success',
                  width: 80,
                  render: (success: boolean) => (
                    <Tag color={success ? 'green' : 'red'}>
                      {success ? '成功' : '失败'}
                    </Tag>
                  ),
                },
                {
                  title: '消息',
                  dataIndex: 'message',
                  ellipsis: true,
                },
              ]}
              pagination={false}
              size="small"
              scroll={{ y: 200 }}
            />
          </div>
        )}

        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Space>
            <Button
              onClick={() => {
                setImportModalVisible(false);
                resetImportStatus();
              }}
            >
              关闭
            </Button>
            {importStatus === 'preview' && (
              <Button type="primary" onClick={startBatchImport}>
                确认导入 {parsedDatasets.length} 个数据集
              </Button>
            )}
            {importStatus === 'completed' && (
              <Button
                type="primary"
                onClick={() => {
                  setImportModalVisible(false);
                  resetImportStatus();
                }}
              >
                完成
              </Button>
            )}
          </Space>
        </div>
      </Modal>

      {/* 数据集详情抽屉 */}
      <Drawer
        title={`数据集详情 - ${selectedDataset?.name || ''}`}
        placement="right"
        width={800}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        destroyOnClose
      >
        {selectedDataset && (
          <div>
            {/* 基本信息 */}
            <Descriptions
              title="基本信息"
              bordered
              column={2}
              size="small"
              style={{ marginBottom: 24 }}
            >
              <Descriptions.Item label="数据集名称" span={2}>
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                    {selectedDataset.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    ID: {selectedDataset.datasetId}
                  </div>
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="应用场景" span={1}>
                <Tag color="blue">{selectedDataset.scene}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="数据类型" span={1}>
                <Tag color="green">{selectedDataset.dataType}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="数据集大小" span={1}>
                {selectedDataset.size}
              </Descriptions.Item>
              <Descriptions.Item label="数据集类型" span={1}>
                <Tag color="orange">{selectedDataset.datasetType}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="发布者" span={1}>
                {selectedDataset.publisher}
              </Descriptions.Item>
              <Descriptions.Item label="数据格式" span={1}>
                <Tag color="cyan">{selectedDataset.datasetFormat}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="存储类型" span={1}>
                <Tag color="purple">{selectedDataset.storageType}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="存储实例" span={1}>
                {selectedDataset.storageInstance}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间" span={1}>
                  {selectedDataset.createdTime || selectedDataset.createTime
                  ? new Date(
                      selectedDataset.createdTime ||
                        selectedDataset.createTime ||
                        Date.now(),
                    ).toLocaleString()
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="最后更新时间" span={1}>
                  {selectedDataset.updatedTime || selectedDataset.updateTime
                  ? new Date(
                      selectedDataset.updatedTime ||
                        selectedDataset.updateTime ||
                        Date.now(),
                    ).toLocaleString()
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="描述" span={2}>
                <div style={{ wordBreak: 'break-all' }}>
                  {selectedDataset.description}
                </div>
              </Descriptions.Item>
              {selectedDataset.url && (
                <Descriptions.Item label="访问URL" span={2}>
                  <a
                    href={selectedDataset.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {selectedDataset.url}
                  </a>
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* 版本列表 */}
            {selectedDataset.publicDataEntries &&
              selectedDataset.publicDataEntries.length > 0 && (
                <div>
                  <h4 style={{ marginBottom: 16, color: '#1890ff' }}>
                    版本列表
                  </h4>
                  <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '13px',
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            backgroundColor: '#fafafa',
                            borderBottom: '2px solid #e8e8e8',
                          }}
                        >
                          <th
                            style={{
                              padding: '8px 12px',
                              textAlign: 'left',
                              fontWeight: 500,
                              color: '#666',
                            }}
                          >
                            版本
                          </th>
                          <th
                            style={{
                              padding: '8px 12px',
                              textAlign: 'left',
                              fontWeight: 500,
                              color: '#666',
                            }}
                          >
                            ID
                          </th>
                          <th
                            style={{
                              padding: '8px 12px',
                              textAlign: 'left',
                              fontWeight: 500,
                              color: '#666',
                            }}
                          >
                            源路径
                          </th>
                          <th
                            style={{
                              padding: '8px 12px',
                              textAlign: 'left',
                              fontWeight: 500,
                              color: '#666',
                            }}
                          >
                            存储路径
                          </th>
                          <th
                            style={{
                              padding: '8px 12px',
                              textAlign: 'left',
                              fontWeight: 500,
                              color: '#666',
                            }}
                          >
                            更新时间
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDataset.publicDataEntries.map(
                          (entry: any, index: number) => (
                            <tr
                              key={entry.id || index}
                              style={{
                                borderBottom: '1px solid #f0f0f0',
                                backgroundColor:
                                  index % 2 === 0 ? '#fff' : '#fafafa',
                              }}
                            >
                              <td style={{ padding: '8px 12px' }}>
                                <Tag color="blue">版本 {entry.version}</Tag>
                              </td>
                              <td
                                style={{ padding: '8px 12px', color: '#666' }}
                              >
                                {entry.id}
                              </td>
                              <td
                                style={{
                                  padding: '8px 12px',
                                  fontFamily: 'monospace',
                                  wordBreak: 'break-all',
                                }}
                              >
                                {entry.sourcePath}
                              </td>
                              <td
                                style={{
                                  padding: '8px 12px',
                                  fontFamily: 'monospace',
                                  wordBreak: 'break-all',
                                }}
                              >
                                {entry.storagePath}
                              </td>
                              <td
                                style={{
                                  padding: '8px 12px',
                                  color: '#999',
                                  fontSize: '12px',
                                }}
                              >
                                {entry.updatedTime
                                  ? new Date(entry.updatedTime).toLocaleString()
                                  : '-'}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
          </div>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default PublicDataset;
