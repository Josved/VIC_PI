import * as Location from 'expo-location';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  LocateFixed,
  MapPinned,
  Navigation,
  QrCode,
  RefreshCw,
  ScanLine,
} from 'lucide-react-native';

import { Boton } from '../componentes/Boton';
import { conexionApi, obtenerMensajeErrorApi } from '../componentes/conexionApi';
import { EscanerQR } from '../componentes/EscanerQR';
import { MapaContenedores } from '../componentes/MapaContenedores';
import { PantallaBase } from '../componentes/PantallaBase';
import { colores, espaciado } from '../componentes/tema';

const RADIOS = [
  { etiqueta: '1 km', valor: 1000 },
  { etiqueta: '5 km', valor: 5000 },
  { etiqueta: '10 km', valor: 10000 },
];

function formatearDistancia(distanciaM) {
  if (distanciaM == null) {
    return 'Sin distancia';
  }
  if (distanciaM < 1000) {
    return `${Math.round(distanciaM)} m`;
  }
  return `${(distanciaM / 1000).toFixed(1)} km`;
}

export function PantallaContenedores() {
  const [estadoPermiso, cambiarEstadoPermiso] = useState('pendiente');
  const [ubicacion, cambiarUbicacion] = useState(null);
  const [contenedores, cambiarContenedores] = useState([]);
  const [idSeleccionado, cambiarIdSeleccionado] = useState(null);
  const [radioM, cambiarRadioM] = useState(5000);
  const [cargando, cambiarCargando] = useState(false);
  const [error, cambiarError] = useState('');
  const [escanerVisible, cambiarEscanerVisible] = useState(false);
  const [registrandoQR, cambiarRegistrandoQR] = useState(false);
  const observadorUbicacion = useRef(null);

  const contenedorSeleccionado = useMemo(
    () =>
      contenedores.find((contenedor) => contenedor.id === idSeleccionado) ||
      contenedores[0] ||
      null,
    [contenedores, idSeleccionado],
  );

  async function leerUbicacionActual(solicitarPermiso = true) {
    let permiso = await Location.getForegroundPermissionsAsync();

    if (!permiso.granted && solicitarPermiso && permiso.canAskAgain) {
      permiso = await Location.requestForegroundPermissionsAsync();
    }

    if (!permiso.granted) {
      cambiarEstadoPermiso('denegado');
      throw new Error('VIC necesita acceso a tu ubicación para registrar y mostrar contenedores cercanos.');
    }

    cambiarEstadoPermiso('concedido');
    const posicion = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    cambiarUbicacion(posicion.coords);
    return posicion.coords;
  }

  async function cargarContenedoresCercanos(coordenadas = ubicacion, radio = radioM) {
    if (!coordenadas) {
      return;
    }

    cambiarCargando(true);
    cambiarError('');
    try {
      const respuesta = await conexionApi.get('/contenedores/cercanos', {
        params: {
          latitud: coordenadas.latitude,
          longitud: coordenadas.longitude,
          radio_m: radio,
          limite: 100,
        },
      });
      cambiarContenedores(respuesta.data);
      cambiarIdSeleccionado((idActual) => {
        if (respuesta.data.some((item) => item.id === idActual)) {
          return idActual;
        }
        return respuesta.data[0]?.id || null;
      });
    } catch (excepcion) {
      cambiarError(
        obtenerMensajeErrorApi(
          excepcion,
          'No fue posible consultar los contenedores cercanos.',
        ),
      );
    } finally {
      cambiarCargando(false);
    }
  }

  useEffect(() => {
    let pantallaActiva = true;

    async function iniciarUbicacion() {
      try {
        const coordenadas = await leerUbicacionActual(true);
        if (!pantallaActiva) {
          return;
        }
        await cargarContenedoresCercanos(coordenadas, radioM);

        observadorUbicacion.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 25,
            timeInterval: 15000,
          },
          (posicion) => {
            if (pantallaActiva) {
              cambiarUbicacion(posicion.coords);
            }
          },
        );
      } catch (excepcion) {
        if (pantallaActiva) {
          cambiarError(excepcion.message);
        }
      }
    }

    iniciarUbicacion();
    return () => {
      pantallaActiva = false;
      observadorUbicacion.current?.remove();
      observadorUbicacion.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ubicacion) {
      return undefined;
    }

    const temporizador = setTimeout(() => {
      cargarContenedoresCercanos(ubicacion, radioM);
    }, 350);

    return () => clearTimeout(temporizador);
  }, [radioM, ubicacion?.latitude, ubicacion?.longitude]);

  async function activarUbicacion() {
    cambiarError('');
    try {
      const coordenadas = await leerUbicacionActual(true);
      await cargarContenedoresCercanos(coordenadas, radioM);
    } catch (excepcion) {
      cambiarError(excepcion.message);
      Alert.alert(
        'Permiso de ubicación',
        excepcion.message,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir ajustes', onPress: () => Linking.openSettings() },
        ],
      );
    }
  }

  async function abrirEscaner() {
    cambiarError('');
    try {
      await leerUbicacionActual(true);
      cambiarEscanerVisible(true);
    } catch (excepcion) {
      cambiarError(excepcion.message);
      Alert.alert('Ubicación requerida', excepcion.message);
    }
  }

  async function registrarCodigoQR(codigoQr) {
    cambiarRegistrandoQR(true);
    cambiarError('');

    try {
      const coordenadas = await leerUbicacionActual(true);
      let direccion = {};
      try {
        const respuestaDireccion = await conexionApi.get('/geografia/direccion', {
          params: {
            latitud: coordenadas.latitude,
            longitud: coordenadas.longitude,
          },
        });
        direccion = respuestaDireccion.data;
      } catch {
        // El GPS sigue siendo válido aunque el geocodificador no tenga conexión.
      }
      const respuesta = await conexionApi.post('/contenedores/registrar-qr', {
        codigo_qr: codigoQr,
        latitud: coordenadas.latitude,
        longitud: coordenadas.longitude,
        precision_m: coordenadas.accuracy ?? null,
        direccion_completa: direccion.direccion_completa ?? null,
        calle: direccion.calle ?? null,
        numero: direccion.numero ?? null,
        colonia: direccion.colonia ?? null,
        codigo_postal: direccion.codigo_postal ?? null,
        municipio: direccion.municipio ?? null,
      });

      await cargarContenedoresCercanos(coordenadas, radioM);
      cambiarIdSeleccionado(respuesta.data.contenedor.id);
      cambiarEscanerVisible(false);

      Alert.alert(
        respuesta.data.accion === 'creado'
          ? 'Contenedor registrado'
          : 'Ubicación actualizada',
        `QR: ${respuesta.data.contenedor.codigo_qr}\nPrecisión GPS: ${
          coordenadas.accuracy == null
            ? 'no disponible'
            : `${Math.round(coordenadas.accuracy)} m`
        }`,
      );
    } catch (excepcion) {
      const mensaje = obtenerMensajeErrorApi(
        excepcion,
        excepcion.message || 'No fue posible registrar el código QR.',
      );
      cambiarError(mensaje);
      Alert.alert('No se pudo registrar', mensaje);
    } finally {
      cambiarRegistrandoQR(false);
    }
  }

  async function refrescar() {
    try {
      const coordenadas = await leerUbicacionActual(true);
      await cargarContenedoresCercanos(coordenadas, radioM);
    } catch (excepcion) {
      cambiarError(excepcion.message);
    }
  }

  return (
    <>
      <PantallaBase centrada={false}>
        <View style={estilos.encabezado}>
          <MapPinned color={colores.primary} size={42} />
          <View style={estilos.textoEncabezado}>
            <Text style={estilos.titulo}>Mapa de contenedores</Text>
            <Text style={estilos.subtitulo}>
              Tu GPS y los QR registrados se consultan en tiempo real.
            </Text>
          </View>
        </View>

        <View style={estilos.acciones}>
          <View style={estilos.accionPrincipal}>
            <Boton texto="Escanear QR" alPresionar={abrirEscaner} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Actualizar ubicación y contenedores"
            onPress={refrescar}
            style={estilos.botonIcono}
          >
            {cargando ? (
              <ActivityIndicator color={colores.primary} />
            ) : (
              <RefreshCw color={colores.primary} size={23} />
            )}
          </Pressable>
        </View>

        <View style={estilos.estadoUbicacion}>
          <LocateFixed
            color={
              estadoPermiso === 'concedido' ? colores.primary : colores.secondary
            }
            size={24}
          />
          <View style={estilos.estadoTexto}>
            <Text style={estilos.estadoTitulo}>
              {estadoPermiso === 'concedido'
                ? 'Ubicación activa'
                : estadoPermiso === 'denegado'
                  ? 'Ubicación bloqueada'
                  : 'Solicitando ubicación'}
            </Text>
            <Text style={estilos.estadoDescripcion}>
              {ubicacion
                ? `${ubicacion.latitude.toFixed(5)}, ${ubicacion.longitude.toFixed(5)} · precisión ${
                    ubicacion.accuracy == null
                      ? 'desconocida'
                      : `${Math.round(ubicacion.accuracy)} m`
                  }`
                : 'Acepta el permiso para usar el mapa y registrar QR.'}
            </Text>
          </View>
          {estadoPermiso !== 'concedido' ? (
            <Pressable onPress={activarUbicacion} style={estilos.botonActivar}>
              <Text style={estilos.textoActivar}>Activar</Text>
            </Pressable>
          ) : null}
        </View>

        {error ? <Text style={estilos.error}>{error}</Text> : null}

        <MapaContenedores
          ubicacion={ubicacion}
          contenedores={contenedores}
          idSeleccionado={idSeleccionado}
          alSeleccionar={cambiarIdSeleccionado}
        />

        <View style={estilos.filtros}>
          <Text style={estilos.tituloSeccion}>Radio de búsqueda</Text>
          <View style={estilos.radios}>
            {RADIOS.map((radio) => (
              <Pressable
                accessibilityRole="button"
                key={radio.valor}
                onPress={() => cambiarRadioM(radio.valor)}
                style={[
                  estilos.radio,
                  radioM === radio.valor && estilos.radioSeleccionado,
                ]}
              >
                <Text
                  style={[
                    estilos.textoRadio,
                    radioM === radio.valor && estilos.textoRadioSeleccionado,
                  ]}
                >
                  {radio.etiqueta}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={estilos.tituloListaFila}>
          <Text style={estilos.tituloSeccion}>Contenedores cercanos</Text>
          <Text style={estilos.cantidad}>{contenedores.length}</Text>
        </View>

        {cargando && contenedores.length === 0 ? (
          <View style={estilos.estadoVacio}>
            <ActivityIndicator color={colores.primary} size="large" />
            <Text style={estilos.textoVacio}>Buscando contenedores…</Text>
          </View>
        ) : contenedores.length === 0 ? (
          <View style={estilos.estadoVacio}>
            <ScanLine color={colores.secondary} size={42} />
            <Text style={estilos.vacioTitulo}>No hay contenedores en este radio</Text>
            <Text style={estilos.textoVacio}>
              Escanea el primer QR o amplía el radio de búsqueda.
            </Text>
          </View>
        ) : (
          <View style={estilos.lista}>
            {contenedores.map((contenedor) => (
              <Pressable
                accessibilityRole="button"
                key={contenedor.id}
                onPress={() => cambiarIdSeleccionado(contenedor.id)}
                style={[
                  estilos.tarjeta,
                  contenedor.id === contenedorSeleccionado?.id &&
                    estilos.tarjetaSeleccionada,
                ]}
              >
                <View style={estilos.iconoContenedor}>
                  <QrCode color={colores.white} size={21} />
                </View>
                <View style={estilos.info}>
                  <Text numberOfLines={1} style={estilos.codigo}>
                    {contenedor.codigo_qr}
                  </Text>
                  <Text style={estilos.detalle}>
                    Actualizado {contenedor.veces_registrado}{' '}
                    {contenedor.veces_registrado === 1 ? 'vez' : 'veces'}
                  </Text>
                </View>
                <View style={estilos.distanciaFila}>
                  <Navigation color={colores.primary} size={17} />
                  <Text style={estilos.distancia}>
                    {formatearDistancia(contenedor.distancia_m)}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {contenedorSeleccionado ? (
          <View style={estilos.detalleSeleccionado}>
            <Text style={estilos.tituloDetalle}>Detalle seleccionado</Text>
            <FilaDetalle etiqueta="Código QR" valor={contenedorSeleccionado.codigo_qr} />
            <FilaDetalle
              etiqueta="Coordenadas"
              valor={`${contenedorSeleccionado.latitud.toFixed(6)}, ${contenedorSeleccionado.longitud.toFixed(6)}`}
            />
            <FilaDetalle
              etiqueta="Dirección"
              valor={contenedorSeleccionado.direccion_completa || 'Pendiente de identificar'}
            />
            <FilaDetalle
              etiqueta="Distancia"
              valor={formatearDistancia(contenedorSeleccionado.distancia_m)}
            />
            <FilaDetalle
              etiqueta="Precisión registrada"
              valor={
                contenedorSeleccionado.precision_m == null
                  ? 'No disponible'
                  : `${Math.round(contenedorSeleccionado.precision_m)} m`
              }
            />
          </View>
        ) : null}
      </PantallaBase>

      <EscanerQR
        visible={escanerVisible}
        procesando={registrandoQR}
        alCancelar={() => cambiarEscanerVisible(false)}
        alDetectar={registrarCodigoQR}
      />
    </>
  );
}

function FilaDetalle({ etiqueta, valor }) {
  return (
    <View style={estilos.filaDetalle}>
      <Text style={estilos.etiquetaDetalle}>{etiqueta}</Text>
      <Text selectable style={estilos.valorDetalle}>
        {valor}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    marginBottom: espaciado.lg,
  },
  textoEncabezado: {
    flex: 1,
  },
  titulo: {
    color: colores.text,
    fontSize: 27,
    fontWeight: '900',
  },
  subtitulo: {
    color: colores.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  acciones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    marginBottom: espaciado.md,
  },
  accionPrincipal: {
    flex: 1,
  },
  botonIcono: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colores.border,
    backgroundColor: colores.white,
  },
  estadoUbicacion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    marginBottom: espaciado.md,
    padding: espaciado.md,
    borderRadius: 15,
    backgroundColor: colores.surface,
    borderWidth: 1,
    borderColor: colores.border,
  },
  estadoTexto: {
    flex: 1,
  },
  estadoTitulo: {
    color: colores.text,
    fontSize: 14,
    fontWeight: '900',
  },
  estadoDescripcion: {
    color: colores.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  botonActivar: {
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.sm,
    borderRadius: 12,
    backgroundColor: colores.secondary,
  },
  textoActivar: {
    color: colores.white,
    fontSize: 13,
    fontWeight: '900',
  },
  error: {
    marginBottom: espaciado.md,
    padding: espaciado.md,
    color: colores.danger,
    fontSize: 13,
    lineHeight: 18,
    borderRadius: 12,
    backgroundColor: '#FFF1F0',
  },
  filtros: {
    marginTop: espaciado.lg,
    marginBottom: espaciado.lg,
  },
  tituloSeccion: {
    color: colores.text,
    fontSize: 19,
    fontWeight: '900',
  },
  radios: {
    flexDirection: 'row',
    gap: espaciado.sm,
    marginTop: espaciado.sm,
  },
  radio: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: espaciado.sm,
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 12,
    backgroundColor: colores.white,
  },
  radioSeleccionado: {
    borderColor: colores.primary,
    backgroundColor: colores.primary,
  },
  textoRadio: {
    color: colores.text,
    fontSize: 13,
    fontWeight: '800',
  },
  textoRadioSeleccionado: {
    color: colores.white,
  },
  tituloListaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: espaciado.sm,
  },
  cantidad: {
    minWidth: 30,
    paddingHorizontal: espaciado.sm,
    paddingVertical: 3,
    color: colores.white,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
    borderRadius: 999,
    backgroundColor: colores.primary,
  },
  estadoVacio: {
    alignItems: 'center',
    gap: espaciado.sm,
    padding: espaciado.xl,
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 16,
    backgroundColor: colores.surface,
  },
  vacioTitulo: {
    color: colores.text,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  textoVacio: {
    color: colores.muted,
    fontSize: 14,
    textAlign: 'center',
  },
  lista: {
    gap: espaciado.sm,
  },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    padding: espaciado.md,
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 15,
    backgroundColor: colores.white,
  },
  tarjetaSeleccionada: {
    borderColor: colores.primary,
    backgroundColor: colores.surface,
  },
  iconoContenedor: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: colores.primary,
  },
  info: {
    flex: 1,
  },
  codigo: {
    color: colores.text,
    fontSize: 15,
    fontWeight: '900',
  },
  detalle: {
    color: colores.muted,
    fontSize: 12,
  },
  distanciaFila: {
    alignItems: 'flex-end',
  },
  distancia: {
    color: colores.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  detalleSeleccionado: {
    gap: espaciado.sm,
    marginTop: espaciado.xl,
    padding: espaciado.lg,
    borderRadius: 17,
    backgroundColor: colores.surface,
    borderWidth: 1,
    borderColor: colores.border,
  },
  tituloDetalle: {
    color: colores.text,
    fontSize: 18,
    fontWeight: '900',
  },
  filaDetalle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: espaciado.md,
    paddingTop: espaciado.sm,
    borderTopWidth: 1,
    borderTopColor: colores.border,
  },
  etiquetaDetalle: {
    color: colores.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  valorDetalle: {
    flex: 1,
    color: colores.text,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'right',
  },
});
