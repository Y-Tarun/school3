import { createHash, randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { durationInSeconds } from './config.js';

const issuer = 'balvatika-api';
const audience = 'balvatika-admin';

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createAccessToken(admin, config, sessionId) {
  return new SignJWT({ role: admin.role, type: 'access', sid: sessionId })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(admin.id)
    .setIssuedAt()
    .setExpirationTime(config.JWT_ACCESS_TTL)
    .sign(config.JWT_ACCESS_SECRET);
}

export async function createRefreshToken(admin, config, sessionId = randomUUID()) {
  const id = randomUUID();
  const token = await new SignJWT({ type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(admin.id)
    .setJti(id)
    .setIssuedAt()
    .setExpirationTime(config.JWT_REFRESH_TTL)
    .sign(config.JWT_REFRESH_SECRET);

  return {
    id,
    sessionId,
    token,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + durationInSeconds(config.JWT_REFRESH_TTL) * 1000),
  };
}

export async function verifyAccessToken(token, config) {
  const { payload } = await jwtVerify(token, config.JWT_ACCESS_SECRET, {
    issuer,
    audience,
    algorithms: ['HS256'],
  });
  if (payload.type !== 'access' || typeof payload.sub !== 'string' || typeof payload.sid !== 'string') {
    throw new Error('Invalid access token claims.');
  }
  return payload;
}

export async function verifyRefreshToken(token, config) {
  const { payload } = await jwtVerify(token, config.JWT_REFRESH_SECRET, {
    issuer,
    audience,
    algorithms: ['HS256'],
  });
  if (payload.type !== 'refresh' || typeof payload.sub !== 'string' || typeof payload.jti !== 'string') {
    throw new Error('Invalid refresh token claims.');
  }
  return payload;
}
