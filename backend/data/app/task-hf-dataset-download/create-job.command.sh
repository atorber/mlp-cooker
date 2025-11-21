#!/bin/bash
#
# HuggingFace 数据集下载脚本
# 
# 功能：
#   1. 从 DATASET_URL 解析镜像站地址和数据集名称
#   2. 安装 huggingface_hub 并下载数据集
#
# 环境变量：
#   - DATASET_URL: 数据集 URL（必需，如果未提供 dataset_name）
#   - dataset_name: 数据集名称（可选，如果 DATASET_URL 中无法提取）
#   - save_path: 保存路径（可选，默认根据 URL 自动生成）
#   - DEBUG: 调试模式（可选，设置为 1 启用详细输出）
#
# 支持的 URL 格式：
#   1. 完整URL: https://hf-mirror.com/datasets/username/dataset-name
#   2. 完整URL: https://huggingface.co/datasets/username/dataset-name
#   3. 镜像站地址: https://hf-mirror.com（需要单独提供 dataset_name）
#

set -euo pipefail  # 严格模式：遇到错误立即退出，未定义变量报错，管道失败立即退出

# 颜色输出（如果支持）
if [ -t 1 ]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  BLUE='\033[0;34m'
  NC='\033[0m' # No Color
else
  RED='' GREEN='' YELLOW='' BLUE='' NC=''
fi

# 日志函数
log_info() {
  echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $*"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $*" >&2
}

log_debug() {
  [ "${DEBUG:-0}" = "1" ] && echo -e "${YELLOW}[DEBUG]${NC} $*" >&2
}

# 清理字符串：去除首尾空白字符
trim_string() {
  echo "$1" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'
}

# 规范化路径：移除多余斜杠和路径后缀
normalize_path() {
  local path="$1"
  # 移除开头的 / 和 datasets/ 前缀
  path=$(echo "$path" | sed -e 's|^/||' -e 's|^datasets/||')
  # 移除 GitHub 风格的路径后缀（/tree/xxx, /blob/xxx 等）
  path=$(echo "$path" | sed -e 's|/tree/[^/]*$||' -e 's|/blob/[^/]*$||' -e 's|/tree/[^/]*/.*$||' -e 's|/blob/[^/]*/.*$||')
  # 移除末尾的 /
  path=$(echo "$path" | sed -e 's|/$||')
  echo "$path"
}

