pip install -U huggingface_hub && python -c "from huggingface_hub import snapshot_download; snapshot_download(repo_id='${dataset_name}', local_dir='${save_path}', repo_type='dataset', ignore_patterns=['*.msgpack', '*.bin', '*.h5'])"

