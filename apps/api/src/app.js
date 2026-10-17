import cors from 'cors';
import express from 'express';
import multer from 'multer';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { z } from 'zod';
import { HttpError, unauthorizedError } from './errors.js';
import {
  clearRefreshCookie,
  login,
  logout,
  readCookie,
  refresh,
  refreshCookieOptions,
} from './auth-service.js';
import { createAuthenticationMiddleware } from './auth-middleware.js';
import {
  createStudent,
  attachStudentPhoto,
  editStudent,
  getStudent,
  getStudentRevision,
  getStudentRevisionByPhotoId,
  listStudentRevisions,
  listStudents,
  markStudentInactive,
} from './student-service.js';
import { createContactEnquiry, listContactEnquiries } from './contact-service.js';
import { createPhotoStorage } from './photo-storage.js';
import { createWhatsAppProvider } from './whatsapp-provider.js';
import {
  createStudentSchema,
  editStudentSchema,
  lifecycleSchema,
  loginSchema,
  parseOrThrow,
  uuidParamSchema,
} from './validation.js';

const asyncRoute = (handler) => (request, response, next) => {
  Promise.resolve(handler(request, response, next)).catch(next);
};

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(100).default(''),
  status: z.enum(['Applied', 'Pending', 'Admitted', 'Rejected']).optional(),
  lifecycle: z.enum(['Active', 'Inactive', 'All']).default('Active'),
}).strict();

const contactEnquirySchema = z.object({
  parentName: z.string().trim().min(1).max(100),
  phoneNumber: z.string().trim().min(1).max(32),
  classOfInterest: z.enum(['Playway', 'Nursery', 'LKG', 'UKG']),
  message: z.string().trim().min(1).max(2000),
  website: z.string().max(0).optional(),
}).strict();

const contactListSchema = z.object({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
}).strict();

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0, parts: 1 },
  fileFilter: (_request, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      callback(new HttpError(415, 'UNSUPPORTED_PHOTO_TYPE', 'Upload a JPEG, PNG, or WebP image.'));
      return;
    }
    callback(null, true);
  },
}).single('photo');

function parsePhotoId(value) {
  return parseOrThrow(uuidParamSchema, value);
}

function requireBrowserOrigin(request, config, requireCustomHeader = false) {
  if (request.get('origin') !== config.WEB_ORIGIN) {
    throw new HttpError(403, 'FORBIDDEN_ORIGIN', 'This request is not allowed.');
  }
  if (requireCustomHeader && request.get('x-csrf-protection') !== '1') {
    throw new HttpError(403, 'CSRF_CHECK_FAILED', 'This request is not allowed.');
  }
}

function parseStudentId(value) {
  return parseOrThrow(uuidParamSchema, value);
}

function buildAuthRouter(prisma, config) {
  const router = express.Router();
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many authentication attempts. Please try again later.' } },
  });

  router.post('/login', authLimiter, asyncRoute(async (request, response) => {
    requireBrowserOrigin(request, config);
    const credentials = parseOrThrow(loginSchema, request.body);
    try {
      const session = await login(credentials, prisma, config);
      response.cookie('balvatika_refresh', session.refreshToken, refreshCookieOptions(config));
      response.json({
        data: {
          accessToken: session.accessToken,
          tokenType: 'Bearer',
          expiresIn: Number(config.JWT_ACCESS_TTL.slice(0, -1)) * ({
            s: 1,
            m: 60,
            h: 3600,
            d: 86400,
          }[config.JWT_ACCESS_TTL.at(-1)]),
          admin: { id: session.admin.id, email: session.admin.email, role: session.admin.role },
        },
      });
    } catch (error) {
      if (error instanceof HttpError && error.status === 401) {
        console.warn('Authentication failed', { reason: 'invalid_credentials' });
      }
      throw error;
    }
  }));

  router.post('/refresh', authLimiter, asyncRoute(async (request, response) => {
    requireBrowserOrigin(request, config, true);
    const refreshToken = readCookie(request, 'balvatika_refresh');
    if (!refreshToken) throw unauthorizedError();

    try {
      const session = await refresh(refreshToken, prisma, config);
      response.cookie('balvatika_refresh', session.refreshToken, refreshCookieOptions(config));
      response.json({
        data: {
          accessToken: session.accessToken,
          tokenType: 'Bearer',
          expiresIn: Number(config.JWT_ACCESS_TTL.slice(0, -1)) * ({
            s: 1,
            m: 60,
            h: 3600,
            d: 86400,
          }[config.JWT_ACCESS_TTL.at(-1)]),
          admin: { id: session.admin.id, email: session.admin.email, role: session.admin.role },
        },
      });
    } catch (error) {
      clearRefreshCookie(response, config);
      throw error;
    }
  }));

  router.post('/logout', asyncRoute(async (request, response) => {
    requireBrowserOrigin(request, config, true);
    await logout(readCookie(request, 'balvatika_refresh'), prisma);
    clearRefreshCookie(response, config);
    response.status(204).end();
  }));

  router.get('/me', createAuthenticationMiddleware(prisma, config), (request, response) => {
    response.json({ data: { id: request.admin.id, email: request.admin.email, role: request.admin.role } });
  });

  return router;
}

