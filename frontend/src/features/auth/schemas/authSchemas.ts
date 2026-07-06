import { z } from 'zod';

export const loginSchema = z.object({
  correo: z.string().trim().email('Ingresa un correo valido'),
  password: z.string().min(6, 'La contrasena debe tener al menos 6 caracteres'),
});

export const registerSchema = z
  .object({
    nombre: z.string().trim().min(2, 'Ingresa tu nombre'),
    apellidos: z.string().trim().min(2, 'Ingresa tus apellidos'),
    correo: z.string().trim().email('Ingresa un correo valido'),
    password: z.string().min(6, 'La contrasena debe tener al menos 6 caracteres'),
    confirmPassword: z.string().min(6, 'Confirma tu contrasena'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contrasenas no coinciden',
  });

export const forgotPasswordSchema = z.object({
  correo: z.string().trim().email('Ingresa un correo valido'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

