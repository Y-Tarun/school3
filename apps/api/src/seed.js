import { fileURLToPath } from 'node:url';
import argon2 from 'argon2';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });

const prisma = new PrismaClient();

async function seedInitialAdmin() {
  const email = process.env.ADMIN_INITIAL_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_INITIAL_PASSWORD;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('ADMIN_INITIAL_EMAIL must be a valid email address.');
  }

  if (!password || password.length < 12) {
    throw new Error('ADMIN_INITIAL_PASSWORD must contain at least 12 characters.');
  }

  const existingAdmin = await prisma.admin.findUnique({ where: { email } });
  if (existingAdmin) {
    console.info('Initial admin already exists; existing credentials were left unchanged.');
    return;
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  await prisma.admin.create({
    data: {
      email,
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.info('Initial admin created.');
}

try {
  await seedInitialAdmin();
} catch (error) {
  console.error('Initial admin seed failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
