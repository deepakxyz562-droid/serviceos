#!/bin/bash
cd /home/z/my-project

# Double fork to fully detach
(
  # First fork
  setsid node node_modules/.bin/next dev -p 3000 >> /home/z/my-project/dev.log 2>&1 &
  # Second fork already done by setsid
  # Exit the intermediate process
  exit 0
) &

# Wait for the server to start
sleep 10
echo "Server should be running"
