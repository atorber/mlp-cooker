import { describe, it, expect } from 'vitest';
import { envVarsTransformer, labelsTransformer } from '../../src/transformers/common.js';

describe('EnvVarsTransformer', () => {
  it('should transform object to array', () => {
    const envs = {
      KEY1: 'value1',
      KEY2: 'value2',
    };

    const array = envVarsTransformer.toArray(envs);

    expect(array).toEqual([
      { name: 'KEY1', value: 'value1' },
      { name: 'KEY2', value: 'value2' },
    ]);
  });

  it('should transform array to object', () => {
    const array = [
      { name: 'KEY1', value: 'value1' },
      { name: 'KEY2', value: 'value2' },
    ];

    const envs = envVarsTransformer.fromArray(array);

    expect(envs).toEqual({
      KEY1: 'value1',
      KEY2: 'value2',
    });
  });

  it('should handle empty input', () => {
    expect(envVarsTransformer.toArray({})).toEqual([]);
    expect(envVarsTransformer.fromArray([])).toEqual({});
    expect(envVarsTransformer.toObject(undefined)).toEqual({});
  });
});

describe('LabelsTransformer', () => {
  it('should transform object to array', () => {
    const labels = {
      'app.kubernetes.io/name': 'training-job',
      'app.kubernetes.io/component': 'worker',
    };

    const array = labelsTransformer.toArray(labels);

    expect(array).toEqual([
      { name: 'app.kubernetes.io/name', value: 'training-job' },
      { name: 'app.kubernetes.io/component', value: 'worker' },
    ]);
  });

  it('should transform array to object', () => {
    const array = [
      { key: 'app.kubernetes.io/name', value: 'training-job' },
      { key: 'app.kubernetes.io/component', value: 'worker' },
    ];

    const labels = labelsTransformer.fromArray(array);

    expect(labels).toEqual({
      'app.kubernetes.io/name': 'training-job',
      'app.kubernetes.io/component': 'worker',
    });
  });
});
