import NetInfo from '@react-native-community/netinfo';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  AlertTriangle,
  CheckCircle2,
  CircleStop,
  Camera,
  History,
  LocateFixed,
  Navigation,
  Play,
  SkipForward,
} from 'lucide-react-native';

import { Boton } from './Boton';
import { CampoTexto } from './CampoTexto';
import { ejecutarConRespaldo, sincronizarCola } from './colaOffline';
import { conexionApi, obtenerMensajeErrorApi } from './conexionApi';
import { usarSesion } from './ContextoSesion';
import { MapaRuta } from './MapaRuta';
import {
  detenerRastreoSegundoPlano,
  iniciarRastreoSegundoPlano,
} from './rastreoSegundoPlano';
import { colores, espaciado } from './tema';

const tiposIncidencia = [
  { id: 'contenedor_bloqueado', etiqueta: 'Bloqueado' },
  { id: 'contenedor_danado', etiqueta: 'Dañado' },
  { id: 'calle_cerrada', etiqueta: 'Calle cerrada' },
  { id: 'exceso_basura', etiqueta: 'Exceso' },
  { id: 'sin_acceso', etiqueta: 'Sin acceso' },
  { id: 'vehiculo', etiqueta: 'Vehículo' },
  { id: 'otro', etiqueta: 'Otro' },
];

const etiquetasParada = {
  pendiente: 'Pendiente',
  recolectado: 'Recolectado',
  omitido: 'Omitido',
  incidencia: 'Incidencia',
};

function distanciaMetros(origen, destino) {
  const radio = 6371000;
  const radianes = (valor) => (valor * Math.PI) / 180;
  const diferenciaLatitud = radianes(destino.latitude - origen.latitude);
  const diferenciaLongitud = radianes(destino.longitude - origen.longitude);
  const latitud1 = radianes(origen.latitude);
  const latitud2 = radianes(destino.latitude);
  const valor =
    Math.sin(diferenciaLatitud / 2) ** 2
    + Math.cos(latitud1)
      * Math.cos(latitud2)
      * Math.sin(diferenciaLongitud / 2) ** 2;
  return 2 * radio * Math.asin(Math.sqrt(valor));
}

