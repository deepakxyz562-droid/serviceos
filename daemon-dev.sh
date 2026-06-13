#!/bin/bash
cd /home/z/my-project
while true; do
  node node_modules/.bin/next dev -p 3000 2>&1
  echo "Server crashed, restarting in 5 seconds..." >> /home/z/my-project/dev.log
  sleep 5
done
