import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colores, espaciado } from './tema';

export function CampoTexto({ etiqueta, error, estilo, ...propiedadesEntrada }) {
  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <TextInput
        placeholderTextColor={colores.muted}
        style={[estilos.entrada, error && estilos.entradaError, estilo]}
        {...propiedadesEntrada}
      />
      {error ? <Text style={estilos.error}>{error}</Text> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    gap: espaciado.xs,
  },
  etiqueta: {
    color: colores.text,
    fontWeight: '800',
    fontSize: 14,
  },
  entrada: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 14,
    paddingHorizontal: espaciado.lg,
    color: colores.text,
    backgroundColor: colores.surface,
    fontSize: 16,
  },
  entradaError: {
    borderColor: colores.danger,
  },
  error: {
    color: colores.danger,
    fontWeight: '700',
    fontSize: 12,
  },
});
