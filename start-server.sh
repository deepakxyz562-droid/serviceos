#!/bin/bash
cd /home/z/my-project
NODE_OPTIONS="--max-old-space-size=512" npx next start -p 3000 >> dev.log 2>&1
