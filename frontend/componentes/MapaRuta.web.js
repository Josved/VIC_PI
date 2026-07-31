import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colores } from './tema';

function icono(etiqueta, color) {
  return L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;border-radius:14px;background:${color};color:white;display:flex;align-items:center;justify-content:center;font-weight:800;border:2px solid white;box-shadow:0 2px 7px #0005">${etiqueta}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export function MapaRuta({
  paradas = [],
  puntos = [],
  geometria = [],
  ubicacionRecolector = null,
  alAgregarPunto = null,
  alEliminarPunto = null,
  alto = 300,
}) {
  const contenedor = useRef(null);
  const mapa = useRef(null);

  useEffect(() => {
    if (!contenedor.current) {
      return undefined;
    }
    if (mapa.current) {
      mapa.current.remove();
    }
    const instancia = L.map(contenedor.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([20.5994, -100.3327], 13);
    mapa.current = instancia;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(instancia);

    const puntosVisibles = puntos.length > 0 ? puntos : paradas;
    const coordenadasRuta = (geometria.length > 0 ? geometria : puntosVisibles).map(
      (punto) => [punto.latitud, punto.longitud],
    );
    if (coordenadasRuta.length > 1) {
      L.polyline(coordenadasRuta, {
        color: colores.primary,
        weight: 5,
        opacity: 0.9,
      }).addTo(instancia);
    }
    puntosVisibles.forEach((punto, indice) => {
      const esPaso = punto.tipo === 'paso';
      const color = esPaso
        ? '#FF9800'
        : punto.tipo === 'inicio'
          ? '#2196F3'
          : punto.tipo === 'fin'
            ? '#673AB7'
            : colores.secondary;
      const marcador = L.marker([punto.latitud, punto.longitud], {
        icon: icono(`${indice + 1}`, color),
      })
        .addTo(instancia)
        .bindPopup(
          punto.direccion
          || punto.codigo_qr
          || (esPaso ? 'Punto de paso. Pulsa para eliminar.' : 'Parada'),
        );
      if (esPaso && alEliminarPunto) {
        marcador.on('click', () => alEliminarPunto(indice));
      }
    });
    if (ubicacionRecolector) {
      L.marker(
        [ubicacionRecolector.latitude, ubicacionRecolector.longitude],
        { icon: icono('C', '#2196F3') },
      )
        .addTo(instancia)
        .bindPopup('Recolector en recorrido');
    }

    const limites = [
      ...coordenadasRuta,
      ...(ubicacionRecolector
        ? [[ubicacionRecolector.latitude, ubicacionRecolector.longitude]]
        : []),
    ];
    if (limites.length > 0) {
      instancia.fitBounds(limites, { padding: [32, 32], maxZoom: 17 });
    }
    if (alAgregarPunto) {
      instancia.on('click', (evento) =>
        alAgregarPunto({
          latitude: evento.latlng.lat,
          longitude: evento.latlng.lng,
        }),
      );
    }
    setTimeout(() => instancia.invalidateSize(), 50);

    return () => {
      instancia.remove();
      mapa.current = null;
    };
  }, [
    JSON.stringify(paradas),
    JSON.stringify(puntos),
    JSON.stringify(geometria),
    ubicacionRecolector?.latitude,
    ubicacionRecolector?.longitude,
  ]);

  return (
    <View style={[estilos.marco, { height: alto }]}>
      <div ref={contenedor} style={{ width: '100%', height: '100%' }} />
      {alAgregarPunto ? (
        <Text style={estilos.ayuda}>Haz clic en el mapa para agregar un punto de paso.</Text>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  marco: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 18,
    backgroundColor: '#eef4ef',
  },
  ayuda: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    color: colores.text,
    backgroundColor: '#ffffffee',
    fontSize: 12,
    fontWeight: '700',
  },
});
