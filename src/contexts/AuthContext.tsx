import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useRouter } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import { User } from '../types';
import { supabase } from '../services/supabase';
import {
  AUTH_ERROR_CODES,
  AuthFlowError,
  mapAuthError,
} from '../utils/authErrors';

export type SignUpResult = 'session_created' | 'email_confirmation_required';

interface AuthContextType {
  user: User | null;
  userName: string;
  userEmail: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (nome: string, email: string, password: string) => Promise<SignUpResult>;
  logout: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  updateName: (newName: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function mapSessionToUser(session: Session): Promise<User> {
  const authUser = session.user;

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, created_at, updated_at')
    .eq('id', authUser.id)
    .maybeSingle();

  const nome =
    profile?.nome ||
    (authUser.user_metadata?.nome as string | undefined) ||
    (authUser.user_metadata?.name as string | undefined) ||
    'Usuário';

  return {
    id: authUser.id,
    nome,
    email: authUser.email ?? '',
    createdAt: profile?.created_at ?? authUser.created_at,
    updatedAt: profile?.updated_at ?? authUser.updated_at ?? authUser.created_at,
  };
}

async function applySession(session: Session | null) {
  if (!session) {
    return { user: null, isAuthenticated: false };
  }

  const mappedUser = await mapSessionToUser(session);
  return { user: mappedUser, isAuthenticated: true };
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    const initSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!mounted) {
          return;
        }

        const nextState = await applySession(session);
        setUser(nextState.user);
        setIsAuthenticated(nextState.isAuthenticated);
      } catch (error) {
        console.error('Error loading session:', error);
        if (mounted) {
          setUser(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) {
        return;
      }

      try {
        const nextState = await applySession(session);
        setUser(nextState.user);
        setIsAuthenticated(nextState.isAuthenticated);
      } catch (error) {
        console.error('Error mapping session user:', error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      throw new Error(mapAuthError(error));
    }
  };

  const signUp = async (
    nome: string,
    email: string,
    password: string
  ): Promise<SignUpResult> => {
    const trimmedName = nome.trim();
    const trimmedEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: { nome: trimmedName },
      },
    });

    if (error) {
      throw new Error(mapAuthError(error));
    }

    if (data.user?.identities?.length === 0) {
      throw new AuthFlowError(
        AUTH_ERROR_CODES.ALREADY_REGISTERED,
        mapAuthError({ code: 'user_already_exists' })
      );
    }

    if (data.session) {
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ nome: trimmedName })
          .eq('id', data.user.id);

        if (profileError) {
          console.warn('Profile name update after signup failed:', profileError.message);
        }
      }

      return 'session_created';
    }

    return 'email_confirmation_required';
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }

      setUser(null);
      setIsAuthenticated(false);
      router.replace('/');
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error(mapAuthError(error));
    }
  };

  const updatePassword = async (newPassword: string): Promise<void> => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new Error(mapAuthError(error));
    }
  };

  const updateName = async (newName: string): Promise<void> => {
    const trimmedName = newName.trim();

    if (!trimmedName) {
      throw new Error('O nome não pode estar vazio.');
    }

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      throw new Error(mapAuthError(authError ?? new Error('Usuário não autenticado')));
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ nome: trimmedName })
      .eq('id', authUser.id);

    if (profileError) {
      throw new Error(mapAuthError(profileError));
    }

    const { error: metadataError } = await supabase.auth.updateUser({
      data: { nome: trimmedName },
    });

    if (metadataError) {
      throw new Error(mapAuthError(metadataError));
    }

    await refreshUser();
  };

  const refreshUser = async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      const nextState = await applySession(session);
      setUser(nextState.user);
      setIsAuthenticated(nextState.isAuthenticated);
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  const value: AuthContextType = {
    user,
    userName: user?.nome || '',
    userEmail: user?.email || '',
    isAuthenticated,
    isLoading,
    login,
    signUp,
    logout,
    updatePassword,
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
