import { useEffect, useRef } from 'react';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { StyleSheet, View } from 'react-native';

import { colores } from './tema';

const REGION_INICIAL = {
  latitude: 19.4326,
  longitude: -99.1332,
  latitudeDelta: 0.03,
  longitudeDelta: 0.03,
};

export function MapaContenedores({
  ubicacion,
  contenedores,
  idSeleccionado,
  alSeleccionar,
}) {
  const referenciaMapa = useRef(null);

  useEffect(() => {
    if (!ubicacion || !referenciaMapa.current) {
      return;
    }

    referenciaMapa.current.animateToRegion(
      {
        latitude: ubicacion.latitude,
        longitude: ubicacion.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      500,
    );
  }, [ubicacion?.latitude, ubicacion?.longitude]);

  return (
    <View style={estilos.contenedor}>
      <MapView
        ref={referenciaMapa}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={
          ubicacion
            ? {
                latitude: ubicacion.latitude,
                longitude: ubicacion.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }
            : REGION_INICIAL
        }
        showsUserLocation={Boolean(ubicacion)}
        showsMyLocationButton={Boolean(ubicacion)}
        toolbarEnabled={false}
      >
        {contenedores.map((contenedor) => (
          <Marker
            key={contenedor.id}
            coordinate={{
              latitude: contenedor.latitud,
              longitude: contenedor.longitud,
            }}
            title={`Contenedor ${contenedor.codigo_qr}`}
            description={
              contenedor.distancia_m == null
                ? 'Ubicacion registrada'
                : `${Math.round(contenedor.distancia_m)} m de distancia`
            }
            pinColor={
              contenedor.id === idSeleccionado ? colores.secondary : colores.primary
            }
            onPress={() => alSeleccionar(contenedor.id)}
          />
        ))}
      </MapView>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    height: 330,
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colores.border,
  },
});
