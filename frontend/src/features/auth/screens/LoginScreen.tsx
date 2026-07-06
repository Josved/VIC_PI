import { zodResolver } from '@hookform/resolvers/zod';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';

import { AuthStackParamList } from '../../../app/navigation/types';
import { getApiErrorMessage } from '../../../shared/api/errors';
import { Button } from '../../../shared/components/Button';
import { Screen } from '../../../shared/components/Screen';
import { TextField } from '../../../shared/components/TextField';
import { VicLogo } from '../../../shared/components/VicLogo';
import { colors, spacing } from '../../../shared/theme';
import { useAuth } from '../context/AuthContext';
import { LoginFormValues, loginSchema } from '../schemas/authSchemas';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { control, handleSubmit } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { correo: '', password: '' },
  });

  const onSubmit = handleSubmit(
    async (values) => {
      try {
        setSubmitError(null);
        setLoading(true);
        await login(values);
      } catch (error) {
        setSubmitError(getApiErrorMessage(error, 'No se pudo iniciar sesion. Revisa que el backend este ejecutandose.'));
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
        <VicLogo />
        <Text style={styles.title}>Bienvenido a VIC</Text>
        <Text style={styles.subtitle}>Gestiona reciclaje, comunidad y reportes desde una sola app.</Text>
      </View>

      <View style={styles.form}>
        <TextField control={control} name="correo" label="Correo" autoCapitalize="none" keyboardType="email-address" />
        <TextField control={control} name="password" label="Contrasena" secureTextEntry />
        {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}
        <Button label="Iniciar sesion" onPress={() => void onSubmit()} loading={loading} />
        <Button label="Recuperar contrasena" variant="ghost" onPress={() => navigation.navigate('ForgotPassword')} />
        <Button label="Crear cuenta" variant="secondary" onPress={() => navigation.navigate('RoleSelection')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    textAlign: 'center',
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
});
