import { ThunderboltOutlined } from '@ant-design/icons';
import { request } from '@umijs/max';
import { Tag } from 'antd';
import React, { useEffect, useState } from 'react';

interface QueueInfo {
  queueId?: string;
  queueName?: string;
}

export const QueueInfo: React.FC = () => {
  const [queueInfo, setQueueInfo] = useState<QueueInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchQueueInfo = async () => {
      try {
        setLoading(true);
        // 获取配置中的队列ID
        const configRes = await request('/api/config/ML_PLATFORM_RESOURCE_QUEUE_ID', {
          method: 'GET',
        });

        if (!configRes?.success || !configRes?.data?.value) {
          setQueueInfo(null);
          return;
        }

        const queueId = configRes.data.value;

        // 获取队列详情以获取队列名称
        try {
          const queueRes = await request(`/api/resources/queues/${queueId}`, {
            method: 'GET',
          });

          if (queueRes?.success) {
            const data = queueRes.data;
            const queue = data?.queue || data || null;

            // 获取实际队列（children[0] 或队列本身）
            let actualQueue: any = null;
            if (
              queue?.children &&
              Array.isArray(queue.children) &&
              queue.children.length > 0
            ) {
              actualQueue = queue.children[0];
            } else {
              actualQueue = queue || null;
            }

            if (actualQueue) {
              setQueueInfo({
                queueId: actualQueue.queueId || queueId,
                queueName: actualQueue.queueName || actualQueue.name || queueId,
              });
            } else {
              setQueueInfo({
                queueId: queueId,
                queueName: queueId,
              });
            }
          } else {
            // 如果获取队列详情失败，至少显示队列ID
            setQueueInfo({
              queueId: queueId,
              queueName: queueId,
            });
          }
        } catch (error) {
          // 如果获取队列详情失败，至少显示队列ID
          console.error('获取队列详情失败:', error);
          setQueueInfo({
            queueId: queueId,
            queueName: queueId,
          });
        }
      } catch (error) {
        console.error('获取队列配置失败:', error);
        setQueueInfo(null);
      } finally {
        setLoading(false);
      }
    };

    fetchQueueInfo();

    // 定期刷新队列信息（每5分钟）
    const interval = setInterval(fetchQueueInfo, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  if (loading || !queueInfo) {
    return null;
  }

  return (
    <Tag
      icon={<ThunderboltOutlined />}
      color="blue"
      style={{
        margin: 0,
        padding: '4px 8px',
        fontSize: '14px',
        lineHeight: '22px',
        cursor: 'default',
      }}
      title={`队列名称: ${queueInfo.queueName}\n队列ID: ${queueInfo.queueId}`}
    >
      队列: {queueInfo.queueName} ({queueInfo.queueId})
    </Tag>
  );
};

