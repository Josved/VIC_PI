import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../../../shared/components/Button';
import { Screen } from '../../../shared/components/Screen';
import { TextField } from '../../../shared/components/TextField';
import { getApiErrorMessage } from '../../../shared/api/errors';
import { colors, spacing } from '../../../shared/theme';
import { useAuth } from '../context/AuthContext';
import { RegisterFormValues, registerSchema } from '../schemas/authSchemas';

const roleLabels = {
  citizen: 'Ciudadano',
  collector: 'Recolector',
  admin: 'Administrador',
};

export function RegisterScreen() {
  const { register, selectedRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { control, handleSubmit } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      nombre: '',
      apellidos: '',
      correo: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = handleSubmit(
    async (values) => {
      try {
        setSubmitError(null);
        setLoading(true);
        await register(values);
      } catch (error) {
        setSubmitError(getApiErrorMessage(error, 'No se pudo crear la cuenta. Revisa que el backend este ejecutandose.'));
      } finally {
        setLoading(false);
      }
    },
    () => {
      setSubmitError('Revisa los campos marcados antes de continuar.');
    },
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Crear cuenta</Text>
        <Text style={styles.subtitle}>Rol seleccionado: {roleLabels[selectedRole]}</Text>
      </View>

      <View style={styles.form}>
        <TextField control={control} name="nombre" label="Nombre" autoCapitalize="words" />
        <TextField control={control} name="apellidos" label="Apellidos" autoCapitalize="words" />
        <TextField control={control} name="correo" label="Correo" autoCapitalize="none" keyboardType="email-address" />
        <TextField control={control} name="password" label="Contrasena" secureTextEntry />
        <TextField control={control} name="confirmPassword" label="Confirmar contrasena" secureTextEntry />
        {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}
        <Button label="Registrarme" onPress={() => void onSubmit()} loading={loading} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
  },
  form: {
    gap: spacing.lg,
  },
  submitError: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});
