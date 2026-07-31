import { useEffect, useRef } from 'react';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { StyleSheet, View } from 'react-native';

import { colores } from './tema';

const REGION_INICIAL = {
  latitude: 20.5994,
  longitude: -100.3327,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export function MapaRuta({ paradas = [], ubicacionRecolector = null }) {
  const mapa = useRef(null);
  const coordenadas = paradas.map((parada) => ({
    latitude: parada.latitud,
    longitude: parada.longitud,
  }));

  useEffect(() => {
    if (!mapa.current || !ubicacionRecolector) {
      return;
    }
    mapa.current.animateToRegion(
      {
        latitude: ubicacionRecolector.latitude,
        longitude: ubicacionRecolector.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      500,
    );
  }, [ubicacionRecolector?.latitude, ubicacionRecolector?.longitude]);

  const inicial = ubicacionRecolector || coordenadas[0] || REGION_INICIAL;

  return (
    <View style={estilos.contenedor}>
      <MapView
        ref={mapa}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: inicial.latitude,
          longitude: inicial.longitude,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }}
      >
        {coordenadas.length > 1 ? (
          <Polyline
            coordinates={coordenadas}
            strokeColor={colores.primary}
            strokeWidth={5}
          />
        ) : null}
        {paradas.map((parada) => (
          <Marker
            key={parada.id}
            coordinate={{ latitude: parada.latitud, longitude: parada.longitud }}
            title={`${parada.orden}. ${parada.codigo_qr}`}
            description={parada.estado}
            pinColor={
              parada.estado === 'pendiente' ? colores.secondary : colores.primary
            }
          />
        ))}
        {ubicacionRecolector ? (
          <Marker
            coordinate={ubicacionRecolector}
            title="Recolector en recorrido"
            pinColor="#2196F3"
          />
        ) : null}
      </MapView>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    height: 300,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 18,
  },
});
