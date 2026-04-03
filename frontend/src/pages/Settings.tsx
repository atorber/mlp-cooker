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
  const [formRef, setFormRef] = useState<any>(null);
  const [buckets, setBuckets] = useState<string[]>([]);

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

  // 组件挂载时加载配置与桶列表
  useEffect(() => {
    loadConfig();
    
    // Fetch bucket list
    request('/api/storage/buckets', { method: 'GET' })
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setBuckets(res.data);
        }
      })
      .catch((e) => console.log('拉取Bucket列表失败, 用户尚未配置合法鉴权', e));
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
      'ML_PLATFORM_RESOURCE_REGION': {
        label: '集群地域 (Region)',
        tooltip: '选择您的资源所在的区域，系统将自动映射基础URL'
      },
      'ML_PLATFORM_RESOURCE_BUCKET': {
        label: '对象存储桶',
        tooltip: '机器学习平台的对象存储桶名称'
      },
      'LAKEFS_ENDPOINT': {
        label: 'LakeFS 地址',
        tooltip: 'LakeFS 实例的访问地址，例如：http://lakefs.example.com'
      },
      'LAKEFS_ACCESS_KEY_ID': {
        label: 'LakeFS Access Key',
        tooltip: '访问 LakeFS 的 Access Key ID'
      },
      'LAKEFS_SECRET_ACCESS_KEY': {
        label: 'LakeFS Secret Key',
        tooltip: '访问 LakeFS 的 Secret Access Key'
      },
    };
    return labelMap[key] || { label: key };
  };

  // 渲染配置表单项
  const renderFormItems = (configKeys: string[]) => {
    return configKeys.map((key) => {
      const value = configData[key];
      const { label, tooltip } = getConfigLabel(key);

      // 仅禁用平台资源的 AK/SK，LakeFS 的 AK/SK 允许手动修改
      const isSecretKey = key === 'ML_PLATFORM_RESOURCE_SK';
      const isAccessKey = key === 'ML_PLATFORM_RESOURCE_AK';
      const isDisabled = isSecretKey || isAccessKey;
      const extra = isDisabled ? '登录时自动配置，不可在此修改' : undefined;

      const isOtherPassword =
        (key.toLowerCase().includes('password') ||
         key.toLowerCase().includes('secret') ||
         key.toLowerCase().includes('token')) &&
        !isSecretKey && !isAccessKey;

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
            extra={extra}
            initialValue={value || ''}
            fieldProps={{
              placeholder: `请输入${label}`,
              autoComplete: 'new-password',
              disabled: isDisabled,
            }}
          />
        );
      } else if (key === 'ML_PLATFORM_RESOURCE_REGION') {
        return (
          <ProFormSelect
            key={key}
            name={key}
            label={label}
            tooltip={tooltip}
            initialValue={value || 'bj'}
            options={[
              { label: '北京 (bj)', value: 'bj' },
              { label: '广州 (gz)', value: 'gz' },
              { label: '苏州 (su)', value: 'su' },
              { label: '保定 (bd)', value: 'bd' },
              { label: '武汉 (fwh)', value: 'fwh' },
              { label: '阳泉 (yq)', value: 'yq' },
            ]}
            fieldProps={{
              allowClear: false,
            }}
          />
        );
      } else if (key === 'ML_PLATFORM_RESOURCE_BUCKET') {
        const bucketOptions = buckets.map(b => ({ label: b, value: b }));
        // 如果当前取值不在下拉列表中且有值，则加入下拉避免空载
        if (value && !buckets.includes(value)) {
          bucketOptions.push({ label: value + ' (未知/无权限)', value });
        }
        return (
          <ProFormSelect
            key={key}
            name={key}
            label={label}
            tooltip={tooltip}
            initialValue={value}
            options={bucketOptions}
            fieldProps={{
              allowClear: true,
              placeholder: `请选择${label}`,
              showSearch: true,
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
            extra={extra}
            initialValue={value || ''}
            fieldProps={{
              type: isOtherPassword ? 'password' : 'text',
              placeholder: `请输入${label}`,
              autoComplete: isOtherPassword ? 'new-password' : 'off',
              disabled: isDisabled,
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

          <ProForm
            formRef={setFormRef as any}
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
            <ProCard title="机器学习平台资源配置" style={{ marginBottom: 16 }}>
              {renderFormItems([
                'ML_PLATFORM_RESOURCE_AK',
                'ML_PLATFORM_RESOURCE_SK',
                'ML_PLATFORM_RESOURCE_REGION',
                'ML_PLATFORM_RESOURCE_BUCKET',
              ])}
            </ProCard>
            
            <ProCard title="数据仓库 (LakeFS) 配置">
              {renderFormItems([
                'LAKEFS_ENDPOINT',
                'LAKEFS_ACCESS_KEY_ID',
                'LAKEFS_SECRET_ACCESS_KEY',
              ])}
            </ProCard>
          </ProForm>
        </>
      )}
    </PageContainer>
  );
};

export default Settings;
