import type {
  StorageMount,
  StorageType,
  PFSStorage,
  BOSStorage,
  CFSStorage,
  DatasetStorage,
  HostPathStorage,
  EmptyDirStorage,
  CDSStorage,
} from '../types/unified/index.js';
import type {
  BackendDataSource,
  BackendVolumeConf,
  BackendVolumeMountConf,
  BackendDevVolumeConf,
  BackendPFSConfig,
  BackendBOSConfig,
} from '../types/backend/index.js';

/**
 * 存储挂载转换器
 */
export class StorageMountTransformer {
  /**
   * 统一结构 -> 训练任务后端结构
   */
  toTrainingJob(mounts: StorageMount[]): BackendDataSource[] {
    return mounts.map((mount) => this.toTrainingJobDataSource(mount));
  }

  private toTrainingJobDataSource(mount: StorageMount): BackendDataSource {
    const dataSource: BackendDataSource = {
      type: mount.storageType,
      name: this.extractName(mount),
      sourcePath: this.extractSourcePath(mount),
      mountPath: mount.mountPath,
      options: {
        readOnly: mount.readOnly,
      },
    };

    // 处理特殊选项
    if (mount.storageType === 'emptyDir' && mount.config.type === 'emptyDir') {
      const config = mount.config as EmptyDirStorage;
      dataSource.options = {
        ...dataSource.options,
        sizeLimit: config.sizeLimit,
        medium: config.medium,
      };
    }

    return dataSource;
  }

  /**
   * 训练任务后端结构 -> 统一结构
   */
  fromTrainingJob(dataSources: BackendDataSource[]): StorageMount[] {
    return dataSources.map((ds) => this.fromTrainingJobDataSource(ds));
  }

  private fromTrainingJobDataSource(ds: BackendDataSource): StorageMount {
    const config = this.buildStorageConfig(ds.type, ds);

    return {
      name: ds.name,
      mountPath: ds.mountPath,
      readOnly: ds.options?.readOnly,
      storageType: ds.type as StorageType,
      config,
    };
  }

  /**
   * 统一结构 -> 服务部署后端结构
   * 返回 volumes 和 volumeMounts 两个数组
   */
  toService(mounts: StorageMount[]): {
    volumes: BackendVolumeConf[];
    volumeMounts: BackendVolumeMountConf[];
  } {
    const volumes: BackendVolumeConf[] = [];
    const volumeMounts: BackendVolumeMountConf[] = [];

    for (const mount of mounts) {
      const volumeName = mount.name;

      // 创建 Volume
      volumes.push({
        volumeType: mount.storageType,
        volumnName: volumeName, // 保留原始拼写错误
        pfs: mount.storageType === 'pfs'
          ? this.toBackendPFSConfig(mount.config as PFSStorage)
          : undefined,
        bos: mount.storageType === 'bos'
          ? this.toBackendBOSConfig(mount.config as BOSStorage)
          : undefined,
        hostpath: mount.storageType === 'hostPath'
          ? { sourcePath: (mount.config as HostPathStorage).path }
          : undefined,
        dataset: mount.storageType === 'dataset'
          ? this.toBackendDatasetVolumeConfig(mount.config as DatasetStorage)
          : undefined,
      });

      // 创建 VolumeMount
      volumeMounts.push({
        volumnName: volumeName, // 保留原始拼写错误
        mountPath: mount.mountPath,
        readOnly: mount.readOnly,
      });
    }

    return { volumes, volumeMounts };
  }

  /**
   * 统一结构 -> 开发机后端结构
   */
  toDevInstance(mounts: StorageMount[]): BackendDevVolumeConf[] {
    return mounts.map((mount) => this.toDevInstanceVolumeConf(mount));
  }

