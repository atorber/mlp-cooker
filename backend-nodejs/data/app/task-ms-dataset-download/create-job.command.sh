#!/bin/bash
# 从 DATASET_URL 解析 ModelScope 地址和数据集名称
# 支持格式：
# 1. 完整URL：https://www.modelscope.cn/datasets/namespace/repo-name
# 2. 完整URL：https://www.modelscope.cn/datasets/namespace/repo-name/tree/master
#
# 使用 ModelScope 官方 SDK 下载数据集

REPO_ID=""

if [ -n "$DATASET_URL" ]; then
  # 解析 URL，提取协议、主机和路径
  if [[ "$DATASET_URL" =~ ^https?://([^/]+)(.*)$ ]]; then
    # 提取主机名和路径
    HOST="${BASH_REMATCH[1]}"
    URL_PATH="${BASH_REMATCH[2]}"
    
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
  fi
fi

# 如果从 URL 中提取到了数据集名称，使用它；否则使用 dataset_name 环境变量
if [ -z "$REPO_ID" ] && [ -n "${dataset_name}" ]; then
  REPO_ID="${dataset_name}"
fi

# 如果仍然没有数据集名称，报错
if [ -z "$REPO_ID" ]; then
  echo "Error: Cannot extract dataset name from DATASET_URL and dataset_name is not set"
  echo "DATASET_URL should be in format: https://www.modelscope.cn/datasets/namespace/repo-name"
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

# 安装 ModelScope SDK 并下载数据集
# 使用官方 ModelScope 下载方式
pip install -U modelscope && python -c "
# Python 3.8 兼容：使用 __future__ annotations 延迟类型注解评估
from __future__ import annotations
import os
import sys

# 设置环境变量以兼容 Python 3.8
os.environ['PYTHONUNBUFFERED'] = '1'

# 导入 ModelScope SDK
from modelscope.hub.snapshot_download import snapshot_download

# 获取环境变量
repo_id = os.environ.get('REPO_ID', '')
save_dir = os.environ.get('save_path', '/data/datasets')
revision = os.environ.get('revision', 'master')

if not repo_id:
    print('Error: REPO_ID is not set')
    sys.exit(1)

print(f'Downloading dataset from ModelScope: {repo_id}')
print(f'Revision: {revision or \"master\"}')
print(f'Save path: {save_dir}')

try:
    # 使用 ModelScope 官方 API 下载数据集
    snapshot_download(
        model_id=repo_id,
        cache_dir=save_dir,
        revision=revision if revision else 'master'
    )
    print(f'Dataset {repo_id} downloaded successfully from ModelScope to {save_dir}')
except Exception as e:
    print(f'Error downloading dataset from ModelScope: {e}')
    import traceback
    traceback.print_exc()
    sys.exit(1)
"
