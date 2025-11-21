pip install -U huggingface_hub && python -c "from huggingface_hub import snapshot_download; snapshot_download(repo_id='${model_name}', local_dir='${save_path}', repo_type='model', ignore_patterns=['*.msgpack', '*.h5'])"

