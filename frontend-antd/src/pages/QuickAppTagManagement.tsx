import {
  AppstoreOutlined,
  EyeOutlined,
  FilterOutlined,
  SearchOutlined,
  SettingOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import {
  message as antdMessage,
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  Descriptions,
  Drawer,
  Input,
  List,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Tooltip,
} from 'antd';
import React, { useEffect, useState } from 'react';

const { Search } = Input;
const { Option } = Select;

// 标签类型定义
type FastTag = {
  tagId: number;
  value: string;
  tagType?: string;
  tagTypeName?: string;
};

// 标签类型分类定义
type TagType = {
  tagType: string;
  tagTypeName: string;
  tagList: FastTag[];
};

// 应用类型定义
type QuickApp = {
  templateID: number;
  templateName: string;
  tags?: Array<{ tagId: number; value: string }>;
};

// 标签类型配置（用于显示颜色）
const TAG_TYPE_COLORS: Record<string, string> = {
  operationWay: 'blue',
  modelSeries: 'green',
  modelCategory: 'orange',
  useScene: 'purple',
  Keywords: 'cyan',
  heat: 'red',
};

const QuickAppTagManagement: React.FC = () => {
  const [selectedTag, setSelectedTag] = useState<FastTag | null>(null);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [appManageModalVisible, setAppManageModalVisible] = useState(false);
  const [tagTypes, setTagTypes] = useState<TagType[]>([]);
  const [allApps, setAllApps] = useState<QuickApp[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [statistics, setStatistics] = useState({
    totalCount: 0,
    typeCount: 0,
  });
  const [filterTagType, setFilterTagType] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [appPageSize, setAppPageSize] = useState<number>(10);
  const [appCurrentPage, setAppCurrentPage] = useState<number>(1);
  const [useProduction, setUseProduction] = useState(false); // 环境切换：false=灰度，true=生产
  const [currentEnvironment, setCurrentEnvironment] = useState<string>('gray'); // 当前环境
  const [hasProductionConfig, setHasProductionConfig] = useState(false); // 是否有生产环境配置
  const [hasGrayConfig, setHasGrayConfig] = useState(false); // 是否有灰度环境配置
  const actionRef = React.useRef<ActionType>(undefined as any);

  // 检查环境配置
  const checkEnvironmentConfig = async () => {
    try {
      const response = await fetch('/api/config');
      const result = await response.json();

      if (result.success && result.data) {
        const config = result.data.config || result.data;

        // 检查生产环境配置
        const prodHost = config.FASTAPP_MANAGEMENT_HOST_PRODUCTION;
        const hasProd = !!(
          prodHost &&
          prodHost !== '' &&
          prodHost !== '********'
        );
        setHasProductionConfig(hasProd);

        // 检查灰度环境配置
        const grayHost = config.FASTAPP_MANAGEMENT_HOST_GRAY;
        const hasGray = !!(
          grayHost &&
          grayHost !== '' &&
          grayHost !== '********'
        );
        setHasGrayConfig(hasGray);

        // 自动选择可用的环境
        if (!hasGray && hasProd) {
          setUseProduction(true);
          setCurrentEnvironment('production');
        } else if (hasGray) {
          setUseProduction(false);
          setCurrentEnvironment('gray');
        } else {
          antdMessage.warning('请先在系统设置中配置快速开始应用管理的环境地址');
        }
      }
    } catch (error) {
      console.error('检查环境配置失败:', error);
      setHasProductionConfig(false);
      setHasGrayConfig(false);
      antdMessage.error('检查环境配置失败');
    }
  };

  // 加载标签类型列表
  useEffect(() => {
    checkEnvironmentConfig();
    fetchTagTypes();
  }, []);

  // 环境切换时刷新数据
  useEffect(() => {
    if (actionRef.current) {
      actionRef.current.reload();
    }
    fetchTagTypes();
  }, [useProduction]);

  const fetchTagTypes = async () => {
    try {
      // 根据当前环境获取标签类型
      const response = await fetch(
        `/api/aihclite/template/v1/fasttaglist/types?useProduction=${useProduction}`,
      );
      const result = await response.json();

      if (result.errno === 0) {
        setTagTypes(result.data.tagTypes || []);
        if (result.data.environment) {
          setCurrentEnvironment(result.data.environment);
        }
      } else {
        antdMessage.error('获取标签类型失败');
      }
    } catch (error) {
      console.error('获取标签类型失败:', error);
      antdMessage.error('获取标签类型失败');
    }
  };

  // 查看标签详情
  const handleViewDetail = async (tagId: number) => {
    try {
      // 根据当前环境获取标签详情
      const response = await fetch(
        `/api/aihclite/template/v1/fasttaglist/${tagId}?useProduction=${useProduction}`,
      );
      const result = await response.json();

      if (result.errno === 0) {
        setSelectedTag(result.data);
        setDetailDrawerVisible(true);
      } else {
        antdMessage.error('获取标签详情失败');
      }
    } catch (error) {
      console.error('获取标签详情失败:', error);
      antdMessage.error('获取标签详情失败');
    }
  };

  // 管理应用
  const handleManageApps = async (tag: FastTag) => {
    setSelectedTag(tag);
    setLoadingApps(true);
    setAppManageModalVisible(true);
    // 重置分页状态
    setAppCurrentPage(1);
    setAppPageSize(10);

    try {
      // 获取所有应用列表
      const response = await fetch(
        `/api/aihclite/template/v1/manage/list?pageNo=1&pageSize=1000&useProduction=${useProduction}`,
      );
      const result = await response.json();

      if (result.success && result.data) {
        setAllApps(result.data.list || []);
      } else {
        antdMessage.error('获取应用列表失败');
      }
    } catch (error) {
      console.error('获取应用列表失败:', error);
      antdMessage.error('获取应用列表失败');
    } finally {
      setLoadingApps(false);
    }
  };

  // 切换应用的标签状态
  const handleToggleAppTag = async (app: QuickApp, hasTag: boolean) => {
    if (!selectedTag) return;

    try {
      if (hasTag) {
        // 移除标签
        const response = await fetch(
          '/api/aihclite/template/v1/manage/deltag',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              templateID: app.templateID,
              tagId: selectedTag.tagId,
            }),
          },
        );

        const result = await response.json();
        if (result.errno === 0) {
          antdMessage.success(`已从"${app.templateName}"移除标签`);
          // 更新应用列表
          setAllApps((apps) =>
            apps.map((a) =>
              a.templateID === app.templateID
                ? {
                    ...a,
                    tags: (a.tags || []).filter(
                      (t) => t.tagId !== selectedTag.tagId,
                    ),
                  }
                : a,
            ),
          );
        } else {
          antdMessage.error(result.message || '移除标签失败');
        }
      } else {
        // 添加标签
        const response = await fetch(
          '/api/aihclite/template/v1/manage/addtag',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              templateID: app.templateID,
              tagId: selectedTag.tagId,
              value: selectedTag.value,
            }),
          },
        );

        const result = await response.json();
        if (result.errno === 0) {
          antdMessage.success(`已为"${app.templateName}"添加标签`);
          // 更新应用列表
          setAllApps((apps) =>
            apps.map((a) =>
              a.templateID === app.templateID
                ? {
                    ...a,
                    tags: [
                      ...(a.tags || []),
                      { tagId: selectedTag.tagId, value: selectedTag.value },
                    ],
                  }
                : a,
            ),
          );
        } else {
          antdMessage.error(result.message || '添加标签失败');
        }
      }
    } catch (error) {
      console.error('操作失败:', error);
      antdMessage.error('操作失败');
    }
  };

  // 表格列定义
  const columns: ProColumns<FastTag>[] = [
    {
      title: '标签ID',
      dataIndex: 'tagId',
      key: 'tagId',
      width: 120,
      fixed: 'left',
      render: (_, record) => <code>{record.tagId}</code>,
    },
    {
      title: '标签名称',
      dataIndex: 'value',
      key: 'value',
      width: 200,
      fixed: 'left',
      render: (_, record) => {
        const color = record.tagType
          ? TAG_TYPE_COLORS[record.tagType]
          : 'default';
        return (
          <Tag color={color} icon={<TagsOutlined />}>
            {record.value}
          </Tag>
        );
      },
    },
    {
      title: '标签类型',
      dataIndex: 'tagTypeName',
      key: 'tagTypeName',
      width: 150,
      render: (_, record) =>
        record.tagTypeName ? (
          <Badge status="processing" text={record.tagTypeName} />
        ) : (
          '-'
        ),
    },
    {
      title: '类型代码',
      dataIndex: 'tagType',
      key: 'tagType',
      width: 150,
      render: (_, record) =>
        record.tagType ? <code>{record.tagType}</code> : '-',
    },
    {
      title: '操作',
      valueType: 'option',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_, record: FastTag) => (
        <Space size="small">
          <a onClick={() => handleViewDetail(record.tagId)}>
            <EyeOutlined /> 详情
          </a>
          <a onClick={() => handleManageApps(record)}>
            <AppstoreOutlined /> 管理应用
          </a>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="快速开始应用标签管理"
      subTitle="管理快速开始应用的标签，支持查询和筛选"
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
                    antdMessage.info('已切换到灰度环境');
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
              <Button
                type={useProduction ? 'primary' : 'default'}
                disabled={!hasProductionConfig}
                onClick={() => {
                  if (hasProductionConfig) {
                    setUseProduction(true);
                    antdMessage.info('已切换到生产环境');
                  }
                }}
              >
                生产环境
              </Button>
            </Tooltip>
          </Space.Compact>
          {(!hasGrayConfig || !hasProductionConfig) && (
            <Tooltip title="配置快速开始应用管理环境地址">
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
              title="标签总数"
              value={statistics.totalCount}
              prefix={<TagsOutlined />}
              valueStyle={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#1890ff',
              }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="标签类型"
              value={statistics.typeCount}
              prefix={<FilterOutlined />}
              valueStyle={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#52c41a',
              }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="筛选结果"
              value={actionRef.current?.pageInfo?.total || 0}
              prefix={<SearchOutlined />}
              valueStyle={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#faad14',
              }}
            />
          </Col>
        </Row>
      </Card>

      {/* 筛选工具栏 */}
      <Card style={{ marginBottom: 24 }}>
        <Space size="large" style={{ width: '100%' }} wrap>
          <Space>
            <span style={{ fontWeight: 500 }}>标签类型:</span>
            <Select
              style={{ width: 200 }}
              value={filterTagType}
              onChange={(value) => {
                setFilterTagType(value);
                actionRef.current?.reload();
              }}
            >
              <Option value="all">全部</Option>
              {tagTypes.map((type) => (
                <Option key={type.tagType} value={type.tagType}>
                  {type.tagTypeName} ({type.tagList.length})
                </Option>
              ))}
            </Select>
          </Space>
          <Space>
            <span style={{ fontWeight: 500 }}>搜索:</span>
            <Search
              placeholder="输入标签名称搜索"
              allowClear
              style={{ width: 300 }}
              onSearch={(value) => {
                setSearchKeyword(value);
                actionRef.current?.reload();
              }}
              enterButton={<SearchOutlined />}
            />
          </Space>
        </Space>
      </Card>

      {/* 标签列表表格 */}
      <ProTable<FastTag>
        columns={columns}
        actionRef={actionRef}
        request={async (params) => {
          try {
            // 构建查询参数
            const queryParams = new URLSearchParams({
              page: String(params.current || 1),
              pageSize: String(params.pageSize || 20),
            });

            if (searchKeyword) {
              queryParams.append('keyword', searchKeyword);
            }

            if (filterTagType && filterTagType !== 'all') {
              queryParams.append('tagType', filterTagType);
            }

            // 根据当前环境获取标签列表
            queryParams.append('useProduction', String(useProduction));

            const response = await fetch(
              `/api/aihclite/template/v1/fasttaglist?${queryParams.toString()}`,
            );
            const result = await response.json();

            if (result.errno === 0) {
              // 更新当前环境
              if (result.data.environment) {
                setCurrentEnvironment(result.data.environment);
              }

              // 更新统计信息
              setStatistics({
                totalCount: result.data.count || 0,
                typeCount: result.data.tagTypes?.length || 0,
              });

              // 为每个标签添加类型信息
              const enrichedTags = result.data.list.map((tag: FastTag) => {
                // 在 tagTypes 中查找该标签所属的类型
                for (const tagType of result.data.tagTypes || []) {
                  const foundTag = tagType.tagList.find(
                    (t: FastTag) => t.tagId === tag.tagId,
                  );
                  if (foundTag) {
                    return {
                      ...tag,
                      tagType: tagType.tagType,
                      tagTypeName: tagType.tagTypeName,
                    };
                  }
                }
                return tag;
              });

              return {
                data: enrichedTags,
                total: result.data.totalCount || result.data.count,
                success: true,
              };
            } else {
              antdMessage.error(result.message || '获取标签列表失败');
              return {
                data: [],
                total: 0,
                success: false,
              };
            }
          } catch (error) {
            console.error('获取标签列表失败:', error);
            antdMessage.error('获取标签列表失败');
            return {
              data: [],
              total: 0,
              success: false,
            };
          }
        }}
        rowKey="tagId"
        search={false}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 个标签`,
        }}
        dateFormatter="string"
        headerTitle="标签列表"
        toolBarRender={false}
      />

      {/* 标签详情抽屉 */}
      <Drawer
        title="标签详情"
        open={detailDrawerVisible}
        onClose={() => setDetailDrawerVisible(false)}
        width={600}
      >
        {selectedTag && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="标签ID">
              <code>{selectedTag.tagId}</code>
            </Descriptions.Item>
            <Descriptions.Item label="标签名称">
              <Tag
                color={
                  selectedTag.tagType
                    ? TAG_TYPE_COLORS[selectedTag.tagType]
                    : 'default'
                }
                icon={<TagsOutlined />}
                style={{ fontSize: 14, padding: '4px 12px' }}
              >
                {selectedTag.value}
              </Tag>
            </Descriptions.Item>
            {selectedTag.tagTypeName && (
              <Descriptions.Item label="标签类型">
                <Badge status="processing" text={selectedTag.tagTypeName} />
              </Descriptions.Item>
            )}
            {selectedTag.tagType && (
              <Descriptions.Item label="类型代码">
                <code>{selectedTag.tagType}</code>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Drawer>

      {/* 应用管理模态框 */}
      <Modal
        title={`管理应用 - ${selectedTag?.value || ''}`}
        open={appManageModalVisible}
        onCancel={() => setAppManageModalVisible(false)}
        footer={null}
        width={800}
      >
        <div style={{ marginBottom: 16 }}>
          <Badge
            status="processing"
            text={`共 ${allApps.length} 个应用，其中 ${allApps.filter((app) => app.tags?.some((t) => t.tagId === selectedTag?.tagId)).length} 个拥有此标签`}
          />
        </div>

        <List
          loading={loadingApps}
          bordered
          dataSource={allApps}
          renderItem={(app) => {
            const hasTag =
              app.tags?.some((t) => t.tagId === selectedTag?.tagId) || false;
            return (
              <List.Item
                actions={[
                  <Checkbox
                    key="checkbox"
                    checked={hasTag}
                    onChange={() => handleToggleAppTag(app, hasTag)}
                  >
                    {hasTag ? '已添加' : '添加标签'}
                  </Checkbox>,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 4,
                        backgroundColor: hasTag ? '#e6f7ff' : '#f5f5f5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: hasTag
                          ? '1px solid #1890ff'
                          : '1px solid #d9d9d9',
                      }}
                    >
                      <AppstoreOutlined
                        style={{
                          fontSize: 20,
                          color: hasTag ? '#1890ff' : '#999',
                        }}
                      />
                    </div>
                  }
                  title={
                    <Space>
                      <span>{app.templateName}</span>
                      {hasTag && <Tag color="blue">已包含</Tag>}
                    </Space>
                  }
                  description={`应用ID: ${app.templateID}`}
                />
              </List.Item>
            );
          }}
          pagination={{
            current: appCurrentPage,
            pageSize: appPageSize,
            pageSizeOptions: ['10', '20', '50', '100'],
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 个应用`,
            onChange: (page, pageSize) => {
              setAppCurrentPage(page);
              if (pageSize !== appPageSize) {
                setAppPageSize(pageSize);
                setAppCurrentPage(1); // 改变页面大小时重置到第一页
              }
            },
          }}
        />
      </Modal>
    </PageContainer>
  );
};

export default QuickAppTagManagement;
