#!/bin/bash
# 从 DATASET_URL 解析 ModelScope 地址和数据集名称
# 支持格式：
# 1. 完整URL：https://www.modelscope.cn/datasets/namespace/repo-name
# 2. 完整URL：https://www.modelscope.cn/datasets/namespace/repo-name/tree/master
#
# 使用 ModelScope 官方 SDK 下载数据集

REPO_ID=""

if [ -n "$DATASET_URL" ]; then
  # 去除首尾空格
  DATASET_URL=$(echo "$DATASET_URL" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
  
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
        # 去除首尾空格
        PATH_PART=$(echo "$PATH_PART" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
        REPO_ID="$PATH_PART"
      fi
    fi
  fi
fi

# 输出解析结果用于调试
echo "Parsed DATASET_URL: $DATASET_URL"
echo "Extracted REPO_ID: $REPO_ID"

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

# 导出 REPO_ID 环境变量，供 Python 脚本使用（保持原始格式，不替换连字符）
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
# 使用官方 ModelScope 下载方式（安装 dataset 扩展及必要的依赖）
pip install -U "modelscope[dataset]" numpy && python -c "
import os
import sys

# 设置环境变量以确保输出实时显示
os.environ['PYTHONUNBUFFERED'] = '1'

# 导入 ModelScope SDK
from modelscope.msdatasets import MsDataset
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
    # 使用 MsDataset.load() 加载数据集（官方推荐方式，会自动下载数据）
    print(f'Loading dataset using MsDataset.load()...')
    dataset = MsDataset.load(repo_id)
    print(f'Dataset {repo_id} loaded successfully')
    
    # 验证数据集是否可用（尝试访问第一条数据）
    try:
        if len(dataset) > 0:
            sample = dataset[0]
            print(f'Dataset verification: Sample data available (total {len(dataset)} items)')
        else:
            print(f'Dataset verification: Dataset is empty')
    except Exception as e:
        print(f'Warning: Could not access sample data: {e}')
        print(f'Dataset may still be downloading or processing...')
    
    # 如果需要下载文件到指定目录，使用 snapshot_download
    if save_dir and save_dir != '/data/datasets':
        print(f'Downloading dataset files to {save_dir}...')
        snapshot_download(
            model_id=repo_id,
            cache_dir=save_dir,
            revision=revision if revision else 'master'
        )
        print(f'Dataset files downloaded successfully to {save_dir}')
    
    print(f'Dataset {repo_id} downloaded successfully from ModelScope')
except Exception as e:
    print(f'Error downloading dataset from ModelScope: {e}')
    print(f'')
    print(f'Possible reasons:')
    print(f'1. The dataset {repo_id} does not exist on ModelScope')
    print(f'2. The dataset path is incorrect (should be namespace/repo-name)')
    print(f'3. The dataset is private and requires authentication')
    print(f'4. Network connection issues')
    print(f'')
    print(f'Please check the dataset URL: https://www.modelscope.cn/datasets/{repo_id}')
    import traceback
    traceback.print_exc()
    sys.exit(1)
"
