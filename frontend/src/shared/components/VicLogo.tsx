import { StyleSheet, Text, View } from 'react-native';
import { Leaf, MapPin, QrCode } from 'lucide-react-native';

import { colors } from '../theme';

type VicLogoProps = {
  compact?: boolean;
};

export function VicLogo({ compact = false }: VicLogoProps) {
  return (
    <View style={styles.wrap} accessibilityLabel="Logo VIC">
      <View style={[styles.mark, compact && styles.markCompact]}>
        <QrCode color={colors.secondary} size={compact ? 38 : 52} strokeWidth={2.8} />
        <MapPin color={colors.primary} size={compact ? 38 : 48} strokeWidth={3} style={styles.pin} />
        <Leaf color={colors.primary} size={compact ? 26 : 34} strokeWidth={3} style={styles.leaf} />
      </View>
      {!compact && <Text style={styles.word}>VIC</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  mark: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 8,
    borderLeftColor: colors.secondary,
    borderBottomColor: colors.secondary,
    borderTopColor: colors.primary,
    borderRightColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  markCompact: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 6,
  },
  pin: {
    position: 'absolute',
  },
  leaf: {
    position: 'absolute',
    top: -12,
    right: 15,
    transform: [{ rotate: '24deg' }],
  },
  word: {
    marginTop: 10,
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: 0,
    color: colors.primary,
  },
});

