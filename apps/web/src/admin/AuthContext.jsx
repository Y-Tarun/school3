import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest, formatApiError, setApiAccessToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [checkingSession, setCheckingSession] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const restoreInFlight = useRef(null);

  useEffect(() => {
    function handleAccessToken(event) {
      setAccessToken(event.detail);
    }
    function handleExpiredSession() {
      setApiAccessToken(null);
      setAccessToken(null);
      setAdmin(null);
      setSessionError('Your session has expired. Please sign in again.');
      setSessionChecked(true);
    }
    window.addEventListener('balvatika:access-token', handleAccessToken);
    window.addEventListener('balvatika:auth-expired', handleExpiredSession);
    return () => {
      window.removeEventListener('balvatika:access-token', handleAccessToken);
      window.removeEventListener('balvatika:auth-expired', handleExpiredSession);
    };
  }, []);

  const restoreSession = useCallback(async () => {
    if (sessionChecked) return Boolean(accessToken);
    if (restoreInFlight.current) return restoreInFlight.current;

    const restoreRequest = (async () => {
      setCheckingSession(true);
      try {
        const session = await apiRequest('/auth/refresh', {
          method: 'POST',
          headers: { 'X-CSRF-Protection': '1' },
        });
        setSessionError('');
        setApiAccessToken(session.accessToken);
        setAccessToken(session.accessToken);
        setAdmin(session.admin);
        return true;
      } catch (error) {
        setSessionError(error.status === 401 ? '' : formatApiError(error));
        setApiAccessToken(null);
        setAccessToken(null);
        setAdmin(null);
        return false;
      } finally {
        setSessionChecked(true);
        setCheckingSession(false);
      }
    })();
    restoreInFlight.current = restoreRequest;
    try {
      return await restoreRequest;
    } finally {
      if (restoreInFlight.current === restoreRequest) restoreInFlight.current = null;
    }
  }, [accessToken, sessionChecked]);

  const signIn = useCallback(async (email, password) => {
    const session = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setSessionError('');
    setApiAccessToken(session.accessToken);
    setAccessToken(session.accessToken);
    setAdmin(session.admin);
    setSessionChecked(true);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
        headers: { 'X-CSRF-Protection': '1' },
      });
    } finally {
      setApiAccessToken(null);
      setAccessToken(null);
      setAdmin(null);
      setSessionError('');
      setSessionChecked(true);
    }
  }, []);

  const value = useMemo(() => ({
    accessToken,
    admin,
    checkingSession,
    sessionChecked,
    sessionError,
    restoreSession,
    signIn,
    signOut,
  }), [accessToken, admin, checkingSession, sessionChecked, sessionError, restoreSession, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
