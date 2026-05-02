import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export type UserRole = 'admin' | 'lead' | 'member';

export interface AuthorInfo {
  id: number;
  name: string;
  email?: string;
  member_role?: string;
  group_type?: string;
}

export interface CurrentUser {
  id: number;
  username: string;
  role: UserRole;
  author_id?: number | null;
  author?: AuthorInfo | null;
}

interface AuthContextValue {
  user: CurrentUser | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, role: UserRole, author_id?: number | null) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
  }, []);

  // Verify token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    if (!savedToken) { setIsLoading(false); return; }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${savedToken}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) { setUser(data); setToken(savedToken); }
        else logout();
      })
      .catch(logout)
      .finally(() => setIsLoading(false));
  }, [logout]);

  const login = async (username: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Đăng nhập thất bại');
    localStorage.setItem('auth_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (username: string, password: string, role: UserRole, author_id?: number | null) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role, author_id: author_id || null }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Đăng ký thất bại');
    localStorage.setItem('auth_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
