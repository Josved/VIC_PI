import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ShieldCheck, Truck, UserRound } from 'lucide-react-native';

import { AuthStackParamList } from '../../../app/navigation/types';
import { Button } from '../../../shared/components/Button';
import { Screen } from '../../../shared/components/Screen';
import { colors, spacing } from '../../../shared/theme';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'RoleSelection'>;

const roles: Array<{ role: UserRole; label: string; description: string; Icon: typeof UserRound }> = [
  { role: 'citizen', label: 'Ciudadano', description: 'Consulta contenedores, calendarios y reportes.', Icon: UserRound },
  { role: 'collector', label: 'Recolector', description: 'Apoya rutas y seguimiento operativo.', Icon: Truck },
  { role: 'admin', label: 'Administrador', description: 'Gestiona informacion y avisos del sistema.', Icon: ShieldCheck },
];

export function RoleSelectionScreen({ navigation }: Props) {
  const { selectedRole, setSelectedRole } = useAuth();

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Selecciona tu rol</Text>
        <Text style={styles.subtitle}>Esto permite adaptar permisos y contenido desde el primer acceso.</Text>
      </View>

      <View style={styles.roles}>
        {roles.map(({ role, label, description, Icon }) => {
          const active = selectedRole === role;
          return (
            <Pressable
              key={role}
              onPress={() => setSelectedRole(role)}
              style={[styles.roleCard, active ? styles.activeRole : null]}
            >
              <Icon color={active ? colors.primary : colors.muted} size={28} />
              <View style={styles.roleText}>
                <Text style={styles.roleLabel}>{label}</Text>
                <Text style={styles.roleDescription}>{description}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Button label="Continuar" onPress={() => navigation.navigate('Register')} />
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
  roles: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  roleCard: {
    minHeight: 92,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  activeRole: {
    borderColor: colors.primary,
    backgroundColor: '#EEF9F1',
  },
  roleText: {
    flex: 1,
    gap: spacing.xs,
  },
  roleLabel: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  roleDescription: {
    color: colors.muted,
    lineHeight: 20,
  },
});

