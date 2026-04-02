#!/usr/bin/env python3
"""
在 BOS 指定路径创建 Lance 测试数据集。
通过环境变量传入 BOS 认证，避免在代码中写死密钥。

使用示例（请勿将密钥提交到仓库）:
  export LANCE_S3_ACCESS_KEY="your_ak"
  export LANCE_S3_SECRET_KEY="your_sk"
  export LANCE_S3_REGION="bj"
  python3 create_lance_bos.py

可选环境变量:
  LANCE_S3_BUCKET  默认 aihc-datasets
  LANCE_S3_PREFIX  默认 aihc-pm/LanceTest
"""
import os
import sys

def main():
    access_key = os.environ.get("LANCE_S3_ACCESS_KEY", "").strip()
    secret_key = os.environ.get("LANCE_S3_SECRET_KEY", "").strip()
    region = os.environ.get("LANCE_S3_REGION", "bj").strip()
    bucket = os.environ.get("LANCE_S3_BUCKET", "aihc-datasets").strip()
    prefix = os.environ.get("LANCE_S3_PREFIX", "aihc-pm/LanceTest").strip()

    if not access_key or not secret_key:
        print("请设置环境变量 LANCE_S3_ACCESS_KEY 和 LANCE_S3_SECRET_KEY", file=sys.stderr)
        sys.exit(1)

    uri = f"s3://{bucket}/{prefix.rstrip('/')}"
    endpoint = f"https://s3.{region}.bcebos.com"

    try:
        import pyarrow as pa
    except ImportError:
        print("请先安装: pip install pyarrow", file=sys.stderr)
        sys.exit(1)
    try:
        import lance  # 需安装 pylance: pip install pylance（勿装错成 lance）
    except ImportError:
        print("请先安装: pip install pylance", file=sys.stderr)
        sys.exit(1)

    # 创建一个小型测试表（Lance 标准结构会生成 _versions、data 等）
    table = pa.table({
        "id": pa.array([1, 2, 3], type=pa.int64()),
        "name": pa.array(["Alice", "Bob", "Carol"], type=pa.string()),
        "score": pa.array([85.5, 92.0, 78.5], type=pa.float64()),
    })

    storage_options = {
        "endpoint": endpoint,
        "region": region,
        "access_key_id": access_key,
        "secret_access_key": secret_key,
    }

    print(f"正在写入 Lance 数据集: {uri}", file=sys.stderr)
    try:
        lance.write_dataset(table, uri, storage_options=storage_options)
        print(f"已创建: {uri}", file=sys.stderr)
        print(uri)
    except Exception as e:
        print(f"写入失败: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
