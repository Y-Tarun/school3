import { PrismaClient } from '@prisma/client';
import { createApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const prisma = new PrismaClient();
const app = createApp({ prisma, config });

try {
  await prisma.$connect();
} catch (error) {
  console.error('Database connection failed', {
    errorCode: typeof error?.code === 'string' ? error.code : 'DATABASE_CONNECTION_FAILED',
  });
  await prisma.$disconnect();
  throw new Error('Unable to connect to the configured database. Verify the local database service and connection settings.');
}

const server = app.listen(config.API_PORT, () => {
  console.info('API server started', { port: config.API_PORT, environment: config.NODE_ENV });
});

async function shutdown(signal) {
  console.info('API server shutting down', { signal });
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
