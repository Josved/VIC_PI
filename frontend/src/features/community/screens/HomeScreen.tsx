import { Bell, CalendarDays } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../../shared/components/Screen';
import { VicLogo } from '../../../shared/components/VicLogo';
import { colors, spacing } from '../../../shared/theme';

export function HomeScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <VicLogo compact />
        <Text style={styles.title}>Inicio y comunidad</Text>
        <Text style={styles.subtitle}>Base reservada para Home, calendario de recoleccion, detalles y anuncios.</Text>
      </View>

      <View style={styles.row}>
        <CalendarDays color={colors.primary} size={28} />
        <View style={styles.textBlock}>
          <Text style={styles.itemTitle}>Calendario de recoleccion</Text>
          <Text style={styles.itemText}>Aqui se integraran rutas, dias y detalle por fecha.</Text>
        </View>
      </View>

      <View style={styles.row}>
        <Bell color={colors.secondary} size={28} />
        <View style={styles.textBlock}>
          <Text style={styles.itemTitle}>Anuncios y notificaciones</Text>
          <Text style={styles.itemText}>Espacio para avisos comunitarios y alertas importantes.</Text>
        </View>
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
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  textBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  itemTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  itemText: {
    color: colors.muted,
    lineHeight: 20,
  },
});

