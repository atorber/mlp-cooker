# Argo Workflows 训练任务模板

本目录包含用于 Argo Workflows 的训练任务模板，可以通过 Argo 编排调用百度百舸平台的训练任务接口。

## 模板说明

本目录提供两种Argo Workflows模板：

### 1. training-job-template.yaml（使用Python SDK调用AIHC API）

使用百度云Python SDK（`bce-python-sdk-next`）直接调用百度百舸平台的训练任务接口。

**优点**：
- 直接与AIHC平台通信
- 使用官方SDK，自动处理签名认证
- 完整的错误处理
- 不依赖MLP Cooker后端

**缺点**：
- 需要配置AK/SK等敏感信息
- 每次执行需要安装Python SDK（约10秒）

### 2. training-job-via-api.yaml（通过MLP Cooker后端API，推荐）

通过调用MLP Cooker后端API来创建训练任务。

**优点**：
- 简单易用，无需处理签名
- 统一的认证和配置管理
- 可以利用MLP Cooker的所有功能

**缺点**：
- 依赖MLP Cooker后端服务

**推荐使用**：`training-job-via-api.yaml`

## 使用方式

### 1. 安装 Argo Workflows

如果您的 Kubernetes 集群还没有安装 Argo Workflows：

```bash
kubectl create namespace argo
kubectl apply -n argo -f https://github.com/argoproj/argo-workflows/releases/latest/download/install.yaml
```

### 1.1 配置 RBAC 权限（必需）

安装后需要配置 argo-server 的 RBAC 权限：

```bash
kubectl apply -f argo/argo-server-rbac.yaml
```

### 1.2 检查服务状态

```bash
# 检查所有Pod状态
kubectl get pods -n argo

# 应该看到类似输出：
# NAME                                   READY   STATUS    RESTARTS   AGE
# argo-server-xxx                        1/1     Running   0          1m
# workflow-controller-xxx                1/1     Running   0          1m

# 检查服务
kubectl get svc -n argo

# 访问Argo UI

# 方式一：端口转发（推荐，适用于本地开发）
kubectl port-forward -n argo svc/argo-server 2746:2746
# 然后访问：http://localhost:2746

# 方式二：使用LoadBalancer IP（仅适用于云环境或支持LoadBalancer的集群）
# 查看EXTERNAL-IP
kubectl get svc argo-server-ui -n argo
# 访问：http://<EXTERNAL-IP>:2746
# 注意：在Docker Desktop等本地环境中，EXTERNAL-IP可能无法直接访问
```

### 2. 部署MLP Cooker后端服务到Kubernetes（如果还没有）

```bash
# 创建ConfigMap存储配置
kubectl create configmap mlp-cooker-config \
  --from-file=config.yaml=../config.yaml

# 部署后端服务（假设您已有Deployment配置）
kubectl apply -f k8s/mlp-cooker-backend-deployment.yaml
```

### 3. 提交 WorkflowTemplate

```bash
# 提交模板（推荐使用via-api版本）
kubectl apply -f argo/training-job-via-api.yaml

# 或者提交直接调用版本
kubectl apply -f argo/training-job-template-cn.yaml

```

### 4. 创建训练任务

#### 方式一：使用示例文件（推荐）

```bash
# PyTorch训练任务
argo submit -n argo argo/examples/pytorch-training-example.yaml

# TensorFlow训练任务
argo submit -n argo argo/examples/tensorflow-training-example.yaml

# DeepSpeed大模型训练
argo submit -n argo argo/examples/deepspeed-training-example.yaml
```

#### 方式二：使用命令行参数

```bash
argo submit -n argo --from workflowtemplate/mlp-cooker-training-job \
  --parameter mlp-cooker-api="http://mlp-cooker-backend:5002" \
  --parameter task-params='{"name":"my-job","jobType":"PyTorchJob","command":"python train.py","jobSpec":{"replicas":1,"image":"registry.baidubce.com/aihc-aiak/pytorch:latest","resources":[],"envs":[],"enableRDMA":true}}'
```

#### 方式三：使用参数文件

```bash
# 编辑配置文件
cp argo/examples/config-example.json my-config.json
vi my-config.json

# 提交任务
argo submit -n argo --from workflowtemplate/mlp-cooker-training-job \
  --parameter-file my-config.json
```

