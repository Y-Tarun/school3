import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });

const prismaCliPath = fileURLToPath(
  new URL('../../../node_modules/prisma/build/index.js', import.meta.url)
);
const result = spawnSync(process.execPath, [prismaCliPath, ...process.argv.slice(2)], {
  env: process.env,
  stdio: 'inherit',
});

if (result.error) {
  console.error('Unable to start Prisma CLI:', result.error.message);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
