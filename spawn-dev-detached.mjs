// Detached spawner for the Next.js dev server.
// Spawns `next dev` in its own session with stdio redirected directly to the
// log file (via shell redirection), so the child is fully independent of this
// spawner. The spawner exits immediately after launching.
import { spawn } from 'child_process';
import { writeFileSync } from 'fs';

const PID_FILE = '/tmp/next-dev-server.pid';

const env = {
  ...process.env,
  DATABASE_URL: 'postgresql://neondb_owner:npg_4QmItuyVeOR2@ep-small-dawn-apeemihn.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require',
  DIRECT_URL: 'postgresql://neondb_owner:npg_4QmItuyVeOR2@ep-small-dawn-apeemihn.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require',
  NODE_OPTIONS: '--max-old-space-size=1280',
};

// Use sh -c with redirection so the child writes directly to the log file.
// stdio: 'ignore' means this spawner doesn't hold any pipe to the child.
const child = spawn(
  'sh',
  ['-c', 'exec node node_modules/.bin/next dev -p 3000 -H 0.0.0.0 > /home/z/my-project/dev.log 2>&1'],
  {
    cwd: '/home/z/my-project',
    env,
    detached: true,
    stdio: 'ignore',
  }
);

try { writeFileSync(PID_FILE, String(child.pid)); } catch {}

child.unref();
console.log(`Spawned detached next dev with session PID ${child.pid}`);
process.exit(0);
