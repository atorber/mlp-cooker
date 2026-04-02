# Argo Workflows UI 访问指南

## 访问方式

### 方式一：端口转发（推荐，适用于本地开发）

这是最简单和最可靠的访问方式，适用于任何环境：

```bash
kubectl port-forward -n argo svc/argo-server 2746:2746
```

然后在浏览器中访问：**http://localhost:2746**

按 `Ctrl+C` 可以停止端口转发。

### 方式二：NodePort

如果您的集群支持 NodePort：

```bash
# 查看 NodePort
kubectl get svc -n argo

# 使用 NodePort 访问
# http://<节点IP>:<NodePort>
```

### 方式三：LoadBalancer（仅云环境）

如果您的集群运行在云环境（如阿里云、AWS、GCP）并支持 LoadBalancer：

```bash
# 查看 EXTERNAL-IP
kubectl get svc argo-server-ui -n argo

# 使用 EXTERNAL-IP 访问
# http://<EXTERNAL-IP>:2746
```

**注意**：
- 在 Docker Desktop、Minikube、Kind 等本地集群中，LoadBalancer 的 EXTERNAL-IP（如 172.19.0.5）通常无法直接从宿主机访问
- 这些 IP 是集群内部 IP，仅在集群内部可用

### 方式四：Ingress（生产环境推荐）

如果您的集群安装了 Ingress Controller（如 Nginx Ingress）：

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argo-server-ingress
  namespace: argo
spec:
  rules:
    - host: argo.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: argo-server
                port:
                  number: 2746
```

## 环境检测

### 检查您的 Kubernetes 环境

```bash
# 查看集群信息
kubectl cluster-info

# 查看节点信息
kubectl get nodes -o wide

# 查看服务
kubectl get svc -n argo
```

### 不同环境的推荐访问方式

| 环境 | 推荐方式 | 访问地址 |
|------|---------|---------|
| Docker Desktop | 端口转发 | http://localhost:2746 |
| Minikube | `minikube service` | 自动打开浏览器 |
| Kind | 端口转发 | http://localhost:2746 |
| 阿里云 ACK | LoadBalancer | http://公网IP:2746 |
| AWS EKS | LoadBalancer | http://ELB-DNS:2746 |
| 自建集群 | Ingress/NodePort | 根据配置 |

## 当前环境检测结果

根据您的集群信息：

```
节点名称: desktop-control-plane
环境类型: Docker Desktop (本地 Kubernetes)
```

**推荐访问方式：端口转发**

```bash
# 启动端口转发
kubectl port-forward -n argo svc/argo-server 2746:2746

# 在浏览器访问
http://localhost:2746
```

## 使用 Argo CLI

除了 Web UI，您也可以使用 Argo CLI：

### 安装 Argo CLI

```bash
# macOS
brew install argo

# 或下载二进制文件
curl -sLO https://github.com/argoproj/argo-workflows/releases/download/v3.7.4/argo-darwin-amd64.gz
gunzip argo-darwin-amd64.gz
chmod +x argo-darwin-amd64
sudo mv argo-darwin-amd64 /usr/local/bin/argo
```

### 使用 CLI 管理 Workflow

```bash
# 查看工作流列表
argo list -n argo

# 查看工作流详情
argo get -n argo <workflow-name>

# 查看工作流日志
argo logs -n argo <workflow-name>

# 提交工作流
argo submit -n argo workflow.yaml

# 删除工作流
argo delete -n argo <workflow-name>
```

## 界面语言

Argo Workflows UI 目前**仅支持英文界面**，官方尚未提供中文语言包。

### 临时解决方案

1. **使用浏览器翻译**
   - Chrome/Edge：右键点击页面 → 翻译成中文
   - Safari：点击地址栏的翻译图标

2. **使用 Argo CLI**（支持中文终端输出）
   ```bash
   argo list -n argo
   argo get -n argo <workflow-name>
   ```

3. **使用 MLP Cooker 前端**
   - MLP Cooker 提供了中文界面
   - 访问：http://localhost:8000
   - 包含训练任务的创建、查看和管理功能

### 贡献翻译

如果您希望为 Argo Workflows 添加中文支持：
- GitHub 仓库：https://github.com/argoproj/argo-workflows
- 可以提交 PR 添加国际化（i18n）支持

## 快速测试

运行以下命令测试 Argo Workflows 是否正常工作：

```bash
# 1. 启动端口转发（在后台）
kubectl port-forward -n argo svc/argo-server 2746:2746 &

# 2. 等待几秒
sleep 3

# 3. 访问 API（测试连接）
curl http://localhost:2746/api/v1/workflows/argo

# 4. 在浏览器中打开
open http://localhost:2746
```

或使用快速访问脚本：

```bash
./argo/open-ui.sh
```

## 故障排除

如果端口转发失败：

```bash
# 检查端口是否被占用
lsof -i :2746

# 使用其他端口
kubectl port-forward -n argo svc/argo-server 8080:2746
# 然后访问：http://localhost:8080
```

如果浏览器无法访问：

```bash
# 检查 argo-server 是否运行
kubectl get pods -n argo -l app=argo-server

# 查看日志
kubectl logs -n argo -l app=argo-server

# 重启 argo-server
kubectl rollout restart deployment/argo-server -n argo
```

