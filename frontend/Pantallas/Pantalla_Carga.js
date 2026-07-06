import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { LogoVIC } from '../componentes/LogoVIC';
import { colores, espaciado } from '../componentes/tema';

export function PantallaCarga() {
  return (
    <View style={estilos.contenedor}>
      <LogoVIC />
      <Text style={estilos.titulo}>Cargando VIC</Text>
      <Text style={estilos.subtitulo}>Gestion de contenedores</Text>
      <ActivityIndicator size="large" color={colores.primary} style={estilos.cargando} />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: espaciado.sm,
    backgroundColor: colores.background,
    padding: espaciado.xl,
  },
  titulo: {
    color: colores.text,
    fontSize: 28,
    fontWeight: '900',
  },
  subtitulo: {
    color: colores.muted,
    fontSize: 16,
  },
  cargando: {
    marginTop: espaciado.md,
  },
});
