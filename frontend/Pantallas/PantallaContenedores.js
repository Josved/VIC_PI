import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { LocateFixed, Lock, MapPinned, Navigation, Recycle, Trash2 } from 'lucide-react-native';

import { Boton } from '../componentes/Boton';
import { PantallaBase } from '../componentes/PantallaBase';
import { usarContenedores } from '../componentes/usarContenedores';
import { colores, espaciado } from '../componentes/tema';

const colorEstado = {
  disponible: colores.primary,
  casi_lleno: colores.secondary,
  mantenimiento: colores.danger,
};

const etiquetaEstado = {
  disponible: 'Disponible',
  casi_lleno: 'Casi lleno',
  mantenimiento: 'Mantenimiento',
};

const etiquetaTipo = {
  reciclaje: 'Reciclaje',
  organico: 'Organico',
  inorganico: 'Inorganico',
};

// Posiciona los pines dentro del recuadro segun su lat/lng real, normalizado al rango del
// propio conjunto de contenedores. Es una vista aproximada mientras no se integra un mapa real
// (ej. react-native-maps); no representa una proyeccion geografica exacta.
function calcularPosicionesPines(contenedores) {
  if (contenedores.length === 0) {
    return {};
  }

  const latitudes = contenedores.map((contenedor) => contenedor.latitud);
  const longitudes = contenedores.map((contenedor) => contenedor.longitud);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const rangoLat = maxLat - minLat || 1;
  const rangoLng = maxLng - minLng || 1;

  const posiciones = {};
  contenedores.forEach((contenedor) => {
    const proporcionLat = (contenedor.latitud - minLat) / rangoLat;
    const proporcionLng = (contenedor.longitud - minLng) / rangoLng;
    posiciones[contenedor.id] = {
      arriba: `${10 + proporcionLat * 70}%`,
      izquierda: `${10 + proporcionLng * 70}%`,
    };
  });

  return posiciones;
}

