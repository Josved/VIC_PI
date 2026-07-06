import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { setAuthToken } from '../../../shared/api/http';
import { authApi } from '../api/authApi';
import { LoginFormValues, RegisterFormValues } from '../schemas/authSchemas';
import { AuthSession, User, UserRole } from '../types';

const STORAGE_KEY = '@vic/session';

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  selectedRole: UserRole;
  setSelectedRole: (role: UserRole) => void;
  login: (values: LoginFormValues) => Promise<void>;
  register: (values: RegisterFormValues) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<UserRole>('citizen');

  useEffect(() => {
    const loadSession = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const savedSession = JSON.parse(raw) as AuthSession;
          setAuthToken(savedSession.accessToken);
          setSession(savedSession);
        }
      } finally {
        setLoading(false);
      }
    };

    void loadSession();
  }, []);

  const persistSession = async (nextSession: AuthSession) => {
    setSession(nextSession);
    setAuthToken(nextSession.accessToken);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      token: session?.accessToken ?? null,
      loading,
      selectedRole,
      setSelectedRole,
      async login(values) {
        const nextSession = await authApi.login(values);
        await persistSession(nextSession);
      },
      async register(values) {
        const nextSession = await authApi.register({
          nombre: values.nombre,
          apellidos: values.apellidos,
          correo: values.correo,
          password: values.password,
          rol: selectedRole,
        });
        await persistSession(nextSession);
      },
      async logout() {
        setSession(null);
        setAuthToken(null);
        await AsyncStorage.removeItem(STORAGE_KEY);
      },
    }),
    [loading, selectedRole, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }

  return context;
}

