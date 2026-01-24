#!/bin/bash

# 设置严格模式
set -euo pipefail

# 从环境变量读取配置
SERVER_IP="${AIO_LIFE_SERVER_IP:-}"
USERNAME="${AIO_LIFE_SERVER_USER:-}"
PASSWORD="${AIO_LIFE_SERVER_PASSWORD:-}"
PROJECT_DIR="${PROJECT_DIR:-.}"  # 项目根目录，默认为当前目录

# 验证必需的环境变量
if [[ -z "$SERVER_IP" ]]; then
    echo "错误: 未设置环境变量 AIO_LIFE_SERVER_IP" >&2
    exit 1
fi

if [[ -z "$USERNAME" ]]; then
    echo "错误: 未设置环境变量 AIO_LIFE_SERVER_USER" >&2
    exit 1
fi

if [[ -z "$PASSWORD" ]]; then
    echo "错误: 未设置环境变量 AIO_LIFE_SERVER_PASSWORD" >&2
    exit 1
fi

echo "开始构建项目..."
pnpm run build:antd

# 检查 dist 目录是否存在
DIST_PATH="$PROJECT_DIR/apps/web-antd/dist"
echo "检查 dist 目录: $DIST_PATH"

if [[ ! -d "$DIST_PATH" ]]; then
    echo "错误: dist 目录不存在: $DIST_PATH" >&2
    echo "请手动检查构建输出" >&2
    exit 1
fi

# 打包 dist 文件夹为 tar.gz 格式
echo "打包 dist 文件夹..."
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
ARCHIVE_NAME="dist_$TIMESTAMP.tar.gz"

# 兼容 macOS 和 Linux 的 tar 命令
if [[ "$OSTYPE" == "darwin"* ]]; then
    tar --no-xattrs -czf "/tmp/$ARCHIVE_NAME" -C "$PROJECT_DIR/apps/web-antd" dist
else
    tar -czf "/tmp/$ARCHIVE_NAME" -C "$PROJECT_DIR/apps/web-antd" dist
fi

LOCAL_ARCHIVE_PATH="/tmp/$ARCHIVE_NAME"
echo "创建压缩包: $LOCAL_ARCHIVE_PATH"

echo "开始部署到服务器: $SERVER_IP"
echo "本地文件: $LOCAL_ARCHIVE_PATH"
echo "远程路径: /projects/front/$ARCHIVE_NAME"

# 创建远程目录（如果不存在）
echo "创建远程目录..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no "$USERNAME@$SERVER_IP" \
    "mkdir -p /projects/front"

# 上传压缩包
echo "上传压缩包..."
# 使用 rsync 显示进度条
PROGRESS_FLAG="--progress"
if rsync --help | grep -q "--info"; then
    PROGRESS_FLAG="--info=progress2"
fi

RSYNC_CMD="sshpass -p '$PASSWORD' rsync -e 'ssh -o StrictHostKeyChecking=no' $PROGRESS_FLAG '$LOCAL_ARCHIVE_PATH' '$USERNAME@$SERVER_IP:/projects/front/$ARCHIVE_NAME'"
eval $RSYNC_CMD

# 检查上传是否成功
if [[ $? -ne 0 ]]; then
    echo "错误: 文件上传失败" >&2
    # 清理本地临时文件
    rm -f "$LOCAL_ARCHIVE_PATH"
    exit 1
fi

# 在远程服务器上解压文件
echo "在远程服务器上解压文件..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no "$USERNAME@$SERVER_IP" \
    "cd /projects/front && tar -xzf $ARCHIVE_NAME && rm -f $ARCHIVE_NAME"

# 检查解压是否成功
if [[ $? -eq 0 ]]; then
    echo "部署成功完成！"
else
    echo "错误: 远程解压失败" >&2
    # 清理本地临时文件
    rm -f "$LOCAL_ARCHIVE_PATH"
    exit 1
fi

# 清理本地临时文件
rm -f "$LOCAL_ARCHIVE_PATH"
