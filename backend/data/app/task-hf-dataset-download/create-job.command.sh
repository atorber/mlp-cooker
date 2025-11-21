#!/bin/bash
# 从 DATASET_URL 解析镜像站地址和数据集名称
# 支持格式：
# 1. 完整URL：https://hf-mirror.com/datasets/username/dataset-name
# 2. 完整URL：https://huggingface.co/datasets/username/dataset-name
# 3. 镜像站地址：https://hf-mirror.com（需要单独提供 dataset_name）

HF_ENDPOINT=""
REPO_ID=""

if [ -n "$DATASET_URL" ]; then
  # 解析 URL，提取协议、主机和路径
  if [[ "$DATASET_URL" =~ ^https?://([^/]+)(.*)$ ]]; then
    # 提取主机名和路径
    HOST="${BASH_REMATCH[1]}"
    URL_PATH="${BASH_REMATCH[2]}"
    
    # 设置镜像站地址（base URL）
    # 只有当使用镜像站时才设置 HF_ENDPOINT，官方地址不需要设置
    if [[ "$HOST" =~ hf-mirror ]] || [[ "$HOST" != "huggingface.co" ]]; then
      # 使用镜像站，需要设置 HF_ENDPOINT
      HF_ENDPOINT="https://$HOST"
    fi
    # 如果是官方地址（huggingface.co），不设置 HF_ENDPOINT 变量，让 huggingface_hub 使用默认值
    
    # 从路径中提取数据集名称
    if [[ -n "$URL_PATH" ]]; then
      # 移除开头的 / 和可能的 /datasets/ 前缀
      PATH_PART=$(echo "$URL_PATH" | sed -e 's|^/||' | sed -e 's|^datasets/||')
      if [[ -n "$PATH_PART" ]]; then
        # 移除末尾的 /
        PATH_PART=$(echo "$PATH_PART" | sed -e 's|/$||')
        # 移除 GitHub 风格的路径后缀（/tree/main, /tree/master, /blob/main 等）
        PATH_PART=$(echo "$PATH_PART" | sed -e 's|/tree/[^/]*$||' | sed -e 's|/blob/[^/]*$||' | sed -e 's|/tree/[^/]*/.*$||' | sed -e 's|/blob/[^/]*/.*$||')
        # 移除末尾的 /
        PATH_PART=$(echo "$PATH_PART" | sed -e 's|/$||')
        REPO_ID="$PATH_PART"
      fi
    fi
  else
    # 如果格式不正确，直接作为镜像站地址
    if [[ "$DATASET_URL" =~ hf-mirror ]] || [[ "$DATASET_URL" != *"huggingface.co"* ]]; then
      HF_ENDPOINT="$DATASET_URL"
    fi
  fi
  
  # 只有当 HF_ENDPOINT 不为空时才导出
  if [ -n "$HF_ENDPOINT" ]; then
    export HF_ENDPOINT
  fi
fi

# 如果从 URL 中提取到了数据集名称，使用它；否则使用 dataset_name 环境变量
if [ -z "$REPO_ID" ] && [ -n "${dataset_name}" ]; then
  REPO_ID="${dataset_name}"
fi

# 如果仍然没有数据集名称，报错
if [ -z "$REPO_ID" ]; then
  echo "Error: Cannot extract dataset name from DATASET_URL and dataset_name is not set"
  echo "DATASET_URL should be in format: https://hf-mirror.com/datasets/username/dataset-name"
  echo "Or provide dataset_name environment variable"
  exit 1
fi

# 导出 REPO_ID 环境变量，供 Python 脚本使用
export REPO_ID

# 生成存储路径（从 DATASET_URL 提取主机名，去掉 https:// 前缀）
if [ -z "$save_path" ] && [ -n "$DATASET_URL" ]; then
  # 从原始 URL 提取主机名用于存储路径
  if [[ "$DATASET_URL" =~ ^https?://([^/]+) ]]; then
    host_path="${BASH_REMATCH[1]}"
    # 将 repo_id 中的 / 替换为 -
    dataset_dir=$(echo "$REPO_ID" | sed 's|/|-|g')
    save_path="/data/${host_path}/${dataset_dir}"
    export save_path
  fi
fi

# 安装 huggingface_hub 并下载数据集
pip install -U huggingface_hub && python -c "
from huggingface_hub import snapshot_download
import os
import sys

# 获取环境变量
repo_id = os.environ.get('REPO_ID', '')
save_dir = os.environ.get('save_path', '/data/datasets')
hf_endpoint = os.environ.get('HF_ENDPOINT', '')

if not repo_id:
    print('Error: REPO_ID is not set')
    sys.exit(1)

# 设置 HF_ENDPOINT 环境变量（huggingface_hub 会读取此变量）
# 只有当使用镜像站时才设置，官方地址不需要设置
# 如果 HF_ENDPOINT 为空字符串或不存在，确保不设置该环境变量（让库使用默认值）
if hf_endpoint and hf_endpoint.strip():
    os.environ['HF_ENDPOINT'] = hf_endpoint.strip()
    print(f'Using mirror endpoint: {hf_endpoint.strip()}')
else:
    # 确保不设置 HF_ENDPOINT（如果存在但为空，删除它）
    if 'HF_ENDPOINT' in os.environ:
        del os.environ['HF_ENDPOINT']
    print('Using default HuggingFace endpoint (https://huggingface.co)')

print(f'Downloading dataset: {repo_id}')
print(f'Save path: {save_dir}')

try:
    snapshot_download(
        repo_id=repo_id,
        local_dir=save_dir,
        repo_type='dataset',
        ignore_patterns=['*.msgpack', '*.bin', '*.h5']
    )
    print(f'Dataset {repo_id} downloaded successfully to {save_dir}')
except Exception as e:
    print(f'Error downloading dataset: {e}')
    sys.exit(1)
"