# 解析 URL，提取主机名和路径
parse_url() {
  local url="$1"
  local host=""
  local path=""
  
  if [[ "$url" =~ ^https?://([^/]+)(.*)$ ]]; then
    host="${BASH_REMATCH[1]}"
    path="${BASH_REMATCH[2]}"
  fi
  
  echo "$host|$path"
}

# 判断是否为镜像站
is_mirror_site() {
  local host="$1"
  [[ "$host" =~ hf-mirror ]] || [[ "$host" != "huggingface.co" ]]
}

# 主逻辑开始
log_info "Starting HuggingFace dataset download script..."

# 初始化变量
HF_ENDPOINT=""
REPO_ID=""
SAVE_PATH="${save_path:-}"

# 处理 DATASET_URL
if [ -n "${DATASET_URL:-}" ]; then
  DATASET_URL=$(trim_string "$DATASET_URL")
  log_debug "DATASET_URL: $DATASET_URL"
  
  # 解析 URL
  url_parts=$(parse_url "$DATASET_URL")
  if [ -n "$url_parts" ] && [ "$url_parts" != "|" ]; then
    HOST="${url_parts%%|*}"
    URL_PATH="${url_parts#*|}"
    
    log_debug "Parsed HOST: $HOST, URL_PATH: $URL_PATH"
    
    # 设置镜像站地址
    if is_mirror_site "$HOST"; then
      HF_ENDPOINT="https://$HOST"
      log_debug "Detected mirror site: $HF_ENDPOINT"
    else
      log_debug "Using official HuggingFace site"
    fi
    
    # 从路径中提取数据集名称
    if [ -n "$URL_PATH" ]; then
      normalized_path=$(normalize_path "$URL_PATH")
      if [ -n "$normalized_path" ]; then
        REPO_ID="$normalized_path"
        log_debug "Extracted REPO_ID from URL: $REPO_ID"
      fi
    fi
  else
    # URL 格式不正确，尝试直接作为镜像站地址
    log_warning "Invalid URL format, treating as mirror endpoint"
    if is_mirror_site "$DATASET_URL" || [[ "$DATASET_URL" != *"huggingface.co"* ]]; then
      HF_ENDPOINT="$DATASET_URL"
      log_debug "Using DATASET_URL as mirror endpoint: $HF_ENDPOINT"
    fi
  fi
  
  # 导出 HF_ENDPOINT（如果不为空）
  if [ -n "$HF_ENDPOINT" ]; then
    export HF_ENDPOINT
    log_info "Using mirror endpoint: $HF_ENDPOINT"
  else
    log_info "Using default HuggingFace endpoint (https://huggingface.co)"
  fi
fi

# 处理数据集名称：优先使用从 URL 提取的，其次使用环境变量
if [ -z "$REPO_ID" ] && [ -n "${dataset_name:-}" ]; then
  REPO_ID=$(trim_string "${dataset_name}")
  log_debug "Using dataset_name from environment: $REPO_ID"
fi

# 验证数据集名称
if [ -z "$REPO_ID" ]; then
  log_error "Cannot extract dataset name from DATASET_URL and dataset_name is not set"
  echo "Usage examples:"
  echo "  DATASET_URL=https://hf-mirror.com/datasets/username/dataset-name"
  echo "  DATASET_URL=https://huggingface.co/datasets/username/dataset-name"
  echo "  dataset_name=username/dataset-name (requires DATASET_URL for mirror endpoint)"
  exit 1
fi

# 导出 REPO_ID
export REPO_ID
log_info "Dataset repository: $REPO_ID"

# 生成默认保存路径（如果未指定）
if [ -z "$SAVE_PATH" ] && [ -n "${DATASET_URL:-}" ]; then
  url_parts=$(parse_url "$DATASET_URL")
  if [ -n "$url_parts" ] && [ "$url_parts" != "|" ]; then
    HOST="${url_parts%%|*}"
    # 将 REPO_ID 中的 / 替换为 -，作为目录名
    dataset_dir=$(echo "$REPO_ID" | sed 's|/|-|g')
    SAVE_PATH="/data/$HOST/$dataset_dir"
    export save_path="$SAVE_PATH"
    log_debug "Auto-generated save_path: $SAVE_PATH"
  fi
fi

# 设置默认保存路径
SAVE_PATH="${save_path:-/data/datasets}"
export save_path="$SAVE_PATH"
log_info "Save path: $SAVE_PATH"

# 创建保存目录（如果不存在）
if [ ! -d "$SAVE_PATH" ]; then
  log_info "Creating directory: $SAVE_PATH"
  mkdir -p "$SAVE_PATH" || {
    log_error "Failed to create directory: $SAVE_PATH"
    exit 1
  }
fi

# 安装 huggingface_hub 并下载数据集
log_info "Installing huggingface_hub..."
if ! pip install -U huggingface_hub >/dev/null 2>&1; then
  log_error "Failed to install huggingface_hub"
  exit 1
fi

log_info "Starting dataset download..."
python -c "
import os
import sys
from huggingface_hub import snapshot_download

# 获取环境变量
repo_id = os.environ.get('REPO_ID', '').strip()
save_dir = os.environ.get('save_path', '/data/datasets').strip()
hf_endpoint = os.environ.get('HF_ENDPOINT', '').strip()

if not repo_id:
    print('Error: REPO_ID is not set', file=sys.stderr)
    sys.exit(1)

# 处理 HF_ENDPOINT
if hf_endpoint:
    os.environ['HF_ENDPOINT'] = hf_endpoint
    print(f'[INFO] Using mirror endpoint: {hf_endpoint}')
else:
    # 确保不设置 HF_ENDPOINT（如果存在但为空）
    os.environ.pop('HF_ENDPOINT', None)
    print('[INFO] Using default HuggingFace endpoint (https://huggingface.co)')

print(f'[INFO] Downloading dataset: {repo_id}')
print(f'[INFO] Save directory: {save_dir}')

try:
    snapshot_download(
        repo_id=repo_id,
        local_dir=save_dir,
        repo_type='dataset',
        ignore_patterns=['*.msgpack', '*.bin', '*.h5']
    )
    print(f'[SUCCESS] Dataset {repo_id} downloaded successfully to {save_dir}')
except KeyboardInterrupt:
    print('[WARNING] Download interrupted by user', file=sys.stderr)
    sys.exit(130)
except Exception as e:
    print(f'[ERROR] Failed to download dataset: {e}', file=sys.stderr)
    import traceback
    traceback.print_exc()
    sys.exit(1)
"

# 检查 Python 脚本执行结果
if [ $? -eq 0 ]; then
  log_success "Dataset download completed successfully"
  exit 0
else
  log_error "Dataset download failed"
  exit 1
fi
