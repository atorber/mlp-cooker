#!/usr/bin/env python3
"""
Lance 数据集 SQL 查询脚本。
从环境变量读取 LANCE_S3_URI, LANCE_SQL 及 S3 认证：
  1. 用 pylance 读取 Lance 数据集为 PyArrow 表（无需 DuckDB 的 lance 扩展）
  2. 用 DuckDB 对 PyArrow 表执行用户 SQL，输出 JSON。
依赖: pip install duckdb pyarrow pylance
BOS 使用 S3 兼容接口，通过 storage_options 传入 endpoint、AK/SK。
"""
import os
import sys
import json

def main():
    uri = os.environ.get("LANCE_S3_URI", "").strip()
    sql = os.environ.get("LANCE_SQL", "").strip()
    endpoint = os.environ.get("LANCE_S3_ENDPOINT", "").strip()
    access_key = os.environ.get("LANCE_S3_ACCESS_KEY", "").strip()
    secret_key = os.environ.get("LANCE_S3_SECRET_KEY", "").strip()
    region = os.environ.get("LANCE_S3_REGION", "bj").strip()

    if not uri or not sql:
        out = {"columns": [], "rows": [], "error": "LANCE_S3_URI and LANCE_SQL are required"}
        print(json.dumps(out, ensure_ascii=False))
        sys.exit(1)

    storage_options = {}
    if endpoint:
        storage_options["endpoint"] = endpoint
    if region:
        storage_options["region"] = region
    if access_key:
        storage_options["access_key_id"] = access_key
    if secret_key:
        storage_options["secret_access_key"] = secret_key

    # 1. 用 pylance 读取 Lance 数据集为 PyArrow 表（不依赖 DuckDB lance 扩展）
    try:
        import lance
    except ImportError:
        out = {"columns": [], "rows": [], "error": "python package pylance is required: pip install pylance"}
        print(json.dumps(out, ensure_ascii=False))
        sys.exit(1)

    # 使用 LanceDataset 类打开（pylance 包；勿装成 PyPI 上的 lance）
    opener = getattr(lance, "LanceDataset", None) or getattr(lance, "dataset", None)
    if not opener:
        out = {"columns": [], "rows": [], "error": "pylance 未提供 LanceDataset/dataset，请安装: pip install pylance"}
        print(json.dumps(out, ensure_ascii=False))
        sys.exit(1)

    try:
        ds = opener(uri, storage_options=storage_options or None)
        table = ds.to_table()
    except Exception as e:
        out = {"columns": [], "rows": [], "error": f"Open lance dataset failed: {e}"}
        print(json.dumps(out, ensure_ascii=False))
        sys.exit(1)

    # 2. DuckDB 注册 PyArrow 表为 dataset，执行用户 SQL
    try:
        import duckdb
    except ImportError:
        out = {"columns": [], "rows": [], "error": "python package duckdb is required: pip install duckdb"}
        print(json.dumps(out, ensure_ascii=False))
        sys.exit(1)

    conn = duckdb.connect(":memory:")
    conn.register("dataset", table)

    def to_jsonable(v):
        if v is None:
            return None
        if isinstance(v, float) and __import__("math").isnan(v):
            return None
        if hasattr(v, "isoformat"):
            return v.isoformat()
        if hasattr(v, "__str__") and type(v).__name__ not in ("str", "int", "float", "bool"):
            return str(v)
        return v

    try:
        result = conn.execute(sql)
        rows = result.fetchall()
        columns = getattr(result, "columns", None) or (
            [d[0] for d in result.description] if result.description else []
        )
        out = {"columns": list(columns), "rows": [[to_jsonable(c) for c in row] for row in rows]}
        print(json.dumps(out, ensure_ascii=False))
    except Exception as e:
        out = {"columns": [], "rows": [], "error": str(e)}
        print(json.dumps(out, ensure_ascii=False))
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
