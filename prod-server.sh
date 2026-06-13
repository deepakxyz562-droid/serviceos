#!/bin/bash
cd /home/z/my-project
while true; do
  NODE_OPTIONS="--max-old-space-size=512" node node_modules/.bin/next start -p 3000 >> dev.log 2>&1
  echo "[$(date)] Server exited, restarting in 2s..." >> dev-restart.log
  sleep 2
done
