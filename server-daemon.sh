#!/bin/bash
trap "" SIGHUP SIGTERM
cd /home/z/my-project
while true; do
    node node_modules/.bin/next dev -p 3000 >> /home/z/my-project/dev.log 2>&1
    echo "[$(date)] Server exited, restarting in 3s..." >> /home/z/my-project/dev.log
    sleep 3
done
