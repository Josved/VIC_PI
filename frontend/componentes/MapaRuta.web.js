import { MapPinned, Navigation } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colores, espaciado } from './tema';

export function MapaRuta({ paradas = [], ubicacionRecolector = null }) {
  return (
    <View style={estilos.contenedor}>
      <MapPinned color={colores.primary} size={38} />
      <Text style={estilos.titulo}>Recorrido en mapa móvil</Text>
      <Text style={estilos.texto}>
        En Android y iOS se dibuja la línea del recorrido y sus paradas.
      </Text>
      {ubicacionRecolector ? (
        <View style={estilos.ubicacion}>
          <Navigation color="#2196F3" size={18} />
          <Text style={estilos.coordenadas}>
            Recolector: {ubicacionRecolector.latitude.toFixed(5)},{' '}
            {ubicacionRecolector.longitude.toFixed(5)}
          </Text>
        </View>
      ) : null}
      <Text style={estilos.resumen}>
        {paradas.length} parada{paradas.length === 1 ? '' : 's'} en el recorrido
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    alignItems: 'center',
    gap: espaciado.sm,
    padding: espaciado.xl,
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 18,
    backgroundColor: colores.surface,
  },
  titulo: { color: colores.text, fontSize: 17, fontWeight: '900' },
  texto: {
    color: colores.muted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  ubicacion: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  coordenadas: { color: '#1769AA', fontSize: 12, fontWeight: '800' },
  resumen: { color: colores.primary, fontSize: 13, fontWeight: '900' },
});
