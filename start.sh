#!/bin/bash
# ============================================================
# ServiceOS — Quick Start Script
# ============================================================
# Usage:
#   bash start.sh         # Start dev server in background
#   bash start.sh status  # Check if running
#   bash start.sh stop    # Stop the server
#   bash start.sh logs    # Tail the dev log
# ============================================================

set -e
cd "$(dirname "$0")"

case "${1:-start}" in
  start)
    if [ -f next-dev.pid ] && kill -0 "$(cat next-dev.pid)" 2>/dev/null; then
      echo "✓ Dev server already running (PID $(cat next-dev.pid))"
      echo "  URL: http://localhost:3000"
      exit 0
    fi
    echo "Starting ServiceOS dev server..."
    setsid bash -c 'exec node spawn-dev.mjs' < /dev/null > /dev/null 2>&1 &
    disown
    sleep 3
    if [ -f next-dev.pid ]; then
      echo "✓ Started (PID $(cat next-dev.pid))"
      echo "  URL: http://localhost:3000"
      echo "  Logs: tail -f dev.log"
    else
      echo "⚠ Spawner exited; check dev.log"
    fi
    ;;
  stop)
    if [ -f next-dev.pid ]; then
      PID=$(cat next-dev.pid)
      kill -TERM "$PID" 2>/dev/null || true
      pkill -9 -P "$PID" 2>/dev/null || true
      rm -f next-dev.pid
      echo "✓ Stopped (PID $PID)"
    else
      pkill -9 -f "next dev" 2>/dev/null || true
      pkill -9 -f "next-server" 2>/dev/null || true
      echo "✓ Killed any stray Next processes"
    fi
    ;;
  status)
    if [ -f next-dev.pid ] && kill -0 "$(cat next-dev.pid)" 2>/dev/null; then
      echo "✓ Running (PID $(cat next-dev.pid)) on http://localhost:3000"
    else
      echo "✗ Not running"
      exit 1
    fi
    ;;
  logs)
    tail -f dev.log
    ;;
  restart)
    "$0" stop || true
    sleep 2
    "$0" start
    ;;
  *)
    echo "Usage: $0 {start|stop|status|logs|restart}"
    exit 1
    ;;
esac
