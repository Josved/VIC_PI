import { MapPinned } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colores, espaciado } from './tema';

export function MapaContenedores({ ubicacion, direccionUbicacion, contenedores }) {
  return (
    <View style={estilos.contenedor}>
      <MapPinned color={colores.primary} size={44} />
      <Text style={estilos.titulo}>Mapa móvil de Google</Text>
      <Text style={estilos.texto}>
        El mapa interactivo se muestra en Android y iOS. Esta vista web conserva
        la consulta de la API y la lista de contenedores.
      </Text>
      {ubicacion ? (
        <Text style={estilos.coordenadas}>
          Tu ubicación: {direccionUbicacion || 'Identificando la dirección más próxima…'}
        </Text>
      ) : null}
      <Text style={estilos.resumen}>
        {contenedores.length} contenedor{contenedores.length === 1 ? '' : 'es'} cercano
        {contenedores.length === 1 ? '' : 's'}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado.sm,
    padding: espaciado.xl,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colores.border,
    backgroundColor: colores.surface,
  },
  titulo: {
    color: colores.text,
    fontSize: 20,
    fontWeight: '900',
  },
  texto: {
    maxWidth: 520,
    color: colores.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  coordenadas: {
    color: colores.text,
    fontSize: 13,
    fontWeight: '700',
  },
  resumen: {
    color: colores.primary,
    fontSize: 14,
    fontWeight: '900',
  },
});
