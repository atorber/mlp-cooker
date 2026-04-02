# 增加 -vvv 输出详细的网络和安装调试信息
pip install -vvv lakefs

export HTTPS_PROXY="http://10.0.7.40:18000"
export HTTP_PROXY="http://10.0.7.40:18000"

# (可选) 查看帮助以寻找官方调试参数
# python -m lakefs.quickstart --help

# 尝试带上常用的通用调试环境变量及 Python 详细模式启动
export LAKEFS_LOG_LEVEL="debug" # 尝试利用常见的系统环境变量开启日志
python -v -m lakefs.quickstart