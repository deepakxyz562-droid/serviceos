#!/bin/bash
# Start embedded PostgreSQL for development
# This script starts the embedded PostgreSQL server used by the application

PG_BIN="/home/z/my-project/node_modules/@embedded-postgres/linux-x64/native/bin"
PG_DATA="/tmp/pgdata"
PG_LOG="/tmp/pgdata/logfile"
PG_LIB="/home/z/my-project/node_modules/@embedded-postgres/linux-x64/native/lib"
PG_PORT=5432

export LD_LIBRARY_PATH="$PG_LIB:$LD_LIBRARY_PATH"

# Check if PostgreSQL is already running
if "$PG_BIN/pg_ctl" -D "$PG_DATA" status 2>/dev/null | grep -q "server is running"; then
    echo "PostgreSQL is already running on port $PG_PORT"
    exit 0
fi

# Check if data directory exists and is initialized
if [ ! -f "$PG_DATA/PG_VERSION" ]; then
    echo "Initializing PostgreSQL data directory..."
    rm -rf "$PG_DATA"
    mkdir -p "$PG_DATA"
    "$PG_BIN/initdb" --username=postgres --auth=password -D "$PG_DATA" 2>&1
    if [ $? -ne 0 ]; then
        echo "Failed to initialize PostgreSQL"
        exit 1
    fi

    # Configure password authentication
    echo "local   all   all   trust" > "$PG_DATA/pg_hba.conf"
    echo "host    all   all   127.0.0.1/32   trust" >> "$PG_DATA/pg_hba.conf"
    echo "host    all   all   ::1/128        trust" >> "$PG_DATA/pg_hba.conf"
fi

# Start PostgreSQL
echo "Starting PostgreSQL on port $PG_PORT..."
"$PG_BIN/pg_ctl" -D "$PG_DATA" -l "$PG_LOG" -o "-p $PG_PORT" start 2>&1

# Wait for server to be ready
for i in {1..10}; do
    if "$PG_BIN/pg_ctl" -D "$PG_DATA" status 2>/dev/null | grep -q "server is running"; then
        echo "PostgreSQL started successfully!"
        break
    fi
    sleep 1
done

# Create database if it doesn't exist
echo "Ensuring 'serviceos' database exists..."
node -e "
const { Client } = require('pg');
const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  database: 'postgres'
});
client.connect().then(() => {
  return client.query('SELECT 1 FROM pg_database WHERE datname = \$1', ['serviceos']);
}).then(res => {
  if (res.rows.length === 0) {
    return client.query('CREATE DATABASE serviceos');
  }
  console.log('Database serviceos already exists');
  client.end();
  return null;
}).then(() => {
  if (arguments) return;
}).catch(err => {
  console.error('DB check error:', err.message);
  client.end();
});
" 2>&1

echo "PostgreSQL is ready on port $PG_PORT"
echo "Connection: postgresql://postgres:postgres@localhost:5432/serviceos"
