#!/bin/bash
LOG=/home/z/my-project/dev.log
cd /home/z/my-project

while true; do
  # Check if port 3000 is responding
  if ! curl -s -o /dev/null -w "" http://localhost:3000/ 2>/dev/null; then
    echo "$(date): Server not responding, starting..." >> $LOG
    # Kill any leftover
    pkill -f "next dev" 2>/dev/null
    sleep 2
    # Start fresh
    bun run dev >> $LOG 2>&1 &
    # Wait for it to be ready
    for i in $(seq 1 30); do
      sleep 2
      if curl -s -o /dev/null http://localhost:3000/ 2>/dev/null; then
        echo "$(date): Server is ready" >> $LOG
        break
      fi
    done
  fi
  sleep 10
done