export function PanelRecorrido({ rutas, alActualizarRutas }) {
  const { usuario } = usarSesion();
  const [ejecucion, cambiarEjecucion] = useState(null);
  const [historial, cambiarHistorial] = useState([]);
  const [cargando, cambiarCargando] = useState(true);
  const [procesando, cambiarProcesando] = useState(false);
  const [error, cambiarError] = useState('');
  const [tipoIncidencia, cambiarTipoIncidencia] = useState('contenedor_bloqueado');
  const [comentarioIncidencia, cambiarComentarioIncidencia] = useState('');
  const [evidenciaIncidencia, cambiarEvidenciaIncidencia] = useState('');
  const [evidenciaNombre, cambiarEvidenciaNombre] = useState('');
  const [mensajeOffline, cambiarMensajeOffline] = useState('');
  const [paradaIncidenciaId, cambiarParadaIncidenciaId] = useState(null);
  const [motivoCancelacion, cambiarMotivoCancelacion] = useState('');
  const observador = useRef(null);
  const llegadaNotificada = useRef(null);

  const rutasAsignadas = useMemo(
    () =>
      rutas.filter(
        (ruta) => ruta.activa && ruta.recolector?.id === usuario?.id,
      ),
    [rutas, usuario?.id],
  );
  const siguienteParada = useMemo(
    () => ejecucion?.paradas.find((parada) => parada.estado === 'pendiente') || null,
    [ejecucion?.paradas],
  );
  const ubicacionCalculada = useMemo(
    () =>
      ejecucion?.latitud_actual != null && ejecucion?.longitud_actual != null
        ? {
            latitude: ejecucion.latitud_actual,
            longitude: ejecucion.longitud_actual,
          }
        : null,
    [ejecucion?.latitud_actual, ejecucion?.longitud_actual],
  );
  const distanciaSiguiente = useMemo(
    () =>
      ubicacionCalculada && siguienteParada
        ? distanciaMetros(ubicacionCalculada, {
            latitude: siguienteParada.latitud,
            longitude: siguienteParada.longitud,
          })
        : null,
    [ubicacionCalculada, siguienteParada],
  );
  const distanciaRuta = useMemo(() => {
    if (!ubicacionCalculada || !ejecucion?.geometria?.length) return null;
    return Math.min(
      ...ejecucion.geometria
        .filter((_, indice) => indice % 5 === 0)
        .map((punto) =>
          distanciaMetros(ubicacionCalculada, {
            latitude: punto.latitud,
            longitude: punto.longitud,
          }),
        ),
    );
  }, [ubicacionCalculada, ejecucion?.geometria]);
  const estaDesviado = distanciaRuta != null && distanciaRuta > 120;

  const cargarActivo = useCallback(async () => {
    try {
      cambiarCargando(true);
      cambiarError('');
      const [respuesta, respuestaHistorial] = await Promise.all([
        conexionApi.get('/operacion/mi-recorrido-activo'),
        conexionApi.get('/operacion/historial'),
      ]);
      cambiarEjecucion(respuesta.data);
      cambiarHistorial(respuestaHistorial.data);
      if (respuesta.data) {
        const siguiente = respuesta.data.paradas.find(
          (parada) => parada.estado === 'pendiente',
        );
        cambiarParadaIncidenciaId(siguiente?.id || null);
      }
    } catch (excepcion) {
      cambiarError(
        obtenerMensajeErrorApi(
          excepcion,
          'No fue posible consultar el recorrido activo.',
        ),
      );
    } finally {
      cambiarCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarActivo();
  }, [cargarActivo]);

  useEffect(() => {
    if (
      !siguienteParada
      || distanciaSiguiente == null
      || distanciaSiguiente > 30
      || llegadaNotificada.current === siguienteParada.id
    ) {
      return;
    }
    llegadaNotificada.current = siguienteParada.id;
    Alert.alert(
      'Llegaste a la parada',
      `Estás a ${Math.round(distanciaSiguiente)} m de ${siguienteParada.codigo_qr}.`,
    );
    Notifications.scheduleNotificationAsync({
      content: {
        title: 'Llegaste a la siguiente parada',
        body: siguienteParada.direccion || siguienteParada.codigo_qr,
      },
      trigger: null,
    }).catch(() => null);
  }, [distanciaSiguiente, siguienteParada?.id]);

  useEffect(() => {
    const cancelarSuscripcion = NetInfo.addEventListener(async (estado) => {
      if (estado.isConnected) {
        const resultado = await sincronizarCola();
        if (resultado.enviadas > 0) {
          cambiarMensajeOffline(`${resultado.enviadas} acciones sin conexión sincronizadas.`);
          await cargarActivo();
        }
      }
    });
    return cancelarSuscripcion;
  }, [cargarActivo]);

  useEffect(() => {
    let montado = true;

    async function observarUbicacion() {
      if (!ejecucion || ejecucion.estado !== 'en_recorrido') {
        return;
      }
      const permiso = await Location.getForegroundPermissionsAsync();
      if (!permiso.granted || !montado) {
        return;
      }
      observador.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 20,
          timeInterval: 15000,
        },
        async (posicion) => {
          if (!montado) {
            return;
          }
          try {
            const { respuesta, encolada } = await ejecutarConRespaldo(
              'post',
              `/operacion/ejecuciones/${ejecucion.id}/ubicacion`,
              {
                latitud: posicion.coords.latitude,
                longitud: posicion.coords.longitude,
                precision_m: posicion.coords.accuracy ?? null,
              },
            );
            if (montado && respuesta) {
              cambiarEjecucion(respuesta.data);
            }
            if (encolada) cambiarMensajeOffline('GPS guardado para sincronizar.');
          } catch {
            // El siguiente punto GPS vuelve a intentar sin interrumpir el recorrido.
          }
        },
      );
    }

    observarUbicacion();
    return () => {
      montado = false;
      observador.current?.remove();
      observador.current = null;
    };
  }, [ejecucion?.id, ejecucion?.estado]);

  async function obtenerUbicacion() {
    let permiso = await Location.getForegroundPermissionsAsync();
    if (!permiso.granted && permiso.canAskAgain) {
      permiso = await Location.requestForegroundPermissionsAsync();
    }
    if (!permiso.granted) {
      throw new Error('Activa la ubicación para iniciar y compartir el recorrido.');
    }
    const posicion = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return posicion.coords;
  }

  async function iniciarRuta(ruta) {
    try {
      cambiarProcesando(true);
      cambiarError('');
      const ubicacion = await obtenerUbicacion();
      const respuesta = await conexionApi.post(
        `/operacion/rutas/${ruta.id}/iniciar`,
        {
          latitud: ubicacion.latitude,
          longitud: ubicacion.longitude,
          precision_m: ubicacion.accuracy ?? null,
        },
      );
      cambiarEjecucion(respuesta.data);
      cambiarParadaIncidenciaId(respuesta.data.paradas[0]?.id || null);
      iniciarRastreoSegundoPlano(respuesta.data.id).catch(() => false);
      await alActualizarRutas();
    } catch (excepcion) {
      cambiarError(
        obtenerMensajeErrorApi(
          excepcion,
          excepcion.message || 'No fue posible iniciar el recorrido.',
        ),
      );
    } finally {
      cambiarProcesando(false);
    }
  }

  async function actualizarParada(parada, estado) {
    try {
      cambiarProcesando(true);
      cambiarError('');
      const { respuesta, encolada } = await ejecutarConRespaldo(
        'patch',
        `/operacion/ejecuciones/${ejecucion.id}/paradas/${parada.id}`,
        {
          estado,
          observacion:
            estado === 'omitido'
              ? 'Parada omitida por el recolector; revisar incidencia.'
              : null,
        },
      );
      const datosActualizados = respuesta?.data || {
        ...ejecucion,
        paradas: ejecucion.paradas.map((item) =>
          item.id === parada.id ? { ...item, estado } : item,
        ),
      };
      const atendidas = datosActualizados.paradas.filter(
        (item) => item.estado !== 'pendiente',
      ).length;
      datosActualizados.progreso_porcentaje = Math.round(
        (atendidas / datosActualizados.paradas.length) * 100,
      );
      cambiarEjecucion(datosActualizados);
      const siguiente = datosActualizados.paradas.find(
        (item) => item.estado === 'pendiente',
      );
      cambiarParadaIncidenciaId(siguiente?.id || null);
      if (encolada) cambiarMensajeOffline('Parada guardada para sincronizar.');
      else await alActualizarRutas();
    } catch (excepcion) {
      Alert.alert(
        'No se pudo actualizar',
        obtenerMensajeErrorApi(excepcion, 'Intenta nuevamente.'),
      );
    } finally {
      cambiarProcesando(false);
    }
  }

  async function registrarIncidencia() {
    if (comentarioIncidencia.trim().length < 3) {
      cambiarError('Describe brevemente la incidencia.');
      return;
    }
    try {
      cambiarProcesando(true);
      cambiarError('');
      let ubicacion = null;
      try {
        ubicacion = await obtenerUbicacion();
      } catch {
        ubicacion = null;
      }
      const { respuesta, encolada } = await ejecutarConRespaldo(
        'post',
        `/operacion/ejecuciones/${ejecucion.id}/incidencias`,
        {
          parada_id: paradaIncidenciaId,
          tipo: tipoIncidencia,
          comentario: comentarioIncidencia.trim(),
          evidencia_url: evidenciaIncidencia.trim() || null,
          latitud: ubicacion?.latitude ?? null,
          longitud: ubicacion?.longitude ?? null,
        },
      );
      if (respuesta) cambiarEjecucion(respuesta.data);
      if (encolada) cambiarMensajeOffline('Incidencia guardada para sincronizar.');
      cambiarComentarioIncidencia('');
      cambiarEvidenciaIncidencia('');
      cambiarEvidenciaNombre('');
      const siguiente = (respuesta?.data || ejecucion).paradas.find(
        (parada) => parada.estado === 'pendiente',
      );
      cambiarParadaIncidenciaId(siguiente?.id || null);
      if (!encolada) await alActualizarRutas();
    } catch (excepcion) {
      cambiarError(
        obtenerMensajeErrorApi(excepcion, 'No se pudo registrar la incidencia.'),
      );
    } finally {
      cambiarProcesando(false);
    }
  }

  async function finalizar() {
    try {
      cambiarProcesando(true);
      cambiarError('');
      await conexionApi.post(
        `/operacion/ejecuciones/${ejecucion.id}/finalizar`,
      );
      await detenerRastreoSegundoPlano();
      cambiarEjecucion(null);
      await alActualizarRutas();
      Alert.alert('Recorrido finalizado', 'Todas las paradas quedaron registradas.');
    } catch (excepcion) {
      cambiarError(
        obtenerMensajeErrorApi(
          excepcion,
          'Atiende u omite todas las paradas antes de finalizar.',
        ),
      );
    } finally {
      cambiarProcesando(false);
    }
  }

  async function cancelar() {
    if (motivoCancelacion.trim().length < 3) {
      cambiarError('Escribe el motivo de la cancelación.');
      return;
    }
    try {
      cambiarProcesando(true);
      cambiarError('');
      await conexionApi.post(
        `/operacion/ejecuciones/${ejecucion.id}/cancelar`,
        { motivo: motivoCancelacion.trim() },
      );
      await detenerRastreoSegundoPlano();
      cambiarEjecucion(null);
      cambiarMotivoCancelacion('');
      await alActualizarRutas();
    } catch (excepcion) {
      cambiarError(
        obtenerMensajeErrorApi(excepcion, 'No se pudo cancelar el recorrido.'),
      );
    } finally {
      cambiarProcesando(false);
    }
  }

  async function tomarEvidencia() {
    try {
      const permiso = await ImagePicker.requestCameraPermissionsAsync();
      if (!permiso.granted) {
        cambiarError('Autoriza la cámara para adjuntar una fotografía.');
        return;
      }
      const resultado = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.75,
      });
      if (resultado.canceled) return;
      cambiarProcesando(true);
      const recurso = resultado.assets[0];
      const formulario = new FormData();
      formulario.append(
        'archivo',
        recurso.file || {
          uri: recurso.uri,
          name: recurso.fileName || `evidencia-${Date.now()}.jpg`,
          type: recurso.mimeType || 'image/jpeg',
        },
      );
      const respuesta = await conexionApi.post('/archivos/evidencias', formulario, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      cambiarEvidenciaIncidencia(respuesta.data.url);
      cambiarEvidenciaNombre(recurso.fileName || 'Fotografía capturada');
    } catch (excepcion) {
      cambiarError(
        obtenerMensajeErrorApi(excepcion, 'No fue posible subir la fotografía.'),
      );
    } finally {
      cambiarProcesando(false);
    }
  }

  function abrirNavegacion(parada) {
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${parada.latitud},${parada.longitud}&travelmode=driving`,
    );
  }

  async function recalcularRecorrido() {
    try {
      cambiarProcesando(true);
      const ubicacion = await obtenerUbicacion();
      const respuesta = await conexionApi.post(
        `/operacion/ejecuciones/${ejecucion.id}/recalcular`,
        { latitud: ubicacion.latitude, longitud: ubicacion.longitude },
      );
      cambiarEjecucion(respuesta.data);
      cambiarError('');
    } catch (excepcion) {
      cambiarError(
        obtenerMensajeErrorApi(excepcion, 'No fue posible recalcular el recorrido.'),
      );
    } finally {
      cambiarProcesando(false);
    }
  }

  if (cargando) {
    return (
      <View style={estilos.panel}>
        <ActivityIndicator color={colores.primary} />
      </View>
    );
  }

  if (!ejecucion) {
    return (
      <View style={estilos.panel}>
        <View style={estilos.tituloFila}>
          <Navigation color={colores.primary} size={23} />
          <Text style={estilos.titulo}>Mis rutas asignadas</Text>
        </View>
        <Text style={estilos.ayuda}>
          El GPS comenzará a compartirse únicamente cuando inicies un recorrido.
        </Text>
        {mensajeOffline ? <Text style={estilos.sincronizacion}>{mensajeOffline}</Text> : null}
        {error ? <Text style={estilos.error}>{error}</Text> : null}
        {rutasAsignadas.length === 0 ? (
          <Text style={estilos.vacio}>No tienes rutas activas asignadas.</Text>
        ) : (
          <View style={estilos.lista}>
            {rutasAsignadas.map((ruta) => (
              <View key={ruta.id} style={estilos.ruta}>
                <View style={estilos.flexible}>
                  <Text style={estilos.nombreRuta}>{ruta.nombre}</Text>
                  <Text style={estilos.detalleRuta}>
                    {ruta.zona} · {ruta.hora_aproximada} ·{' '}
                    {ruta.contenedores.length} paradas · placa{' '}
                    {ruta.vehiculo?.placa || 'sin asignar'}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  disabled={procesando}
                  onPress={() => iniciarRuta(ruta)}
                  style={estilos.botonIniciar}
                >
                  <Play color={colores.white} size={17} />
                  <Text style={estilos.textoIniciar}>Iniciar</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
        {historial.length > 0 ? (
          <View style={estilos.historial}>
            <View style={estilos.tituloFila}>
              <History color={colores.primary} size={19} />
              <Text style={estilos.subtitulo}>Historial reciente</Text>
            </View>
            {historial.slice(0, 5).map((registro) => (
              <View key={registro.id} style={estilos.historialFila}>
                <Text style={estilos.codigo}>{registro.ruta_nombre}</Text>
                <Text style={estilos.estadoParada}>
                  {registro.fecha_servicio} · {registro.estado} · {registro.progreso_porcentaje}%
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    );
  }

  const ubicacionRecolector =
    ejecucion.latitud_actual != null && ejecucion.longitud_actual != null
      ? {
          latitude: ejecucion.latitud_actual,
          longitude: ejecucion.longitud_actual,
        }
      : null;

  return (
    <View style={[estilos.panel, estilos.panelActivo]}>
      <View style={estilos.recorridoCabecera}>
        <View style={estilos.flexible}>
          <Text style={estilos.etiquetaActiva}>RECORRIDO EN CURSO</Text>
          <Text style={estilos.titulo}>{ejecucion.ruta_nombre}</Text>
          <Text style={estilos.ayuda}>{ejecucion.zona}</Text>
        </View>
        <View style={estilos.progresoCirculo}>
          <Text style={estilos.progreso}>{ejecucion.progreso_porcentaje}%</Text>
        </View>
      </View>

      <View style={estilos.barra}>
        <View
          style={[
            estilos.barraActiva,
            { width: `${ejecucion.progreso_porcentaje}%` },
          ]}
        />
      </View>

      <MapaRuta
        paradas={ejecucion.paradas}
        geometria={ejecucion.geometria}
        ubicacionRecolector={ubicacionRecolector}
      />
      <View style={estilos.gps}>
        <LocateFixed color="#2196F3" size={19} />
        <Text style={estilos.textoGps}>
          GPS activo · primer plano cada 15 segundos; segundo plano en la aplicación instalada
        </Text>
      </View>
      {mensajeOffline ? <Text style={estilos.sincronizacion}>{mensajeOffline}</Text> : null}
      {siguienteParada ? (
        <View style={estilos.siguiente}>
          <View style={estilos.flexible}>
            <Text style={estilos.codigo}>Siguiente: {siguienteParada.codigo_qr}</Text>
            <Text style={estilos.estadoParada}>
              {distanciaSiguiente == null
                ? 'Calculando distancia'
                : `${Math.round(distanciaSiguiente)} m · ETA aproximado ${Math.max(1, Math.ceil(distanciaSiguiente / 417))} min`}
            </Text>
          </View>
          <Pressable onPress={() => abrirNavegacion(siguienteParada)} style={estilos.botonNavegar}>
            <Navigation color={colores.white} size={18} />
            <Text style={estilos.textoIniciar}>Navegar</Text>
          </Pressable>
        </View>
      ) : null}
      {estaDesviado ? (
        <View style={estilos.desvio}>
          <AlertTriangle color="#8A5800" size={20} />
          <View style={estilos.flexible}>
            <Text style={estilos.codigo}>Te alejaste del recorrido</Text>
            <Text style={estilos.estadoParada}>
              Estás aproximadamente a {Math.round(distanciaRuta)} m de la línea calculada.
            </Text>
          </View>
          <Pressable onPress={recalcularRecorrido} style={estilos.botonRecalcular}>
            <Text style={estilos.textoRecalcular}>Recalcular</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={estilos.subtitulo}>Paradas del recorrido</Text>
      <View style={estilos.lista}>
        {ejecucion.paradas.map((parada) => (
          <View
            key={parada.id}
            style={[
              estilos.parada,
              parada.estado !== 'pendiente' && estilos.paradaAtendida,
            ]}
          >
            <View style={estilos.numero}>
              <Text style={estilos.textoNumero}>{parada.orden}</Text>
            </View>
            <View style={estilos.flexible}>
              <Text style={estilos.codigo}>{parada.codigo_qr}</Text>
              <Text style={estilos.estadoParada}>
                {etiquetasParada[parada.estado]}
              </Text>
              <Text numberOfLines={2} style={estilos.direccion}>
                {parada.direccion || 'Dirección no disponible'}
                {parada.eta_minutos != null ? ` · ETA inicial ${parada.eta_minutos} min` : ''}
              </Text>
            </View>
            {parada.estado === 'pendiente' ? (
              <View style={estilos.accionesParada}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => abrirNavegacion(parada)}
                  style={estilos.accionAzul}
                >
                  <Navigation color={colores.white} size={18} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={procesando}
                  onPress={() => actualizarParada(parada, 'recolectado')}
                  style={estilos.accionVerde}
                >
                  <CheckCircle2 color={colores.white} size={18} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={procesando}
                  onPress={() => actualizarParada(parada, 'omitido')}
                  style={estilos.accionNaranja}
                >
                  <SkipForward color={colores.white} size={18} />
                </Pressable>
              </View>
            ) : null}
          </View>
        ))}
      </View>

      <View style={estilos.incidencia}>
        <View style={estilos.tituloFila}>
          <AlertTriangle color={colores.secondary} size={21} />
          <Text style={estilos.subtitulo}>Registrar incidencia</Text>
        </View>
        <Text style={estilos.etiqueta}>Parada relacionada</Text>
        <View style={estilos.chips}>
          <Pressable
            onPress={() => cambiarParadaIncidenciaId(null)}
            style={[
              estilos.chip,
              paradaIncidenciaId == null && estilos.chipActivo,
            ]}
          >
            <Text style={estilos.textoChip}>General</Text>
          </Pressable>
          {ejecucion.paradas.map((parada) => (
            <Pressable
              key={parada.id}
              onPress={() => cambiarParadaIncidenciaId(parada.id)}
              style={[
                estilos.chip,
                paradaIncidenciaId === parada.id && estilos.chipActivo,
              ]}
            >
              <Text style={estilos.textoChip}>#{parada.orden}</Text>
            </Pressable>
          ))}
        </View>
        <View style={estilos.chips}>
          {tiposIncidencia.map((tipo) => (
            <Pressable
              key={tipo.id}
              onPress={() => cambiarTipoIncidencia(tipo.id)}
              style={[
                estilos.chip,
                tipoIncidencia === tipo.id && estilos.chipActivo,
              ]}
            >
              <Text style={estilos.textoChip}>{tipo.etiqueta}</Text>
            </Pressable>
          ))}
        </View>
        <CampoTexto
          etiqueta="Descripción"
          value={comentarioIncidencia}
          onChangeText={cambiarComentarioIncidencia}
        />
        <Pressable onPress={tomarEvidencia} style={estilos.foto}>
          <Camera color={colores.secondary} size={20} />
          <Text style={estilos.textoFoto}>
            {evidenciaNombre || 'Tomar fotografía de evidencia'}
          </Text>
        </Pressable>
        <Boton
          texto="Guardar incidencia"
          variante="secundario"
          cargando={procesando}
          alPresionar={registrarIncidencia}
        />
      </View>

      {error ? <Text style={estilos.error}>{error}</Text> : null}
      <Boton
        texto="Finalizar recorrido"
        cargando={procesando}
        alPresionar={finalizar}
      />
      <View style={estilos.cancelacion}>
        <CircleStop color={colores.danger} size={20} />
        <View style={estilos.flexible}>
          <CampoTexto
            etiqueta="Motivo para cancelar"
            value={motivoCancelacion}
            onChangeText={cambiarMotivoCancelacion}
          />
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={procesando}
        onPress={cancelar}
        style={estilos.botonCancelar}
      >
        <Text style={estilos.textoCancelar}>Cancelar recorrido</Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  flexible: { flex: 1 },
  panel: {
    gap: espaciado.md,
    marginBottom: espaciado.xxl,
    padding: espaciado.lg,
    borderWidth: 1,
    borderColor: colores.primary,
    borderRadius: 18,
    backgroundColor: '#F4FBF6',
  },
  panelActivo: { borderWidth: 2 },
  tituloFila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
  titulo: { color: colores.text, fontSize: 20, fontWeight: '900' },
  subtitulo: { color: colores.text, fontSize: 17, fontWeight: '900' },
  ayuda: { color: colores.muted, fontSize: 13, lineHeight: 19 },
  lista: { gap: espaciado.sm },
  ruta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    padding: espaciado.md,
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 14,
    backgroundColor: colores.white,
  },
  nombreRuta: { color: colores.text, fontSize: 15, fontWeight: '900' },
  detalleRuta: { color: colores.muted, fontSize: 12 },
  botonIniciar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: espaciado.md,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colores.primary,
  },
  textoIniciar: { color: colores.white, fontSize: 12, fontWeight: '900' },
  recorridoCabecera: { flexDirection: 'row', alignItems: 'center', gap: espaciado.md },
  etiquetaActiva: { color: colores.primary, fontSize: 11, fontWeight: '900' },
  progresoCirculo: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    borderColor: colores.primary,
    borderRadius: 31,
    backgroundColor: colores.white,
  },
  progreso: { color: colores.primaryDark, fontSize: 16, fontWeight: '900' },
  barra: {
    height: 10,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: colores.border,
  },
  barraActiva: { height: '100%', borderRadius: 999, backgroundColor: colores.primary },
  gps: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    padding: espaciado.sm,
    borderRadius: 10,
    backgroundColor: '#E8F3FC',
  },
  textoGps: { flex: 1, color: '#1769AA', fontSize: 11, fontWeight: '800' },
  sincronizacion: {
    padding: espaciado.sm,
    color: '#1769AA',
    fontSize: 12,
    fontWeight: '800',
    borderRadius: 10,
    backgroundColor: '#E8F3FC',
  },
  siguiente: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    padding: espaciado.md,
    borderWidth: 1,
    borderColor: '#2196F3',
    borderRadius: 14,
    backgroundColor: '#E8F3FC',
  },
  botonNavegar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: espaciado.md,
    paddingVertical: 10,
    borderRadius: 11,
    backgroundColor: '#2196F3',
  },
  desvio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    padding: espaciado.md,
    borderRadius: 14,
    backgroundColor: '#FFF3CD',
  },
  botonRecalcular: {
    paddingHorizontal: espaciado.sm,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: '#8A5800',
  },
  textoRecalcular: { color: colores.white, fontSize: 11, fontWeight: '900' },
  parada: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    padding: espaciado.md,
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 14,
    backgroundColor: colores.white,
  },
  paradaAtendida: { backgroundColor: '#EAF7EE' },
  numero: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colores.primary,
  },
  textoNumero: { color: colores.white, fontWeight: '900' },
  codigo: { color: colores.text, fontSize: 13, fontWeight: '900' },
  estadoParada: { color: colores.muted, fontSize: 11 },
  direccion: { color: colores.muted, fontSize: 10, lineHeight: 14 },
  accionesParada: { flexDirection: 'row', gap: 6 },
  accionAzul: { padding: 9, borderRadius: 10, backgroundColor: '#2196F3' },
  accionVerde: { padding: 9, borderRadius: 10, backgroundColor: colores.primary },
  accionNaranja: { padding: 9, borderRadius: 10, backgroundColor: colores.secondary },
  incidencia: {
    gap: espaciado.md,
    marginTop: espaciado.md,
    padding: espaciado.md,
    borderWidth: 1,
    borderColor: colores.secondary,
    borderRadius: 15,
    backgroundColor: '#FFF9F0',
  },
  etiqueta: { color: colores.text, fontSize: 13, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: espaciado.sm,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 999,
    backgroundColor: colores.white,
  },
  chipActivo: { borderColor: colores.secondary, backgroundColor: '#FFE5CC' },
  textoChip: { color: colores.text, fontSize: 11, fontWeight: '800' },
  foto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    padding: espaciado.md,
    borderWidth: 1,
    borderColor: colores.secondary,
    borderRadius: 12,
    backgroundColor: colores.white,
  },
  textoFoto: { color: colores.secondary, fontSize: 13, fontWeight: '900' },
  historial: {
    gap: espaciado.sm,
    marginTop: espaciado.md,
    paddingTop: espaciado.md,
    borderTopWidth: 1,
    borderTopColor: colores.border,
  },
  historialFila: {
    padding: espaciado.sm,
    borderRadius: 10,
    backgroundColor: colores.white,
  },
  error: {
    padding: espaciado.md,
    color: colores.danger,
    fontSize: 13,
    borderRadius: 12,
    backgroundColor: '#FFF1F0',
  },
  vacio: {
    padding: espaciado.lg,
    color: colores.muted,
    textAlign: 'center',
    borderRadius: 14,
    backgroundColor: colores.white,
  },
  cancelacion: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
  botonCancelar: {
    alignItems: 'center',
    paddingVertical: espaciado.md,
    borderWidth: 1,
    borderColor: colores.danger,
    borderRadius: 13,
  },
  textoCancelar: { color: colores.danger, fontSize: 14, fontWeight: '900' },
});
