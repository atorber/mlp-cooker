/**
 * 资源规格
 * 用途：统一描述训练任务和在线服务的计算资源需求
 */
export interface ResourceSpec {
    cpus: number;              // CPU 核数 (单位：核)
    memory: number;            // 内存大小 (单位：GB)
    gpu?: {
        type?: string;           // GPU 卡型 (可选，如 "V100", "A100")
        count: number;           // GPU 数量 (单位：张)
    };
}

/**
 * 环境变量
 * 用途：统一描述容器的环境变量
 */
export interface EnvVar {
    name: string;              // 变量名
    value: string;             // 变量值
}

/**
 * 存储卷配置
 * 用途：统一描述 PFS、BOS 或 HostPath 的挂载信息
 */
export interface VolumeSpec {
    type: 'PFS' | 'BOS' | 'HOST_PATH'; // 存储类型
    name?: string;             // 资源名称 (PFS 实例ID 或 BOS Bucket 名，可选，可从配置读取)
    sourcePath: string;        // 源路径 (例如 / 或 /data)
    mountPath: string;         // 容器内挂载路径
    readOnly?: boolean;        // 是否只读 (默认 false)
}

/**
 * 容器配置
 * 用途：统一描述运行的容器信息
 */
export interface ContainerSpec {
    image: string;               // 镜像地址
    command?: string[];          // 启动命令 (数组格式)
    args?: string[];             // 启动参数 (数组格式)
    envs?: EnvVar[];             // 环境变量列表
    volumes?: VolumeSpec[];      // 存储挂载列表
    resources: ResourceSpec;     // 资源规格
}

/**
 * 创建服务参数
 */
export interface CreateServiceParams {
    name: string;                // 服务名称
    description?: string;        // 描述
    resourcePoolId?: string;     // 资源池 ID
    queueName?: string;          // 队列名称

    replicas: number;            // 实例数
    container: ContainerSpec;    // 容器配置 (Service 通常只有一个主容器)

    ports?: Array<{              // Service 特有的网络配置
        port: number;
        protocol?: 'TCP' | 'UDP';
        name?: string;
    }>;

    logConfig?: {                // 日志配置
        persistent: boolean;
    };
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
}

/**
 * 创建训练任务参数
 */
export interface CreateJobParams {
    name: string;                // 任务名称
    description?: string;        // 描述
    resourcePoolId?: string;     // 资源池 ID
    queueName?: string;          // 队列名称

    replicas: number;            // 节点数/并发数
    container: ContainerSpec;    // 容器配置 (Job 通常也是单容器模型)

    // Job 特有的配置
    priority?: string;           // 优先级
    maxRetries?: number;         // 最大重试次数
    timeout?: number;            // 超时时间
}
