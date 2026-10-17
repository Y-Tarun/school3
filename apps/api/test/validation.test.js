import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';
import { HttpError } from '../src/errors.js';
import { createStudentSchema, editStudentSchema, parseOrThrow } from '../src/validation.js';

const validEnvironment = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://user:password@localhost:5432/balvatika_test',
  API_PORT: '3000',
  WEB_ORIGIN: 'http://localhost:5173',
  JWT_ACCESS_SECRET: 'a-distinct-access-secret-with-at-least-32-bytes',
  JWT_ACCESS_TTL: '15m',
  JWT_REFRESH_SECRET: 'a-distinct-refresh-secret-with-at-least-32-bytes',
  JWT_REFRESH_TTL: '7d',
};

describe('API configuration and validation', () => {
  it('requires distinct strong signing secrets and validates environment configuration', () => {
    expect(loadConfig(validEnvironment).API_PORT).toBe(3000);
    expect(() => loadConfig({ ...validEnvironment, JWT_REFRESH_SECRET: validEnvironment.JWT_ACCESS_SECRET }))
      .toThrow('must be distinct');
    expect(() => loadConfig({ ...validEnvironment, JWT_ACCESS_SECRET: 'short' }))
      .toThrow('Invalid environment configuration');
    expect(() => loadConfig({ ...validEnvironment, NODE_ENV: 'production' }))
      .toThrow('must use HTTPS');
    expect(() => loadConfig({ ...validEnvironment, WEB_ORIGIN: 'http://localhost:5173/contact' }))
      .toThrow('without a path');
  });

  it('requires application number and first name but permits an absent surname', () => {
    const parsed = createStudentSchema.parse({
      applicationNumber: ' app-7 ',
      firstName: 'Mina',
    });
    expect(parsed.applicationNumber).toBe('APP-7');
    expect(parsed.firstName).toBe('Mina');
    expect(parsed.surname).toBeUndefined();
    expect(parsed.status).toBe('Applied');
    expect(() => createStudentSchema.parse({ applicationNumber: 'APP-8' })).toThrow();
  });

  it('validates revision bases, status values, dates, and non-negative counts', () => {
    expect(() => editStudentSchema.parse({
      basedOnRevisionId: 'invalid',
      changes: { firstName: 'Mina' },
    })).toThrow();
    expect(() => createStudentSchema.parse({
      applicationNumber: 'APP-1',
      firstName: 'Mina',
      status: 'Enrolled',
    })).toThrow();
    expect(() => createStudentSchema.parse({
      applicationNumber: 'APP-1',
      firstName: 'Mina',
      dateOfBirth: '2025-02-31',
    })).toThrow();
    expect(() => createStudentSchema.parse({
      applicationNumber: 'APP-1',
      firstName: 'Mina',
      brothersCount: -1,
    })).toThrow();
  });

  it('returns a safe stable validation error without exposing field values', () => {
    try {
      parseOrThrow(createStudentSchema, { firstName: 'private child data' });
      throw new Error('Expected validation to fail.');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect(error.status).toBe(400);
      expect(error.message).not.toContain('private child data');
    }
  });
});
