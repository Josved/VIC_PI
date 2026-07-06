import { ClipboardCheck, Keyboard, QrCode } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../../shared/components/Screen';
import { colors, spacing } from '../../../shared/theme';

export function ReportsScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <QrCode color={colors.secondary} size={48} />
        <Text style={styles.title}>Reportes de contenedor</Text>
        <Text style={styles.subtitle}>Base para QR, numero de serie, evidencia, motivo y confirmacion.</Text>
      </View>

      <View style={styles.row}>
        <QrCode color={colors.primary} size={28} />
        <Text style={styles.item}>Escanear codigo QR</Text>
      </View>
      <View style={styles.row}>
        <Keyboard color={colors.secondary} size={28} />
        <Text style={styles.item}>Captura manual de numero de serie</Text>
      </View>
      <View style={styles.row}>
        <ClipboardCheck color={colors.primary} size={28} />
        <Text style={styles.item}>Formulario con evidencia y confirmacion</Text>
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

