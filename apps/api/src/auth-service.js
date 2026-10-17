import argon2 from 'argon2';
import { unauthorizedError } from './errors.js';
import {
  createAccessToken,
  createRefreshToken,
  hashToken,
  verifyRefreshToken,
} from './tokens.js';

const dummyPasswordHash =
  '$argon2id$v=19$m=19456,t=2,p=1$5gA09VwFGGdBtN1p3v2keg$3TtpquH1e06qN5QyyQ9ITVykWje68tIV4ifptkZd5/k';

export function refreshCookieOptions(config) {
  return {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/v1/auth',
    maxAge: Number(config.JWT_REFRESH_TTL.slice(0, -1)) * ({
      s: 1000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    }[config.JWT_REFRESH_TTL.at(-1)]),
  };
}

export function clearRefreshCookie(response, config) {
  const { maxAge, ...cookieOptions } = refreshCookieOptions(config);
  response.clearCookie('balvatika_refresh', cookieOptions);
}

export function readCookie(request, name) {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    return part.slice(separator + 1).trim();
  }
  return null;
}

async function issueSession(admin, prisma, config) {
  const refreshToken = await createRefreshToken(admin, config);
  await prisma.refreshToken.create({
    data: {
      id: refreshToken.id,
      adminId: admin.id,
      sessionId: refreshToken.sessionId,
      tokenHash: refreshToken.tokenHash,
      expiresAt: refreshToken.expiresAt,
    },
  });
  const accessToken = await createAccessToken(admin, config, refreshToken.sessionId);
  return { refreshToken: refreshToken.token, accessToken };
}

export async function login({ email, password }, prisma, config) {
  const admin = await prisma.admin.findUnique({ where: { email } });
  const passwordMatches = await argon2.verify(admin?.passwordHash ?? dummyPasswordHash, password);

  if (!admin || !passwordMatches) {
    throw unauthorizedError();
  }

  return { admin, ...(await issueSession(admin, prisma, config)) };
}

export async function refresh(refreshTokenString, prisma, config) {
  let claims;
  try {
    claims = await verifyRefreshToken(refreshTokenString, config);
  } catch {
    throw unauthorizedError();
  }

  const tokenHash = hashToken(refreshTokenString);
  const existingToken = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!existingToken || existingToken.id !== claims.jti || existingToken.adminId !== claims.sub) {
    throw unauthorizedError();
  }

  if (existingToken.revokedAt || existingToken.expiresAt <= new Date()) {
    if (existingToken.revokedAt) {
      await prisma.refreshToken.updateMany({
        where: {
          adminId: existingToken.adminId,
          sessionId: existingToken.sessionId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    }
    throw unauthorizedError();
  }

  const admin = await prisma.admin.findUnique({ where: { id: existingToken.adminId } });
  if (!admin) throw unauthorizedError();

  const nextToken = await createRefreshToken(admin, config, existingToken.sessionId);
  const accessToken = await createAccessToken(admin, config, existingToken.sessionId);

  await prisma.$transaction(async (transaction) => {
    await transaction.refreshToken.create({
      data: {
        id: nextToken.id,
        adminId: admin.id,
        sessionId: nextToken.sessionId,
        tokenHash: nextToken.tokenHash,
        expiresAt: nextToken.expiresAt,
      },
    });

    const claimed = await transaction.refreshToken.updateMany({
      where: {
        id: existingToken.id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { revokedAt: new Date(), replacedByTokenId: nextToken.id },
    });
    if (claimed.count !== 1) throw unauthorizedError();
  });

  return { admin, refreshToken: nextToken.token, accessToken };
}

export async function logout(refreshTokenString, prisma) {
  if (!refreshTokenString) return;

  const token = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshTokenString) },
    select: { adminId: true, sessionId: true },
  });
  if (!token) return;

  await prisma.refreshToken.updateMany({
    where: { adminId: token.adminId, sessionId: token.sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
