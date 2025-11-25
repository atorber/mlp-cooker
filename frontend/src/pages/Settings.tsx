import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProCard,
  ProForm,
  ProFormDigit,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { Alert, App, Button, Space, Spin, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import { request } from '@umijs/max';
import {
  getConfig,
  updateConfig,
  validateConfig,
} from '@/services/aihc-mentor/api';

const { Text, Paragraph } = Typography;

interface ConfigData {
  [key: string]: any;
}

const Settings: React.FC = () => {
  const { message, modal } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [configData, setConfigData] = useState<ConfigData>({});
  const [configFileExists, setConfigFileExists] = useState(false);
  const [configFilePath, setConfigFilePath] = useState('');
  const [queueList, setQueueList] = useState<Array<{ label: string; value: string }>>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [formRef, setFormRef] = useState<any>(null);

  // 查询队列列表
  const fetchQueueList = async (resourcePoolId: string) => {
    if (!resourcePoolId || !resourcePoolId.trim()) {
      setQueueList([]);
      return;
    }

    setQueueLoading(true);
    try {
      const response = await request('/api/resources/queues', {
        method: 'GET',
        params: {
          resourcePoolId: resourcePoolId.trim(),
          pageSize: 100, // 使用较大的 pageSize 以获取更多队列
          pageNumber: 1,
        },
      });

      if (response.success) {
        // 处理响应数据格式
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

        // 提取所有 children 下的队列（扁平化处理）
        const childQueues: any[] = [];
        queues.forEach((queue: any) => {
          if (queue.children && Array.isArray(queue.children) && queue.children.length > 0) {
            // 添加所有子队列
            childQueues.push(...queue.children);
          }
        });

        // 转换为下拉选项格式
        const queueOptions = childQueues.map((queue: any) => {
          const queueId = queue.queueId || queue.id || queue.queue_id || '';
          const queueName = queue.queueName || queue.name || queue.queue_name || queueId;
          return {
            label: `${queueName} (${queueId})`,
            value: queueId,
          };
        });

        setQueueList(queueOptions);
      } else {
        message.error(response.message || '获取队列列表失败');
        setQueueList([]);
      }
    } catch (error: any) {
      console.error('获取队列列表失败:', error);
      const errorMessage = error?.info?.errorMessage || error?.message || '获取队列列表失败';
      message.error(errorMessage);
      setQueueList([]);
    } finally {
      setQueueLoading(false);
    }
  };

  // 加载配置数据
  const loadConfig = async () => {
    setLoading(true);
    try {
      const response = await getConfig();
      if (response.success && response.data) {
        const newConfigData = response.data.config || {};
        setConfigData(newConfigData);
        setConfigFileExists(response.data.config_file_exists);
        setConfigFilePath(response.data.config_file_path);
        
        // 如果配置中有资源池ID，自动查询队列列表
        const resourcePoolId = newConfigData['ML_PLATFORM_RESOURCE_POOL_ID'];
        if (resourcePoolId && resourcePoolId.trim()) {
          fetchQueueList(resourcePoolId);
        } else {
          setQueueList([]);
        }
      } else {
        message.error(response.message || '加载配置失败');
      }
    } catch (error: any) {
      // 认证错误已经在 errorHandler 中处理，这里只记录日志
      console.error('加载配置错误:', error);
      // 如果不是认证错误，且 errorHandler 没有处理，这里显示错误
      if (!error?.info?.errorMessage?.includes('认证失败') &&
          !error?.info?.errorMessage?.includes('未认证') &&
          error?.response?.status !== 401) {
        const errorMessage = error?.info?.errorMessage || error?.message || '加载配置时发生错误';
        if (!error?.info || error?.info?.showType === undefined) {
          message.error(errorMessage);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // 保存配置
  const handleSaveConfig = async (values: ConfigData) => {
    setSubmitting(true);
    try {
      const response = await updateConfig({ config: values });
      if (response.success) {
        message.success('配置保存成功');
        await loadConfig(); // 重新加载配置
      } else {
        message.error(response.message || '配置保存失败');
      }
    } catch (error: any) {
      // 错误已经被 errorHandler 处理，这里只需要记录日志
      const errorMessage = error?.info?.errorMessage || error?.message || '保存配置时发生错误';
      console.error('保存配置错误:', error);
      // 如果 errorHandler 没有处理，这里再次显示错误
      if (!error?.info) {
        message.error(errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 验证配置
  const handleValidateConfig = async () => {
    setValidating(true);
    try {
      const response = await validateConfig();
      if (response.success && response.data) {
        if (response.data.is_valid) {
          message.success('配置验证通过');
        } else {
          modal.error({
            title: '配置验证失败',
            content: (
              <div>
                <p>以下配置项存在问题：</p>
                <ul>
                  {response.data.errors?.map((error: string) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ),
          });
        }
      } else {
        message.error(response.message || '配置验证失败');
      }
    } catch (error) {
      message.error('验证配置时发生错误');
      console.error('验证配置错误:', error);
    } finally {
      setValidating(false);
    }
  };

  // 组件挂载时加载配置
  useEffect(() => {
    loadConfig();
  }, []);


  // 获取配置项的友好标签和说明
  const getConfigLabel = (key: string) => {
    const labelMap: { [key: string]: { label: string; tooltip?: string } } = {
      'ML_PLATFORM_RESOURCE_AK': {
        label: 'Access Key',
        tooltip: '机器学习平台的 Access Key（访问密钥）'
      },
      'ML_PLATFORM_RESOURCE_SK': {
        label: 'Secret Key',
        tooltip: '机器学习平台的 Secret Key（密钥）'
      },
      'ML_PLATFORM_RESOURCE_BASE_URL': {
        label: '基础URL',
        tooltip: '机器学习平台的基础URL，如：aihc.bj.baidubce.com'
      },
      'ML_PLATFORM_RESOURCE_POOL_ID': {
        label: '资源池ID',
        tooltip: '机器学习平台的资源池ID'
      },
      'ML_PLATFORM_RESOURCE_QUEUE_ID': {
        label: '队列ID',
        tooltip: '机器学习平台的队列ID'
      },
      'ML_PLATFORM_RESOURCE_PFS_INSTANCE_ID': {
        label: '存储实例ID',
        tooltip: '机器学习平台的存储实例ID（PFS实例ID）'
      },
      'ML_PLATFORM_RESOURCE_BUCKET': {
        label: '对象存储桶',
        tooltip: '机器学习平台的对象存储桶名称'
      },
    };
    return labelMap[key] || { label: key };
  };

  // 渲染配置表单项
  const renderFormItems = () => {
    // 按照配置项顺序排序
    const configKeys = [
      'ML_PLATFORM_RESOURCE_AK',
      'ML_PLATFORM_RESOURCE_SK',
      'ML_PLATFORM_RESOURCE_BASE_URL',
      'ML_PLATFORM_RESOURCE_POOL_ID',
      'ML_PLATFORM_RESOURCE_QUEUE_ID',
      'ML_PLATFORM_RESOURCE_PFS_INSTANCE_ID',
      'ML_PLATFORM_RESOURCE_BUCKET',
    ];

    return configKeys.map((key) => {
      const value = configData[key];
      const { label, tooltip } = getConfigLabel(key);

      // AK 直接显示，SK 使用密码输入框（带显示/隐藏按钮）
      const isSecretKey = key === 'ML_PLATFORM_RESOURCE_SK';
      const isAccessKey = key === 'ML_PLATFORM_RESOURCE_AK';
      const isQueueId = key === 'ML_PLATFORM_RESOURCE_QUEUE_ID';
      const isResourcePoolId = key === 'ML_PLATFORM_RESOURCE_POOL_ID';
      const isOtherPassword =
        (key.toLowerCase().includes('password') ||
         key.toLowerCase().includes('secret') ||
         key.toLowerCase().includes('token')) &&
        !isSecretKey && !isAccessKey;

      // 队列ID使用下拉选择
      if (isQueueId) {
        return (
          <ProFormSelect
            key={key}
            name={key}
            label={label}
            tooltip={tooltip}
            initialValue={value || undefined}
            options={queueList}
            fieldProps={{
              placeholder: configData['ML_PLATFORM_RESOURCE_POOL_ID'] 
                ? '请选择队列' 
                : '请先设置资源池ID',
              loading: queueLoading,
              disabled: !configData['ML_PLATFORM_RESOURCE_POOL_ID'] || queueLoading,
              showSearch: true,
              filterOption: (input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
            }}
          />
        );
      }

      // 资源池ID变化时重新查询队列列表
      if (isResourcePoolId) {
        return (
          <ProFormText
            key={key}
            name={key}
            label={label}
            tooltip={tooltip}
            initialValue={value || ''}
            fieldProps={{
              placeholder: `请输入${label}`,
            }}
            dependencies={['ML_PLATFORM_RESOURCE_QUEUE_ID']}
            onValuesChange={(changedValues) => {
              if (changedValues[key]) {
                // 资源池ID改变时，查询新的队列列表
                fetchQueueList(changedValues[key]);
                // 清空队列ID选择
                if (formRef) {
                  formRef.setFieldsValue({
                    'ML_PLATFORM_RESOURCE_QUEUE_ID': undefined,
                  });
                }
              } else {
                // 如果资源池ID被清空，清空队列列表和队列ID
                setQueueList([]);
                if (formRef) {
                  formRef.setFieldsValue({
                    'ML_PLATFORM_RESOURCE_QUEUE_ID': undefined,
                  });
                }
              }
            }}
          />
        );
      }

      if (typeof value === 'boolean') {
        return (
          <ProFormSwitch
            key={key}
            name={key}
            label={label}
            tooltip={tooltip}
            initialValue={value}
          />
        );
      } else if (typeof value === 'number') {
        return (
          <ProFormDigit
            key={key}
            name={key}
            label={label}
            tooltip={tooltip}
            initialValue={value}
            min={0}
          />
        );
      } else if (typeof value === 'string' && value.length > 100) {
        return (
          <ProFormTextArea
            key={key}
            name={key}
            label={label}
            tooltip={tooltip}
            initialValue={value}
            fieldProps={{
              rows: 3,
            }}
          />
        );
      } else if (isSecretKey) {
        // SK 使用 ProFormText.Password，支持显示/隐藏切换按钮
        return (
          <ProFormText.Password
            key={key}
            name={key}
            label={label}
            tooltip={tooltip}
            initialValue={value || ''}
            fieldProps={{
              placeholder: `请输入${label}`,
              autoComplete: 'new-password',
            }}
          />
        );
      } else {
        // AK 和其他字段使用普通文本输入框（AK 直接显示，不脱敏）
        return (
          <ProFormText
            key={key}
            name={key}
            label={label}
            tooltip={tooltip}
            initialValue={value || ''}
            fieldProps={{
              type: isOtherPassword ? 'password' : 'text',
              placeholder: `请输入${label}`,
              autoComplete: isOtherPassword ? 'new-password' : 'off',
            }}
          />
        );
      }
    });
  };

  return (
    <PageContainer
      title="系统设置"
      subTitle="配置机器学习平台资源参数"
      extra={[
        <Space key="actions">
          <Button
            icon={<ReloadOutlined />}
            onClick={loadConfig}
            loading={loading}
          >
            重新加载
          </Button>
          <Button
            icon={<CheckCircleOutlined />}
            onClick={handleValidateConfig}
            loading={validating}
          >
            验证配置
          </Button>
        </Space>,
      ]}
    >
      {loading ? (
        <ProCard style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>加载配置中...</div>
        </ProCard>
      ) : (
        <>
          <Alert
            message="配置文件信息"
            description={
              <div>
                <Paragraph>
                  <Text strong>配置文件路径：</Text>
                  <Text code>{configFilePath}</Text>
                </Paragraph>
                <Paragraph>
                  <Text strong>配置文件状态：</Text>
                  {configFileExists ? (
                    <Text type="success">
                      <CheckCircleOutlined /> 配置文件存在
                    </Text>
                  ) : (
                    <Text type="warning">
                      <ExclamationCircleOutlined />{' '}
                      配置文件不存在（将使用环境变量）
                    </Text>
                  )}
                </Paragraph>
                <Paragraph>
                  <Text strong>优先级：</Text>
                  <Text>
                    YAML配置文件 {'>'} 环境变量 {'>'} 默认值
                  </Text>
                </Paragraph>
              </div>
            }
            type="info"
            style={{ marginBottom: '24px' }}
            showIcon
          />

          <ProCard title="机器学习平台资源配置">
            <ProForm
              formRef={(ref) => setFormRef(ref)}
              onFinish={handleSaveConfig}
              submitter={{
                render: (props, _doms) => [
                  <Button
                    key="submit"
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={submitting}
                    onClick={() => props.form?.submit?.()}
                  >
                    保存配置
                  </Button>,
                ],
                submitButtonProps: {
                  loading: submitting,
                },
              }}
            >
              {renderFormItems()}
            </ProForm>
          </ProCard>
        </>
      )}
    </PageContainer>
  );
};

export default Settings;
