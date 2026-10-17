import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { hashToken } from '../src/tokens.js';

const origin = 'http://localhost:5173';
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error('Set TEST_DATABASE_URL to a dedicated disposable database ending in _test before running API integration tests.');
}

const databaseName = decodeURIComponent(new URL(testDatabaseUrl).pathname.slice(1).split('?')[0]);
if (!databaseName.endsWith('_test')) {
  throw new Error('Refusing to run integration tests: TEST_DATABASE_URL database name must end in _test.');
}

const photoDirectory = await mkdtemp(join(tmpdir(), 'balvatika-api-test-'));
const config = loadConfig({
  NODE_ENV: 'test',
  DATABASE_URL: testDatabaseUrl,
  API_PORT: '3001',
  WEB_ORIGIN: origin,
  JWT_ACCESS_SECRET: 'test-only-access-signing-secret-012345678901234567890123',
  JWT_ACCESS_TTL: '15m',
  JWT_REFRESH_SECRET: 'test-only-refresh-signing-secret-012345678901234567890123',
  JWT_REFRESH_TTL: '7d',
  PHOTO_STORAGE_DIR: photoDirectory,
});

const prisma = new PrismaClient({ datasourceUrl: testDatabaseUrl });
const app = createApp({ prisma, config });
const adminId = randomUUID();
const adminEmail = 'admin@balvatika.invalid';
const adminPassword = 'Synthetic-Admin-Password-Only-2026!';
let accessToken;
let refreshCookie;

function authenticated(method, path, token = accessToken) {
  return request(app)
    [method](path)
    .set('Authorization', `Bearer ${token}`)
    .set('Origin', origin);
}

async function login(email = adminEmail, password = adminPassword) {
  return request(app)
    .post('/api/v1/auth/login')
    .set('Origin', origin)
    .send({ email, password });
}

async function createStudent(overrides = {}) {
  const result = await authenticated('post', '/api/v1/students')
    .send({
      applicationNumber: `app-${randomUUID().slice(0, 8)}`,
      firstName: 'Riya',
      status: 'Applied',
      ...overrides,
    });
  expect(result.status).toBe(201);
  return result.body.data;
}

