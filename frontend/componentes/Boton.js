import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { colores, espaciado } from './tema';

export function Boton({ texto, alPresionar, cargando = false, variante = 'principal' }) {
  const estiloVariante = {
    principal: estilos.principal,
    secundario: estilos.secundario,
    fantasma: estilos.fantasma,
  }[variante];

  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.85}
      disabled={cargando}
      onPress={alPresionar}
      style={[estilos.base, estiloVariante, cargando && estilos.deshabilitado]}
    >
      {cargando ? <ActivityIndicator color={variante === 'fantasma' ? colores.primary : colores.white} /> : null}
      <Text style={[estilos.etiqueta, variante === 'fantasma' && estilos.etiquetaFantasma]}>{texto}</Text>
    </TouchableOpacity>
  );
}

const estilos = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: espaciado.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: espaciado.sm,
  },
  principal: {
    backgroundColor: colores.primary,
  },
  secundario: {
    backgroundColor: colores.secondary,
  },
  fantasma: {
    backgroundColor: 'transparent',
  },
  etiqueta: {
    color: colores.white,
    fontWeight: '800',
    fontSize: 16,
  },
  etiquetaFantasma: {
    color: colores.primary,
  },
  deshabilitado: {
    opacity: 0.7,
  },
});
