export type UserRole = 'citizen' | 'collector' | 'admin';

export type User = {
  id: number;
  nombre: string;
  apellidos: string;
  correo: string;
  rol: UserRole;
};

export type AuthSession = {
  accessToken: string;
  user: User;
};

