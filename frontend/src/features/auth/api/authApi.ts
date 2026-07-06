import { http, setAuthToken } from '../../../shared/api/http';
import { AuthSession, User, UserRole } from '../types';

type LoginPayload = {
  correo: string;
  password: string;
};

type RegisterPayload = LoginPayload & {
  nombre: string;
  apellidos: string;
  rol: UserRole;
};

export const authApi = {
  async login(payload: LoginPayload): Promise<AuthSession> {
    const { data } = await http.post<AuthSession>('/auth/login', payload);
    setAuthToken(data.accessToken);
    return data;
  },

  async register(payload: RegisterPayload): Promise<AuthSession> {
    const { data } = await http.post<AuthSession>('/auth/register', payload);
    setAuthToken(data.accessToken);
    return data;
  },

  async forgotPassword(correo: string): Promise<void> {
    await http.post('/auth/forgot-password', { correo });
  },

  async me(token: string): Promise<User> {
    setAuthToken(token);
    const { data } = await http.get<User>('/auth/me');
    return data;
  },
};

