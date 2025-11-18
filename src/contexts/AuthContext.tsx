import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserSession, RegisterRequest, LoginRequest } from '../types/auth';
import { AuthService } from '../services/auth.service';

interface AuthContextType {
  user: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (request: LoginRequest) => Promise<void>;
  register: (request: RegisterRequest) => Promise<void>;
  logout: () => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_SESSION_KEY = 'cham_lang_user_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user session from localStorage on mount
  useEffect(() => {
    const loadUserSession = () => {
      try {
        const storedSession = localStorage.getItem(USER_SESSION_KEY);
        if (storedSession) {
          const session = JSON.parse(storedSession) as UserSession;
          setUser(session);
        }
      } catch (error) {
        console.error('Failed to load user session:', error);
        localStorage.removeItem(USER_SESSION_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserSession();
  }, []);

  const login = async (request: LoginRequest) => {
    try {
      const session = await AuthService.login(request);
      setUser(session);
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (request: RegisterRequest) => {
    try {
      const session = await AuthService.register(request);
      setUser(session);
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(USER_SESSION_KEY);
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    if (!user) {
      throw new Error('No user logged in');
    }

    try {
      await AuthService.changePassword(user.user_id, oldPassword, newPassword);
    } catch (error) {
      console.error('Change password failed:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
