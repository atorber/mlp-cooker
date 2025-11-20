import {
  AppstoreOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  FilterOutlined,
  LinkOutlined,
  PlusOutlined,
  SearchOutlined,
  SettingOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import type { ActionType } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import {
  Select as AntdSelect,
  App,
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  Descriptions,
  Divider,
  Drawer,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Space,
  Statistic,
  Tag,
  Tooltip,
} from 'antd';
import React, { useEffect, useRef, useState } from 'react';

// 快速应用类型定义
type QuickApp = {
  templateID: number;
  templateName: string;
  shortDesc: string;
  document?: string;
  thumb?: string;
  extInfo?: string;
  tags: Array<{
    tagId: number;
    value: string;
  }>;
  linkInfo: Array<{
    linkType: number;
    linkID: number;
    linkName?: string;
  }>;
  weight: number;
  ctime: number;
  mtime: number;
};

const QuickApp = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [_loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<{ [key: string]: number }>({
    total: 0,
  });
  const [filteredCount, setFilteredCount] = useState(0); // 筛选结果数量
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [selectedApp, setSelectedApp] = useState<QuickApp | null>(null);
  const [editLinkInfo, setEditLinkInfo] = useState<
    Array<{ linkType: number; linkID: number; linkName: string }>
  >([]);
  const [searchText, setSearchText] = useState('');
  const [selectedTags, setSelectedTags] = useState<Record<string, string[]>>(
    {},
  );
  const [tagTypes, setTagTypes] = useState<
    Array<{
      tagType: string;
      tagTypeName: string;
      tagList: Array<{ tagId: number; value: string }>;
    }>
  >([]);
  const [allTagsList, setAllTagsList] = useState<
    Array<{
      tagId: number;
      value: string;
      tagType: string;
      tagTypeName: string;
    }>
  >([]);
  const [useProduction, setUseProduction] = useState(false); // 环境切换：false=灰度，true=生产
  const [currentEnvironment, setCurrentEnvironment] = useState<string>('gray'); // 当前环境
  const [hasProductionConfig, setHasProductionConfig] = useState(false); // 是否有生产环境配置
  const [hasGrayConfig, setHasGrayConfig] = useState(false); // 是否有灰度环境配置
  const proTableRef = useRef<ActionType>(null);

  // 检查环境配置
  const checkEnvironmentConfig = async () => {
    try {
      const response = await fetch('/api/config');
      const result = await response.json();

      if (result.success && result.data) {
        // 注意：配置数据在 data.config 下，不是直接在 data 下
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
          // 如果灰度未配置但生产已配置，自动切换到生产
          setUseProduction(true);
          setCurrentEnvironment('production');
        } else if (hasGray) {
          // 如果灰度已配置，默认使用灰度
          setUseProduction(false);
          setCurrentEnvironment('gray');
        } else {
          // 都未配置，显示警告
          message.warning('请先在系统设置中配置快速开始应用管理的环境地址');
        }
      }
    } catch (error) {
      console.error('检查环境配置失败:', error);
      // 默认都禁用
      setHasProductionConfig(false);
      setHasGrayConfig(false);
      message.error('检查环境配置失败');
    }
  };

  // 初始化：获取标签类型和统计数据
  const initializeData = async () => {
    try {
      // 先检查环境配置
      await checkEnvironmentConfig();

      // 注意：标签列表使用与应用列表相同的环境
      // 但由于初始化时useProduction可能还未设置，这里使用灰度环境
      // 实际的标签筛选会在应用列表加载时使用正确的环境
      const tagsResponse = await fetch(
        '/api/aihclite/template/v1/fasttaglist?useProduction=false',
      );
      const tagsResult = await tagsResponse.json();

      if (tagsResult.errno === 0 && tagsResult.data) {
        const tagTypesData = tagsResult.data.tagTypes || [];
        setTagTypes(tagTypesData);

        // 构建包含tagType信息的标签列表
        const allTags: Array<{
          tagId: number;
          value: string;
          tagType: string;
          tagTypeName: string;
        }> = [];
        tagTypesData.forEach((typeGroup: any) => {
          if (typeGroup.tagList && Array.isArray(typeGroup.tagList)) {
            typeGroup.tagList.forEach((tag: any) => {
              allTags.push({
                tagId: tag.tagId,
                value: tag.value,
                tagType: typeGroup.tagType,
                tagTypeName: typeGroup.tagTypeName,
              });
            });
          }
        });
        setAllTagsList(allTags);
      }

      // 注意：不在这里获取应用列表，而是由 ProTable 的 request 自动触发
      // 这样可以避免配置状态更新前就触发请求
    } catch (error) {
      console.error('初始化数据失败:', error);
      message.error('初始化数据失败');
    }
  };

  // 获取快速应用列表
  const fetchQuickApps = async (params: any = {}) => {
    try {
      setLoading(true);

      // 注意：不在这里检查配置，因为按钮已经根据配置状态禁用了
      // 这里的检查会导致在配置状态更新前就触发错误提示
      // 配置检查由按钮的 disabled 属性控制

      // 构建查询参数
      const queryParams = new URLSearchParams({
        pageNo: String(params.current || 1),
        pageSize: String(params.pageSize || 10),
        useProduction: String(useProduction), // 添加环境参数
      });

      // 添加搜索关键词
      if (searchText) {
        queryParams.append('searchText', searchText);
      }

      // 添加标签筛选（按tagType分组）
      const hasSelectedTags = Object.keys(selectedTags).some(
        (key) => selectedTags[key] && selectedTags[key].length > 0,
      );
      if (hasSelectedTags) {
        queryParams.append('tagFilters', JSON.stringify(selectedTags));
      }

      // 调用真实API
      const response = await fetch(
        `/api/aihclite/template/v1/manage/list?${queryParams.toString()}`,
      );
      const result = await response.json();

      if (result.success) {
        // 更新当前环境
        if (result.data.environment) {
          setCurrentEnvironment(result.data.environment);
        }

        // 更新筛选结果数量
        setFilteredCount(result.data.count || 0);

        // 更新统计信息（总应用数）
        if (result.data.totalCount !== undefined) {
          setStatistics({
            total: result.data.totalCount,
          });
        }

        return {
          data: result.data.list,
          success: true,
          total: result.data.count,
        };
      } else {
        message.error(result.message || '获取快速应用列表失败');
        setFilteredCount(0);
        return {
          data: [],
          success: false,
          total: 0,
        };
      }
    } catch (error) {
      console.error('获取快速应用列表失败:', error);
      message.error('获取快速应用列表失败');
      return {
        data: [],
        success: false,
        total: 0,
      };
    } finally {
      setLoading(false);
    }
  };

  // 查看应用详情
  const handleViewDetails = (record: QuickApp) => {
    setSelectedApp(record);
    setDrawerVisible(true);
  };

  // 打开文档链接
  const handleOpenDocument = (url: string) => {
    window.open(url, '_blank');
  };

  // 编辑应用
  const handleEdit = (app: QuickApp) => {
    setSelectedApp(app);
    form.setFieldsValue({
      templateName: app.templateName,
      shortDesc: app.shortDesc,
      document: app.document,
      thumb: app.thumb,
      weight: app.weight,
      extInfo: app.extInfo,
    });
    // 初始化 linkInfo 编辑状态
    setEditLinkInfo(
      app.linkInfo && app.linkInfo.length > 0
        ? app.linkInfo.map((link) => ({
            linkType: link.linkType,
            linkID: link.linkID,
            linkName: link.linkName || '',
          }))
        : [],
    );
    setEditModalVisible(true);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    try {
      const values = await form.validateFields();

      // 按照接口文档定义，只发送有值的字段
      const requestData: any = {
        templateID: selectedApp?.templateID, // 必需，用于标识要更新的应用
      };

      // 只添加有值的可选参数
      if (values.templateName !== undefined && values.templateName !== '') {
        requestData.templateName = values.templateName;
      }
      if (values.thumb !== undefined && values.thumb !== '') {
        requestData.thumb = values.thumb;
      }
      if (values.shortDesc !== undefined && values.shortDesc !== '') {
        requestData.shortDesc = values.shortDesc;
      }
      if (values.document !== undefined && values.document !== '') {
        requestData.document = values.document;
      }
      if (values.weight !== undefined && values.weight !== null) {
        requestData.weight = values.weight;
      }
      if (values.extInfo !== undefined && values.extInfo !== '') {
        requestData.extInfo = values.extInfo;
      }

      // 包含 linkInfo（如果已修改）
      if (editLinkInfo.length > 0) {
        requestData.linkInfo = editLinkInfo;
      }

      // 添加环境参数
      requestData.useProduction = useProduction;

      const response = await fetch('/api/aihclite/template/v1/manage/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (result.errno === 0) {
        message.success('更新成功');
        setEditModalVisible(false);
        form.resetFields();
        setEditLinkInfo([]);
        proTableRef.current?.reload();
      } else {
        message.error(result.message || '更新失败');
      }
    } catch (error) {
      console.error('保存失败:', error);
      message.error('保存失败');
    }
  };

  // 管理标签
  const handleManageTags = (app: QuickApp) => {
    setSelectedApp(app);
    setTagModalVisible(true);
  };

  // 删除标签
  const handleDeleteTag = async (tagId: number) => {
    if (!selectedApp) return;

    try {
      const response = await fetch('/api/aihclite/template/v1/manage/deltag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateID: selectedApp.templateID,
          tagId: tagId,
          useProduction: useProduction,
        }),
      });

      const result = await response.json();

      if (result.errno === 0) {
        message.success('删除标签成功');
        // 更新当前应用的标签
        setSelectedApp({
          ...selectedApp,
          tags: selectedApp.tags.filter((t) => t.tagId !== tagId),
        });
        proTableRef.current?.reload();
      } else {
        message.error(result.message || '删除标签失败');
      }
    } catch (error) {
      console.error('删除标签失败:', error);
      message.error('删除标签失败');
    }
  };

  // 添加标签
  const handleAddTag = async (
    tagId: number,
    tagValue: string,
    tagType: string,
  ) => {
    if (!selectedApp) return;

    // 操作方式标签不能通过此方法修改
    if (tagType === 'operationWay') {
      message.warning('操作方式标签由 linkInfo 决定，无法在此处修改');
      return;
    }

    // 检查标签是否已存在
    if (selectedApp.tags.some((t) => t.tagId === tagId)) {
      message.warning('该标签已存在');
      return;
    }

    // 查找要添加的标签的 tagType
    const newTagInfo = allTagsList.find((t) => t.tagId === tagId);
    if (!newTagInfo) {
      message.error('标签信息不存在');
      return;
    }

    // 检查是否已有相同 tagType 的标签
    const existingTagWithSameType = selectedApp.tags.find((appTag) => {
      const tagInfo = allTagsList.find((t) => t.tagId === appTag.tagId);
      return tagInfo && tagInfo.tagType === newTagInfo.tagType;
    });

    try {
      // 如果存在相同 tagType 的标签，先删除旧标签
      if (existingTagWithSameType) {
        const deleteResponse = await fetch(
          '/api/aihclite/template/v1/manage/deltag',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              templateID: selectedApp.templateID,
              tagId: existingTagWithSameType.tagId,
              useProduction: useProduction,
            }),
          },
        );

        const deleteResult = await deleteResponse.json();
        if (deleteResult.errno !== 0) {
          message.error('删除旧标签失败');
          return;
        }
      }

      // 添加新标签
      const response = await fetch('/api/aihclite/template/v1/manage/addtag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateID: selectedApp.templateID,
          tagId: tagId,
          useProduction: useProduction,
        }),
      });

      const result = await response.json();

      if (result.errno === 0) {
        if (existingTagWithSameType) {
          message.success(
            `已替换标签：${existingTagWithSameType.value} → ${tagValue}`,
          );
          // 更新当前应用的标签（移除旧标签，添加新标签）
          setSelectedApp({
            ...selectedApp,
            tags: [
              ...selectedApp.tags.filter(
                (t) => t.tagId !== existingTagWithSameType.tagId,
              ),
              { tagId: tagId, value: tagValue },
            ],
          });
        } else {
          message.success('添加标签成功');
          // 更新当前应用的标签
          setSelectedApp({
            ...selectedApp,
            tags: [...selectedApp.tags, { tagId: tagId, value: tagValue }],
          });
        }
        proTableRef.current?.reload();
      } else {
        message.error(result.message || '添加标签失败');
      }
    } catch (error) {
      console.error('添加标签失败:', error);
      message.error('添加标签失败');
    }
  };

  // 删除应用
  const handleDelete = async (templateID: number) => {
    try {
      const response = await fetch(
        `/api/aihclite/template/v1/manage/delete/${templateID}?useProduction=${useProduction}`,
        {
          method: 'DELETE',
        },
      );

      const result = await response.json();

      if (result.errno === 0) {
        message.success('删除成功');
        proTableRef.current?.reload();
      } else {
        message.error(result.message || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      message.error('删除失败');
    }
  };

  // 创建应用
  const handleCreate = async () => {
    try {
      const values = await form.validateFields();

      // 构建 linkInfo 数组
      const linkInfo = [];
      if (values.linkType && values.linkID) {
        linkInfo.push({
          linkType: parseInt(values.linkType, 10),
          linkID: parseInt(values.linkID, 10),
          linkName: '',
        });
      }

      // 按照接口文档定义的参数构建请求数据
      const requestData: any = {
        templateName: values.templateName,
        linkInfo: linkInfo,
      };

      // 可选参数，只有在有值时才添加
      if (values.thumb) {
        requestData.thumb = values.thumb;
      }
      if (values.shortDesc) {
        requestData.shortDesc = values.shortDesc;
      }
      if (values.document) {
        requestData.document = values.document;
      }
      if (values.weight !== undefined && values.weight !== null) {
        requestData.weight = values.weight;
      }
      if (values.extInfo) {
        requestData.extInfo = values.extInfo;
      }

      // 添加环境参数
      requestData.useProduction = useProduction;

      const response = await fetch('/api/aihclite/template/v1/manage/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (result.errno === 0) {
        message.success('创建成功');
        setCreateModalVisible(false);
        form.resetFields();
        proTableRef.current?.reload();
      } else {
        message.error(result.message || '创建失败');
      }
    } catch (error: any) {
      if (error.errorFields) {
        // 表单验证失败
        message.error('请填写必填项');
      } else {
        console.error('创建失败:', error);
        message.error('创建失败');
      }
    }
  };

  // 获取标签颜色
  const getTagColor = (tagValue: string) => {
    const colorMap: { [key: string]: string } = {
      NEW: 'red',
      HOT: 'orange',
      LLM: 'blue',
      VLM: 'green',
      VLA: 'purple',
      MoE: 'cyan',
      通义千问: 'blue',
      文心大模型: 'red',
      DeepSeek: 'green',
      OpenAI: 'purple',
      月之暗面: 'orange',
      昆仑芯: 'gold',
      具身智能: 'magenta',
      自动驾驶: 'lime',
      智驾端到端: 'volcano',
      Python: 'geekblue',
    };
    return colorMap[tagValue] || 'default';
  };

  // 表格列定义
  const columns = [
    {
      title: '应用名称',
      dataIndex: 'templateName',
      key: 'templateName',
      width: 220,
      fixed: 'left' as const,
      render: (text: any, record: QuickApp) => {
        // 检查是否有NEW或HOT标签
        const hasNew = record.tags?.some((tag) => tag.value === 'NEW');
        const hasHot = record.tags?.some((tag) => tag.value === 'HOT');

        return (
          <div style={{ padding: '4px 0' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 4,
              }}
            >
              {record.thumb ? (
                <Image
                  src={record.thumb}
                  alt={text}
                  width={24}
                  height={24}
                  style={{ borderRadius: 4 }}
                  fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiByeD0iNCIgZmlsbD0iI0Y1RjVGNSIvPgo8cGF0aCBkPSJNOCAxMEgxNlYxNEg4VjEwWiIgZmlsbD0iIzk5OTk5OSIvPgo8cGF0aCBkPSJNMTAgNkgxNFY4SDEwVjZaIiBmaWxsPSIjOTk5OTk5Ii8+Cjwvc3ZnPgo="
                />
              ) : (
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 4,
                    backgroundColor: '#f5f5f5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AppstoreOutlined style={{ fontSize: 16, color: '#999' }} />
                </div>
              )}
              <span style={{ fontWeight: 500, fontSize: 14 }}>{text}</span>
              {hasNew && (
                <Badge
                  count="NEW"
                  style={{
                    backgroundColor: '#f5222d',
                    fontSize: 10,
                    height: 18,
                    lineHeight: '18px',
                    padding: '0 6px',
                  }}
                />
              )}
              {hasHot && (
                <Badge
                  count="HOT"
                  style={{
                    backgroundColor: '#fa8c16',
                    fontSize: 10,
                    height: 18,
                    lineHeight: '18px',
                    padding: '0 6px',
                  }}
                />
              )}
            </div>
            <div style={{ fontSize: 12, color: '#999', marginLeft: 32 }}>
              {record.templateID}
            </div>
          </div>
        );
      },
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 220,
      render: (tags: any) => {
        // 确保tags是数组
        if (!Array.isArray(tags)) {
          return '-';
        }
        return (
          <div style={{ padding: '4px 0' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {tags.slice(0, 3).map((tag: any) => (
                <Tag
                  key={tag.tagId}
                  color={getTagColor(tag.value)}
                  style={{ margin: 0, fontSize: 12 }}
                >
                  {tag.value}
                </Tag>
              ))}
              {tags.length > 3 && (
                <Tag style={{ margin: 0, fontSize: 12 }}>
                  +{tags.length - 3}
                </Tag>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: '权重',
      dataIndex: 'weight',
      key: 'weight',
      width: 80,
      align: 'center' as const,
      sorter: (a: QuickApp, b: QuickApp) => a.weight - b.weight,
      defaultSortOrder: 'descend' as const,
      render: (weight: any) => (
        <div style={{ padding: '4px 0', textAlign: 'center' }}>
          <Badge
            count={weight}
            style={{ backgroundColor: '#52c41a', fontSize: 12 }}
          />
        </div>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'ctime',
      key: 'ctime',
      width: 120,
      render: (ctime: any) => (
        <div style={{ padding: '4px 0', fontSize: 12, color: '#666' }}>
          {new Date(ctime * 1000).toLocaleDateString()}
        </div>
      ),
    },
    {
      title: '描述',
      dataIndex: 'shortDesc',
      key: 'shortDesc',
      width: 300,
      ellipsis: {
        showTitle: false,
      },
      render: (text: any) => (
        <Tooltip placement="topLeft" title={text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      fixed: 'right' as const,
      render: (_: any, record: QuickApp) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetails(record)}
            >
              详情
            </Button>
          </Tooltip>
          <Tooltip title="编辑应用">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
          </Tooltip>
          <Tooltip title="管理标签">
            <Button
              type="link"
              size="small"
              icon={<TagsOutlined />}
              onClick={() => handleManageTags(record)}
            >
              标签
            </Button>
          </Tooltip>
          <Popconfirm
            title="确定要删除这个应用模板吗？"
            description="删除后将无法恢复"
            onConfirm={() => handleDelete(record.templateID)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  useEffect(() => {
    initializeData();
  }, []);

  // 当搜索、筛选条件或环境变化时，重新加载表格
  useEffect(() => {
    if (proTableRef.current) {
      proTableRef.current.reload();
    }
  }, [searchText, selectedTags, useProduction]);

  // 处理标签选择
  const handleTagChange = (tagType: string, values: string[]) => {
    setSelectedTags((prev) => ({
      ...prev,
      [tagType]: values,
    }));
  };

  // 计算实际的标签筛选数量
  const getTotalSelectedTagsCount = () => {
    return Object.values(selectedTags).reduce(
      (sum, tags) => sum + tags.length,
      0,
    );
  };

  return (
    <PageContainer
      title="应用模版管理"
      subTitle="管理和查看可用的快速应用模板"
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
              <Button
                type={useProduction ? 'primary' : 'default'}
                disabled={!hasProductionConfig}
                onClick={() => {
                  if (hasProductionConfig) {
                    setUseProduction(true);
                    message.info('已切换到生产环境');
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
      <Card style={{ marginBottom: 16 }}>
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
              title="总应用数"
              value={statistics.total}
              prefix={<AppstoreOutlined />}
              valueStyle={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#1890ff',
              }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="标签分类"
              value={tagTypes.length}
              prefix={<TagsOutlined />}
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
              value={filteredCount}
              prefix={<FilterOutlined />}
              valueStyle={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#faad14',
              }}
            />
          </Col>
        </Row>
      </Card>

      {/* 搜索和操作工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space
          size="large"
          style={{ width: '100%', justifyContent: 'space-between' }}
        >
          <Space>
            <span style={{ fontWeight: 500 }}>搜索:</span>
            <Input
              placeholder="搜索应用名称或描述"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
          </Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              form.resetFields();
              setCreateModalVisible(true);
            }}
          >
            创建应用
          </Button>
        </Space>
      </Card>

      {/* 标签筛选区域 */}
      {tagTypes.length > 0 && (
        <Card
          style={{ marginBottom: 16 }}
          title={
            <>
              <FilterOutlined /> 标签筛选
            </>
          }
          extra={
            getTotalSelectedTagsCount() > 0 && (
              <Button size="small" onClick={() => setSelectedTags({})}>
                清空筛选
              </Button>
            )
          }
        >
          <Row gutter={[16, 16]}>
            {tagTypes.map((tagType) => (
              <Col span={12} key={tagType.tagType}>
                <div
                  style={{
                    marginBottom: 8,
                    fontWeight: 500,
                    color: '#666',
                    borderBottom: '1px solid #f0f0f0',
                    paddingBottom: 8,
                  }}
                >
                  {tagType.tagTypeName}
                  {selectedTags[tagType.tagType] &&
                    selectedTags[tagType.tagType].length > 0 && (
                      <Badge
                        count={selectedTags[tagType.tagType].length}
                        style={{ marginLeft: 8, backgroundColor: '#1890ff' }}
                      />
                    )}
                </div>
                <Checkbox.Group
                  value={selectedTags[tagType.tagType] || []}
                  onChange={(values) =>
                    handleTagChange(tagType.tagType, values as string[])
                  }
                  style={{ width: '100%', display: 'block' }}
                >
                  <Space wrap size={[6, 3]} style={{ lineHeight: 1.5 }}>
                    {tagType.tagList.map((tag) => (
                      <Checkbox
                        value={tag.value}
                        key={tag.tagId}
                        style={{ marginRight: 0 }}
                      >
                        <Tag
                          color={getTagColor(tag.value)}
                          style={{ margin: 0, fontSize: 12 }}
                        >
                          {tag.value}
                        </Tag>
                      </Checkbox>
                    ))}
                  </Space>
                </Checkbox.Group>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* 应用列表表格 */}
      <ProTable<QuickApp>
        actionRef={proTableRef}
        columns={columns}
        request={fetchQuickApps}
        rowKey="templateID"
        search={false}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `第 ${range[0]}-${range[1]} 条/总共 ${total} 条`,
        }}
        toolBarRender={false}
        size="middle"
        scroll={{ x: 'max-content' }}
        sticky
        tableStyle={{ marginTop: 16 }}
      />

      {/* 应用详情抽屉 */}
      <Drawer
        title={`应用详情 - ${selectedApp?.templateName || ''}`}
        placement="right"
        width={800}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        destroyOnClose
      >
        {selectedApp && (
          <div>
            {/* 基本信息 */}
            <Descriptions title="基本信息" bordered column={1} size="small">
              <Descriptions.Item label="应用名称">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {selectedApp.thumb && (
                    <Image
                      src={selectedApp.thumb}
                      alt={selectedApp.templateName}
                      width={32}
                      height={32}
                      style={{ borderRadius: 4 }}
                    />
                  )}
                  <span style={{ fontWeight: 500 }}>
                    {selectedApp.templateName}
                  </span>
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="应用ID">
                {selectedApp.templateID}
              </Descriptions.Item>
              <Descriptions.Item label="权重">
                <Badge
                  count={selectedApp.weight}
                  style={{ backgroundColor: '#52c41a' }}
                />
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {new Date(selectedApp.ctime * 1000).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {new Date(selectedApp.mtime * 1000).toLocaleString()}
              </Descriptions.Item>
              {selectedApp.extInfo && (
                <Descriptions.Item label="扩展信息">
                  <code
                    style={{
                      fontSize: 12,
                      padding: '4px 8px',
                      backgroundColor: '#f5f5f5',
                      borderRadius: 4,
                    }}
                  >
                    {selectedApp.extInfo}
                  </code>
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider />

            {/* 描述信息 */}
            <div style={{ marginBottom: 16 }}>
              <h4>应用描述</h4>
              <p style={{ lineHeight: 1.6, color: '#666' }}>
                {selectedApp.shortDesc}
              </p>
            </div>

            <Divider />

            {/* 标签信息 */}
            <div style={{ marginBottom: 16 }}>
              <h4>标签</h4>
              <div>
                {selectedApp.tags.map((tag) => (
                  <Tag
                    key={tag.tagId}
                    color={getTagColor(tag.value)}
                    style={{ marginBottom: 4 }}
                  >
                    {tag.value}
                  </Tag>
                ))}
              </div>
            </div>

            <Divider />

            {/* 链接信息 */}
            <div style={{ marginBottom: 16 }}>
              <h4>相关链接</h4>
              <div>
                {selectedApp.document && (
                  <Button
                    type="link"
                    icon={<FileTextOutlined />}
                    onClick={() => selectedApp.document && handleOpenDocument(selectedApp.document)}
                  >
                    查看文档
                  </Button>
                )}
                {selectedApp.linkInfo.map((link) => (
                  <div
                    key={`${link.linkType}-${link.linkID}`}
                    style={{ marginTop: 8 }}
                  >
                    <span style={{ color: '#666' }}>
                      链接类型: {link.linkType}
                    </span>
                    <br />
                    <span style={{ color: '#666' }}>链接ID: {link.linkID}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* 创建应用模态框 */}
      <Modal
        title="创建应用模版"
        open={createModalVisible}
        onOk={handleCreate}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        width={700}
        okText="创建"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="应用名称"
            name="templateName"
            rules={[{ required: true, message: '请输入应用名称' }]}
          >
            <Input placeholder="请输入应用名称" />
          </Form.Item>

          <Form.Item label="简短描述" name="shortDesc">
            <Input.TextArea rows={3} placeholder="请输入应用描述" />
          </Form.Item>

          <Form.Item label="文档链接" name="document">
            <Input placeholder="https://cloud.baidu.com/doc/..." />
          </Form.Item>

          <Form.Item label="缩略图URL" name="thumb">
            <Input placeholder="https://..." />
          </Form.Item>

          <Form.Item label="权重" name="weight" initialValue={10}>
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="扩展信息 (extInfo)"
            name="extInfo"
            tooltip="可选的扩展信息，JSON格式"
          >
            <Input.TextArea
              rows={2}
              placeholder='可选，例如: {"key": "value"}'
            />
          </Form.Item>

          <Divider>操作方式配置 (linkInfo)</Divider>

          <Form.Item
            label="链接类型 (linkType)"
            name="linkType"
            rules={[{ required: true, message: '请选择链接类型' }]}
            tooltip="10001=部署, 10002=训练, 10003=在开发机中打开"
          >
            <AntdSelect placeholder="请选择链接类型">
              <AntdSelect.Option value="10001">部署 (10001)</AntdSelect.Option>
              <AntdSelect.Option value="10002">训练 (10002)</AntdSelect.Option>
              <AntdSelect.Option value="10003">
                在开发机中打开 (10003)
              </AntdSelect.Option>
            </AntdSelect>
          </Form.Item>

          <Form.Item
            label="链接ID (linkID)"
            name="linkID"
            rules={[{ required: true, message: '请输入链接ID' }]}
            tooltip="关联的底层服务ID"
          >
            <InputNumber
              placeholder="请输入链接ID"
              style={{ width: '100%' }}
              min={1}
            />
          </Form.Item>

          <p
            style={{
              color: '#999',
              fontSize: 12,
              marginTop: 16,
              marginBottom: 0,
            }}
          >
            💡 提示：
            <br />• linkInfo 决定应用的操作方式标签
            <br />• 其他标签可在创建后通过"标签管理"功能添加
            <br />• 所有参数按照接口文档定义
          </p>
        </Form>
      </Modal>

      {/* 编辑应用模态框 */}
      <Modal
        title={`编辑应用 - ${selectedApp?.templateName || ''}`}
        open={editModalVisible}
        onOk={handleSaveEdit}
        onCancel={() => {
          setEditModalVisible(false);
          form.resetFields();
          setEditLinkInfo([]);
        }}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="应用名称"
            name="templateName"
            rules={[{ required: true, message: '请输入应用名称' }]}
          >
            <Input placeholder="请输入应用名称" />
          </Form.Item>

          <Form.Item label="简短描述" name="shortDesc">
            <Input.TextArea rows={3} placeholder="请输入应用描述" />
          </Form.Item>

          <Form.Item label="文档链接" name="document">
            <Input placeholder="https://cloud.baidu.com/doc/..." />
          </Form.Item>

          <Form.Item label="缩略图URL" name="thumb">
            <Input placeholder="https://..." />
          </Form.Item>

          <Form.Item label="权重" name="weight">
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="扩展信息 (extInfo)"
            name="extInfo"
            tooltip="可选的扩展信息，JSON格式"
          >
            <Input.TextArea
              rows={2}
              placeholder='可选，例如: {"key": "value"}'
            />
          </Form.Item>

          <Divider>操作方式配置 (linkInfo)</Divider>

          {/* 可编辑的 linkInfo 列表 */}
          <div style={{ marginBottom: 16 }}>
            {editLinkInfo.map((link, index) => (
              <Card
                key={`edit-link-${link.linkType}-${link.linkID}-${index}`}
                size="small"
                style={{ marginBottom: 8 }}
                extra={
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      const newLinkInfo = editLinkInfo.filter(
                        (_, i) => i !== index,
                      );
                      setEditLinkInfo(newLinkInfo);
                    }}
                  >
                    删除
                  </Button>
                }
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <div
                      style={{ marginBottom: 4, fontSize: 12, color: '#666' }}
                    >
                      链接类型 (linkType)
                    </div>
                    <AntdSelect
                      value={link.linkType}
                      style={{ width: '100%' }}
                      onChange={(value) => {
                        const newLinkInfo = [...editLinkInfo];
                        newLinkInfo[index].linkType = value;
                        setEditLinkInfo(newLinkInfo);
                      }}
                    >
                      <AntdSelect.Option value={10001}>
                        部署 (10001)
                      </AntdSelect.Option>
                      <AntdSelect.Option value={10002}>
                        训练 (10002)
                      </AntdSelect.Option>
                      <AntdSelect.Option value={10003}>
                        在开发机中打开 (10003)
                      </AntdSelect.Option>
                    </AntdSelect>
                  </Col>
                  <Col span={12}>
                    <div
                      style={{ marginBottom: 4, fontSize: 12, color: '#666' }}
                    >
                      链接ID (linkID)
                    </div>
                    <InputNumber
                      value={link.linkID}
                      style={{ width: '100%' }}
                      min={1}
                      onChange={(value) => {
                        if (value) {
                          const newLinkInfo = [...editLinkInfo];
                          newLinkInfo[index].linkID = value;
                          setEditLinkInfo(newLinkInfo);
                        }
                      }}
                    />
                  </Col>
                </Row>
              </Card>
            ))}

            <Button
              type="dashed"
              block
              icon={<PlusOutlined />}
              onClick={() => {
                setEditLinkInfo([
                  ...editLinkInfo,
                  { linkType: 10001, linkID: 100001, linkName: '' },
                ]);
              }}
            >
              添加 linkInfo
            </Button>

            <p
              style={{
                color: '#999',
                fontSize: 12,
                marginTop: 8,
                marginBottom: 0,
              }}
            >
              💡 提示：linkInfo 决定应用的操作方式标签，可添加多个链接信息
            </p>
          </div>
        </Form>
      </Modal>

      {/* 标签管理模态框 */}
      <Modal
        title={`管理标签 - ${selectedApp?.templateName || ''}`}
        open={tagModalVisible}
        onCancel={() => setTagModalVisible(false)}
        footer={null}
        width={700}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 500, marginBottom: 8 }}>
            当前标签 (
            {(selectedApp?.tags?.length || 0) +
              (selectedApp?.linkInfo?.length || 0)}
            个)：
          </div>
          <Space wrap>
            {/* 显示普通标签 */}
            {selectedApp?.tags &&
              selectedApp.tags.length > 0 &&
              selectedApp.tags.map((tag) => {
                // 查找标签的 tagType 信息
                const tagInfo = allTagsList.find((t) => t.tagId === tag.tagId);
                return (
                  <Tag
                    key={tag.tagId}
                    color={getTagColor(tag.value)}
                    closable
                    onClose={(e) => {
                      e.preventDefault();
                      Modal.confirm({
                        title: '确认删除标签？',
                        content: `确定要删除标签"${tag.value}"吗？`,
                        onOk: () => handleDeleteTag(tag.tagId),
                      });
                    }}
                  >
                    {tagInfo
                      ? `[${tagInfo.tagTypeName}] ${tag.value}`
                      : tag.value}
                  </Tag>
                );
              })}

            {/* 显示操作方式标签（从 linkInfo 读取） */}
            {selectedApp?.linkInfo &&
              selectedApp.linkInfo.length > 0 &&
              selectedApp.linkInfo.map((link, _index) => {
                const linkTypeMap: Record<number, string> = {
                  10001: '部署',
                  10002: '训练',
                  10003: '在开发机中打开',
                };
                const operationWay = linkTypeMap[link.linkType];
                if (operationWay) {
                  return (
                    <Tag
                      key={`link-${link.linkType}-${link.linkID}`}
                      color={getTagColor(operationWay)}
                      icon={<LinkOutlined />}
                    >
                      [操作方式] {operationWay}
                    </Tag>
                  );
                }
                return null;
              })}

            {(!selectedApp?.tags || selectedApp.tags.length === 0) &&
              (!selectedApp?.linkInfo || selectedApp.linkInfo.length === 0) && (
                <span style={{ color: '#999' }}>暂无标签</span>
              )}
          </Space>
        </div>
        <Divider />
        <div>
          <div style={{ fontWeight: 500, marginBottom: 12 }}>
            按分类添加标签：
          </div>
          {/* 按 tagType 分组显示标签选择 */}
          {Array.from(new Set(allTagsList.map((t) => t.tagType))).map(
            (tagType) => {
              const tagsOfType = allTagsList.filter(
                (t) => t.tagType === tagType,
              );
              const tagTypeName = tagsOfType[0]?.tagTypeName || tagType;

              // 特殊处理：操作方式标签从 linkInfo 读取（只读）
              if (tagType === 'operationWay') {
                // 操作方式标签的映射
                const operationWayMap: Record<string, number> = {
                  部署: 10001,
                  训练: 10002,
                  在开发机中打开: 10003,
                };

                // 从 linkInfo 中找到当前的操作方式
                const currentLinkTypes =
                  selectedApp?.linkInfo?.map((link) => link.linkType) || [];
                const currentOperationWays = tagsOfType
                  .filter((tag) =>
                    currentLinkTypes.includes(operationWayMap[tag.value]),
                  )
                  .map((tag) => tag.value);

                return (
                  <div
                    key={tagType}
                    style={{
                      marginBottom: 16,
                      padding: 12,
                      backgroundColor: '#f5f5f5',
                      borderRadius: 4,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        color: '#666',
                        marginBottom: 6,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>{tagTypeName}</span>
                      <Tag color="orange" style={{ fontSize: 11, margin: 0 }}>
                        只读 (基于linkInfo)
                      </Tag>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      {currentOperationWays.length > 0 ? (
                        <Space wrap>
                          {currentOperationWays.map((way) => (
                            <Tag key={way} color="blue" icon={<LinkOutlined />}>
                              {way}
                            </Tag>
                          ))}
                        </Space>
                      ) : (
                        <span style={{ color: '#999', fontSize: 12 }}>
                          未设置操作方式
                        </span>
                      )}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 11, color: '#999' }}>
                      💡 操作方式由应用的 linkInfo 决定，无法在此处修改
                    </div>
                  </div>
                );
              }

              // 其他标签从 tags 读取，可编辑
              const currentTagOfType = selectedApp?.tags?.find((appTag) => {
                const tagInfo = allTagsList.find(
                  (t) => t.tagId === appTag.tagId,
                );
                return tagInfo && tagInfo.tagType === tagType;
              });

              return (
                <div key={tagType} style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontSize: 13,
                      color: '#666',
                      marginBottom: 6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{tagTypeName}</span>
                    {currentTagOfType && (
                      <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>
                        当前: {currentTagOfType.value}
                      </Tag>
                    )}
                    <span style={{ fontSize: 11, color: '#999' }}>
                      (同类型只能选择一个)
                    </span>
                  </div>
                  <AntdSelect
                    style={{ width: '100%' }}
                    placeholder={`选择${tagTypeName}标签`}
                    showSearch
                    allowClear
                    value={currentTagOfType?.tagId}
                    optionFilterProp="children"
                    onChange={(value) => {
                      if (value) {
                        const selectedTag = allTagsList.find(
                          (t) => t.tagId === value,
                        );
                        if (selectedTag) {
                          handleAddTag(
                            selectedTag.tagId,
                            selectedTag.value,
                            selectedTag.tagType,
                          );
                        }
                      }
                    }}
                    filterOption={(input, option) =>
                      (option?.label ?? '')
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    options={tagsOfType.map((tag) => ({
                      value: tag.tagId,
                      label: tag.value,
                    }))}
                  />
                </div>
              );
            },
          )}
          <p
            style={{
              color: '#999',
              fontSize: 12,
              marginTop: 16,
              marginBottom: 0,
            }}
          >
            💡
            提示：每个分类下只能选择一个标签，选择新标签会自动替换该分类下的旧标签
          </p>
        </div>
      </Modal>
    </PageContainer>
  );
};

export default QuickApp;
