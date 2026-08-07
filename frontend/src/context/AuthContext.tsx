import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // Crucial for reading/storing HTTPOnly Cookies
});

interface User {
  email: string;
  phone: string;
  full_name: string;
  company: string;
  designation: string;
  country: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  registerUser: (payload: { 
    email: string; 
    password?: string;
    full_name: string; 
    company: string; 
    designation: string; 
    phone: string; 
    country: string; 
  }) => Promise<any>;
  verifyRegistrationOTP: (identifier: string, otp: string) => Promise<any>;
  requestLoginOTP: (method: string, identifier: string) => Promise<any>;
  verifyLoginOTP: (identifier: string, otp: string) => Promise<any>;
  loginWithPassword: (email: string, password: string) => Promise<any>;
  requestForgotPasswordOTP: (method: string, identifier: string) => Promise<any>;
  resetPassword: (payload: any) => Promise<any>;
  logoutUser: () => Promise<any>;
  checkSession: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSession = async () => {
    try {
      const res = await api.get('/api/auth/me');
      setUser(res.data);
      localStorage.setItem('user_fullname', res.data.full_name);
      localStorage.setItem('user_role', res.data.role);
    } catch (e) {
      setUser(null);
      localStorage.removeItem('user_fullname');
      localStorage.removeItem('user_role');
      localStorage.removeItem('access_token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const registerUser = async (payload: any) => {
    const res = await api.post('/api/auth/register', payload);
    return res.data;
  };

  const verifyRegistrationOTP = async (identifier: string, otp: string) => {
    const res = await api.post('/api/auth/verify-registration', { identifier, otp });
    setUser(res.data.user);
    localStorage.setItem('access_token', res.data.access_token);
    localStorage.setItem('user_role', res.data.user.role);
    localStorage.setItem('user_fullname', res.data.user.full_name);
    return res.data;
  };

  const requestLoginOTP = async (method: string, identifier: string) => {
    const res = await api.post('/api/auth/login-otp', { method, identifier });
    return res.data;
  };

  const verifyLoginOTP = async (identifier: string, otp: string) => {
    const res = await api.post('/api/auth/verify-login', { identifier, otp });
    setUser(res.data.user);
    localStorage.setItem('access_token', res.data.access_token);
    localStorage.setItem('user_role', res.data.user.role);
    localStorage.setItem('user_fullname', res.data.user.full_name);
    return res.data;
  };

  const requestForgotPasswordOTP = async (method: string, identifier: string) => {
    const res = await api.post('/api/auth/forgot-password', { method, identifier });
    return res.data;
  };

  const loginWithPassword = async (email: string, password: string) => {
    const res = await api.post('/api/auth/login-password', { email, password });
    setUser(res.data.user);
    localStorage.setItem('access_token', res.data.access_token);
    localStorage.setItem('user_role', res.data.user.role);
    localStorage.setItem('user_fullname', res.data.user.full_name);
    return res.data;
  };

  const resetPassword = async (payload: any) => {
    const res = await api.post('/api/auth/reset-password', payload);
    return res.data;
  };

  const logoutUser = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (e) {
      console.error(e);
    }
    setUser(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_fullname');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        registerUser,
        verifyRegistrationOTP,
        requestLoginOTP,
        verifyLoginOTP,
        loginWithPassword,
        requestForgotPasswordOTP,
        resetPassword,
        logoutUser,
        checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
