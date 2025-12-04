#!/bin/bash

# Argo Workflows UI 快速访问脚本

echo "🚀 启动 Argo Workflows UI"
echo "================================"

# 检查 argo-server 是否运行
if ! kubectl get deployment argo-server -n argo &> /dev/null; then
    echo "❌ argo-server 未安装或不在 argo 命名空间中"
    exit 1
fi

# 检查 Pod 状态
POD_STATUS=$(kubectl get pods -n argo -l app=argo-server -o jsonpath='{.items[0].status.phase}')
if [ "$POD_STATUS" != "Running" ]; then
    echo "❌ argo-server Pod 未运行，当前状态: $POD_STATUS"
    echo "请检查 Pod 日志："
    echo "kubectl logs -n argo -l app=argo-server"
    exit 1
fi

echo "✅ argo-server 运行正常"
echo ""
echo "正在启动端口转发..."
echo "访问地址: http://localhost:2746"
echo ""
echo "💡 提示："
echo "  - 端口转发运行期间请保持此终端窗口打开"
echo "  - 按 Ctrl+C 可以停止端口转发"
echo "  - 浏览器会自动打开 Argo UI"
echo ""

# 等待1秒
sleep 1

# 在后台启动端口转发
kubectl port-forward -n argo svc/argo-server 2746:2746 &
PF_PID=$!

# 等待端口转发就绪
sleep 2

# 检查端口转发是否成功
if ! kill -0 $PF_PID 2>/dev/null; then
    echo "❌ 端口转发启动失败"
    exit 1
fi

echo "✅ 端口转发已启动"

# 尝试打开浏览器
if command -v open &> /dev/null; then
    echo "正在打开浏览器..."
    open http://localhost:2746
elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:2746
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Argo UI 已启动"
echo "  访问地址: http://localhost:2746"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 等待用户中断
wait $PF_PID

