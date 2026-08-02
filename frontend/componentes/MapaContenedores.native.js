import { useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { StyleSheet, Text, View } from 'react-native';

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
                ? 'Ubicación registrada'
                : `${Math.round(contenedor.distancia_m)} m de distancia`
            }
            onPress={() => alSeleccionar(contenedor.id)}
          >
            <View
              style={[
                estilos.marcador,
                contenedor.id === idSeleccionado && estilos.marcadorSeleccionado,
              ]}
            >
              <Trash2 color={colores.white} size={21} strokeWidth={2.5} />
              <View style={estilos.identificador}>
                <Text style={estilos.identificadorTexto}>{contenedor.id}</Text>
              </View>
            </View>
          </Marker>
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
  marcador: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colores.white,
    borderRadius: 12,
    backgroundColor: colores.primary,
  },
  marcadorSeleccionado: { backgroundColor: colores.secondary },
  identificador: {
    position: 'absolute',
    top: -7,
    right: -7,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colores.white,
    borderRadius: 10,
    backgroundColor: colores.text,
  },
  identificadorTexto: { color: colores.white, fontSize: 9, fontWeight: '900' },
});
