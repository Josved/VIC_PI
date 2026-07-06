import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';

import { getApiErrorMessage } from '../../../shared/api/errors';
import { Button } from '../../../shared/components/Button';
import { Screen } from '../../../shared/components/Screen';
import { TextField } from '../../../shared/components/TextField';
import { colors, spacing } from '../../../shared/theme';
import { authApi } from '../api/authApi';
import { ForgotPasswordFormValues, forgotPasswordSchema } from '../schemas/authSchemas';

export function ForgotPasswordScreen() {
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const { control, handleSubmit } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { correo: '' },
  });

  const onSubmit = handleSubmit(
    async ({ correo }) => {
      try {
        setSubmitError(null);
        setSubmitSuccess(null);
        setLoading(true);
        await authApi.forgotPassword(correo);
        setSubmitSuccess('Solicitud enviada. Si el correo existe, recibira instrucciones para recuperar la cuenta.');
      } catch (error) {
        setSubmitError(getApiErrorMessage(error, 'No se pudo enviar. Verifica que el backend este ejecutandose.'));
      } finally {
        setLoading(false);
      }
    },
    () => {
      setSubmitError('Ingresa un correo valido antes de continuar.');
    },
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Recuperar contrasena</Text>
        <Text style={styles.subtitle}>Ingresa tu correo para iniciar el proceso de recuperacion.</Text>
      </View>

      <View style={styles.form}>
        <TextField control={control} name="correo" label="Correo" autoCapitalize="none" keyboardType="email-address" />
        {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}
        {submitSuccess ? <Text style={styles.submitSuccess}>{submitSuccess}</Text> : null}
        <Button label="Enviar instrucciones" onPress={() => void onSubmit()} loading={loading} />
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
    lineHeight: 22,
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
  submitSuccess: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});
