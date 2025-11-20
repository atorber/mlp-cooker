import {
  AuditOutlined,
  BellOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  FileExcelOutlined,
  MessageOutlined,
  SearchOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-table';
import {
  App,
  Button,
  Card,
  Checkbox,
  Col,
  Descriptions,
  Drawer,
  Input,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Tabs,
  Tag,
  Timeline,
} from 'antd';
import { useEffect, useState } from 'react';
import {
  getCardDetails,
  getCardHistory,
  getCards,
  manualCheck,
  sendNotification,
} from '@/services/aihc-mentor/api';

// 添加全局样式
const globalStyles = `
  .card-detail-content img {
    max-width: 100% !important;
    height: auto !important;
    display: block;
    margin: 8px 0;
    border-radius: 4px;
  }
  .card-detail-content {
    overflow-x: auto;
  }
`;

// HTML反转义函数
const unescapeHtml = (html: string): string => {
  if (!html) return '';
  return html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&amp;/g, '&');
};

// 卡片数据类型定义
type CardItem = {
  id: string;
  sequence: number;
  title: string;
  status: string;
  type: string;
  pmOwner?: string;
  techHandler?: string;
  nextFollowUpDate?: string;
  expectedOnlineDate?: string;
  complianceIssues?: string[];
  lastCheckTime?: string;
  createdTime?: string;
  lastModifiedTime?: string;
  isCompliant: boolean;
};

