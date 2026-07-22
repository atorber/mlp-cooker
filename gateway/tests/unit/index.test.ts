import { describe, it, expect } from 'vitest';
import { computeResourcesTransformer } from '../../src/transformers/compute-resources.js';
import { storageMountTransformer } from '../../src/transformers/storage-mount.js';
import { imageConfigTransformer } from '../../src/transformers/image-config.js';
import type { ComputeResources, StorageMount, ImageConfig } from '../../src/types/unified/index.js';

describe('ComputeResourcesTransformer', () => {
  it('should transform unified resources to training job format', () => {
    const resources: ComputeResources = {
      cpu: 4,
      memory: 16,
      accelerator: {
        type: 'baidu.com/a800_80g_cgpu',
        count: 8,
      },
      sharedMemory: 10,
    };

    const backend = computeResourcesTransformer.toTrainingJob(resources);

    expect(backend).toEqual([
      { name: 'cpu', quantity: 4 },
      { name: 'memory', quantity: 16 },
      { name: 'baidu.com/a800_80g_cgpu', quantity: 8 },
      { name: 'sharedMemory', quantity: 10 },
    ]);
  });

  it('should transform training job format to unified resources', () => {
    const backend = [
      { name: 'cpu', quantity: 4 },
      { name: 'memory', quantity: 16 },
      { name: 'baidu.com/a800_80g_cgpu', quantity: 8 },
    ];

    const resources = computeResourcesTransformer.fromTrainingJob(backend);

    expect(resources).toEqual({
      cpu: 4,
      memory: 16,
      accelerator: {
        type: 'baidu.com/a800_80g_cgpu',
        count: 8,
      },
    });
  });

  it('should transform unified resources to service format', () => {
    const resources: ComputeResources = {
      cpu: 4,
      memory: 16,
      accelerator: {
        type: 'baidu.com/l20_cgpu',
        count: 2,
      },
    };

    const backend = computeResourcesTransformer.toService(resources);

    expect(backend).toEqual({
      cpus: 4,
      memory: 16,
      acceleratorCount: 2,
    });
  });

  it('should transform unified resources to dev instance format', () => {
    const resources: ComputeResources = {
      cpu: 8,
      memory: 32,
      accelerator: {
        type: 'baidu.com/h800_80g_cgpu',
        count: 1,
      },
      sharedMemory: 16,
    };

    const backend = computeResourcesTransformer.toDevInstance(resources);

    expect(backend).toEqual({
      cpus: 8,
      memory: 32,
      acceleratorType: 'baidu.com/h800_80g_cgpu',
      acceleratorCount: 1,
      shmSize: 16,
    });
  });
});

describe('StorageMountTransformer', () => {
  it('should transform unified storage mounts to training job format', () => {
    const mounts: StorageMount[] = [
      {
        name: 'training-data',
        mountPath: '/data',
        readOnly: false,
        storageType: 'pfs',
        config: {
          type: 'pfs',
          instanceId: 'pfs-xxx',
          sourcePath: '/training-data',
        },
      },
    ];

    const backend = storageMountTransformer.toTrainingJob(mounts);

    expect(backend).toHaveLength(1);
    expect(backend[0]).toMatchObject({
      type: 'pfs',
      name: 'pfs-xxx',
      sourcePath: '/training-data',
      mountPath: '/data',
    });
  });
});

describe('ImageConfigTransformer', () => {
  it('should transform unified image to training job format', () => {
    const image: ImageConfig = {
      url: 'registry.baidubce.com/test/image:v1',
      auth: {
        username: 'user',
        password: 'pass',
      },
    };

    const backend = imageConfigTransformer.toTrainingJob(image);

    expect(backend).toEqual({
      image: 'registry.baidubce.com/test/image:v1',
      imageConfig: {
        username: 'user',
        password: 'pass',
      },
    });
  });

  it('should transform unified image to service format', () => {
    const image: ImageConfig = {
      url: 'registry.baidubce.com/test/image:v1',
      source: 'preset',
    };

    const backend = imageConfigTransformer.toService(image);

    expect(backend).toEqual({
      imageUrl: 'registry.baidubce.com/test/image:v1',
      imageType: 0,
    });
  });

  it('should transform service image to unified format', () => {
    const backend = {
      imageUrl: 'registry.baidubce.com/test/image:v1',
      imageType: 1,
      username: 'user',
      password: 'pass',
    };

    const image = imageConfigTransformer.fromService(backend);

    expect(image).toEqual({
      url: 'registry.baidubce.com/test/image:v1',
      source: 'custom',
      auth: {
        username: 'user',
        password: 'pass',
      },
    });
  });
});
