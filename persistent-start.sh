#!/bin/bash
# Persistent Next.js server starter
cd /home/z/my-project

# Kill existing
pkill -f "next dev -p 3000" 2>/dev/null
sleep 2

# Start server - keep running
while true; do
  echo "[$(date)] Starting Next.js server..." >> /tmp/server-persistent.log
  npx next dev -p 3000 2>&1 >> /tmp/server-persistent.log
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 3s..." >> /tmp/server-persistent.log
  sleep 3
done