  private toDevInstanceVolumeConf(mount: StorageMount): BackendDevVolumeConf {
    const config: BackendDevVolumeConf = {
      volumnType: mount.storageType, // 保留原始拼写错误
      mountPath: mount.mountPath,
      readOnly: mount.readOnly,
    };

    switch (mount.storageType) {
      case 'pfs':
        config.pfs = {
          instanceId: (mount.config as PFSStorage).instanceId,
          sourcePath: (mount.config as PFSStorage).sourcePath,
        };
        break;
      case 'bos':
        const bosConfig = mount.config as BOSStorage;
        config.bos = {
          sourcePath: `${bosConfig.bucket}/${bosConfig.path}`,
          version: bosConfig.version,
          cacheLimitSize: bosConfig.cacheLimitSize,
        };
        break;
      case 'cds':
        config.cds = {
          capacity: (mount.config as CDSStorage).capacity,
        };
        break;
      case 'cfs':
        const cfsConfig = mount.config as CFSStorage;
        config.cfs = {
          instanceId: cfsConfig.instanceId,
          sourcePath: cfsConfig.sourcePath,
          mountPoint: cfsConfig.mountPoint,
        };
        break;
      case 'dataset':
        config.dataset = this.toBackendDevDataset(mount.config as DatasetStorage);
        break;
    }

    return config;
  }

  // 辅助方法

  private extractName(mount: StorageMount): string {
    const config = mount.config;
    switch (config.type) {
      case 'pfs':
        return (config as PFSStorage).instanceId;
      case 'bos':
        return (config as BOSStorage).bucket;
      case 'cfs':
        return (config as CFSStorage).instanceId;
      case 'dataset':
        return (config as DatasetStorage).datasetId;
      case 'hostPath':
        return mount.name;
      case 'cds':
        return mount.name;
      case 'emptyDir':
        return mount.name;
      default:
        return mount.name;
    }
  }

  private extractSourcePath(mount: StorageMount): string {
    const config = mount.config;
    switch (config.type) {
      case 'pfs':
        return (config as PFSStorage).sourcePath;
      case 'bos':
        return (config as BOSStorage).path;
      case 'cfs':
        return (config as CFSStorage).sourcePath;
      case 'hostPath':
        return (config as HostPathStorage).path;
      case 'dataset':
        return ''; // 数据集可能没有统一的源路径
      default:
        return '';
    }
  }

  private buildStorageConfig(type: string, ds: BackendDataSource): StorageMount['config'] {
    switch (type) {
      case 'pfs':
      case 'pfsl1':
        return {
          type: 'pfs',
          instanceId: ds.name,
          sourcePath: ds.sourcePath,
        } as PFSStorage;
      case 'bos':
        const [bucket, ...pathParts] = ds.sourcePath.split('/');
        return {
          type: 'bos',
          bucket,
          path: pathParts.join('/'),
        } as BOSStorage;
      case 'cfs':
        return {
          type: 'cfs',
          instanceId: ds.name,
          sourcePath: ds.sourcePath,
        } as CFSStorage;
      case 'hostPath':
        return {
          type: 'hostPath',
          path: ds.sourcePath,
        } as HostPathStorage;
      case 'emptydir':
        return {
          type: 'emptyDir',
          sizeLimit: ds.options?.sizeLimit,
          medium: ds.options?.medium as '' | 'Memory',
        } as EmptyDirStorage;
      default:
        return {
          type: 'emptyDir',
        } as EmptyDirStorage;
    }
  }

  private toBackendPFSConfig(config: PFSStorage): BackendPFSConfig {
    return {
      instanceId: config.instanceId,
      sourcePath: config.sourcePath,
    };
  }

  private toBackendBOSConfig(config: BOSStorage): BackendBOSConfig {
    return {
      sourcePath: `${config.bucket}/${config.path}`,
      version: config.version,
    };
  }

  private toBackendDatasetVolumeConfig(config: DatasetStorage): BackendVolumeConf['dataset'] {
    return {
      datasetId: config.datasetId,
      versionId: config.versionId,
      storageType: config.storageType,
    };
  }

  private toBackendDevDataset(config: DatasetStorage): BackendDevVolumeConf['dataset'] {
    if (config.storageType === 'pfs' && config.pfs) {
      return {
        datasetId: config.datasetId,
        versionId: config.versionId,
        storageType: 'pfs',
        pfs: {
          clientID: config.pfs.clientID,
          instanceType: config.pfs.instanceType,
          region: config.pfs.region,
          instanceId: config.pfs.instanceId,
          clusterIP: config.pfs.clusterIP,
          mountTargetId: config.pfs.mountTargetId,
          hostMountPath: config.pfs.hostMountPath,
          srcPath: config.pfs.srcPath,
        },
      };
    }
    return {
      datasetId: config.datasetId,
      versionId: config.versionId,
      storageType: config.storageType,
    };
  }
}

export const storageMountTransformer = new StorageMountTransformer();
