import { CreateServiceParams, CreateJobParams, VolumeSpec, ResourceSpec } from '../types/task-common';
import { YamlConfigManager } from '../config/yaml-config';

export class TaskConverter {
    /**
     * 判断是否为新版统一数据结构 (CreateServiceParams)
     * 依据：存在 container 对象且没有 containers 数组
     */
    public static isUnifiedServiceParams(params: any): params is CreateServiceParams {
        return params && typeof params === 'object' && params.container && !params.containers;
    }

    /**
     * 判断是否为新版统一数据结构 (CreateJobParams)
     * 依据：存在 container 对象且没有 jobSpec 对象
     */
    public static isUnifiedJobParams(params: any): params is CreateJobParams {
        return params && typeof params === 'object' && params.container && !params.jobSpec;
    }

    /**
     * 转换为创建服务参数 (SDK格式)
     */
    public static toServiceSDKParams(params: CreateServiceParams): any {
        const yamlConfig = YamlConfigManager.getInstance();
        const mlResourceConfig = yamlConfig.getMLResourceConfig();

        const { container } = params;

        // 转换存储挂载
        const volumeMounts = container.volumes?.map(v => this.convertVolumeToServiceMount(v, mlResourceConfig)) || [];

        // 转换环境变量
        // Service API 需要 map[string]string 格式: { "KEY": "VALUE" }
        const envs: Record<string, string> = {};
        if (container.envs) {
            container.envs.forEach(env => {
                envs[env.name] = env.value;
            });
        }

        return {
            name: params.name,
            description: params.description,
            instanceCount: params.replicas,
            resourcePool: {
                resourcePoolId: params.resourcePoolId || mlResourceConfig.poolId,
                queueName: params.queueName || mlResourceConfig.queueId,
            },
            containers: [
                {
                    name: params.name, // 默认容器名与服务名一致
                    image: {
                        imageUrl: container.image,
                    },
                    resources: {
                        cpus: container.resources.cpus,
                        memory: container.resources.memory,
                        acceleratorCount: container.resources.gpu?.count || 0,
                    },
                    command: container.command,
                    args: container.args,
                    envs: envs,
                    ports: params.ports,
                    volumeMounts: volumeMounts,
                }
            ],
            log: params.logConfig,
            misc: {
                podLabels: params.labels,
                podAnnotations: params.annotations,
            },
        };
    }

    /**
     * 转换为创建训练任务参数 (SDK格式)
     */
    public static toJobSDKParams(params: CreateJobParams): any {
        const yamlConfig = YamlConfigManager.getInstance();
        const mlResourceConfig = yamlConfig.getMLResourceConfig();

        const { container } = params;

        // 转换数据源
        const datasources = container.volumes?.map(v => this.convertVolumeToJobDatasource(v, mlResourceConfig)) || [];

        // 转换环境变量
        // Job API 也可能需要 map[string]string 格式
        const envs: Record<string, string> = {};
        if (container.envs) {
            container.envs.forEach(env => {
                envs[env.name] = env.value;
            });
        }

        return {
            name: params.name,
            description: params.description,
            queue: params.queueName || mlResourceConfig.queueId,
            jobSpec: {
                image: container.image,
                command: container.command ? container.command.join(' ') : undefined, // Job API 可能需要字符串
                envs: envs,
                resources: {
                    cpu: container.resources.cpus,
                    memory: container.resources.memory,
                    gpu: container.resources.gpu?.count || 0,
                }
            },
            datasources: datasources,
            replica: params.replicas,
            priority: params.priority,
            maxRetries: params.maxRetries,
            timeout: params.timeout,
        };
    }

    private static convertVolumeToServiceMount(vol: VolumeSpec, config: any): any {
        const mount: any = {
            name: vol.name || 'data', // 需确保唯一，若未指定则给默认值
            mountPath: vol.mountPath,
            readOnly: vol.readOnly || false,
        };

        if (vol.type === 'PFS') {
            // Service API 对 PFS 的定义可能在 volumeMounts 里或外层 volumes
            // 这里假设直接在 volumeMounts 里定义源信息 (根据 ServiceController 现有逻辑推断)
            // 但通常 K8s 风格是 volumes 定义源，volumeMounts 引用 name
            // 现有 ServiceController 逻辑似乎没有显式处理 volumes 数组，而是直接在 containers 里
            // 我们参考 ServiceController 中的逻辑：
            // 现有逻辑没有显式转换 volumes，可能是直接透传。
            // 我们这里按通用逻辑处理，假设 Service API 支持在 volumeMounts 中指定 source
            // 或者我们需要构造外层的 volumes 数组。
            // 鉴于 AIHC API 的复杂性，这里先按最通用的方式：
            // 如果是 PFS，通常需要 instanceId
            // 如果是 BOS，需要 bucket
        }

        // 由于 ServiceController 现有代码中没有详细的 volume 处理逻辑 (只看到 datasources 处理逻辑在 JobController)，
        // 我们暂时透传 type 和 sourcePath，具体字段需根据实际 API 调整。
        // 假设 Service API 结构：
        /*
          volumeMounts: [{
            name: "pfs-vol",
            mountPath: "/data",
            readOnly: false,
            pfs: { instanceId: "xxx", mountPath: "/" }
          }]
        */

        if (vol.type === 'PFS') {
            mount.pfs = {
                instanceId: vol.name || config.pfsInstanceId,
                mountPath: vol.sourcePath
            };
        } else if (vol.type === 'BOS') {
            mount.bos = {
                bucket: vol.name || config.bucket,
                subPath: vol.sourcePath
            };
        } else if (vol.type === 'HOST_PATH') {
            mount.hostPath = {
                path: vol.sourcePath
            };
        }

        return mount;
    }

    private static convertVolumeToJobDatasource(vol: VolumeSpec, config: any): any {
        return {
            type: vol.type.toLowerCase(), // pfs, bos, hostPath
            name: vol.name || (vol.type === 'PFS' ? config.pfsInstanceId : ''),
            sourcePath: vol.sourcePath,
            mountPath: vol.mountPath,
            options: {
                readOnly: vol.readOnly ? 'true' : 'false'
            }
        };
    }
}
