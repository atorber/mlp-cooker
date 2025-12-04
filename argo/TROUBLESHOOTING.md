# Argo Workflows 故障排除

## 常见问题

### 问题1：argo-server CrashLoopBackOff

**症状：**
```
argo-server-xxx   0/1  CrashLoopBackOff
```

**原因：**
argo-server 缺少访问 ConfigMap 的权限。

**错误日志：**
```
configmaps "workflow-controller-configmap" is forbidden: 
User "system:serviceaccount:argo:default" cannot get resource "configmaps"
```

**解决方法：**

1. 应用 RBAC 配置：
```bash
kubectl apply -f argo/argo-server-rbac.yaml
```

2. 更新 argo-server deployment：
```bash
kubectl patch deployment argo-server -n argo -p '{"spec":{"template":{"spec":{"serviceAccountName":"argo-server"}}}}'
```

3. 验证修复：
```bash
kubectl get pods -n argo
# argo-server 应该显示 Running 状态
```

### 问题2：无法访问 Argo UI

**症状：**
无法通过浏览器访问 Argo Workflows UI。

**解决方法：**

#### 方式一：使用 Port Forward

```bash
kubectl -n argo port-forward deployment/argo-server 2746:2746
```

然后访问：http://localhost:2746

#### 方式二：使用 LoadBalancer（如果支持）

```bash
# 检查服务
kubectl get svc argo-server-ui -n argo

# 使用 EXTERNAL-IP 访问
# 例如：http://172.19.0.5:2746
```

#### 方式三：创建 NodePort 服务

```bash
kubectl apply -f argo/argo-ui-service.yaml
```

### 问题3：WorkflowTemplate 提交失败

**症状：**
```bash
kubectl apply -f argo/training-job-template.yaml
# Error: ...
```

**解决方法：**

1. 检查命名空间是否存在：
```bash
kubectl get namespace argo
```

2. 检查 YAML 格式：
```bash
kubectl apply -f argo/training-job-template.yaml --dry-run=client
```

3. 查看详细错误信息：
```bash
kubectl apply -f argo/training-job-template.yaml -v=8
```

### 问题4：Workflow 执行失败

**症状：**
Workflow 提交后失败或一直 Pending。

**诊断步骤：**

1. 查看 Workflow 状态：
```bash
argo get -n argo <workflow-name>
```

2. 查看 Workflow 日志：
```bash
argo logs -n argo <workflow-name>
```

3. 查看详细事件：
```bash
kubectl describe workflow -n argo <workflow-name>
```

4. 查看 Pod 状态：
```bash
kubectl get pods -n argo | grep <workflow-name>
kubectl logs -n argo <pod-name>
```

### 问题5：Python SDK 安装失败

**症状：**
在 training-job-template.yaml 中安装 `bce-python-sdk-next` 失败。

**可能原因：**
- 网络问题
- PyPI 源不可达

**解决方法：**

使用国内镜像源：

修改 training-job-template.yaml 中的安装命令：

```python
subprocess.check_call([
    sys.executable, "-m", "pip", "install", "-q", 
    "bce-python-sdk-next",
    "-i", "https://pypi.tuna.tsinghua.edu.cn/simple"
])
```

### 问题6：Python SDK 依赖缺失

**症状：**
```
ModuleNotFoundError: No module named 'requests'
ModuleNotFoundError: No module named 'dotenv'
```

**原因：**
`bce-python-sdk-next` 依赖 `requests` 和 `python-dotenv` 等模块。

**解决方法：**

模板已更新，同时安装所有必需依赖：

```python
subprocess.check_call([
    sys.executable, "-m", "pip", "install", "-q", 
    "bce-python-sdk-next", "requests", "python-dotenv",
    "-i", "https://pypi.tuna.tsinghua.edu.cn/simple"
])
```

**最佳实践：**

为避免依赖问题，推荐使用预装 SDK 的自定义镜像：

```dockerfile
FROM python:3.10-slim
RUN pip install --no-cache-dir bce-python-sdk-next requests python-dotenv \
    -i https://pypi.tuna.tsinghua.edu.cn/simple
```

构建并推送镜像后，在模板中使用：

```yaml
script:
  image: your-registry/python-bce-sdk:latest
  imagePullPolicy: IfNotPresent
```

### 问题7：任务创建失败（AIHC API 错误）