function buildStudentsRouter(prisma, config, photoStorage) {
  const router = express.Router();
  const authenticate = createAuthenticationMiddleware(prisma, config);
  const photoLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many photo uploads. Please try again later.' } },
  });
  router.use(authenticate);

  router.post('/:id/photo', photoLimiter, (request, response, next) => {
    photoUpload(request, response, (error) => {
      if (error instanceof multer.MulterError) {
        const tooLarge = error.code === 'LIMIT_FILE_SIZE';
        next(new HttpError(
          tooLarge ? 413 : 400,
          tooLarge ? 'PHOTO_TOO_LARGE' : 'INVALID_PHOTO_UPLOAD',
          tooLarge ? 'The photo must be 5 MiB or smaller.' : 'Upload one photo using the photo field.'
        ));
        return;
      }
      next(error);
    });
  }, asyncRoute(async (request, response) => {
    const studentId = parseStudentId(request.params.id);
    if (!request.file) throw new HttpError(400, 'PHOTO_REQUIRED', 'Choose a photo to upload.');
    const student = await getStudent(prisma, studentId);
    const storedPhoto = await photoStorage.store(request.file.buffer, request.file.mimetype);
    try {
      const result = await attachStudentPhoto(
        prisma,
        request.admin.id,
        studentId,
        student.currentRevision.id,
        storedPhoto.locator
      );
      response.status(201).json({ data: result });
    } catch (error) {
      await photoStorage.remove(storedPhoto.locator);
      throw error;
    }
  }));

  router.get('/:id/photo/:photoId', asyncRoute(async (request, response) => {
    const studentId = parseStudentId(request.params.id);
    const photoId = parsePhotoId(request.params.photoId);
    const revision = await getStudentRevisionByPhotoId(prisma, studentId, photoId);
    const photo = await photoStorage.read(revision.photoLocator);
    response.type(photo.contentType).set('Cache-Control', 'private, no-store').send(photo.buffer);
  }));

  router.get('/:id/photo', asyncRoute(async (request, response) => {
    const student = await getStudent(prisma, parseStudentId(request.params.id));
    const photoId = photoStorage.photoIdFromLocator(student.currentRevision.photoLocator);
    if (!photoId) throw new HttpError(404, 'PHOTO_NOT_FOUND', 'The requested photo was not found.');
    const photo = await photoStorage.read(student.currentRevision.photoLocator);
    response.type(photo.contentType).set('Cache-Control', 'private, no-store').send(photo.buffer);
  }));

  router.get('/', asyncRoute(async (request, response) => {
    const filters = parseOrThrow(paginationSchema, request.query);
    const result = await listStudents(prisma, {
      page: filters.page,
      pageSize: filters.pageSize,
      search: filters.q,
      status: filters.status,
      lifecycle: filters.lifecycle,
    });
    response.json({ data: result });
  }));

  router.post('/', asyncRoute(async (request, response) => {
    const student = await createStudent(prisma, request.admin.id, parseOrThrow(createStudentSchema, request.body));
    response.status(201).json({ data: student });
  }));

  router.get('/:id/revisions/:revisionId', asyncRoute(async (request, response) => {
    const studentId = parseStudentId(request.params.id);
    const revisionId = parseStudentId(request.params.revisionId);
    const revision = await getStudentRevision(prisma, studentId, revisionId);
    response.json({ data: revision });
  }));

  router.get('/:id/revisions', asyncRoute(async (request, response) => {
    const studentId = parseStudentId(request.params.id);
    const revisions = await listStudentRevisions(prisma, studentId);
    response.json({ data: revisions });
  }));

  router.patch('/:id/lifecycle', asyncRoute(async (request, response) => {
    const studentId = parseStudentId(request.params.id);
    const lifecycle = parseOrThrow(lifecycleSchema, request.body);
    const student = await markStudentInactive(prisma, studentId);
    response.json({ data: student });
  }));

  router.get('/:id', asyncRoute(async (request, response) => {
    const student = await getStudent(prisma, parseStudentId(request.params.id));
    response.json({ data: student });
  }));

  router.patch('/:id', asyncRoute(async (request, response) => {
    const studentId = parseStudentId(request.params.id);
    const input = parseOrThrow(editStudentSchema, request.body);
    const result = await editStudent(
      prisma,
      request.admin.id,
      studentId,
      input.basedOnRevisionId,
      input.changes
    );
    response.json({ data: result });
  }));

  return router;
}

