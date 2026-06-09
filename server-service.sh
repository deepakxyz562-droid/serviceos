#!/bin/bash
# ServiceOS Production Server Service
# Runs with proper signal handling and auto-restart

cd /home/z/my-project
LOG="/home/z/my-project/dev.log"
PIDFILE="/tmp/next-server.pid"

cleanup() {
  echo "[$(date)] Service stopping..." >> "$LOG"
  exit 0
}

trap cleanup SIGTERM SIGINT

while true; do
  echo "[$(date)] Starting Next.js production server..." >> "$LOG"
  
  NODE_OPTIONS="--max-old-space-size=768" \
  node node_modules/.bin/next start -p 3000 >> "$LOG" 2>&1 &
  SERVER_PID=$!
  echo $SERVER_PID > "$PIDFILE"
  
  # Wait for server to exit
  wait $SERVER_PID 2>/dev/null
  EXIT_CODE=$?
  
  echo "[$(date)] Server exited with code $EXIT_CODE" >> "$LOG"
  
  # Brief delay before restart
  sleep 3
done
