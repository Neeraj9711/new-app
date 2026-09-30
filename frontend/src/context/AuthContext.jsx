import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, getAuthToken, setAuthToken } from '../services/api';
import { useLanguage } from './LanguageContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { language } = useLanguage();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(getAuthToken()));

  const refreshUser = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const data = await authApi.me();
      setUser(data.user);
      setLoading(false);
      return data.user;
    } catch {
      setAuthToken(null);
      setUser(null);
      setLoading(false);
      return null;
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const loginWithGoogle = useCallback(async (idToken) => {
    const data = await authApi.google(idToken, language);
    setAuthToken(data.token);
    setUser(data.user);
    return data;
  }, [language]);

  const updateProfile = useCallback(async (phone, city) => {
    const data = await authApi.profile(phone, city);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    setAuthToken(null);
    setUser(null);
  }, []);

  const track = useCallback((type, path, meta) => {
    if (!getAuthToken()) return;
    authApi.track(type, path, meta);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      loginWithGoogle,
      updateProfile,
      logout,
      refreshUser,
      track,
      needsProfile: Boolean(user && (!user.phone || !user.city)),
    }),
    [user, loading, loginWithGoogle, updateProfile, logout, refreshUser, track],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
