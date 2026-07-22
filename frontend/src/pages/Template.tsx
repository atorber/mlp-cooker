import {
  AppstoreOutlined,
  CloudServerOutlined,
  CodeOutlined,
  DeleteOutlined,
  DeploymentUnitOutlined,
  EditOutlined,
  FileTextOutlined,
  LinkOutlined,
  PictureOutlined,
  PlusOutlined,
  ReloadOutlined,
  SoundOutlined,
  ThunderboltOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { request } from '@umijs/max';
import {
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';

const { Paragraph, Text, Link } = Typography;
const { TextArea } = Input;

interface TemplateTag {
  code: string;
  level: number;
  name: string;
}

interface TemplateItem {
  id: number;
  name: string;
  logo_type: string;
  description?: string;
  doc_url?: string;
  source: 'preset' | 'custom';
  module: string;
  sub_module?: string;
  tags?: TemplateTag[];
  template_content?: string;
  version?: string;
  created_at?: string;
  updated_at?: string;
}

interface TemplateMetadata {
  modules: string[];
  subModulesByModule: Record<string, string[]>;
  sources: string[];
  tags: TemplateTag[];
}

const MODULE_OPTIONS = ['通用', '资源池', '分布式训练', '在线服务部署', '开发机', '工作流'];

const SUB_MODULES_BY_MODULE: Record<string, string[]> = {
  通用: [],
  资源池: ['资源套餐模板'],
  分布式训练: ['任务模板'],
  在线服务部署: ['服务模版'],
  开发机: [],
  工作流: ['工作流模板', '子任务模板'],
};

/** 展示子模块名称（去掉 `模块/` 前缀，兼容历史数据） */
function getSubModuleLabel(subModule?: string) {
  if (!subModule) return '';
  if (!subModule.includes('/')) return subModule;
  const parts = subModule.split('/');
  return parts[parts.length - 1] || subModule;
}

const LOGO_TYPE_OPTIONS = [
  { value: 'audio', label: '音频' },
  { value: 'video', label: '视频' },
  { value: 'image', label: '图像' },
  { value: 'text', label: '文本' },
  { value: 'training', label: '训练' },
  { value: 'deployment', label: '部署' },
  { value: 'resource', label: '资源' },
  { value: 'workflow', label: '工作流' },
  { value: 'default', label: '通用' },
];

function getLogoIcon(logoType?: string) {
  switch (logoType) {
    case 'audio':
      return <SoundOutlined />;
    case 'video':
      return <VideoCameraOutlined />;
    case 'image':
      return <PictureOutlined />;
    case 'text':
      return <FileTextOutlined />;
    case 'training':
      return <ThunderboltOutlined />;
    case 'deployment':
      return <DeploymentUnitOutlined />;
    case 'resource':
      return <CloudServerOutlined />;
    case 'workflow':
      return <CodeOutlined />;
    default:
      return <AppstoreOutlined />;
  }
}

function getSourceLabel(source: string) {
  return source === 'preset' ? '预置' : '自定义';
}

function isUrl(value?: string) {
  return !!value && /^https?:\/\//i.test(value);
}

function isMarkdownUrl(url: string) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return pathname.endsWith('.md') || pathname.endsWith('.markdown');
  } catch {
    return url.toLowerCase().includes('.md');
  }
}

function looksLikeMarkdown(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (/^<!DOCTYPE/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) return false;
  if (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('apiVersion:')) {
    return false;
  }
  return /^#{1,6}\s|^\*\*[^*]+\*\*|^-\s|^\d+\.\s|^```/m.test(trimmed);
}

const markdownPreviewStyle: React.CSSProperties = {
  lineHeight: 1.7,
  wordBreak: 'break-word',
};

