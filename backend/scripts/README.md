# Backend Scripts

## create_lance_bos.py — 在 BOS 创建 Lance 测试数据集

用于在指定 BOS 路径创建符合 Lance 格式的测试数据集（会生成 `_versions`、`data` 等目录）。

- 依赖：`pip install pyarrow pylance`（注意是 **pylance**，不是 lance）
- 通过环境变量传入 BOS 认证：`LANCE_S3_ACCESS_KEY`、`LANCE_S3_SECRET_KEY`、`LANCE_S3_REGION`（默认 bj）
- 可选：`LANCE_S3_BUCKET`（默认 aihc-datasets）、`LANCE_S3_PREFIX`（默认 aihc-pm/LanceTest）

示例（请勿将密钥提交到仓库）：

```bash
export LANCE_S3_ACCESS_KEY="your_ak"
export LANCE_S3_SECRET_KEY="your_sk"
export LANCE_S3_REGION="bj"
python3 scripts/create_lance_bos.py
```

---

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
- 脚本内先用 **pylance** 从 BOS 读取 Lance 数据集为 PyArrow 表，再用 **DuckDB** 对该表执行用户 SQL（DuckDB 原生支持 PyArrow，无需 DuckDB 的 lance 扩展），结果以 JSON 输出：`{"columns": [...], "rows": [[...], ...]}`。

### 依赖

- Python 3
- `pip install duckdb pyarrow pylance`
- 不依赖 DuckDB 的 lance 扩展（避免部分平台 404）

后端调用脚本时会优先使用 `backend/.venv-lance/bin/python3`（若存在），建议在该 venv 内安装上述依赖：  
`pip install duckdb pyarrow pylance`，以免使用系统 Python 时误用错误的 `lance` 包。
