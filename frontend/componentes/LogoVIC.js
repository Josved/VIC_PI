import { StyleSheet, Text, View } from 'react-native';
import { Leaf, MapPin, QrCode } from 'lucide-react-native';

import { colores } from './tema';

export function LogoVIC({ compacto = false }) {
  return (
    <View style={estilos.contenedor} accessibilityLabel="Logo VIC">
      <View style={[estilos.marca, compacto && estilos.marcaCompacta]}>
        <QrCode color={colores.secondary} size={compacto ? 38 : 52} strokeWidth={2.8} />
        <MapPin color={colores.primary} size={compacto ? 38 : 48} strokeWidth={3} style={estilos.pin} />
        <Leaf color={colores.primary} size={compacto ? 26 : 34} strokeWidth={3} style={estilos.hoja} />
      </View>
      {!compacto && <Text style={estilos.palabra}>VIC</Text>}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    alignItems: 'center',
  },
  marca: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 8,
    borderLeftColor: colores.secondary,
    borderBottomColor: colores.secondary,
    borderTopColor: colores.primary,
    borderRightColor: colores.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.white,
  },
  marcaCompacta: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 6,
  },
  pin: {
    position: 'absolute',
  },
  hoja: {
    position: 'absolute',
    top: -12,
    right: 15,
    transform: [{ rotate: '24deg' }],
  },
  palabra: {
    marginTop: 10,
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: 0,
    color: colores.primary,
  },
});
