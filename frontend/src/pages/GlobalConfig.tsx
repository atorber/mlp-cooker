import { ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import { PageContainer, ProForm, ProFormSelect, ProFormText } from '@ant-design/pro-components';
import { request } from '@umijs/max';
import {
  App,
  Button,
  Card,
  Col,
  Form,
  Input,
  Menu,
  Radio,
  Row,
  Select,
  Space,
  Spin,
  Typography,
} from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { updateConfig } from '@/services/aihc-mentor/api';

const { Text } = Typography;

const GlobalConfig: React.FC = () => {
  const { message: messageApi } = App.useApp();
  const [resourceForm] = Form.useForm();
  const [storageForm] = Form.useForm();
  const [formVersion, setFormVersion] = useState(0);
  const [resourceInitial, setResourceInitial] = useState({
    ML_PLATFORM_RESOURCE_POOL_ID: '',
    ML_PLATFORM_RESOURCE_QUEUE_ID: '',
  });
  const [storageInitial, setStorageInitial] = useState({
    ML_PLATFORM_RESOURCE_BUCKET: '',
    ML_PLATFORM_RESOURCE_PFS_INSTANCE_ID: '',
  });

  const [configLoading, setConfigLoading] = useState(true);
  const [saveSubmitting, setSaveSubmitting] = useState(false);

  const [resourcePoolOptions, setResourcePoolOptions] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [resourcePoolOptionsLoading, setResourcePoolOptionsLoading] = useState(false);
  const [queueOptions, setQueueOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [queueOptionsLoading, setQueueOptionsLoading] = useState(false);
  const [pfsOptions, setPfsOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [pfsOptionsLoading, setPfsOptionsLoading] = useState(false);
  const [pfsInputMode, setPfsInputMode] = useState<'select' | 'input'>('select');

  const [resourcePoolId, setResourcePoolId] = useState('');

  const [activeSection, setActiveSection] = useState<'resource' | 'storage'>('resource');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const resourceSectionRef = useRef<HTMLDivElement>(null);
  const storageSectionRef = useRef<HTMLDivElement>(null);
  const programmaticScrollRef = useRef(false);

  const scrollToSection = useCallback((key: 'resource' | 'storage') => {
    const container = scrollContainerRef.current;
    const target =
      key === 'resource' ? resourceSectionRef.current : storageSectionRef.current;
    if (!container || !target) return;
    programmaticScrollRef.current = true;
    setActiveSection(key);
    const top =
      target.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop -
      8;
    container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    window.setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 450);
  }, []);

  const updateActiveSectionFromScroll = useCallback(() => {
    if (programmaticScrollRef.current) return;
    const container = scrollContainerRef.current;
    const storageEl = storageSectionRef.current;
    if (!container || !storageEl) return;

    const cRect = container.getBoundingClientRect();
    const sRect = storageEl.getBoundingClientRect();
    const referenceY = cRect.top + cRect.height * 0.35;
    if (sRect.top <= referenceY + 8) {
      setActiveSection('storage');
    } else {
      setActiveSection('resource');
    }
  }, []);

  const fetchResourcePoolOptions = useCallback(async () => {
    setResourcePoolOptionsLoading(true);
    try {
      const response = await request('/api/resources/pools', {
        method: 'GET',
        params: {
          resourcePoolType: 'dedicatedV2',
          pageSize: 100,
          pageNumber: 1,
        },
      });

      if (response.success) {
        let resourcePools: any[] = [];
        const data = response.data;
        if (Array.isArray(data)) {
          resourcePools = data;
        } else if (data?.resourcePools && Array.isArray(data.resourcePools)) {
          resourcePools = data.resourcePools;
        } else if (data?.data && Array.isArray(data.data)) {
          resourcePools = data.data;
        } else if (data?.result && Array.isArray(data.result)) {
          resourcePools = data.result;
        } else if (data?.items && Array.isArray(data.items)) {
          resourcePools = data.items;
        }

        const options = resourcePools
          .filter((pool: any) => pool.resourcePoolId)
          .map((pool: any) => {
            const poolId = pool.resourcePoolId || pool.id || '';
            const poolName = pool.name || pool.resourcePoolName || poolId;
            return { label: `${poolName} (${poolId})`, value: poolId };
          });
        setResourcePoolOptions(options);
      } else {
        messageApi.error(response.message || '获取资源池列表失败');
        setResourcePoolOptions([]);
      }
    } catch (error: any) {
      console.error(error);
      messageApi.error(error?.info?.errorMessage || error?.message || '获取资源池列表失败');
      setResourcePoolOptions([]);
    } finally {
      setResourcePoolOptionsLoading(false);
    }
  }, [messageApi]);

  const fetchPfsOptions = useCallback(async (poolId: string) => {
    if (!poolId?.trim()) {
      setPfsOptions([]);
      return;
    }
    setPfsOptionsLoading(true);
    try {
      const response = await request(`/api/resources/pools/${poolId.trim()}`, {
        method: 'GET',
      });
      if (response.success) {
        const data = response.data;
        const poolDetail = data?.resourcePool || data?.data || data || null;
        if (poolDetail?.bindingStorages && Array.isArray(poolDetail.bindingStorages)) {
          const pfsStorages = poolDetail.bindingStorages.filter((storage: any) => {
            const provider = (storage.provider || '').toLowerCase();
            return provider === 'pfs' || provider.includes('pfs');
          });
          const options = pfsStorages.map((storage: any) => {
            const pfsId = storage.id || '';
            const provider = storage.provider || 'pfs';
            return { label: `${provider}: ${pfsId}`, value: pfsId };
          });
          setPfsOptions(options);
          setPfsInputMode(options.length > 0 ? 'select' : 'input');
        } else {
          setPfsOptions([]);
          setPfsInputMode('input');
        }
      } else {
        setPfsOptions([]);
        setPfsInputMode('input');
      }
    } catch {
      setPfsOptions([]);
      setPfsInputMode('input');
    } finally {
      setPfsOptionsLoading(false);
    }
  }, []);

  const fetchQueueOptions = useCallback(
    async (poolId: string) => {
      if (!poolId?.trim()) {
        setQueueOptions([]);
        return;
      }
      setQueueOptionsLoading(true);
      try {
        const response = await request('/api/resources/queues', {
          method: 'GET',
          params: {
            resourcePoolId: poolId.trim(),
            pageSize: 100,
            pageNumber: 1,
          },
        });

        if (response.success) {
          let queues: any[] = [];
          const data = response.data;
          if (Array.isArray(data)) {
            queues = data;
          } else if (data?.queues && Array.isArray(data.queues)) {
            queues = data.queues;
          } else if (data?.data && Array.isArray(data.data)) {
            queues = data.data;
          } else if (data?.result && Array.isArray(data.result)) {
            queues = data.result;
          }

          const childQueues: any[] = [];
          queues.forEach((queue: any) => {
            if (queue.children && Array.isArray(queue.children) && queue.children.length > 0) {
              childQueues.push(...queue.children);
            }
          });

          const options = childQueues.map((queue: any) => {
            const qid = queue.queueId || queue.id || queue.queue_id || '';
            const qname = queue.queueName || queue.name || queue.queue_name || qid;
            return { label: `${qname} (${qid})`, value: qid };
          });
          setQueueOptions(options);
        } else {
          messageApi.error(response.message || '获取队列列表失败');
          setQueueOptions([]);
        }
      } catch (error: any) {
        console.error(error);
        if (!error?.info) {
          messageApi.error(error?.message || '获取队列列表失败');
        }
        setQueueOptions([]);
      } finally {
        setQueueOptionsLoading(false);
      }
    },
    [messageApi],
  );

  const loadAll = useCallback(async () => {
    setConfigLoading(true);
    try {
      await fetchResourcePoolOptions();
      const [poolRes, queueRes, bucketRes, pfsRes] = await Promise.all([
        request('/api/config/ML_PLATFORM_RESOURCE_POOL_ID', { method: 'GET' }),
        request('/api/config/ML_PLATFORM_RESOURCE_QUEUE_ID', { method: 'GET' }),
        request('/api/config/ML_PLATFORM_RESOURCE_BUCKET', { method: 'GET' }),
        request('/api/config/ML_PLATFORM_RESOURCE_PFS_INSTANCE_ID', { method: 'GET' }),
      ]);

      const poolId = poolRes?.success ? poolRes.data?.value || '' : '';
      const queueId = queueRes?.success ? queueRes.data?.value || '' : '';
      const bucket = bucketRes?.success ? bucketRes.data?.value || '' : '';
      const pfsId = pfsRes?.success ? pfsRes.data?.value || '' : '';

      setResourcePoolId(poolId);

      if (poolId) {
        await fetchQueueOptions(poolId);
        await fetchPfsOptions(poolId);
      } else {
        setQueueOptions([]);
        setPfsOptions([]);
        setPfsInputMode('input');
      }

      setResourceInitial({
        ML_PLATFORM_RESOURCE_POOL_ID: poolId,
        ML_PLATFORM_RESOURCE_QUEUE_ID: queueId,
      });
      setStorageInitial({
        ML_PLATFORM_RESOURCE_BUCKET: bucket,
        ML_PLATFORM_RESOURCE_PFS_INSTANCE_ID: pfsId,
      });
      setFormVersion((v) => v + 1);
    } catch (e) {
      console.error(e);
      messageApi.error('加载配置失败');
    } finally {
      setConfigLoading(false);
    }
  }, [
    fetchResourcePoolOptions,
    fetchQueueOptions,
    fetchPfsOptions,
    messageApi,
  ]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (configLoading) return;
    const t = window.setTimeout(() => updateActiveSectionFromScroll(), 100);
    return () => window.clearTimeout(t);
  }, [configLoading, formVersion, updateActiveSectionFromScroll]);

  const handleSaveAll = async () => {
    setSaveSubmitting(true);
    try {
      let resourceValues: Record<string, unknown>;
      let storageValues: Record<string, unknown>;
      try {
        resourceValues = await resourceForm.validateFields();
      } catch {
        scrollToSection('resource');
        return;
      }
      try {
        storageValues = await storageForm.validateFields();
      } catch {
        scrollToSection('storage');
        return;
      }

      const response = await updateConfig({
        config: {
          ML_PLATFORM_RESOURCE_POOL_ID:
            String(resourceValues.ML_PLATFORM_RESOURCE_POOL_ID ?? ''),
          ML_PLATFORM_RESOURCE_QUEUE_ID:
            String(resourceValues.ML_PLATFORM_RESOURCE_QUEUE_ID ?? ''),
          ML_PLATFORM_RESOURCE_BUCKET: String(
            storageValues.ML_PLATFORM_RESOURCE_BUCKET ?? '',
          ),
          ML_PLATFORM_RESOURCE_PFS_INSTANCE_ID: String(
            storageValues.ML_PLATFORM_RESOURCE_PFS_INSTANCE_ID ?? '',
          ),
        } as any,
      });
      if (response.success) {
        messageApi.success('配置已保存');
        setResourcePoolId(String(resourceValues.ML_PLATFORM_RESOURCE_POOL_ID ?? ''));
        await loadAll();
      } else {
        messageApi.error(response.message || '保存失败');
      }
    } catch (error: any) {
      messageApi.error(error?.info?.errorMessage || error?.message || '保存失败');
    } finally {
      setSaveSubmitting(false);
    }
  };

  return (
    <PageContainer
      header={{
        title: '全局配置',
        breadcrumb: {},
        extra: [
          <Space key="actions" wrap>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadAll}
              loading={configLoading}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSaveAll}
              loading={saveSubmitting}
              disabled={configLoading}
            >
              保存配置
            </Button>
          </Space>,
        ],
      }}
    >
      {configLoading ? (
        <Card>
          <div style={{ padding: 48, textAlign: 'center' }}>
            <Spin tip="加载配置中..." />
          </div>
        </Card>
      ) : (
        <Card styles={{ body: { padding: 0 } }}>
          <Row wrap={false}>
            <Col flex="none" style={{ borderRight: '1px solid #f0f0f0' }}>
              <Menu
                mode="vertical"
                selectedKeys={[activeSection]}
                items={[
                  { key: 'resource', label: '资源配置' },
                  { key: 'storage', label: '存储配置' },
                ]}
                onClick={({ key }) =>
                  scrollToSection(key as 'resource' | 'storage')
                }
                style={{
                  width: 168,
                  border: 'none',
                  paddingTop: 12,
                  paddingBottom: 12,
                }}
              />
            </Col>
            <Col flex="auto" style={{ minWidth: 0 }}>
              <div
                ref={scrollContainerRef}
                onScroll={updateActiveSectionFromScroll}
                style={{
                  position: 'relative',
                  overflow: 'auto',
                  maxHeight: 'calc(100vh - 160px)',
                }}
              >
                <div
                  ref={resourceSectionRef}
                  style={{ padding: '16px 24px 32px 16px', maxWidth: 720 }}
                >
                  <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                    配置平台默认使用的资源池与默认队列（ML_PLATFORM_RESOURCE_POOL_ID /
                    ML_PLATFORM_RESOURCE_QUEUE_ID）
                  </Text>
                  <ProForm
                    key={`resource-${formVersion}`}
                    form={resourceForm}
                    initialValues={resourceInitial}
                    submitter={false}
                    onValuesChange={(changed) => {
                      if (changed.ML_PLATFORM_RESOURCE_POOL_ID !== undefined) {
                        const pid = changed.ML_PLATFORM_RESOURCE_POOL_ID as string;
                        setResourcePoolId(pid || '');
                        if (pid?.trim()) {
                          fetchQueueOptions(pid.trim());
                          fetchPfsOptions(pid.trim());
                          resourceForm.setFieldsValue({
                            ML_PLATFORM_RESOURCE_QUEUE_ID: undefined,
                          });
                        } else {
                          setQueueOptions([]);
                          setPfsOptions([]);
                          resourceForm.setFieldsValue({
                            ML_PLATFORM_RESOURCE_QUEUE_ID: undefined,
                          });
                        }
                      }
                    }}
                  >
                    <ProFormSelect
                      name="ML_PLATFORM_RESOURCE_POOL_ID"
                      label="默认资源池"
                      tooltip="机器学习平台默认资源池 ID"
                      placeholder="请选择资源池"
                      options={resourcePoolOptions}
                      fieldProps={{
                        loading: resourcePoolOptionsLoading,
                        showSearch: true,
                        filterOption: (input, option) =>
                          (option?.label ?? '')
                            .toLowerCase()
                            .includes(input.toLowerCase()),
                      }}
                    />
                    <ProFormSelect
                      name="ML_PLATFORM_RESOURCE_QUEUE_ID"
                      label="默认队列"
                      tooltip="机器学习平台默认队列 ID（子队列）"
                      placeholder={
                        resourcePoolId ? '请选择队列' : '请先选择默认资源池'
                      }
                      options={queueOptions}
                      fieldProps={{
                        loading: queueOptionsLoading,
                        disabled: !resourcePoolId || queueOptionsLoading,
                        showSearch: true,
                        filterOption: (input, option) =>
                          (option?.label ?? '')
                            .toLowerCase()
                            .includes(input.toLowerCase()),
                      }}
                    />
                  </ProForm>
                </div>

                <div
                  ref={storageSectionRef}
                  style={{
                    padding: '8px 24px 48px 16px',
                    maxWidth: 720,
                    borderTop: '1px solid #f0f0f0',
                  }}
                >
                  <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                    配置对象存储桶与 PFS 存储实例（ML_PLATFORM_RESOURCE_BUCKET /
                    ML_PLATFORM_RESOURCE_PFS_INSTANCE_ID）。选择默认资源池后，可从该池绑定的 PFS
                    中选取实例。
                  </Text>
                  <ProForm
                    key={`storage-${formVersion}`}
                    form={storageForm}
                    initialValues={storageInitial}
                    submitter={false}
                  >
                    <ProFormText
                      name="ML_PLATFORM_RESOURCE_BUCKET"
                      label="对象存储桶"
                      tooltip="机器学习平台对象存储桶名称（BOS 等）"
                      placeholder="请输入存储桶名称"
                      fieldProps={{ allowClear: true }}
                    />
                    <ProForm.Item
                      name="ML_PLATFORM_RESOURCE_PFS_INSTANCE_ID"
                      label="PFS 存储实例 ID"
                      tooltip="并行文件存储（PFS）实例 ID，可从默认资源池绑定存储中选择或手动输入"
                      extra={
                        pfsOptions.length > 0 ? (
                          <Space style={{ marginTop: 8 }}>
                            <Radio.Group
                              size="small"
                              value={pfsInputMode}
                              onChange={(e) => {
                                setPfsInputMode(e.target.value);
                                storageForm.setFieldsValue({
                                  ML_PLATFORM_RESOURCE_PFS_INSTANCE_ID: undefined,
                                });
                              }}
                            >
                              <Radio.Button value="select">从列表选择</Radio.Button>
                              <Radio.Button value="input">手动输入</Radio.Button>
                            </Radio.Group>
                          </Space>
                        ) : (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            当前默认资源池未返回可选项时，请直接输入 PFS 实例 ID
                          </Text>
                        )
                      }
                    >
                      {pfsOptions.length > 0 && pfsInputMode === 'select' ? (
                        <Select
                          placeholder="请选择 PFS 实例"
                          options={pfsOptions}
                          loading={pfsOptionsLoading}
                          showSearch
                          allowClear
                          style={{ width: '100%' }}
                          filterOption={(input, option) =>
                            (option?.label ?? '')
                              .toLowerCase()
                              .includes(input.toLowerCase()) ||
                            String(option?.value ?? '')
                              .toLowerCase()
                              .includes(input.toLowerCase())
                          }
                          notFoundContent={
                            pfsOptionsLoading ? <Spin size="small" /> : '未找到匹配项'
                          }
                        />
                      ) : (
                        <Input placeholder="请输入 PFS 实例 ID" allowClear />
                      )}
                    </ProForm.Item>
                  </ProForm>
                </div>
              </div>
            </Col>
          </Row>
        </Card>
      )}
    </PageContainer>
  );
};

export default GlobalConfig;
