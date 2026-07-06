import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../../../shared/components/Button';
import { Screen } from '../../../shared/components/Screen';
import { colors, spacing } from '../../../shared/theme';
import { useAuth } from '../../auth/context/AuthContext';

export function ProfileScreen() {
  const { logout, user } = useAuth();

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Perfil</Text>
        <Text style={styles.subtitle}>{user ? `${user.nombre} ${user.apellidos}` : 'Sesion activa'}</Text>
        <Text style={styles.email}>{user?.correo}</Text>
      </View>
      <Button label="Cerrar sesion" variant="secondary" onPress={() => void logout()} />
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
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  email: {
    color: colors.muted,
    fontSize: 16,
  },
});

