import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { User } from '../types';
import * as authStorage from '../services/authStorage';

interface AuthContextType {
  // User data
  user: User | null;
  userName: string;
  
  // Authentication state
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (pin: string) => Promise<boolean>;
  logout: () => Promise<void>;
  switchAccount: () => Promise<void>;
  createUser: (nome: string, pin: string) => Promise<User>;
  updatePin: (currentPin: string, newPin: string) => Promise<void>;
  updateName: (newName: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load user on mount
  useEffect(() => {
    loadUser();
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated && user) {
      // User exists but not authenticated, redirect to login
      // This is handled by the login screen itself
    }
  }, [isLoading, isAuthenticated, user]);

  const loadUser = async () => {
    try {
      const storedUser = await authStorage.getUser();
      setUser(storedUser);
      // User exists but is not authenticated until PIN is validated
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (pin: string): Promise<boolean> => {
    try {
      const isValid = await authStorage.validatePin(pin);
      if (isValid) {
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      setIsAuthenticated(false);
      router.replace('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const switchAccount = async () => {
    try {
      setIsAuthenticated(false);
      await authStorage.deleteUser();
      setUser(null);
      router.replace('/');
    } catch (error) {
      console.error('Switch account error:', error);
      throw error;
    }
  };

  const createUser = async (nome: string, pin: string): Promise<User> => {
    try {
      const newUser = await authStorage.createUser(nome, pin);
      setUser(newUser);
      setIsAuthenticated(true);
      return newUser;
    } catch (error) {
      console.error('Create user error:', error);
      throw error;
    }
  };

  const updatePin = async (currentPin: string, newPin: string): Promise<void> => {
    try {
      await authStorage.updatePin(currentPin, newPin);
      // Refresh user data
      await refreshUser();
    } catch (error) {
      console.error('Update PIN error:', error);
      throw error;
    }
  };

  const updateName = async (newName: string): Promise<void> => {
    try {
      await authStorage.updateName(newName);
      // Refresh user data
      await refreshUser();
    } catch (error) {
      console.error('Update name error:', error);
      throw error;
    }
  };

  const refreshUser = async () => {
    try {
      const storedUser = await authStorage.getUser();
      setUser(storedUser);
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  const value: AuthContextType = {
    user,
    userName: user?.nome || '',
    isAuthenticated,
    isLoading,
    login,
    logout,
    switchAccount,
    createUser,
    updatePin,
    updateName,
    refreshUser,
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
