import { LocateFixed, MapPinned, Trash2 } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../../shared/components/Screen';
import { colors, spacing } from '../../../shared/theme';

export function ContainersScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <MapPinned color={colors.primary} size={48} />
        <Text style={styles.title}>Contenedores y mapa</Text>
        <Text style={styles.subtitle}>Base para mapa, lista, detalle de contenedor y permisos de ubicacion.</Text>
      </View>

      <View style={styles.row}>
        <Trash2 color={colors.primary} size={28} />
        <Text style={styles.item}>Lista y detalle de contenedores</Text>
      </View>
      <View style={styles.row}>
        <LocateFixed color={colors.secondary} size={28} />
        <Text style={styles.item}>Contenedores cercanos y permisos</Text>
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
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  item: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
});

