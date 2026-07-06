import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { colors, spacing } from '../theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
};

export function Button({ label, onPress, loading = false, variant = 'primary' }: ButtonProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.85}
      disabled={loading}
      onPress={onPress}
      style={[styles.base, styles[variant], loading ? styles.disabled : null]}
    >
      {loading ? <ActivityIndicator color={variant === 'ghost' ? colors.primary : colors.white} /> : null}
      <Text style={[styles.label, variant === 'ghost' ? styles.ghostLabel : null]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.secondary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  label: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 16,
  },
  ghostLabel: {
    color: colors.primary,
  },
  disabled: {
    opacity: 0.7,
  },
});