**症状：**
```
❌ 服务器错误: 400/403/500
错误代码: InvalidParameter/AccessDenied
```

**诊断步骤：**

1. 检查 AK/SK 配置：
```bash
# 如果使用 ConfigMap
kubectl get configmap aihc-config -n argo -o yaml

# 如果使用 Secret
kubectl get secret aihc-secret -n argo -o yaml
```

2. 检查资源池ID和队列ID：
```bash
# 通过 MLP Cooker API 验证
curl http://localhost:5002/api/resources/pools
curl http://localhost:5002/api/resources/queues
```

3. 查看详细错误信息：
```bash
argo logs -n argo @latest
```

### 问题7：workflow-controller 不工作

**症状：**
Workflow 提交后一直处于 Pending 状态。

**解决方法：**

1. 检查 workflow-controller 日志：
```bash
kubectl logs -n argo deployment/workflow-controller
```

2. 检查 ServiceAccount 权限：
```bash
kubectl get sa -n argo
kubectl describe sa argo -n argo
```

3. 重启 workflow-controller：
```bash
kubectl rollout restart deployment/workflow-controller -n argo
```

## 检查清单

使用以下命令检查 Argo Workflows 是否正常运行：

```bash
# 1. 检查命名空间
kubectl get namespace argo

# 2. 检查 Pod 状态（应该都是 Running）
kubectl get pods -n argo

# 3. 检查服务
kubectl get svc -n argo

# 4. 检查 WorkflowTemplate
kubectl get workflowtemplates -n argo

# 5. 检查权限
kubectl auth can-i --list --as=system:serviceaccount:argo:argo-server -n argo

# 6. 测试提交 Workflow
argo submit -n argo --from workflowtemplate/mlp-cooker-training-job \
  --parameter mlp-cooker-api="http://mlp-cooker-backend:5002"

# 7. 查看 Workflow 列表
argo list -n argo
```

## 日志收集

如果需要提交问题报告，请收集以下信息：

```bash
# 1. 集群信息
kubectl version
kubectl cluster-info

# 2. Argo 版本
argo version

# 3. Pod 状态
kubectl get pods -n argo -o wide

# 4. Pod 日志
kubectl logs -n argo deployment/argo-server
kubectl logs -n argo deployment/workflow-controller

# 5. 事件
kubectl get events -n argo --sort-by='.lastTimestamp'

# 6. Workflow 详情（如果有失败的 Workflow）
argo get -n argo <workflow-name>
argo logs -n argo <workflow-name>
```

## 有用的调试命令

```bash
# 查看 argo-server 配置
kubectl get deployment argo-server -n argo -o yaml

# 查看 workflow-controller 配置
kubectl get deployment workflow-controller -n argo -o yaml

# 查看 ConfigMap
kubectl get configmap workflow-controller-configmap -n argo -o yaml

# 删除失败的 Workflow
argo delete -n argo <workflow-name>

# 清理所有已完成的 Workflow
argo delete -n argo --completed

# 重新提交失败的 Workflow
argo resubmit -n argo <workflow-name>
```

## 性能优化

### 1. 加速 Python SDK 安装

在 training-job-template.yaml 中使用国内镜像：

```python
subprocess.check_call([
    sys.executable, "-m", "pip", "install", "-q", 
    "bce-python-sdk-next",
    "-i", "https://mirrors.aliyun.com/pypi/simple/"
])
```

### 2. 使用预装 SDK 的镜像

创建自定义镜像，预装 `bce-python-sdk-next`：

```dockerfile
FROM python:3.10-slim
RUN pip install bce-python-sdk-next -i https://mirrors.aliyun.com/pypi/simple/
```

然后修改模板使用自定义镜像：

```yaml
script:
  image: your-registry/python-bce-sdk:latest
```

## 安全建议

1. **使用 Secret 存储 AK/SK**：

```bash
kubectl create secret generic aihc-credentials -n argo \
  --from-literal=ak='your-access-key' \
  --from-literal=sk='your-secret-key'
```

2. **启用 TLS**：参考 [Argo Server TLS 配置](https://argo-workflows.readthedocs.io/en/latest/tls/)

3. **启用认证**：参考 [Argo Server 认证模式](https://argo-workflows.readthedocs.io/en/latest/argo-server-auth-mode/)

4. **限制命名空间访问**：使用 RBAC 限制 Workflow 可以访问的资源