const CardCompliance = () => {
  const { message, modal } = App.useApp();
  const { Option } = Select;
  const [cardType, setCardType] = useState<
    'customer_demand' | 'customer_issue'
  >('customer_demand');
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<CardItem[]>([]);
  const [filteredDataSource, setFilteredDataSource] = useState<CardItem[]>([]);
  const [checkStats, setCheckStats] = useState({
    totalCards: 0,
    checkedCards: 0,
    skippedCards: 0,
    nonCompliantCards: 0,
  });
  const [searchParams, setSearchParams] = useState({
    sequence: '',
    responsiblePerson: '',
    status: '',
    issueType: '',
  });
  const [showCompletedCards, setShowCompletedCards] = useState(false);
  const [showProductFixedCards, setShowProductFixedCards] = useState(false);
  const [showSuspendedCards, setShowSuspendedCards] = useState(false);
  const [hideCompliantCards, setHideCompliantCards] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardItem | null>(null);
  const [cardDetails, setCardDetails] = useState<any>(null);
  const [cardHistory, setCardHistory] = useState<any>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // 筛选数据
  const filterData = (
    data: CardItem[],
    params: typeof searchParams,
    showCompleted: boolean,
    showProductFixed: boolean,
    showSuspended: boolean,
    hideCompliant: boolean,
  ) => {
    return data.filter((item) => {
      // 是否显示已完成卡片筛选
      if (!showCompleted && item.status === '已完成') {
        return false;
      }
      // 是否显示产品修复已解决卡片筛选
      if (!showProductFixed && item.status === '产品修复已解决') {
        return false;
      }
      // 是否显示挂起卡片筛选
      if (!showSuspended && item.status === '挂起') {
        return false;
      }
      // 是否隐藏无问题卡片筛选
      if (hideCompliant && item.isCompliant) {
        return false;
      }

      // 卡片编号筛选
      if (
        params.sequence &&
        !item.sequence.toString().includes(params.sequence)
      ) {
        return false;
      }
      // 负责人筛选
      if (params.responsiblePerson) {
        const hasResponsiblePerson =
          item.responsiblePeople?.some(
            (person: any) =>
              person.name?.includes(params.responsiblePerson) ||
              person.username?.includes(params.responsiblePerson),
          ) ||
          item.pmOwner?.includes(params.responsiblePerson) ||
          item.techHandler?.includes(params.responsiblePerson);

        if (!hasResponsiblePerson) {
          return false;
        }
      }
      // 状态筛选
      if (params.status && item.status !== params.status) {
        return false;
      }
      // 问题类型筛选
      if (
        params.issueType &&
        !item.complianceIssues?.some((issue) =>
          issue.includes(params.issueType),
        )
      ) {
        return false;
      }
      return true;
    });
  };

  // 监听搜索参数变化，实时筛选
  useEffect(() => {
    const filtered = filterData(
      dataSource,
      searchParams,
      showCompletedCards,
      showProductFixedCards,
      showSuspendedCards,
      hideCompliantCards,
    );
    console.log(
      'Filtered data:',
      filtered.length,
      'items from',
      dataSource.length,
      'total',
    );
    setFilteredDataSource(filtered);
  }, [
    searchParams,
    dataSource,
    showCompletedCards,
    showProductFixedCards,
    showSuspendedCards,
    hideCompliantCards,
  ]);

  // 获取卡片数据
  const fetchCards = async () => {
    setLoading(true);
    try {
      const response = await getCards(cardType, 'all');
      if (response.success) {
        const newData = response.data || [];
        console.log('Fetched data:', newData.length, 'items');
        console.log('First item:', newData[0]);
        setDataSource(newData);
        setFilteredDataSource(newData);

        // 更新统计信息
        if (response.stats) {
          setCheckStats({
            totalCards: response.stats.totalCards || 0,
            checkedCards: response.stats.checkedCards || 0,
            skippedCards: response.stats.skippedCards || 0,
            nonCompliantCards: response.stats.nonCompliantCards || 0,
          });
        }

        message.success('数据加载成功');
      } else {
        message.error(response.message || '数据加载失败');
      }
    } catch (_error) {
      message.error('数据加载失败');
    } finally {
      setLoading(false);
    }
  };

  // 执行检测
  const handleCheck = async () => {
    setLoading(true);
    try {
      const response = await manualCheck(cardType, false); // 不自动发送通知
      if (response.success) {
        // 更新检测统计信息
        if (response.data) {
          setCheckStats({
            totalCards: response.data.totalCards || 0,
            checkedCards: response.data.checkedCards || 0,
            skippedCards: response.data.skippedCards || 0,
            nonCompliantCards: response.data.nonCompliantCards || 0,
          });
        }
        message.success(response.message || '检测完成');
        // 重新加载数据
        fetchCards();
      } else {
        message.error(response.message || '检测失败');
      }
    } catch (_error) {
      message.error('检测失败');
    } finally {
      setLoading(false);
    }
  };

  // 提醒到群
  const handleRemind = (record: CardItem) => {
    modal.confirm({
      title: '提醒到群',
      content: '确定要发送群组提醒消息吗？',
      onOk: async () => {
        try {
          const response = await sendNotification(
            record.sequence.toString(),
            'group_announcement',
            undefined, // 群组公告不需要用户名
            record.complianceIssues || [],
          );
          if (response.success) {
            message.success('群组提醒消息已发送');
          } else {
            message.error(response.message || '发送提醒失败');
          }
        } catch (_error) {
          message.error('发送提醒失败');
        }
      },
    });
  };

  // 提醒指定用户
  const handleRemindUser = (username: string, record: CardItem) => {
    modal.confirm({
      title: '提醒用户',
      content: `确定要向 ${username} 发送提醒消息吗？`,
      onOk: async () => {
        try {
          const response = await sendNotification(
            record.sequence.toString(),
            'private_message',
            username,
            record.complianceIssues || [],
          );
          if (response.success) {
            message.success(`提醒消息已发送给 ${username}`);
          } else {
            message.error(response.message || '发送提醒失败');
          }
        } catch (_error) {
          message.error('发送提醒失败');
        }
      },
    });
  };

  // 查看卡片详情
  const handleViewCard = async (record: CardItem) => {
    try {
      setDrawerLoading(true);
      setSelectedCard(record);
      setDrawerVisible(true);

      // 并行获取卡片详情和历史
      const [detailsResponse, historyResponse] = await Promise.all([
        getCardDetails(record.sequence),
        getCardHistory(record.sequence),
      ]);

      if (detailsResponse.success) {
        // 从API返回的数据结构中提取卡片详情
        const cardData =
          detailsResponse.data?.cards?.[0] || detailsResponse.data;
        setCardDetails(cardData);
      } else {
        message.error('获取卡片详情失败');
      }

      if (historyResponse.success) {
        setCardHistory(historyResponse.data);
      } else {
        message.error('获取卡片历史失败');
      }
    } catch (_error) {
      message.error('获取卡片信息失败');
    } finally {
      setDrawerLoading(false);
    }
  };

  // 关闭抽屉
  const handleCloseDrawer = () => {
    setDrawerVisible(false);
    setSelectedCard(null);
    setCardDetails(null);
    setCardHistory(null);
  };

  // 导出报表
  const handleExport = () => {
    message.success('报表已导出');
  };

  // 搜索
  const handleSearch = () => {
    const filtered = filterData(
      dataSource,
      searchParams,
      showCompletedCards,
      showProductFixedCards,
      showSuspendedCards,
      hideCompliantCards,
    );
    setFilteredDataSource(filtered);
    message.success(`搜索完成，找到 ${filtered.length} 条记录`);
  };

  // 重置
  const handleReset = () => {
    const resetParams = {
      sequence: '',
      responsiblePerson: '',
      status: '',
      issueType: '',
    };
    setSearchParams(resetParams);
    setShowCompletedCards(false);
    setShowProductFixedCards(false);
    setShowSuspendedCards(false);
    setHideCompliantCards(false);
    const filtered = filterData(
      dataSource,
      resetParams,
      false,
      false,
      false,
      false,
    );
    setFilteredDataSource(filtered);
    message.success('筛选条件已重置');
  };

  // 状态标签渲染
  const renderStatusTag = (status: string) => {
    const colorMap: Record<string, string> = {
      新建: 'default',
      待评估: 'cyan',
      评估中: 'orange',
      待排期: 'yellow',
      已排期: 'green',
      处理中: 'blue',
      已完成: 'green',
      拒绝: 'red',
      挂起: 'red',
      产品修复待排期: 'orange',
      产品修复已排期: 'blue',
      产品修复已解决: 'green',
      转其他产品: 'purple',
      转其他产品已排期: 'purple',
      转其他产品已解决: 'purple',
    };

    return <Tag color={colorMap[status] || 'default'}>{status}</Tag>;
  };

  // 合规性状态渲染
  const _renderComplianceStatus = (isCompliant: boolean, issues?: string[]) => {
    if (isCompliant) {
      return (
        <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '18px' }} />
      );
    }

    return (
      <div>
        <ExclamationCircleOutlined
          style={{ color: '#ff4d4f', fontSize: '18px' }}
        />
        {issues && issues.length > 0 && (
          <span style={{ marginLeft: 8, color: '#ff4d4f' }}>
            {issues.length}个问题
          </span>
        )}
      </div>
    );
  };

  // 表格列定义
  const columns: ProColumns<CardItem>[] = [
    {
      title: '编号',
      dataIndex: 'sequence',
      width: 80,
      sorter: (a, b) => a.sequence - b.sequence,
    },
    {
      title: '标题',
      dataIndex: 'title',
      width: 300,
      ellipsis: true,
      copyable: true,
      render: (text, record) => (
        <a
          href={`https://console.cloud.baidu-int.com/devops/icafe/issue/aihc-customer-${record.sequence}/show?source=copy-shortcut`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#1890ff',
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.textDecoration = 'underline';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.textDecoration = 'none';
          }}
        >
          {text}
        </a>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (_, record) => renderStatusTag(record.status),
      filters: [
        { text: '新建', value: '新建' },
        { text: '待评估', value: '待评估' },
        { text: '评估中', value: '评估中' },
        { text: '待排期', value: '待排期' },
        { text: '已排期', value: '已排期' },
        { text: '处理中', value: '处理中' },
        { text: '已完成', value: '已完成' },
        { text: '拒绝', value: '拒绝' },
        { text: '挂起', value: '挂起' },
        { text: '产品修复待排期', value: '产品修复待排期' },
        { text: '产品修复已排期', value: '产品修复已排期' },
        { text: '产品修复已解决', value: '产品修复已解决' },
        { text: '转其他产品', value: '转其他产品' },
        { text: '转其他产品已排期', value: '转其他产品已排期' },
        { text: '转其他产品已解决', value: '转其他产品已解决' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'PM负责人',
      dataIndex: 'PM负责人',
      width: 150,
      render: (_, record) => {
        const pmField = record.PM负责人;
        const pmName = pmField?.displayValue ? pmField.displayValue : '无';
        const pmValue = pmField?.value ? pmField.value : null;

        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ flex: 1 }}>{pmName}</span>
            {pmValue && (
              <Button
                type="text"
                size="small"
                icon={<BellOutlined />}
                onClick={() => handleRemindUser(pmValue, record)}
                style={{
                  color: '#1890ff',
                  padding: '4px 8px',
                  minWidth: 'auto',
                }}
                title={`提醒 ${pmName}`}
              />
            )}
          </div>
        );
      },
    },
    {
      title: '产研处理人',
      dataIndex: '产研处理人',
      width: 150,
      render: (_, record) => {
        const field = record.产研处理人;
        const name = field?.displayValue ? field.displayValue : '无';
        const value = field?.value ? field.value : null;

        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ flex: 1 }}>{name}</span>
            {value && (
              <Button
                type="text"
                size="small"
                icon={<BellOutlined />}
                onClick={() => handleRemindUser(value, record)}
                style={{
                  color: '#1890ff',
                  padding: '4px 8px',
                  minWidth: 'auto',
                }}
                title={`提醒 ${name}`}
              />
            )}
          </div>
        );
      },
    },
    {
      title: '产研后续跟进人',
      dataIndex: '产研后续跟进人',
      width: 150,
      render: (_, record) => {
        const field = record.产研后续跟进人;
        const name = field?.displayValue ? field.displayValue : '无';
        const value = field?.value ? field.value : null;

        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ flex: 1 }}>{name}</span>
            {value && (
              <Button
                type="text"
                size="small"
                icon={<BellOutlined />}
                onClick={() => handleRemindUser(value, record)}
                style={{
                  color: '#1890ff',
                  padding: '4px 8px',
                  minWidth: 'auto',
                }}
                title={`提醒 ${name}`}
              />
            )}
          </div>
        );
      },
    },
    {
      title: '问题描述',
      dataIndex: 'complianceIssues',
      width: 300,
      ellipsis: false,
      render: (_, record) => (
        <div style={{ maxWidth: '280px' }}>
          {record.complianceIssues?.map((issue) => (
            <Tag
              color="error"
              key={issue}
              style={{
                marginBottom: 4,
                marginRight: 4,
                wordBreak: 'break-word',
                whiteSpace: 'normal',
                height: 'auto',
                lineHeight: '1.4',
              }}
            >
              {issue}
            </Tag>
          ))}
          {(!record.complianceIssues ||
            record.complianceIssues.length === 0) && (
            <Tag color="success">无问题</Tag>
          )}
        </div>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdTime',
      width: 160,
      sorter: (a, b) =>
        (a.createdTime || '').localeCompare(b.createdTime || ''),
      render: (text) => text || '-',
    },
    {
      title: '最后修改时间',
      dataIndex: 'lastModifiedTime',
      width: 160,
      sorter: (a, b) =>
        (a.lastModifiedTime || '').localeCompare(b.lastModifiedTime || ''),
      render: (text) => text || '-',
    },
    {
      title: '最后检测时间',
      dataIndex: 'lastCheckTime',
      width: 160,
      sorter: (a, b) => (a.lastCheckTime || '').localeCompare(b.lastCheckTime || ''),
    },
    {
      title: '操作',
      width: 200,
      fixed: 'right',
      valueType: 'option',
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewCard(record)}
            style={{ color: '#1890ff' }}
          >
            查看
          </Button>
          <Button
            type="text"
            size="small"
            icon={<MessageOutlined />}
            onClick={() => handleRemind(record)}
            style={{ color: '#1890ff' }}
          >
            提醒到群
          </Button>
        </Space>
      ),
    },
  ];

  useEffect(() => {
    fetchCards();
  }, [cardType]);

  return (
    <PageContainer
      title="卡片规范性检测"
      subTitle="定期检测iCafe卡片的规范性，识别逻辑冲突，并生成检测报表和发送通知"
    >
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: 需要注入全局样式 */}
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
      {/* 操作区域 */}
      <Card style={{ marginBottom: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <Space size="middle">
            <Button
              type={cardType === 'customer_demand' ? 'primary' : 'default'}
              onClick={() => setCardType('customer_demand')}
              size="large"
            >
              客户需求卡片检测
            </Button>
            <Button
              type={cardType === 'customer_issue' ? 'primary' : 'default'}
              onClick={() => setCardType('customer_issue')}
              size="large"
            >
              客户问题卡片检测
            </Button>
          </Space>
          <Space size="middle">
            <Button
              icon={<FileExcelOutlined />}
              onClick={handleExport}
              size="large"
            >
              导出报表
            </Button>
            <Button
              type="primary"
              icon={<AuditOutlined />}
              loading={loading}
              onClick={handleCheck}
              size="large"
            >
              立即检测
            </Button>
          </Space>
        </div>
      </Card>

      {/* 统计区域 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="总卡片数"
              value={checkStats.totalCards || filteredDataSource.length}
              prefix={<AuditOutlined />}
              valueStyle={{ fontSize: '24px', fontWeight: 'bold' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="实际检测"
              value={checkStats.checkedCards || filteredDataSource.length}
              prefix={<CheckCircleOutlined />}
              valueStyle={{
                color: '#1890ff',
                fontSize: '24px',
                fontWeight: 'bold',
              }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="跳过检测"
              value={checkStats.skippedCards || 0}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{
                color: '#faad14',
                fontSize: '24px',
                fontWeight: 'bold',
              }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="不合规卡片"
              value={
                checkStats.nonCompliantCards ||
                filteredDataSource.filter((item) => !item.isCompliant).length
              }
              prefix={<SyncOutlined />}
              valueStyle={{
                color: '#cf1322',
                fontSize: '24px',
                fontWeight: 'bold',
              }}
            />
          </Col>
        </Row>
      </Card>

      {/* 搜索条件区域 */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
            检索条件
          </h4>
        </div>
        <Space wrap size="middle">
          <Input
            placeholder="卡片编号"
            value={searchParams.sequence}
            onChange={(e) =>
              setSearchParams({ ...searchParams, sequence: e.target.value })
            }
            style={{ width: 150 }}
            allowClear
          />
          <Input
            placeholder="负责人"
            value={searchParams.responsiblePerson}
            onChange={(e) =>
              setSearchParams({
                ...searchParams,
                responsiblePerson: e.target.value,
              })
            }
            style={{ width: 150 }}
            allowClear
          />
          <Select
            placeholder="状态"
            value={searchParams.status || undefined}
            onChange={(value) =>
              setSearchParams({ ...searchParams, status: value })
            }
            style={{ width: 150 }}
            allowClear
          >
            <Option value="新建">新建</Option>
            <Option value="待评估">待评估</Option>
            <Option value="评估中">评估中</Option>
            <Option value="待排期">待排期</Option>
            <Option value="已排期">已排期</Option>
            <Option value="处理中">处理中</Option>
            <Option value="已完成">已完成</Option>
            <Option value="拒绝">拒绝</Option>
            <Option value="挂起">挂起</Option>
            <Option value="产品修复待排期">产品修复待排期</Option>
            <Option value="产品修复已排期">产品修复已排期</Option>
            <Option value="产品修复已解决">产品修复已解决</Option>
            <Option value="转其他产品">转其他产品</Option>
            <Option value="转其他产品已排期">转其他产品已排期</Option>
            <Option value="转其他产品已解决">转其他产品已解决</Option>
          </Select>
          <Input
            placeholder="问题类型"
            value={searchParams.issueType}
            onChange={(e) =>
              setSearchParams({ ...searchParams, issueType: e.target.value })
            }
            style={{ width: 150 }}
            allowClear
          />
          <Checkbox
            checked={showCompletedCards}
            onChange={(e) => setShowCompletedCards(e.target.checked)}
            style={{ marginLeft: 8 }}
          >
            显示已完成卡片
          </Checkbox>
          <Checkbox
            checked={showProductFixedCards}
            onChange={(e) => setShowProductFixedCards(e.target.checked)}
            style={{ marginLeft: 8 }}
          >
            显示产品修复已解决
          </Checkbox>
          <Checkbox
            checked={showSuspendedCards}
            onChange={(e) => setShowSuspendedCards(e.target.checked)}
            style={{ marginLeft: 8 }}
          >
            显示挂起卡片
          </Checkbox>
          <Checkbox
            checked={hideCompliantCards}
            onChange={(e) => setHideCompliantCards(e.target.checked)}
            style={{ marginLeft: 8 }}
          >
            不显示无问题卡片
          </Checkbox>
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleSearch}
          >
            搜索
          </Button>
          <Button onClick={handleReset}>重置</Button>
        </Space>
      </Card>

      {/* 数据表格区域 */}
      <Card>
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
            检测结果
          </h4>
        </div>
        <ProTable<CardItem>
          columns={columns}
          dataSource={filteredDataSource}
          loading={loading}
          rowKey={(record) => `card-${record.sequence || record.id}`}
          pagination={{
            showQuickJumper: true,
            showSizeChanger: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条/总共 ${total} 条`,
            pageSizeOptions: ['10', '20', '50', '100'],
            defaultPageSize: 20,
          }}
          search={false}
          options={{
            setting: {
              listsHeight: 400,
            },
          }}
          dateFormatter="string"
          scroll={{ x: 1800 }}
          size="middle"
        />
      </Card>

      {/* 卡片详情抽屉 */}
      <Drawer
        title={`卡片详情 - ${selectedCard?.title || ''}`}
        placement="right"
        width={800}
        open={drawerVisible}
        onClose={handleCloseDrawer}
        destroyOnClose
      >
        <Spin spinning={drawerLoading}>
          <Tabs
            defaultActiveKey="details"
            items={[
              {
                key: 'details',
                label: '卡片详情',
                children: (
                  <div>
                    {cardDetails && (
                      <Descriptions
                        title="基本信息"
                        bordered
                        column={2}
                        size="small"
                      >
                        <Descriptions.Item label="卡片序号" span={1}>
                          {cardDetails.sequence ||
                            selectedCard?.sequence ||
                            '未知'}
                        </Descriptions.Item>
                        <Descriptions.Item label="卡片标题" span={1}>
                          {cardDetails.title || selectedCard?.title || '未知'}
                        </Descriptions.Item>
                        <Descriptions.Item label="卡片状态" span={1}>
                          {cardDetails.status || selectedCard?.status || '未知'}
                        </Descriptions.Item>
                        <Descriptions.Item label="卡片类型" span={1}>
                          {cardDetails.type?.name ||
                            selectedCard?.type?.name ||
                            selectedCard?.type}
                        </Descriptions.Item>
                        <Descriptions.Item label="创建时间" span={1}>
                          {cardDetails.createdTime || '未知'}
                        </Descriptions.Item>
                        <Descriptions.Item label="最后修改时间" span={1}>
                          {cardDetails.lastModifiedTime || '未知'}
                        </Descriptions.Item>
                        <Descriptions.Item label="创建人" span={1}>
                          {cardDetails.createdUser?.username ||
                            cardDetails.createdUser?.name ||
                            '未知'}
                        </Descriptions.Item>
                        <Descriptions.Item label="最后修改人" span={1}>
                          {cardDetails.lastModifiedUser?.username ||
                            cardDetails.lastModifiedUser?.name ||
                            '未知'}
                        </Descriptions.Item>
                        <Descriptions.Item label="负责人" span={2}>
                          {cardDetails.responsiblePeople
                            ?.map(
                              (person: any) =>
                                person.username || person.name || '未知',
                            )
                            .join(', ') || '无'}
                        </Descriptions.Item>
                        <Descriptions.Item label="卡片内容" span={2}>
                          {/* eslint-disable-next-line react/no-danger */}
                          <div
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: 需要渲染HTML格式的卡片内容
                            dangerouslySetInnerHTML={{
                              __html:
                                unescapeHtml(cardDetails.detail) || '暂无内容',
                            }}
                            style={{
                              minHeight: '60px',
                              border: '1px solid #d9d9d9',
                              padding: '12px',
                              borderRadius: '4px',
                              backgroundColor: '#fafafa',
                              lineHeight: '1.6',
                              wordWrap: 'break-word',
                              overflowWrap: 'break-word',
                            }}
                            className="card-detail-content"
                          />
                        </Descriptions.Item>
                      </Descriptions>
                    )}

                    {/* 合规性问题 */}
                    {selectedCard?.complianceIssues &&
                      selectedCard.complianceIssues.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                          <h4>合规性问题</h4>
                          <div
                            style={{
                              background: '#fff2f0',
                              border: '1px solid #ffccc7',
                              borderRadius: '4px',
                              padding: '12px',
                            }}
                          >
                            {selectedCard.complianceIssues.map(
                              (issue) => (
                                <div key={issue} style={{ marginBottom: 8 }}>
                                  <Tag color="red">{issue}</Tag>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                ),
              },
              {
                key: 'history',
                label: '操作历史',
                children: (
                  <div>
                    {cardHistory && cardHistory.length > 0 ? (
                      <Timeline>
                        {cardHistory.map((item: any) => (
                          <Timeline.Item key={`${item.operator}-${item.operationTime}`}>
                            <div>
                              <div
                                style={{ fontWeight: 'bold', marginBottom: 4 }}
                              >
                                {item.operator} - {item.operationTime}
                              </div>
                              <div style={{ color: '#666', marginBottom: 4 }}>
                                操作类型: {item.operationType} | 状态:{' '}
                                {item.sourceStatusName} →{' '}
                                {item.targetStatusName}
                              </div>
                              {item.title && (
                                <div style={{ marginBottom: 4 }}>
                                  <strong>标题:</strong> {item.title}
                                </div>
                              )}
                              {item.comment && (
                                <div
                                  style={{
                                    background: '#f5f5f5',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    marginTop: 8,
                                  }}
                                >
                                  <strong>备注:</strong> {item.comment}
                                </div>
                              )}
                            </div>
                          </Timeline.Item>
                        ))}
                      </Timeline>
                    ) : (
                      <div
                        style={{
                          textAlign: 'center',
                          color: '#999',
                          padding: '40px 0',
                        }}
                      >
                        暂无操作历史
                      </div>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </Spin>
      </Drawer>
    </PageContainer>
  );
};

export default CardCompliance;
