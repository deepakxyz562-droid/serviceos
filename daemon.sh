#!/bin/bash
# ServiceOS Production Server Daemon
cd /home/z/my-project
LOG="/home/z/my-project/dev.log"

while true; do
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting production server..." >> "$LOG"
  NODE_OPTIONS="--max-old-space-size=1024" node node_modules/.bin/next start -p 3000 >> "$LOG" 2>&1
  EXIT_CODE=$?
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Server exited with code $EXIT_CODE, restarting in 2s..." >> "$LOG"
  sleep 2
done