export function createApp({ prisma, config, notificationProvider = createWhatsAppProvider(config) }) {
  const app = express();
  const photoStorage = createPhotoStorage({ directory: config.PHOTO_STORAGE_DIR });
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({
    origin: config.WEB_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-CSRF-Protection'],
  }));
  app.use(express.json({ limit: '32kb', strict: true }));

  const api = express.Router();
  api.use((request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  api.use('/auth', buildAuthRouter(prisma, config));
  api.use('/students', buildStudentsRouter(prisma, config, photoStorage));
  api.post('/contact-enquiries', rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many enquiries. Please try again later.' } },
  }), asyncRoute(async (request, response) => {
    const input = parseOrThrow(contactEnquirySchema, request.body);
    const result = await createContactEnquiry(prisma, config, input, notificationProvider);
    response.status(201).json({ data: result });
  }));
  api.get('/contact-enquiries', createAuthenticationMiddleware(prisma, config), asyncRoute(async (request, response) => {
    const filters = parseOrThrow(contactListSchema, request.query);
    response.json({ data: await listContactEnquiries(prisma, filters) });
  }));
  app.use('/api/v1', api);

  app.use((request, response, next) => {
    next(new HttpError(404, 'NOT_FOUND', 'The requested resource was not found.'));
  });

  app.use((error, request, response, next) => {
    if (response.headersSent) return next(error);

    if (error instanceof HttpError) {
      return response.status(error.status).json({
        error: { code: error.code, message: error.message },
      });
    }

    if (error?.type === 'entity.parse.failed' || error?.type === 'entity.too.large') {
      const status = error.type === 'entity.too.large' ? 413 : 400;
      return response.status(status).json({
        error: {
          code: status === 413 ? 'REQUEST_TOO_LARGE' : 'INVALID_JSON',
          message: status === 413 ? 'The request is too large.' : 'The request body must be valid JSON.',
        },
      });
    }

    if (error?.code === 'LIMIT_FILE_SIZE') {
      return response.status(413).json({
        error: { code: 'PHOTO_TOO_LARGE', message: 'The photo must be 5 MiB or smaller.' },
      });
    }

    console.error('API request failed', {
      method: request.method,
      path: request.path,
      errorCode: typeof error?.code === 'string' ? error.code : 'UNEXPECTED_ERROR',
    });
    return response.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
    });
  });

  return app;
}