export function PantallaContenedores() {
  const { contenedores, cargando, error, recargar } = usarContenedores();
  const [idSeleccionado, cambiarSeleccionado] = useState(null);
  const [permisoUbicacion, cambiarPermisoUbicacion] = useState(false);

  const posicionesPines = useMemo(() => calcularPosicionesPines(contenedores), [contenedores]);

  const contenedorSeleccionado = useMemo(() => {
    if (contenedores.length === 0) {
      return null;
    }
    return contenedores.find((contenedor) => contenedor.id === idSeleccionado) || contenedores[0];
  }, [contenedores, idSeleccionado]);

  const otrosContenedores = permisoUbicacion ? contenedores : contenedores.slice(0, 2);

  if (cargando) {
    return (
      <PantallaBase>
        <ActivityIndicator color={colores.primary} size="large" />
      </PantallaBase>
    );
  }

  if (error) {
    return (
      <PantallaBase>
        <Text style={estilos.error}>{error}</Text>
        <Boton texto="Reintentar" alPresionar={recargar} />
      </PantallaBase>
    );
  }

  return (
    <PantallaBase centrada={false}>
      <View style={estilos.encabezado}>
        <MapPinned color={colores.primary} size={42} />
        <View style={estilos.textoEncabezado}>
          <Text style={estilos.titulo}>Contenedores y mapa</Text>
          <Text style={estilos.subtitulo}>Consulta ubicaciones, detalles y otros contenedores.</Text>
        </View>
      </View>

      {contenedores.length === 0 ? (
        <Text style={estilos.vacio}>Todavia no hay contenedores registrados.</Text>
      ) : (
        <>
          <View style={estilos.mapa}>
            <Text style={estilos.tituloMapa}>Vista aproximada</Text>
            {contenedores.map((contenedor) => {
              const seleccionado = contenedor.id === contenedorSeleccionado.id;
              const posicion = posicionesPines[contenedor.id];
              return (
                <Pressable
                  accessibilityRole="button"
                  key={contenedor.id}
                  onPress={() => cambiarSeleccionado(contenedor.id)}
                  style={[
                    estilos.pinMapa,
                    {
                      top: posicion.arriba,
                      left: posicion.izquierda,
                      backgroundColor: colorEstado[contenedor.estado],
                    },
                    seleccionado && estilos.pinSeleccionado,
                  ]}
                >
                  <Trash2 color={colores.white} size={18} />
                </Pressable>
              );
            })}
          </View>

          <View style={estilos.permiso}>
            <View style={estilos.iconoPermiso}>
              {permisoUbicacion ? <LocateFixed color={colores.primary} size={24} /> : <Lock color={colores.secondary} size={24} />}
            </View>
            <View style={estilos.textoPermiso}>
              <Text style={estilos.tituloPermiso}>
                {permisoUbicacion ? 'Ubicacion activada' : 'Ubicacion pendiente'}
              </Text>
              <Text style={estilos.descripcionPermiso}>
                {permisoUbicacion
                  ? 'Mostrando todos los contenedores disponibles.'
                  : 'Activa la ubicacion para ver el resto de los contenedores.'}
              </Text>
            </View>
            <Boton
              texto={permisoUbicacion ? 'Activa' : 'Activar'}
              variante={permisoUbicacion ? 'fantasma' : 'secundario'}
              alPresionar={() => cambiarPermisoUbicacion(true)}
            />
          </View>

          <Text style={estilos.tituloSeccion}>Lista de contenedores</Text>
          <View style={estilos.lista}>
            {contenedores.map((contenedor) => {
              const seleccionado = contenedor.id === contenedorSeleccionado.id;
              return (
                <Pressable
                  accessibilityRole="button"
                  key={contenedor.id}
                  onPress={() => cambiarSeleccionado(contenedor.id)}
                  style={[estilos.tarjetaLista, seleccionado && estilos.tarjetaListaSeleccionada]}
                >
                  <View style={[estilos.puntoEstado, { backgroundColor: colorEstado[contenedor.estado] }]} />
                  <View style={estilos.infoLista}>
                    <Text style={estilos.nombreContenedor}>{contenedor.nombre}</Text>
                    <Text style={estilos.zonaContenedor}>{contenedor.zona}</Text>
                  </View>
                  <Text style={estilos.llenado}>{contenedor.porcentaje_llenado}%</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={estilos.tituloSeccion}>Detalle de contenedor</Text>
          <View style={estilos.detalle}>
            <View style={estilos.detalleEncabezado}>
              <View style={[estilos.iconoDetalle, { backgroundColor: colorEstado[contenedorSeleccionado.estado] }]}>
                <Recycle color={colores.white} size={26} />
              </View>
              <View style={estilos.detalleTitulo}>
                <Text style={estilos.nombreDetalle}>{contenedorSeleccionado.nombre}</Text>
                <Text style={estilos.textoDetalle}>{contenedorSeleccionado.zona}</Text>
              </View>
            </View>

            <View style={estilos.barraLlenado}>
              <View
                style={[
                  estilos.progresoLlenado,
                  {
                    width: `${contenedorSeleccionado.porcentaje_llenado}%`,
                    backgroundColor: colorEstado[contenedorSeleccionado.estado],
                  },
                ]}
              />
            </View>
            <Text style={estilos.porcentaje}>{contenedorSeleccionado.porcentaje_llenado}% de capacidad</Text>

            <FilaDetalle etiqueta="Estado" valor={etiquetaEstado[contenedorSeleccionado.estado]} />
            <FilaDetalle etiqueta="Tipo" valor={etiquetaTipo[contenedorSeleccionado.tipo]} />
            <FilaDetalle etiqueta="Numero de serie" valor={contenedorSeleccionado.serie} />
            <FilaDetalle
              etiqueta="Coordenadas"
              valor={`${contenedorSeleccionado.latitud.toFixed(5)}, ${contenedorSeleccionado.longitud.toFixed(5)}`}
            />
          </View>

          <Text style={estilos.tituloSeccion}>Otros contenedores</Text>
          <View style={estilos.cercanos}>
            {otrosContenedores.map((contenedor) => (
              <View key={contenedor.id} style={estilos.cercano}>
                <Navigation color={colorEstado[contenedor.estado]} size={20} />
                <View style={estilos.infoCercano}>
                  <Text style={estilos.nombreCercano}>{contenedor.nombre}</Text>
                  <Text style={estilos.textoCercano}>{contenedor.zona}</Text>
                </View>
                <Text style={estilos.llenado}>{contenedor.porcentaje_llenado}%</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </PantallaBase>
  );
}

function FilaDetalle({ etiqueta, valor }) {
  return (
    <View style={estilos.filaDetalle}>
      <Text style={estilos.etiquetaDetalle}>{etiqueta}</Text>
      <Text style={estilos.valorDetalle}>{valor}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    marginBottom: espaciado.xl,
  },
  textoEncabezado: {
    flex: 1,
  },
  titulo: {
    color: colores.text,
    fontSize: 28,
    fontWeight: '900',
  },
  subtitulo: {
    color: colores.muted,
    fontSize: 15,
    lineHeight: 21,
  },
  error: {
    color: colores.danger,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: espaciado.md,
    textAlign: 'center',
  },
  vacio: {
    color: colores.muted,
    fontSize: 15,
    textAlign: 'center',
  },
  mapa: {
    height: 230,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 18,
    backgroundColor: '#EAF7EE',
    marginBottom: espaciado.lg,
    padding: espaciado.lg,
  },
  tituloMapa: {
    color: colores.text,
    fontSize: 16,
    fontWeight: '900',
  },
  pinMapa: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colores.white,
  },
  pinSeleccionado: {
    transform: [{ scale: 1.18 }],
    borderColor: colores.text,
  },
  permiso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    padding: espaciado.md,
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 16,
    backgroundColor: colores.surface,
    marginBottom: espaciado.xl,
  },
  iconoPermiso: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.white,
  },
  textoPermiso: {
    flex: 1,
  },
  tituloPermiso: {
    color: colores.text,
    fontSize: 15,
    fontWeight: '900',
  },
  descripcionPermiso: {
    color: colores.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  tituloSeccion: {
    color: colores.text,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: espaciado.md,
  },
  lista: {
    gap: espaciado.sm,
    marginBottom: espaciado.xl,
  },
  tarjetaLista: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    padding: espaciado.md,
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 14,
    backgroundColor: colores.white,
  },
  tarjetaListaSeleccionada: {
    borderColor: colores.primary,
    backgroundColor: colores.surface,
  },
  puntoEstado: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  infoLista: {
    flex: 1,
  },
  nombreContenedor: {
    color: colores.text,
    fontSize: 16,
    fontWeight: '900',
  },
  zonaContenedor: {
    color: colores.muted,
    fontSize: 13,
  },
  llenado: {
    color: colores.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  detalle: {
    gap: espaciado.md,
    padding: espaciado.lg,
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 18,
    backgroundColor: colores.surface,
    marginBottom: espaciado.xl,
  },
  detalleEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
  },
  iconoDetalle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detalleTitulo: {
    flex: 1,
  },
  nombreDetalle: {
    color: colores.text,
    fontSize: 18,
    fontWeight: '900',
  },
  textoDetalle: {
    color: colores.muted,
    fontSize: 14,
  },
  barraLlenado: {
    height: 12,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: colores.white,
  },
  progresoLlenado: {
    height: '100%',
    borderRadius: 999,
  },
  porcentaje: {
    color: colores.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  filaDetalle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: espaciado.md,
    borderTopWidth: 1,
    borderTopColor: colores.border,
    paddingTop: espaciado.sm,
  },
  etiquetaDetalle: {
    color: colores.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  valorDetalle: {
    flex: 1,
    color: colores.text,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'right',
  },
  cercanos: {
    gap: espaciado.sm,
    marginBottom: espaciado.lg,
  },
  cercano: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    padding: espaciado.md,
    borderRadius: 14,
    backgroundColor: colores.white,
    borderWidth: 1,
    borderColor: colores.border,
  },
  infoCercano: {
    flex: 1,
  },
  nombreCercano: {
    color: colores.text,
    fontSize: 15,
    fontWeight: '900',
  },
  textoCercano: {
    color: colores.muted,
    fontSize: 13,
  },
});