### 5. 查看任务状态

```bash
# 查看所有工作流
argo list -n argo

# 查看最新工作流
argo get -n argo @latest

# 查看工作流日志
argo logs -n argo @latest

# 查看特定工作流
argo get -n argo <workflow-name>
argo logs -n argo <workflow-name>
```

### 6. 管理任务

```bash
# 删除工作流
argo delete -n argo <workflow-name>

# 重新提交工作流
argo resubmit -n argo <workflow-name>

# 停止运行中的工作流
argo stop -n argo <workflow-name>
```

## 模板参数说明

### training-job-template.yaml 参数（使用Python SDK）

#### 必填参数

| 参数名 | 描述 | 示例 |
|--------|------|------|
| `job-name` | 训练任务名称 | `pytorch-training-job` |
| `job-type` | 任务类型 | `PyTorchJob`, `TensorFlowJob` |
| `command` | 启动命令 | `python train.py` |
| `image` | 训练镜像地址 | `registry.baidubce.com/aihc-aiak/pytorch:latest` |
| `aihc-ak` | AIHC Access Key | - |
| `aihc-sk` | AIHC Secret Key | - |
| `resource-pool-id` | 资源池ID | - |
| `queue-id` | 队列ID | - |

**依赖说明**：
- 使用 `bce-python-sdk-next` Python包
- 自动在容器中安装，首次执行需要约10秒

### 可选参数

| 参数名 | 描述 | 默认值 |
|--------|------|--------|
| `replicas` | 副本数量 | `1` |
| `enable-rdma` | 是否启用RDMA | `true` |
| `aihc-base-url` | AIHC API地址 | `https://aihc.bj.baidubce.com` |
| `pfs-instance-id` | PFS实例ID | - |
| `bucket` | BOS存储桶 | - |
| `envs` | 环境变量（JSON格式） | NCCL配置 |
| `datasources` | 数据源配置（JSON格式） | PFS挂载 |

## 环境变量配置

环境变量使用 JSON 数组格式：

```json
[
  {
    "name": "NCCL_DEBUG",
    "value": "INFO"
  },
  {
    "name": "NCCL_IB_DISABLE",
    "value": "0"
  },
  {
    "name": "MASTER_ADDR",
    "value": "localhost"
  }
]
```

## 数据源配置

数据源配置使用 JSON 数组格式：

### PFS 数据源

```json
[
  {
    "type": "pfs",
    "sourcePath": "/",
    "mountPath": "/data",
    "readOnly": false
  }
]
```

### BOS 数据源

```json
[
  {
    "type": "bos",
    "sourcePath": "my-bucket/data/",
    "mountPath": "/data",
    "readOnly": true
  }
]
```

### 混合数据源

```json
[
  {
    "type": "pfs",
    "sourcePath": "/",
    "mountPath": "/workspace"
  },
  {
    "type": "bos",
    "sourcePath": "my-bucket/datasets/",
    "mountPath": "/data",
    "readOnly": true
  }
]
```

## 任务类型说明

### PyTorchJob

使用 PyTorch 分布式训练框架：

```bash
argo submit -n argo --from workflowtemplate/aihc-training-job \
  --parameter job-type="PyTorchJob" \
  --parameter command="torchrun --nproc_per_node=8 train.py"
```

### TensorFlowJob

使用 TensorFlow 分布式训练框架：

```bash
argo submit -n argo --from workflowtemplate/aihc-training-job \
  --parameter job-type="TensorFlowJob" \
  --parameter command="python train.py"
```

## 与 MLP Cooker 后端接口的对应关系

| Argo 模板 | 调用方式 | SDK/API |
|-----------|---------|---------|
| `training-job-template.yaml` | 直接调用AIHC API | Python: `aihc_client.job.CreateJob()` |
| `training-job-via-api.yaml` | 通过MLP Cooker后端 | `POST /api/jobs/create` → `AihcSDK.createJob()` |

### 实现参考

#### Python SDK实现（training-job-template.yaml）

