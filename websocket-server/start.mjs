import { existsSync } from 'fs';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = join(__dirname, 'server.js');
const envFile = join(__dirname, '.env');

const args = existsSync(envFile)
  ? [`--env-file=${envFile}`, serverPath]
  : [serverPath];

const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
process.exit(result.status ?? 1);
