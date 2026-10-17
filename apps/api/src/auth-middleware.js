import { unauthorizedError, HttpError } from './errors.js';
import { verifyAccessToken } from './tokens.js';

export function createAuthenticationMiddleware(prisma, config) {
  return async function authenticate(request, response, next) {
    const authorization = request.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return next(unauthorizedError());
    }

    let claims;
    try {
      claims = await verifyAccessToken(authorization.slice(7), config);
    } catch {
      return next(unauthorizedError());
    }

    try {
      const [admin, activeSession] = await Promise.all([
        prisma.admin.findUnique({
          where: { id: claims.sub },
          select: { id: true, email: true, role: true },
        }),
        prisma.refreshToken.findFirst({
          where: {
            adminId: claims.sub,
            sessionId: claims.sid,
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
          select: { id: true },
        }),
      ]);
      if (!admin || !activeSession) return next(unauthorizedError());

      request.admin = admin;
      if (admin.role !== 'ADMIN') {
        return next(new HttpError(403, 'FORBIDDEN', 'You do not have permission to access this resource.'));
      }
      return next();
    } catch (error) {
      return next(error);
    }
  };
}