describe('versioned admin and student API', () => {
  beforeAll(async () => {
    await prisma.$connect();
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "contact_enquiries", "refresh_tokens", "student_revisions", "students", "admins" CASCADE'
    );
    await prisma.admin.create({
      data: {
        id: adminId,
        email: adminEmail,
        passwordHash: await argon2.hash(adminPassword, { type: argon2.argon2id }),
        role: 'ADMIN',
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await rm(photoDirectory, { recursive: true, force: true });
  });

  it('protects student APIs and uses generic login errors', async () => {
    const protectedResponse = await request(app).get('/api/v1/students');
    expect(protectedResponse.status).toBe(401);
    expect(protectedResponse.body.error.code).toBe('UNAUTHENTICATED');

    const invalidCredentials = await login('missing@balvatika.invalid', adminPassword);
    expect(invalidCredentials.status).toBe(401);
    expect(invalidCredentials.body.error).toEqual({
      code: 'UNAUTHENTICATED',
      message: 'Authentication is required.',
    });

    const invalidPassword = await login(adminEmail, 'incorrect password');
    expect(invalidPassword.status).toBe(401);
    expect(invalidPassword.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('logs in, refreshes with origin and CSRF checks, then revokes the current session on logout', async () => {
    const loginResponse = await login();
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.headers['cache-control']).toBe('no-store');
    expect(loginResponse.body.data.admin).toEqual({
      id: adminId,
      email: adminEmail,
      role: 'ADMIN',
    });
    expect(loginResponse.body.data.accessToken).toBeTruthy();
    expect(loginResponse.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(loginResponse.headers['set-cookie'][0]).toContain('SameSite=Strict');

    accessToken = loginResponse.body.data.accessToken;
    refreshCookie = loginResponse.headers['set-cookie'][0].split(';')[0];

    const currentAdmin = await authenticated('get', '/api/v1/auth/me');
    expect(currentAdmin.status).toBe(200);
    expect(currentAdmin.body.data.email).toBe(adminEmail);

    const csrfRejected = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Origin', origin)
      .set('Cookie', refreshCookie);
    expect(csrfRejected.status).toBe(403);

    const originRejected = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Origin', 'https://attacker.invalid')
      .set('X-CSRF-Protection', '1')
      .set('Cookie', refreshCookie);
    expect(originRejected.status).toBe(403);

    const refreshed = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Origin', origin)
      .set('X-CSRF-Protection', '1')
      .set('Cookie', refreshCookie);
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.accessToken).toBeTruthy();

    const rotatedAccessToken = refreshed.body.data.accessToken;
    const rotatedCookie = refreshed.headers['set-cookie'][0].split(';')[0];
    const initialRefreshToken = refreshCookie.slice('balvatika_refresh='.length);
    const rotatedRefreshToken = rotatedCookie.slice('balvatika_refresh='.length);
    const oldTokenRow = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(initialRefreshToken) },
    });
    expect(oldTokenRow.revokedAt).not.toBeNull();
    expect(oldTokenRow.replacedByTokenId).not.toBeNull();
    expect(oldTokenRow.tokenHash).not.toBe(initialRefreshToken);

    const logoutResponse = await request(app)
      .post('/api/v1/auth/logout')
      .set('Origin', origin)
      .set('X-CSRF-Protection', '1')
      .set('Cookie', rotatedCookie);
    expect(logoutResponse.status).toBe(204);
    expect(logoutResponse.headers['set-cookie'][0]).toContain('Expires=Thu, 01 Jan 1970');
    const activeTokens = await prisma.refreshToken.count({
      where: {
        sessionId: oldTokenRow.sessionId,
        revokedAt: null,
      },
    });
    expect(activeTokens).toBe(0);
    expect(rotatedRefreshToken).not.toBe(initialRefreshToken);

    const afterLogout = await authenticated('get', '/api/v1/auth/me', rotatedAccessToken);
    expect(afterLogout.status).toBe(401);
    const afterLogoutStudents = await authenticated('get', '/api/v1/students', rotatedAccessToken);
    expect(afterLogoutStudents.status).toBe(401);

    const nextLogin = await login();
    expect(nextLogin.status).toBe(200);
    accessToken = nextLogin.body.data.accessToken;
  });

  it('creates and edits immutable revisions, reports stale bases, and keeps writes atomic', async () => {
    const first = await createStudent({
      applicationNumber: ' app-1001 ',
      firstName: 'Riya',
      status: 'Pending',
      class: 'Nursery',
    });
    expect(first.currentRevision.applicationNumber).toBe('APP-1001');
    expect(first.currentRevision.revisionNumber).toBe(1);
    expect(first.currentRevision.createdByAdminId).toBe(adminId);

    const initialRevisionId = first.currentRevision.id;
    const editOne = await authenticated('patch', `/api/v1/students/${first.id}`)
      .send({
        basedOnRevisionId: initialRevisionId,
        changes: { firstName: 'Mira', surname: 'Devi' },
      });
    expect(editOne.status).toBe(200);
    expect(editOne.body.data.currentRevision.revisionNumber).toBe(2);
    expect(editOne.body.data.staleBase).toBe(false);

    const staleEdit = await authenticated('patch', `/api/v1/students/${first.id}`)
      .send({
        basedOnRevisionId: initialRevisionId,
        changes: { surname: 'Kaur' },
      });
    expect(staleEdit.status).toBe(200);
    expect(staleEdit.body.data.staleBase).toBe(true);
    expect(staleEdit.body.data.previousCurrentRevisionId).toBe(editOne.body.data.currentRevision.id);
    expect(staleEdit.body.data.currentRevision.firstName).toBe('Riya');
    expect(staleEdit.body.data.currentRevision.surname).toBe('Kaur');
    expect(staleEdit.body.data.currentRevision.basedOnRevisionId).toBe(initialRevisionId);

    const history = await authenticated('get', `/api/v1/students/${first.id}/revisions`);
    expect(history.status).toBe(200);
    expect(history.body.data.map((item) => item.revisionNumber)).toEqual([3, 2, 1]);
    expect(history.body.data.at(-1).firstName).toBe('Riya');
    expect(history.body.data[1].firstName).toBe('Mira');

    const historicalDetail = await authenticated(
      'get',
      `/api/v1/students/${first.id}/revisions/${initialRevisionId}`
    );
    expect(historicalDetail.status).toBe(200);
    expect(historicalDetail.body.data.firstName).toBe('Riya');
    expect(historicalDetail.body.data.surname).toBeNull();
    const historicalWrite = await authenticated(
      'patch',
      `/api/v1/students/${first.id}/revisions/${initialRevisionId}`
    ).send({ firstName: 'Should Not Change' });
    expect(historicalWrite.status).toBe(404);

    const invalidStudent = await authenticated('post', '/api/v1/students')
      .send({ applicationNumber: 'INVALID', firstName: '' });
    expect(invalidStudent.status).toBe(400);
    expect(invalidStudent.body.error.code).toBe('VALIDATION_ERROR');

    const second = await createStudent({ applicationNumber: 'APP-2002', firstName: 'Asha' });
    const failedEdit = await authenticated('patch', `/api/v1/students/${first.id}`)
      .send({
        basedOnRevisionId: staleEdit.body.data.currentRevision.id,
        changes: { applicationNumber: second.currentRevision.applicationNumber },
      });
    expect(failedEdit.status).toBe(409);

    const afterFailedEdit = await authenticated('get', `/api/v1/students/${first.id}`);
    expect(afterFailedEdit.status).toBe(200);
    expect(afterFailedEdit.body.data.currentRevision.id).toBe(staleEdit.body.data.currentRevision.id);
    const historyAfterFailure = await authenticated('get', `/api/v1/students/${first.id}/revisions`);
    expect(historyAfterFailure.body.data).toHaveLength(3);
  });

  it('serializes concurrent writes without losing revisions or breaking the current pointer', async () => {
    const student = await createStudent({ applicationNumber: 'APP-CONCURRENT', firstName: 'Tara' });
    const baseRevisionId = student.currentRevision.id;

    const responses = await Promise.all([
      authenticated('patch', `/api/v1/students/${student.id}`)
        .send({ basedOnRevisionId: baseRevisionId, changes: { surname: 'One' } }),
      authenticated('patch', `/api/v1/students/${student.id}`)
        .send({ basedOnRevisionId: baseRevisionId, changes: { surname: 'Two' } }),
    ]);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect(responses.map((response) => response.body.data.currentRevision.revisionNumber).sort())
      .toEqual([2, 3]);
    expect(responses.filter((response) => response.body.data.staleBase)).toHaveLength(1);

    const [profile, history] = await Promise.all([
      authenticated('get', `/api/v1/students/${student.id}`),
      authenticated('get', `/api/v1/students/${student.id}/revisions`),
    ]);
    expect(profile.status).toBe(200);
    expect(history.body.data).toHaveLength(3);
    expect(profile.body.data.currentRevision.id).toBe(history.body.data[0].id);
    expect(profile.body.data.currentRevision.revisionNumber).toBe(3);

    const concurrentDuplicates = await Promise.all([
      authenticated('post', '/api/v1/students')
        .send({ applicationNumber: 'APP-DUPLICATE-RACE', firstName: 'Synthetic A' }),
      authenticated('post', '/api/v1/students')
        .send({ applicationNumber: 'APP-DUPLICATE-RACE', firstName: 'Synthetic B' }),
    ]);
    expect(concurrentDuplicates.map((response) => response.status).sort()).toEqual([201, 409]);
    const duplicateCount = await prisma.student.count({
      where: { currentApplicationNumber: 'APP-DUPLICATE-RACE' },
    });
    expect(duplicateCount).toBe(1);
  });

  it('filters records, enforces revision ownership, and marks inactive without altering admission status', async () => {
    const pending = await createStudent({
      applicationNumber: 'APP-FILTER-1',
      firstName: 'Aarav',
      status: 'Pending',
    });
    const rejected = await createStudent({
      applicationNumber: 'APP-FILTER-2',
      firstName: 'Vihaan',
      status: 'Rejected',
    });

    const defaultList = await authenticated('get', '/api/v1/students?page=1&pageSize=100');
    expect(defaultList.status).toBe(200);
    expect(defaultList.body.data.items.map((item) => item.status)).toEqual(
      expect.arrayContaining(['Pending', 'Rejected'])
    );
    expect(defaultList.body.data.items.find((item) => item.id === rejected.id).address).toBeUndefined();

    const statusFiltered = await authenticated('get', '/api/v1/students?status=Rejected');
    expect(statusFiltered.body.data.items.every((item) => item.status === 'Rejected')).toBe(true);

    const searchFiltered = await authenticated('get', '/api/v1/students?q=Vihaan');
    expect(searchFiltered.body.data.items.map((item) => item.id)).toContain(rejected.id);

    const wrongOwnerRevision = await authenticated(
      'get',
      `/api/v1/students/${pending.id}/revisions/${rejected.currentRevision.id}`
    );
    expect(wrongOwnerRevision.status).toBe(404);

    const deactivated = await authenticated('patch', `/api/v1/students/${pending.id}/lifecycle`)
      .send({ lifecycleStatus: 'Inactive' });
    expect(deactivated.status).toBe(200);
    expect(deactivated.body.data.lifecycleStatus).toBe('Inactive');

    const afterDeactivation = await authenticated('get', '/api/v1/students');
    expect(afterDeactivation.body.data.items.some((item) => item.id === pending.id)).toBe(false);
    const inactiveOnly = await authenticated('get', '/api/v1/students?lifecycle=Inactive');
    expect(inactiveOnly.body.data.items.map((item) => item.id)).toContain(pending.id);
    const profile = await authenticated('get', `/api/v1/students/${pending.id}`);
    expect(profile.body.data.lifecycleStatus).toBe('Inactive');
    expect(profile.body.data.currentRevision.status).toBe('Pending');
  });

  it('stores public contact enquiries when WhatsApp delivery is not configured', async () => {
    const submission = await request(app)
      .post('/api/v1/contact-enquiries')
      .send({
        parentName: 'Synthetic Parent',
        phoneNumber: '+91 90000 00000',
        classOfInterest: 'Nursery',
        message: 'Please share the school timings.',
        website: '',
      });
    expect(submission.status).toBe(201);
    expect(submission.body.data.notificationStatus).toBe('Failed');
    expect(submission.body.data.notificationErrorCode).toBe('PROVIDER_NOT_CONFIGURED');

    const saved = await prisma.contactEnquiry.findUnique({
      where: { id: submission.body.data.id },
    });
    expect(saved).toMatchObject({
      parentName: 'Synthetic Parent',
      phoneNumber: '+91 90000 00000',
      classOfInterest: 'Nursery',
      notificationStatus: 'Failed',
      notificationErrorCode: 'PROVIDER_NOT_CONFIGURED',
    });

    const publicList = await request(app).get('/api/v1/contact-enquiries');
    expect(publicList.status).toBe(401);
    const adminList = await authenticated('get', '/api/v1/contact-enquiries');
    expect(adminList.status).toBe(200);
    expect(adminList.body.data.items[0].id).toBe(submission.body.data.id);
  });

  it('records successful WhatsApp delivery after persisting an enquiry', async () => {
    const notificationProvider = { sendEnquiry: vi.fn().mockResolvedValue({ sent: true }) };
    const notificationApp = createApp({ prisma, config, notificationProvider });
    const submission = await request(notificationApp)
      .post('/api/v1/contact-enquiries')
      .send({
        parentName: 'Synthetic Parent',
        phoneNumber: '+91 90000 00001',
        classOfInterest: 'LKG',
        message: 'Please arrange a visit.',
      });
    expect(submission.status).toBe(201);
    expect(submission.body.data.notificationStatus).toBe('Sent');
    expect(submission.body.data.notificationErrorCode).toBeNull();
    expect(notificationProvider.sendEnquiry).toHaveBeenCalledWith(expect.objectContaining({
      parentName: 'Synthetic Parent',
      classOfInterest: 'LKG',
    }));
  });

  it('rejects invalid and oversized photos and serves owned photos only to an admin', async () => {
    const student = await createStudent({ applicationNumber: 'APP-PHOTO-1', firstName: 'Photo' });
    const invalidPhoto = await authenticated('post', `/api/v1/students/${student.id}/photo`)
      .attach('photo', Buffer.from('not an image'), { filename: 'not.png', contentType: 'image/png' });
    expect(invalidPhoto.status).toBe(415);
    const truncatedPhoto = await authenticated('post', `/api/v1/students/${student.id}/photo`)
      .attach('photo', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), {
        filename: 'truncated.png',
        contentType: 'image/png',
      });
    expect(truncatedPhoto.status).toBe(415);

    const oversizedPhoto = await authenticated('post', `/api/v1/students/${student.id}/photo`)
      .attach('photo', Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: 'large.png',
        contentType: 'image/png',
      });
    expect(oversizedPhoto.status).toBe(413);

    const png = await sharp({
      create: { width: 1, height: 1, channels: 4, background: { r: 0, g: 80, b: 180, alpha: 1 } },
    }).png().toBuffer();
    const upload = await authenticated('post', `/api/v1/students/${student.id}/photo`)
      .attach('photo', png, { filename: 'student.png', contentType: 'image/png' });
    expect(upload.status).toBe(201);
    const photoLocator = upload.body.data.currentRevision.photoLocator;
    const firstPhotoId = photoLocator.match(/^local:([0-9a-f-]{36})\.webp$/)?.[1];
    expect(firstPhotoId).toBeTruthy();

    const privatePhoto = await request(app)
      .get(`/api/v1/students/${student.id}/photo/${firstPhotoId}`);
    expect(privatePhoto.status).toBe(401);
    const authorizedPhoto = await authenticated(
      'get',
      `/api/v1/students/${student.id}/photo/${firstPhotoId}`
    );
    expect(authorizedPhoto.status).toBe(200);
    expect(authorizedPhoto.headers['content-type']).toContain('image/webp');
    expect(authorizedPhoto.headers['cache-control']).toContain('private');
    expect(authorizedPhoto.body.subarray(8, 12).toString()).toBe('WEBP');

    const replacement = await authenticated('post', `/api/v1/students/${student.id}/photo`)
      .attach('photo', png, { filename: 'replacement.png', contentType: 'image/png' });
    expect(replacement.status).toBe(201);
    expect(replacement.body.data.currentRevision.photoLocator).not.toBe(photoLocator);
    const revisions = await authenticated('get', `/api/v1/students/${student.id}/revisions`);
    expect(revisions.body.data).toHaveLength(3);
    expect(revisions.body.data[1].id).toBe(upload.body.data.currentRevision.id);
    const historicalPhoto = await authenticated(
      'get',
      `/api/v1/students/${student.id}/photo/${firstPhotoId}`
    );
    expect(historicalPhoto.status).toBe(200);
  });
});
