import { useEffect, useMemo, useRef } from 'react';
import { Trash2, Truck } from 'lucide-react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { StyleSheet, Text, View } from 'react-native';

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
        {puntosVisibles.map((punto, indice) => {
          const esContenedor =
            punto.tipo === 'contenedor'
            || Boolean(punto.contenedor_id)
            || Boolean(punto.codigo_qr);
          return (
            <Marker
              key={punto.id || `${punto.tipo || 'parada'}-${indice}`}
              coordinate={{ latitude: punto.latitud, longitude: punto.longitud }}
              title={
                punto.tipo === 'paso'
                  ? `Punto de paso ${indice + 1}`
                  : `${punto.orden || indice + 1}. ${punto.codigo_qr || punto.tipo || 'Contenedor'}`
              }
              description={
                punto.direccion || punto.estado || 'Mantén presionado para agregar puntos'
              }
              pinColor={esContenedor ? undefined : coloresPunto[punto.tipo]}
              onPress={
                punto.tipo === 'paso' && alEliminarPunto
                  ? () => alEliminarPunto(indice)
                  : undefined
              }
            >
              {esContenedor ? (
                <View
                  style={[
                    estilos.marcadorContenedor,
                    punto.estado && punto.estado !== 'pendiente'
                      ? estilos.marcadorAtendido
                      : null,
                  ]}
                >
                  <Trash2 color={colores.white} size={20} strokeWidth={2.5} />
                  <View style={estilos.ordenContenedor}>
                    <Text style={estilos.ordenTexto}>{indice + 1}</Text>
                  </View>
                </View>
              ) : null}
            </Marker>
          );
        })}
        {ubicacionRecolector ? (
          <Marker
            coordinate={ubicacionRecolector}
            title="Recolector en recorrido"
          >
            <View style={estilos.marcadorRecolector}>
              <Truck color={colores.white} size={20} strokeWidth={2.5} />
            </View>
          </Marker>
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
  marcadorContenedor: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colores.white,
    borderRadius: 12,
    backgroundColor: colores.secondary,
  },
  marcadorAtendido: { backgroundColor: colores.primary },
  ordenContenedor: {
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
  ordenTexto: { color: colores.white, fontSize: 9, fontWeight: '900' },
  marcadorRecolector: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colores.white,
    borderRadius: 20,
    backgroundColor: '#2196F3',
  },
});
