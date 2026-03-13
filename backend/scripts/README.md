# Backend Scripts

## query_lance.py — Lance 数据集 SQL 查询

用于在数据集详情页「SQL查询」Tab 中执行 Lance 数据集的 SQL。

### 检测逻辑（后端）

- 接口：`GET /api/datasets/:datasetId/lance-check`
- 通过 BOS 列出数据集根目录下的**直接子项**（目录名与文件名）。
- 若存在目录 `_versions` 或 `data`，或存在任意以 `.lance` 结尾的 key，则判定为 Lance 格式。

### 查询逻辑（后端）

- 接口：`POST /api/datasets/:datasetId/query`，body：`{ "sql": "SELECT * FROM dataset LIMIT 10" }`。
- 后端将当前版本的 BOS 路径拼成 S3 URI（`s3://bucket/prefix`），并调用本脚本。
- 脚本通过环境变量接收：`LANCE_S3_URI`、`LANCE_SQL`、`LANCE_S3_ENDPOINT`、`LANCE_S3_ACCESS_KEY`、`LANCE_S3_SECRET_KEY`、`LANCE_S3_REGION`。
- 脚本内使用 DuckDB + Lance 扩展，配置 BOS 的 S3 兼容 endpoint 与 AK/SK，将 Lance 数据集注册为视图 `dataset`，执行用户 SQL，结果以 JSON 输出：`{"columns": [...], "rows": [[...], ...]}`。

### 依赖

- Python 3
- `pip install duckdb`
- DuckDB 需能安装并加载社区扩展：`INSTALL lance; LOAD lance;`（需网络或预装扩展）

### 可选：BOS 自定义 S3 endpoint

脚本内通过 DuckDB 的 `SET s3_endpoint=...` 等配置 BOS，若遇兼容问题可查阅 DuckDB 文档中 S3 自定义 endpoint 的写法。
