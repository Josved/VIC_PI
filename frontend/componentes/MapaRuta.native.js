import { useEffect, useMemo, useRef } from 'react';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { StyleSheet, View } from 'react-native';

import { colores } from './tema';

const REGION_INICIAL = {
  latitude: 20.5994,
  longitude: -100.3327,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const coloresPunto = {
  inicio: '#2196F3',
  paso: '#FF9800',
  fin: '#673AB7',
};

export function MapaRuta({
  paradas = [],
  puntos = [],
  geometria = [],
  ubicacionRecolector = null,
  alAgregarPunto = null,
  alEliminarPunto = null,
  alto = 300,
}) {
  const mapa = useRef(null);
  const puntosVisibles = useMemo(
    () => (puntos.length > 0 ? puntos : paradas),
    [paradas, puntos],
  );
  const coordenadasPuntos = useMemo(
    () =>
      puntosVisibles.map((punto) => ({
        latitude: punto.latitud,
        longitude: punto.longitud,
      })),
    [puntosVisibles],
  );
  const coordenadasRuta = useMemo(
    () =>
      (geometria.length > 0 ? geometria : puntosVisibles).map((punto) => ({
        latitude: punto.latitud,
        longitude: punto.longitud,
      })),
    [geometria, puntosVisibles],
  );

  useEffect(() => {
    const todas = [
      ...coordenadasRuta,
      ...(ubicacionRecolector ? [ubicacionRecolector] : []),
    ];
    if (mapa.current && todas.length > 1) {
      mapa.current.fitToCoordinates(todas, {
        edgePadding: { top: 45, right: 45, bottom: 45, left: 45 },
        animated: true,
      });
    }
  }, [
    coordenadasRuta,
    ubicacionRecolector?.latitude,
    ubicacionRecolector?.longitude,
  ]);

  const inicial =
    ubicacionRecolector || coordenadasPuntos[0] || coordenadasRuta[0] || REGION_INICIAL;

  return (
    <View style={[estilos.contenedor, { height: alto }]}>
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
        onLongPress={
          alAgregarPunto
            ? (evento) => alAgregarPunto(evento.nativeEvent.coordinate)
            : undefined
        }
      >
        {coordenadasRuta.length > 1 ? (
          <Polyline
            coordinates={coordenadasRuta}
            strokeColor={colores.primary}
            strokeWidth={5}
          />
        ) : null}
        {puntosVisibles.map((punto, indice) => (
          <Marker
            key={punto.id || `${punto.tipo || 'parada'}-${indice}`}
            coordinate={{ latitude: punto.latitud, longitude: punto.longitud }}
            title={
              punto.tipo === 'paso'
                ? `Punto de paso ${indice + 1}`
                : `${punto.orden || indice + 1}. ${punto.codigo_qr || punto.tipo || 'Parada'}`
            }
            description={
              punto.direccion || punto.estado || 'Mantén presionado para agregar puntos'
            }
            pinColor={
              coloresPunto[punto.tipo]
              || (punto.estado === 'pendiente' ? colores.secondary : colores.primary)
            }
            onPress={
              punto.tipo === 'paso' && alEliminarPunto
                ? () => alEliminarPunto(indice)
                : undefined
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
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 18,
  },
});
