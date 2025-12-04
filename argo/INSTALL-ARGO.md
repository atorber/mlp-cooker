# Argo Workflows 安装指南

## 快速安装

### 1. 安装 Argo Workflows

```bash
# 创建命名空间
kubectl create namespace argo

# 安装 Argo Workflows
kubectl apply -n argo -f https://github.com/argoproj/argo-workflows/releases/download/v3.7.4/install.yaml
```

### 2. 配置 RBAC 权限（必需）

```bash
kubectl apply -f argo/argo-server-rbac.yaml
```

### 3. 配置 LoadBalancer 服务（可选）

```bash
kubectl apply -f argo/argo-ui-service.yaml
```

### 4. 验证安装

```bash
# 检查 Pod 状态
kubectl get pods -n argo

# 应该看到：
# argo-server-xxx         1/1  Running
# workflow-controller-xxx 1/1  Running
```

## 解决镜像拉取问题

### 问题：ImagePullBackOff

如果遇到镜像拉取失败，请按以下步骤解决：

#### 方法一：预拉取镜像（推荐）

```bash
# 在本地拉取镜像
docker pull python:3.10-slim

# 验证镜像
docker images | grep python
```

如果 Docker 可以拉取成功，Kubernetes 应该也能访问。

#### 方法二：使用镜像加速器

**Docker Desktop 配置：**

1. 打开 Docker Desktop
2. 进入 Settings → Docker Engine
3. 添加镜像加速配置：

```json
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com"
  ]
}
```

4. 点击 "Apply & Restart"

#### 方法三：手动加载镜像到集群

```bash
# 1. 在本地拉取镜像
docker pull python:3.10-slim

# 2. 保存镜像
docker save python:3.10-slim -o python-3.10-slim.tar

# 3. 加载到 Kind/K3s 集群（如果使用）
kind load docker-image python:3.10-slim --name your-cluster-name

# 或者导入到 Minikube
minikube image load python:3.10-slim

# 或者导入到 Docker Desktop Kubernetes（自动共享）
# Docker Desktop 的 Kubernetes 会自动使用本地 Docker 镜像
```

#### 方法四：创建 ImagePullSecret（如果需要认证）

```bash
kubectl create secret docker-registry regcred \
  --docker-server=registry.cn-hangzhou.aliyuncs.com \
  --docker-username=your-username \
  --docker-password=your-password \
  -n argo
```

然后在模板中添加：

```yaml
spec:
  imagePullSecrets:
    - name: regcred
```

## 提交训练任务模板

安装完成后，提交 WorkflowTemplate：

```bash
# 方式一：使用官方镜像（如果网络良好）
kubectl apply -f argo/training-job-template.yaml

# 方式二：使用国内镜像优化版本
kubectl apply -f argo/training-job-template-cn.yaml

# 方式三：使用 MLP Cooker API 版本（推荐，不依赖外部镜像）
kubectl apply -f argo/training-job-via-api.yaml
```

## 验证 WorkflowTemplate

```bash
# 查看已提交的模板
kubectl get workflowtemplates -n argo

# 应该看到：
# NAME                    AGE
# aihc-training-job       1m
# aihc-training-job-cn    1m
# mlp-cooker-training-job 1m
```

## 测试提交任务

### 使用 MLP Cooker API 版本（推荐）

```bash
argo submit -n argo argo/examples/pytorch-training-example.yaml
```

这个版本不需要拉取外部 Python 镜像，直接使用 curl 镜像调用 MLP Cooker API。

### 使用 Python SDK 版本

```bash
# 确保 python:3.10-slim 镜像已存在
docker pull python:3.10-slim

# 提交任务
argo submit -n argo --from workflowtemplate/aihc-training-job \
  --parameter aihc-ak="your-ak" \
  --parameter aihc-sk="your-sk" \
  --parameter resource-pool-id="your-pool-id" \
  --parameter queue-id="your-queue-id"
```

## 推荐方案

对于国内用户，推荐使用以下方案：

### 方案一：使用 MLP Cooker API（最简单）

1. 确保 MLP Cooker 后端服务已部署
2. 使用 `training-job-via-api.yaml` 模板
3. 只需要 curl 镜像（体积小，拉取快）

```bash
kubectl apply -f argo/training-job-via-api.yaml
argo submit -n argo argo/examples/pytorch-training-example.yaml
```

### 方案二：预拉取镜像 + Python SDK

1. 预先拉取 Python 镜像
2. 使用 `training-job-template.yaml`

```bash
# 拉取并加载镜像
docker pull python:3.10-slim

# 提交模板
kubectl apply -f argo/training-job-template.yaml

# 提交任务
argo submit -n argo --from workflowtemplate/aihc-training-job ...
```

## 检查镜像是否可用

```bash
# 方法一：在集群中创建测试 Pod
kubectl run test-python --image=python:3.10-slim --rm -it --restart=Never -- python --version

# 方法二：检查 Docker 本地镜像
docker images | grep python

# 方法三：检查节点镜像缓存
kubectl get nodes
kubectl debug node/docker-desktop -it --image=alpine -- sh
# 在 debug 容器中：crictl images | grep python
```

## 故障排除

如果问题仍然存在：

1. 检查 Docker Desktop Kubernetes 设置
2. 重启 Docker Desktop
3. 清理并重新拉取镜像
4. 使用 `training-job-via-api.yaml`（推荐，避免镜像问题）

## 参考文档

- [Argo Workflows 官方文档](https://argo-workflows.readthedocs.io/)
- [Kubernetes ImagePullBackOff 故障排除](https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/)
- [Docker 镜像加速器配置](https://www.docker.com/blog/speed-up-your-development-flow-with-these-dockerfile-best-practices/)

