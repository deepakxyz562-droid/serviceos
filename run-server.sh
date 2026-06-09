#!/bin/bash
cd /home/z/my-project
exec NODE_OPTIONS="--max-old-space-size=512" node node_modules/.bin/next start -p 3000 2>&1
