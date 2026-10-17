import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url().refine(
    (value) => value.startsWith('postgresql://') || value.startsWith('postgres://'),
    'Expected a PostgreSQL connection URL.'
  ),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  WEB_ORIGIN: z.string().url().refine((value) => {
    const parsed = new URL(value);
    return parsed.pathname === '/' && !parsed.search && !parsed.hash;
  }, 'WEB_ORIGIN must be an origin without a path, query, or fragment.').default('http://localhost:5173'),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().regex(/^\d+[smhd]$/).refine(
    (value) => durationInSeconds(value) <= 3600,
    'Access tokens must expire within one hour.'
  ).default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_TTL: z.string().regex(/^\d+[smhd]$/).refine(
    (value) => durationInSeconds(value) <= 30 * 86400,
    'Refresh tokens must expire within 30 days.'
  ).default('7d'),
  PHOTO_STORAGE_DIR: z.string().min(1).default(
    fileURLToPath(new URL('../../../local-data/photos', import.meta.url))
  ),
  WHATSAPP_ACCESS_TOKEN: z.string().trim().min(1).optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().trim().min(1).optional(),
  WHATSAPP_RECIPIENT_PHONE: z.string().trim().min(1).optional(),
  WHATSAPP_TEMPLATE_NAME: z.string().trim().min(1).optional(),
  WHATSAPP_TEMPLATE_LANGUAGE: z.string().trim().min(1).default('en'),
  WHATSAPP_GRAPH_API_VERSION: z.string().regex(/^v\d+\.\d+$/).default('v22.0'),
});

export function loadConfig(environment = process.env) {
  const result = environmentSchema.safeParse(environment);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  const config = result.data;
  if (
    config.JWT_ACCESS_SECRET === config.JWT_REFRESH_SECRET ||
    config.JWT_ACCESS_SECRET.trim().length < 32 ||
    config.JWT_REFRESH_SECRET.trim().length < 32
  ) {
    throw new Error('JWT access and refresh secrets must be distinct, strong values.');
  }
  if (config.NODE_ENV === 'production' && new URL(config.WEB_ORIGIN).protocol !== 'https:') {
    throw new Error('WEB_ORIGIN must use HTTPS in production.');
  }

  return {
    ...config,
    PHOTO_STORAGE_DIR: resolve(config.PHOTO_STORAGE_DIR),
    JWT_ACCESS_SECRET: new TextEncoder().encode(config.JWT_ACCESS_SECRET),
    JWT_REFRESH_SECRET: new TextEncoder().encode(config.JWT_REFRESH_SECRET),
  };
}

export function durationInSeconds(duration) {
  const [, amount, unit] = duration.match(/^(\d+)([smhd])$/);
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
  return Number(amount) * multipliers[unit];
}