const TemplatePage: React.FC = () => {
  const { message: messageApi } = App.useApp();
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [metadata, setMetadata] = useState<TemplateMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [pageNo, setPageNo] = useState(1);
  const [pageSize] = useState(12);
  const [keyword, setKeyword] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>();
  const [tagFilter, setTagFilter] = useState<string>();
  const [sourceTab, setSourceTab] = useState<'all' | 'preset' | 'custom'>('all');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateItem | null>(null);
  const [form] = Form.useForm();
  const selectedModule = Form.useWatch('module', form);
  const [docPreviewLoading, setDocPreviewLoading] = useState(false);
  const [docPreviewMarkdown, setDocPreviewMarkdown] = useState<string | null>(null);

  const fetchMetadata = useCallback(async () => {
    try {
      const response = await request('/api/templates/metadata', { method: 'GET' });
      if (response.success) {
        setMetadata(response.data);
      }
    } catch (error) {
      console.error('获取模板元数据失败:', error);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await request('/api/templates', {
        method: 'GET',
        params: {
          pageNo,
          pageSize,
          keyword: keyword || undefined,
          module: moduleFilter || undefined,
          tag: tagFilter || undefined,
          source: sourceTab === 'all' ? undefined : sourceTab,
        },
      });

      if (response.success) {
        setTemplates(response.data?.list || []);
        setTotal(response.data?.total || 0);
      } else {
        messageApi.error(response.message || '获取模板列表失败');
      }
    } catch (error) {
      console.error('获取模板列表失败:', error);
      messageApi.error('获取模板列表失败');
    } finally {
      setLoading(false);
    }
  }, [keyword, messageApi, moduleFilter, pageNo, pageSize, sourceTab, tagFilter]);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    const docUrl = selectedTemplate?.doc_url?.trim();
    if (!drawerVisible || !docUrl) {
      setDocPreviewMarkdown(null);
      setDocPreviewLoading(false);
      return;
    }

    let cancelled = false;

    const loadDocPreview = async () => {
      setDocPreviewLoading(true);
      setDocPreviewMarkdown(null);
      try {
        if (!isUrl(docUrl)) {
          if (looksLikeMarkdown(docUrl)) {
            setDocPreviewMarkdown(docUrl);
          }
          return;
        }

        if (looksLikeMarkdown(docUrl) && !isMarkdownUrl(docUrl)) {
          setDocPreviewMarkdown(docUrl);
          return;
        }

        const response = await request('/api/templates/doc-preview', {
          method: 'GET',
          params: { url: docUrl },
        });

        if (cancelled) return;

        if (response.success && response.data?.isMarkdown && response.data?.content) {
          setDocPreviewMarkdown(response.data.content);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('加载文档预览失败:', error);
        }
      } finally {
        if (!cancelled) {
          setDocPreviewLoading(false);
        }
      }
    };

    loadDocPreview();

    return () => {
      cancelled = true;
    };
  }, [drawerVisible, selectedTemplate?.doc_url]);

  const tagOptions = useMemo(() => metadata?.tags || [], [metadata]);

  const subModuleOptions = useMemo(() => {
    const moduleKey = selectedModule || '通用';
    const options =
      metadata?.subModulesByModule?.[moduleKey] || SUB_MODULES_BY_MODULE[moduleKey] || [];
    return options.map((item) => ({ label: item, value: item }));
  }, [metadata?.subModulesByModule, selectedModule]);

  const openDetail = (item: TemplateItem) => {
    setSelectedTemplate(item);
    setDrawerVisible(true);
  };

  const openCreate = () => {
    setEditingTemplate(null);
    form.resetFields();
    form.setFieldsValue({
      logo_type: 'default',
      version: '1.0.0',
      module: '通用',
      tags: [],
    });
    setModalVisible(true);
  };

  const openEdit = (item: TemplateItem) => {
    setEditingTemplate(item);
    form.setFieldsValue({
      ...item,
      sub_module: getSubModuleLabel(item.sub_module) || undefined,
      tags: item.tags?.map((tag) => tag.code) || [],
    });
    setModalVisible(true);
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      const tagCodes = Array.isArray(values.tags) ? values.tags : [];
      const tags = tagCodes.map((code) => {
        const existing = tagOptions.find((tag) => tag.code === code);
        return existing || { code: String(code), level: 1, name: String(code) };
      });

      const payload = {
        name: values.name,
        logo_type: values.logo_type,
        description: values.description,
        doc_url: values.doc_url,
        module: values.module,
        sub_module: values.sub_module,
        template_content: values.template_content,
        version: values.version,
        tags,
      };

      const response = editingTemplate
        ? await request(`/api/templates/${editingTemplate.id}`, {
            method: 'PUT',
            data: payload,
          })
        : await request('/api/templates', {
            method: 'POST',
            data: payload,
          });

      if (response.success) {
        messageApi.success(editingTemplate ? '模板更新成功' : '模板创建成功');
        setModalVisible(false);
        form.resetFields();
        setEditingTemplate(null);
        fetchMetadata();
        fetchTemplates();
      } else {
        messageApi.error(response.message || '操作失败');
      }
    } catch (error: any) {
      messageApi.error(error?.info?.errorMessage || error?.message || '操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await request(`/api/templates/${id}`, { method: 'DELETE' });
      if (response.success) {
        messageApi.success('模板删除成功');
        fetchTemplates();
        fetchMetadata();
      } else {
        messageApi.error(response.message || '删除失败');
      }
    } catch (error: any) {
      messageApi.error(error?.info?.errorMessage || error?.message || '删除失败');
    }
  };

  return (
    <PageContainer
      title="模板"
      subTitle="管理平台预置模板与自定义模板，支持按模块与标签检索"
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchTemplates} loading={loading}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增自定义模板
          </Button>
        </Space>
      }
    >
      <Card style={{ marginBottom: 16 }}>
        <Space wrap size="middle">
          <Input.Search
            allowClear
            placeholder="搜索名称、简介、标签"
            style={{ width: 280 }}
            onSearch={(value) => {
              setPageNo(1);
              setKeyword(value.trim());
            }}
          />
          <Select
            allowClear
            placeholder="功能模块"
            style={{ width: 180 }}
            value={moduleFilter}
            options={MODULE_OPTIONS.map((item) => ({ label: item, value: item }))}
            onChange={(value) => {
              setPageNo(1);
              setModuleFilter(value);
            }}
          />
          <Select
            allowClear
            placeholder="标签筛选"
            style={{ width: 180 }}
            value={tagFilter}
            options={tagOptions.map((tag) => ({ label: tag.name, value: tag.code }))}
            onChange={(value) => {
              setPageNo(1);
              setTagFilter(value);
            }}
          />
        </Space>
      </Card>

      <Tabs
        activeKey={sourceTab}
        onChange={(key) => {
          setPageNo(1);
          setSourceTab(key as 'all' | 'preset' | 'custom');
        }}
        items={[
          { key: 'all', label: '全部模板' },
          { key: 'preset', label: '预置模板' },
          { key: 'custom', label: '自定义模板' },
        ]}
      />

      <Spin spinning={loading}>
        {templates.length === 0 ? (
          <Card>
            <Empty description="暂无模板" />
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            {templates.map((item) => (
              <Col key={item.id} xs={24} sm={12} lg={8} xl={6}>
                <Card
                  hoverable
                  onClick={() => openDetail(item)}
                  actions={
                    item.source === 'custom'
                      ? [
                          <Button
                            key="edit"
                            type="link"
                            icon={<EditOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(item);
                            }}
                          >
                            编辑
                          </Button>,
                          <Popconfirm
                            key="delete"
                            title="确定删除此模板？"
                            onConfirm={(e) => {
                              e?.stopPropagation();
                              handleDelete(item.id);
                            }}
                            onCancel={(e) => e?.stopPropagation()}
                          >
                            <Button
                              type="link"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={(e) => e.stopPropagation()}
                            >
                              删除
                            </Button>
                          </Popconfirm>,
                        ]
                      : [
                          <Button
                            key="doc"
                            type="link"
                            icon={<LinkOutlined />}
                            disabled={!item.doc_url}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.doc_url) window.open(item.doc_url, '_blank');
                            }}
                          >
                            查看详情
                          </Button>,
                        ]
                  }
                >
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Space align="start">
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          background: '#f0f5ff',
                          color: '#2f54eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 20,
                        }}
                      >
                        {getLogoIcon(item.logo_type)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text strong ellipsis>
                          {item.name}
                        </Text>
                        <div>
                          <Tag color={item.source === 'preset' ? 'blue' : 'green'}>
                            {getSourceLabel(item.source)}
                          </Tag>
                          {item.version ? <Tag>{item.version}</Tag> : null}
                        </div>
                      </div>
                    </Space>
                    <Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ marginBottom: 0 }}>
                      {item.description || '暂无简介'}
                    </Paragraph>
                    <Space wrap size={[4, 4]}>
                      <Tag>{item.module}</Tag>
                      {item.sub_module ? (
                        <Tag color="processing">{getSubModuleLabel(item.sub_module)}</Tag>
                      ) : null}
                    </Space>
                    <Space wrap size={[4, 4]}>
                      {item.tags?.map((tag) => (
                        <Tag key={tag.code} color="default">
                          {tag.name}
                        </Tag>
                      ))}
                    </Space>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Spin>

      {total > pageSize ? (
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Space>
            <Button disabled={pageNo <= 1} onClick={() => setPageNo((p) => p - 1)}>
              上一页
            </Button>
            <Text type="secondary">
              第 {pageNo} 页 / 共 {Math.ceil(total / pageSize)} 页
            </Text>
            <Button
              disabled={pageNo >= Math.ceil(total / pageSize)}
              onClick={() => setPageNo((p) => p + 1)}
            >
              下一页
            </Button>
          </Space>
        </div>
      ) : null}

      <Drawer
        title={selectedTemplate?.name || '模板详情'}
        width={720}
        open={drawerVisible}
        onClose={() => {
          setDrawerVisible(false);
          setSelectedTemplate(null);
          setDocPreviewMarkdown(null);
        }}
      >
        {selectedTemplate ? (
          <>
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="ID">{selectedTemplate.id}</Descriptions.Item>
            <Descriptions.Item label="名称">{selectedTemplate.name}</Descriptions.Item>
            <Descriptions.Item label="图标类型">{selectedTemplate.logo_type}</Descriptions.Item>
            <Descriptions.Item label="模板来源">
              {getSourceLabel(selectedTemplate.source)}
            </Descriptions.Item>
            <Descriptions.Item label="功能模块">{selectedTemplate.module}</Descriptions.Item>
            <Descriptions.Item label="子模块">
              {getSubModuleLabel(selectedTemplate.sub_module) || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="版本">{selectedTemplate.version || '-'}</Descriptions.Item>
            <Descriptions.Item label="简介">
              {selectedTemplate.description || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="详情文档">
              {selectedTemplate.doc_url ? (
                isUrl(selectedTemplate.doc_url) ? (
                  <Link href={selectedTemplate.doc_url} target="_blank">
                    {selectedTemplate.doc_url}
                  </Link>
                ) : looksLikeMarkdown(selectedTemplate.doc_url) ? (
                  <Text type="secondary">内嵌 Markdown 文档（见下方预览）</Text>
                ) : (
                  selectedTemplate.doc_url
                )
              ) : (
                '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="标签">
              <Space wrap>
                {selectedTemplate.tags?.length
                  ? selectedTemplate.tags.map((tag) => (
                      <Tag key={tag.code}>
                        {tag.name} ({tag.code})
                      </Tag>
                    ))
                  : '-'}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="模板内容">
              {selectedTemplate.template_content ? (
                isUrl(selectedTemplate.template_content) ? (
                  <Link href={selectedTemplate.template_content} target="_blank">
                    {selectedTemplate.template_content}
                  </Link>
                ) : (
                  <pre
                    style={{
                      margin: 0,
                      padding: 12,
                      background: '#fafafa',
                      borderRadius: 6,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {selectedTemplate.template_content}
                  </pre>
                )
              ) : (
                '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {selectedTemplate.created_at
                ? new Date(selectedTemplate.created_at).toLocaleString('zh-CN')
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {selectedTemplate.updated_at
                ? new Date(selectedTemplate.updated_at).toLocaleString('zh-CN')
                : '-'}
            </Descriptions.Item>
          </Descriptions>

          {selectedTemplate.doc_url ? (
            <Card
              size="small"
              title="文档预览"
              style={{ marginTop: 16 }}
              extra={
                isUrl(selectedTemplate.doc_url) ? (
                  <Link href={selectedTemplate.doc_url} target="_blank">
                    在新窗口打开
                  </Link>
                ) : null
              }
            >
              {docPreviewLoading ? (
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <Spin />
                </div>
              ) : docPreviewMarkdown ? (
                <div style={markdownPreviewStyle}>
                  <ReactMarkdown>{docPreviewMarkdown}</ReactMarkdown>
                </div>
              ) : (
                <Text type="secondary">
                  {isUrl(selectedTemplate.doc_url)
                    ? '该链接为外部网页文档，暂无可渲染的 Markdown 内容，请点击右上角在新窗口查看。'
                    : '当前详情文档不是 Markdown 格式，无法预览。'}
                </Text>
              )}
            </Card>
          ) : null}
          </>
        ) : null}
      </Drawer>

      <Modal
        title={editingTemplate ? '编辑自定义模板' : '新增自定义模板'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingTemplate(null);
        }}
        onOk={() => form.submit()}
        width={760}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input placeholder="模板名称" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="logo_type"
                label="图标 logo_type"
                rules={[{ required: true, message: '请选择图标类型' }]}
              >
                <Select options={LOGO_TYPE_OPTIONS} placeholder="选择图标类型" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="version" label="版本">
                <Input placeholder="例如 1.0.0" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="简介">
            <TextArea rows={2} placeholder="模板简介" />
          </Form.Item>
          <Form.Item name="doc_url" label="详情 doc_url">
            <Input placeholder="文档链接（Markdown 文档或官网文档）" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="module"
                label="所属功能模块"
                rules={[{ required: true, message: '请选择功能模块' }]}
              >
                <Select
                  options={MODULE_OPTIONS.map((item) => ({ label: item, value: item }))}
                  onChange={() => form.setFieldValue('sub_module', undefined)}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sub_module" label="子模块">
                <Select
                  allowClear
                  placeholder={
                    subModuleOptions.length > 0 ? '请选择子模块' : '当前模块暂无子模块'
                  }
                  disabled={subModuleOptions.length === 0}
                  options={subModuleOptions}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="tags" label="标签">
            <Select
              mode="tags"
              placeholder="输入或选择标签 code"
              options={tagOptions.map((tag) => ({ label: `${tag.name} (${tag.code})`, value: tag.code }))}
            />
          </Form.Item>
          <Form.Item
            name="template_content"
            label="模板内容 template_content"
            tooltip="支持 YAML/JSON 文本内容，或填写文件地址 URL"
          >
            <TextArea
              rows={8}
              placeholder="填写 YAML/JSON 内容，或模板文件地址"
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default TemplatePage;