```python
from baidubce.services.aihc.aihc_client import AihcClient
from baidubce.bce_client_configuration import BceClientConfiguration
from baidubce.auth.bce_credentials import BceCredentials

# 配置客户端
config = BceClientConfiguration(
    credentials=BceCredentials(aihc_ak, aihc_sk),
    endpoint='aihc.bj.baidubce.com'
)

# 创建客户端
aihc_client = AihcClient(config)

# 调用CreateJob接口
response = aihc_client.job.CreateJob(
    resourcePoolId=resource_pool_id,
    queueID=queue_id,
    body=job_params
)
```

对应 `backend/src/utils/sdk/aihc.sdk.ts` 中的 `createJob()` 方法。

## 参考文档

- [Argo Workflows 官方文档](https://argoproj.github.io/argo-workflows/)
- [百度百舸平台 API 文档](../../pages/docs/API参考/API-训练任务.md)
- [MLP Cooker 应用模板](../../backend/data/app/README.md)
- [训练任务接口实现](../../backend/src/utils/sdk/aihc.sdk.ts)

## 高级用法

### 1. 串联多个训练任务

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: multi-stage-training-
spec:
  entrypoint: multi-stage-training
  
  templates:
    - name: multi-stage-training
      steps:
        # 第一阶段：预训练
        - - name: pretrain
            templateRef:
              name: aihc-training-job
              template: create-training-job
            arguments:
              parameters:
                - name: job-name
                  value: "pretrain-stage"
                - name: command
                  value: "python pretrain.py"
        
        # 第二阶段：微调
        - - name: finetune
            templateRef:
              name: aihc-training-job
              template: create-training-job
            arguments:
              parameters:
                - name: job-name
                  value: "finetune-stage"
                - name: command
                  value: "python finetune.py"
```

### 2. 带条件的训练流程

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: conditional-training-
spec:
  entrypoint: conditional-training
  
  templates:
    - name: conditional-training
      steps:
        # 数据验证
        - - name: validate-data
            template: data-validation
        
        # 根据验证结果决定是否训练
        - - name: train-model
            templateRef:
              name: aihc-training-job
              template: create-training-job
            when: "{{steps.validate-data.outputs.result}} == 'valid'"
```

### 3. 并行训练多个模型

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: parallel-training-
spec:
  entrypoint: parallel-training
  
  templates:
    - name: parallel-training
      steps:
        - - name: train-model-a
            templateRef:
              name: aihc-training-job
              template: create-training-job
            arguments:
              parameters:
                - name: job-name
                  value: "model-a-training"
          
          - name: train-model-b
            templateRef:
              name: aihc-training-job
              template: create-training-job
            arguments:
              parameters:
                - name: job-name
                  value: "model-b-training"
```

## 故障排除

### 问题1：任务创建失败

检查参数配置是否正确：
```bash
argo logs -n argo @latest
```

### 问题2：认证失败

确认 AK/SK 配置正确：
```bash
kubectl get configmap aihc-config -n argo -o yaml
```

### 问题3：资源池或队列不存在

验证资源池ID和队列ID是否正确：
```bash
# 使用 MLP Cooker API 查询
curl http://localhost:5002/api/resources/pools
curl http://localhost:5002/api/resources/queues
```

## 最佳实践

1. **使用 Secret 存储敏感信息**：将 AK/SK 存储在 Kubernetes Secret 中
2. **使用 ConfigMap 存储配置**：将资源池ID、队列ID等配置存储在 ConfigMap 中
3. **设置资源限制**：为 Argo Workflow 容器设置合理的资源限制
4. **启用日志持久化**：配置日志持久化以便调试
5. **使用标签组织任务**：为 Workflow 添加标签便于管理

## 示例：完整的训练流程

```bash
# 1. 准备配置
kubectl create namespace argo
kubectl create configmap aihc-config -n argo \
  --from-literal=ak="your-ak" \
  --from-literal=sk="your-sk" \
  --from-literal=resource-pool-id="your-pool-id" \
  --from-literal=queue-id="your-queue-id"

# 2. 提交模板
kubectl apply -f argo/training-job-template.yaml

# 3. 创建训练任务
argo submit -n argo --from workflowtemplate/aihc-training-job \
  --parameter job-name="my-pytorch-training" \
  --parameter command="python train.py --lr 0.001 --epochs 100" \
  --parameter replicas="4" \
  --parameter-file config.json

# 4. 查看任务状态
argo list -n argo
argo get -n argo @latest
argo logs -n argo @latest
```

