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

function iconoContenedor(orden, color) {
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:38px;height:38px;border-radius:11px;background:${color};color:white;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 8px #0005">
      <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5"/><path d="M14 11v5"/>
      </svg>
      <span style="position:absolute;right:-7px;top:-7px;min-width:19px;height:19px;padding:0 3px;border-radius:10px;background:#17352b;color:white;border:2px solid white;display:flex;align-items:center;justify-content:center;font:800 9px sans-serif">${orden}</span>
    </div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
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
  const capaDatos = useRef(null);
  const agregarPunto = useRef(alAgregarPunto);
  const eliminarPunto = useRef(alEliminarPunto);

  useEffect(() => {
    agregarPunto.current = alAgregarPunto;
  }, [alAgregarPunto]);

  useEffect(() => {
    eliminarPunto.current = alEliminarPunto;
  }, [alEliminarPunto]);

  useEffect(() => {
    if (!contenedor.current) {
      return undefined;
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
    capaDatos.current = L.layerGroup().addTo(instancia);

    const manejarClic = (evento) => {
      agregarPunto.current?.({
        latitude: evento.latlng.lat,
        longitude: evento.latlng.lng,
      });
    };
    instancia.on('click', manejarClic);
    const temporizador = setTimeout(() => instancia.invalidateSize(), 50);

    return () => {
      clearTimeout(temporizador);
      instancia.off('click', manejarClic);
      capaDatos.current = null;
      mapa.current = null;
      instancia.remove();
    };
  }, []);

  useEffect(() => {
    const instancia = mapa.current;
    const capa = capaDatos.current;
    if (!instancia || !capa) {
      return;
    }
    capa.clearLayers();
    const puntosVisibles = puntos.length > 0 ? puntos : paradas;
    const coordenadasRuta = (geometria.length > 0 ? geometria : puntosVisibles).map(
      (punto) => [punto.latitud, punto.longitud],
    );
    if (coordenadasRuta.length > 1) {
      L.polyline(coordenadasRuta, {
        color: colores.primary,
        weight: 5,
        opacity: 0.9,
      }).addTo(capa);
    }
    puntosVisibles.forEach((punto, indice) => {
      const esPaso = punto.tipo === 'paso';
      const esContenedor =
        punto.tipo === 'contenedor'
        || Boolean(punto.contenedor_id)
        || Boolean(punto.codigo_qr);
      const color = esPaso
        ? '#FF9800'
        : punto.tipo === 'inicio'
          ? '#2196F3'
          : punto.tipo === 'fin'
            ? '#673AB7'
            : colores.secondary;
      const marcador = L.marker([punto.latitud, punto.longitud], {
        icon: esContenedor
          ? iconoContenedor(indice + 1, color)
          : icono(`${indice + 1}`, color),
      })
        .addTo(capa)
        .bindPopup(
          punto.direccion
          || punto.codigo_qr
          || (esPaso ? 'Punto de paso. Pulsa para eliminar.' : 'Parada'),
        );
      if (esPaso && eliminarPunto.current) {
        marcador.on('click', () => eliminarPunto.current?.(indice));
      }
    });
    if (ubicacionRecolector) {
      L.marker(
        [ubicacionRecolector.latitude, ubicacionRecolector.longitude],
        { icon: icono('C', '#2196F3') },
      )
        .addTo(capa)
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
  }, [
    paradas,
    puntos,
    geometria,
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
