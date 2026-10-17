const API_ROOT = '/api/v1';
let memoryAccessToken = null;
let refreshInFlight = null;

export function setApiAccessToken(token) {
  memoryAccessToken = token;
}

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function sendRequest(path, { token, ...options } = {}) {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_ROOT}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 204) return null;

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error?.code ?? 'REQUEST_FAILED',
      payload?.error?.message ?? 'The request could not be completed.'
    );
  }
  return payload?.data;
}

async function refreshAccessToken() {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_ROOT}/auth/refresh`, {
      method: 'POST',
      headers: { 'X-CSRF-Protection': '1' },
      credentials: 'include',
    }).then(async (response) => {
      const payload = await response.json().catch(() => null);
      if (response.status === 401) return null;
      if (!response.ok) {
        throw new ApiError(
          response.status,
          payload?.error?.code ?? 'REFRESH_FAILED',
          payload?.error?.message ?? 'The session could not be refreshed.'
        );
      }
      return payload?.data?.accessToken ?? null;
    }).finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export async function apiRequest(path, options = {}) {
  const token = memoryAccessToken ?? options.token;
  try {
    return await sendRequest(path, { ...options, token });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || !token) throw error;

    const latestToken = memoryAccessToken;
    const refreshedToken = latestToken && latestToken !== token
      ? latestToken
      : await refreshAccessToken();
    if (!refreshedToken) {
      memoryAccessToken = null;
      window.dispatchEvent(new Event('balvatika:auth-expired'));
      throw error;
    }

    memoryAccessToken = refreshedToken;
    window.dispatchEvent(new CustomEvent('balvatika:access-token', { detail: refreshedToken }));
    return sendRequest(path, { ...options, token: refreshedToken });
  }
}

async function sendBinaryRequest(path, options, token) {
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_ROOT}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      payload?.error?.code ?? 'REQUEST_FAILED',
      payload?.error?.message ?? 'The request could not be completed.'
    );
  }
  return response.blob();
}

async function authorizedBinaryRequest(path, options = {}) {
  const token = memoryAccessToken ?? options.token;
  try {
    return await sendBinaryRequest(path, options, token);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || !token) throw error;
    const latestToken = memoryAccessToken;
    const refreshedToken = latestToken && latestToken !== token
      ? latestToken
      : await refreshAccessToken();
    if (!refreshedToken) {
      memoryAccessToken = null;
      window.dispatchEvent(new Event('balvatika:auth-expired'));
      throw error;
    }
    memoryAccessToken = refreshedToken;
    window.dispatchEvent(new CustomEvent('balvatika:access-token', { detail: refreshedToken }));
    return sendBinaryRequest(path, options, refreshedToken);
  }
}

export function apiPhotoRequest(path, options = {}) {
  return authorizedBinaryRequest(path, options);
}

export function uploadStudentPhoto(studentId, file, options = {}) {
  const form = new FormData();
  form.append('photo', file);
  return apiRequest(`/students/${studentId}/photo`, {
    ...options,
    method: 'POST',
    body: form,
  });
}

export function formatApiError(error) {
  if (error instanceof ApiError && error.status === 409) {
    return 'That application number is already in use. Check the number and try again.';
  }
  if (error instanceof ApiError && error.status === 401) {
    return 'Your session has expired. Please sign in again.';
  }
  if (error instanceof ApiError && error.status === 403) {
    return 'This action is not permitted.';
  }
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
}
