import { Image, StyleSheet, View } from 'react-native';

const logoCompleto = require('../assets/branding/vic-logo-master.png');
const simboloCompacto = require('../assets/branding/vic-adaptive-foreground.png');

export function LogoVIC({ compacto = false }) {
  return (
    <View style={estilos.contenedor} accessibilityLabel="Logo VIC">
      <Image
        source={compacto ? simboloCompacto : logoCompleto}
        style={compacto ? estilos.logoCompacto : estilos.logo}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    alignItems: 'center',
  },
  logo: {
    width: 188,
    height: 188,
  },
  logoCompacto: {
    width: 92,
    height: 92,
  },
});
