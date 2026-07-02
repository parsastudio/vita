#!/bin/bash
set -e
IMAGE_NAME="vita-app"
TAG="latest"
TAR_NAME="vita-app.tar"
SERVER_USER="next"
SERVER_IP="87.248.153.199"
SERVER_PATH="/home/next"

docker build -t $IMAGE_NAME:$TAG .
docker save -o $TAR_NAME $IMAGE_NAME:$TAG
scp $TAR_NAME $SERVER_USER@$SERVER_IP:$SERVER_PATH/
rm -f $TAR_NAME
docker rmi $IMAGE_NAME:$TAG