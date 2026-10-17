export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

export function notFoundError() {
  return new HttpError(404, 'NOT_FOUND', 'The requested resource was not found.');
}

export function unauthorizedError() {
  return new HttpError(401, 'UNAUTHENTICATED', 'Authentication is required.');
}
