export function rewriteAihcUrl(reqUrl: string | undefined): string {
  if (!reqUrl) return '/';
  
  // Only process if it starts with /v1/aihc or /api/v1/aihc
  if (!reqUrl.startsWith('/v1/aihc') && !reqUrl.startsWith('/api/v1/aihc')) {
    return reqUrl;
  }

  try {
    const urlParts = reqUrl.split('?');
    const pathPart = urlParts[0];
    const queryPart = urlParts[1] || '';
    
    // Parse query params manually since we are at the raw IncomingMessage level
    const searchParams = new URLSearchParams(queryPart);
    let action = searchParams.get('action') || searchParams.get('Action');

    // 1. Path fallback (e.g. /v1/aihc/jobs/DescribeJobs)
    if (!action) {
      const segments = pathPart.split('/').filter(Boolean);
      const lastSegment = segments[segments.length - 1];
      if (lastSegment && /^[A-Z]/.test(lastSegment)) {
        action = lastSegment;
        searchParams.set('action', action);
      }
    }

    // 2. Query key fallback (e.g. ?DescribeDatasets)
    if (!action && queryPart) {
      for (const [key] of searchParams.entries()) {
        if (/^[A-Z][a-zA-Z]+$/.test(key)) {
          action = key;
          searchParams.set('action', action);
          break;
        }
      }
    }

    if (!action) return reqUrl;

    let rewritePath = '';
    if (['DescribeJobs', 'DescribeJob', 'CreateJob', 'DeleteJob', 'StopJob', 'BatchStopJobs', 'ModifyJob', 'DescribePodEvents', 'DescribeJobEvents', 'DescribeJobNodes', 'DescribeJobLogs', 'DescribeJobMetrics', 'DescribeJobWebterminal'].includes(action)) {
      rewritePath = '/api/v1/jobs';
    } else if (['DescribeDatasets', 'DescribeDataset', 'DescribeDatasetVersions', 'DescribeDatasetVersion', 'CreateDataset', 'CreateDatasetVersion', 'DeleteDataset', 'DeleteDatasetVersion', 'ModifyDataset'].includes(action)) {
      rewritePath = '/api/v1/datasets';
    } else if (['DescribeDevInstances', 'DescribeDevInstance', 'CreateDevInstance', 'DeleteDevInstance'].includes(action)) {
      rewritePath = '/api/v1/dev-instances';
    } else if (['DescribeModels', 'DescribeModel', 'DescribeModelVersions', 'CreateModel', 'CreateModelVersion', 'DeleteModel', 'DeleteModelVersion', 'ModifyModel'].includes(action)) {
      rewritePath = '/api/v1/models';
    } else if (['DescribeResourcePools', 'DescribeResourcePool', 'DescribeQueues', 'DescribeQueue', 'DescribeNodes', 'DescribeNode', 'DescribeResourcePoolUsage', 'DescribeResourcePoolConfiguration', 'DescribeResourcePoolsStatistic', 'CreateResourcePool', 'DeleteResourcePool', 'CreateQueue', 'DeleteQueue', 'CreateNodes', 'DeleteNodes'].includes(action)) {
      rewritePath = '/api/v1/resource-pools';
    } else if (['DescribeServices', 'DescribeService', 'CreateService', 'DeleteService'].includes(action)) {
      rewritePath = '/api/v1/services';
    }

    if (rewritePath) {
      const newQuery = searchParams.toString();
      return newQuery ? `${rewritePath}?${newQuery}` : rewritePath;
    }

    return reqUrl;
  } catch (e) {
    return reqUrl;
  }
}
