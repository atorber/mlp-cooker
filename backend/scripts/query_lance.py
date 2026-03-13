#!/usr/bin/env python3
"""
Lance 数据集 SQL 查询脚本。
从环境变量读取 LANCE_S3_URI, LANCE_SQL 及 S3 认证，用 DuckDB + Lance 扩展执行 SQL，输出 JSON。
依赖: pip install duckdb
可选: DuckDB 需能加载 community 的 lance 扩展（INSTALL lance; LOAD lance）。
BOS 使用 S3 兼容接口，通过 s3_endpoint 等配置。
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

    try:
        import duckdb
    except ImportError:
        out = {"columns": [], "rows": [], "error": "python package duckdb is required: pip install duckdb"}
        print(json.dumps(out, ensure_ascii=False))
        sys.exit(1)

    conn = duckdb.connect(":memory:")

    # BOS S3 兼容：配置自定义 endpoint 与认证
    if endpoint:
        conn.execute(f"SET s3_endpoint='{endpoint.replace(chr(39), chr(39)+chr(39))}'")
    if region:
        conn.execute(f"SET s3_region='{region}'")
    if access_key:
        conn.execute(f"SET s3_access_key_id='{access_key.replace(chr(39), chr(39)+chr(39))}'")
    if secret_key:
        conn.execute(f"SET s3_secret_access_key='{secret_key.replace(chr(39), chr(39)+chr(39))}'")

    # 加载 Lance 扩展并创建视图指向当前数据集
    try:
        conn.execute("INSTALL lance")
        conn.execute("LOAD lance")
    except Exception as e:
        out = {"columns": [], "rows": [], "error": f"Lance extension load failed: {e}"}
        print(json.dumps(out, ensure_ascii=False))
        sys.exit(1)

    # 将 Lance 数据集注册为视图 'dataset'，便于用户写 SELECT * FROM dataset
    safe_uri = uri.replace("'", "''")
    try:
        conn.execute(f"CREATE VIEW dataset AS SELECT * FROM '{safe_uri}'")
    except Exception as e:
        out = {"columns": [], "rows": [], "error": f"Open lance dataset failed: {e}"}
        print(json.dumps(out, ensure_ascii=False))
        sys.exit(1)

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
