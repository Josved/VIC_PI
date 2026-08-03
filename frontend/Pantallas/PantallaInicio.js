import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock3,
  MapPin,
  MapPinned,
  RefreshCw,
  Route,
  Save,
  Trash2,
} from 'lucide-react-native';

import { Boton } from '../componentes/Boton';
import { CampoTexto } from '../componentes/CampoTexto';
import { conexionApi, obtenerMensajeErrorApi } from '../componentes/conexionApi';
import { usarSesion } from '../componentes/ContextoSesion';
import { MapaRuta } from '../componentes/MapaRuta';
import { PantallaBase } from '../componentes/PantallaBase';
import {
  mostrarNotificacionLocal,
  prepararNotificacionesLocales,
} from '../componentes/servicioNotificaciones';
import { colores, espaciado } from '../componentes/tema';

const avisos = [
  {
    id: '1',
    titulo: 'Registro comunitario por QR',
    fecha: 'Disponible',
    descripcion:
      'Si encuentras un contenedor, escanea su QR para registrar o actualizar su ubicación.',
  },
  {
    id: '2',
    titulo: 'Reportes de contenedores',
    fecha: 'En línea',
    descripcion:
      'Informa si un contenedor está lleno, dañado, sucio o aparece en una ubicación incorrecta.',
  },
];

const diasSemana = [
  { id: 'lunes', nombre: 'Lunes', corto: 'Lun' },
  { id: 'martes', nombre: 'Martes', corto: 'Mar' },
  { id: 'miercoles', nombre: 'Miércoles', corto: 'Mié' },
  { id: 'jueves', nombre: 'Jueves', corto: 'Jue' },
  { id: 'viernes', nombre: 'Viernes', corto: 'Vie' },
  { id: 'sabado', nombre: 'Sábado', corto: 'Sáb' },
  { id: 'domingo', nombre: 'Domingo', corto: 'Dom' },
];

const etiquetasOperacion = {
  en_recorrido: 'Recolector en recorrido',
  completada: 'Recolección completada',
  cancelada: 'Ruta cancelada',
};

export function PantallaInicio({ navigation }) {
  const { usuario } = usarSesion();
  const esAdmin = usuario?.rol === 'admin';
  const esCiudadano = usuario?.rol === 'citizen';
  const [rutas, cambiarRutas] = useState([]);
  const [cargando, cambiarCargando] = useState(true);
  const [error, cambiarError] = useState('');
  const [diaSeleccionado, cambiarDiaSeleccionado] = useState(null);
  const [rutaSeleccionadaId, cambiarRutaSeleccionadaId] = useState(null);
  const [ubicaciones, cambiarUbicaciones] = useState([]);
  const [ubicacionSeleccionadaId, cambiarUbicacionSeleccionadaId] = useState(null);
  const [nombreUbicacion, cambiarNombreUbicacion] = useState('');
  const [guardandoUbicacion, cambiarGuardandoUbicacion] = useState(false);
  const estadosAnteriores = useRef(null);

  const ubicacionSeleccionada = ubicaciones.find(
    (ubicacion) => ubicacion.id === ubicacionSeleccionadaId,
  ) || null;

  useEffect(() => {
    prepararNotificacionesLocales().catch(() => null);
  }, []);

  const cargarUbicaciones = useCallback(async () => {
    if (!esCiudadano) return [];
    const respuesta = await conexionApi.get('/ubicaciones/mias');
    cambiarUbicaciones(respuesta.data);
    cambiarUbicacionSeleccionadaId((actual) => (
      respuesta.data.some((ubicacion) => ubicacion.id === actual)
        ? actual
        : respuesta.data[0]?.id || null
    ));
    return respuesta.data;
  }, [esCiudadano]);

  const cargarRutas = useCallback(async () => {
    try {
      cambiarCargando(true);
      cambiarError('');
      if (esCiudadano && !ubicacionSeleccionada) {
        cambiarRutas([]);
        return;
      }
      const respuesta = await conexionApi.get('/rutas', {
        params: ubicacionSeleccionada
          ? {
              latitud: ubicacionSeleccionada.latitud,
              longitud: ubicacionSeleccionada.longitud,
              radio_m: ubicacionSeleccionada.radio_m,
            }
          : undefined,
      });
      cambiarRutas(respuesta.data);
    } catch (excepcion) {
      cambiarError(
        obtenerMensajeErrorApi(
          excepcion,
          'No fue posible consultar el calendario de recolección.',
        ),
      );
    } finally {
      cambiarCargando(false);
    }
  }, [esCiudadano, ubicacionSeleccionadaId]);

  useEffect(() => {
    cargarUbicaciones().catch((excepcion) => {
      cambiarError(obtenerMensajeErrorApi(excepcion, 'No fue posible cargar tus zonas.'));
    });
  }, [cargarUbicaciones]);

  useFocusEffect(
    useCallback(() => {
      cargarRutas();
      const intervalo = setInterval(cargarRutas, 15000);
      return () => clearInterval(intervalo);
    }, [cargarRutas]),
  );

  useEffect(() => {
    const actuales = Object.fromEntries(
      rutas.map((ruta) => [ruta.id, ruta.operacion?.estado || 'programada']),
    );
    if (estadosAnteriores.current) {
      rutas.forEach((ruta) => {
        const anterior = estadosAnteriores.current[ruta.id];
        if (
          anterior
          && anterior !== 'en_recorrido'
          && ruta.operacion?.estado === 'en_recorrido'
        ) {
          mostrarNotificacionLocal({
            titulo: 'El recolector inició su recorrido',
            cuerpo: `${ruta.nombre}: paso aproximado ${ruta.hora_aproximada}.`,
          }).catch(() => null);
        }
      });
    }
    estadosAnteriores.current = actuales;
  }, [rutas]);

  const calendario = diasSemana.map((dia) => ({
    ...dia,
    rutas: rutas.filter((ruta) => ruta.dia_semana === dia.id),
  }));
  const rutasEnCurso = rutas.filter(
    (ruta) => ruta.operacion?.estado === 'en_recorrido',
  );

  function abrirDetalle(dia, rutaId = null) {
    cambiarDiaSeleccionado(dia);
    cambiarRutaSeleccionadaId(rutaId);
  }

  function cerrarDetalle() {
    cambiarDiaSeleccionado(null);
    cambiarRutaSeleccionadaId(null);
  }

  async function guardarUbicacionActual() {
    try {
      cambiarGuardandoUbicacion(true);
      cambiarError('');
      let permiso = await Location.getForegroundPermissionsAsync();
      if (!permiso.granted && permiso.canAskAgain) {
        permiso = await Location.requestForegroundPermissionsAsync();
      }
      if (!permiso.granted) {
        throw new Error('Autoriza la ubicación para guardar esta zona.');
      }
      const posicion = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const direccion = await conexionApi.get('/geografia/direccion', {
        params: {
          latitud: posicion.coords.latitude,
          longitud: posicion.coords.longitude,
        },
      });
      const datosDireccion = direccion.data;
      const respuesta = await conexionApi.post('/ubicaciones', {
        nombre: nombreUbicacion.trim()
          || datosDireccion.colonia
          || datosDireccion.calle
          || 'Mi zona',
        direccion: datosDireccion.direccion_completa,
        latitud: posicion.coords.latitude,
        longitud: posicion.coords.longitude,
        radio_m: 3000,
      });
      cambiarNombreUbicacion('');
      await cargarUbicaciones();
      cambiarUbicacionSeleccionadaId(respuesta.data.id);
    } catch (excepcion) {
      cambiarError(obtenerMensajeErrorApi(excepcion, excepcion.message || 'No se pudo guardar la zona.'));
    } finally {
      cambiarGuardandoUbicacion(false);
    }
  }

  function confirmarEliminarUbicacion(ubicacion) {
    Alert.alert(
      'Quitar zona',
      `¿Dejar de mostrar el calendario de ${ubicacion.nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: async () => {
            await conexionApi.delete(`/ubicaciones/${ubicacion.id}`);
            await cargarUbicaciones();
          },
        },
      ],
    );
  }

  function editarRutaComoAdmin(ruta) {
    cerrarDetalle();
    navigation.navigate('Rutas', {
      editarRutaId: ruta.id,
      solicitudEdicion: Date.now(),
    });
  }

  function confirmarEliminarRuta(ruta) {
    Alert.alert(
      'Eliminar del calendario',
      `La ruta ${ruta.nombre} dejará de mostrarse. Podrás restaurarla desde Rutas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await conexionApi.patch(`/rutas/${ruta.id}`, { activa: false });
            cerrarDetalle();
            await cargarRutas();
          },
        },
      ],
    );
  }

  return (
    <PantallaBase centrada={false}>
      <View style={estilos.encabezado}>
        <Text style={estilos.titulo}>Inicio y comunidad</Text>
        <Text style={estilos.subtitulo}>
          Consulta qué día pasará la recolección y su horario aproximado.
        </Text>
      </View>

      {rutasEnCurso.map((ruta) => (
        <Pressable
          key={`aviso-${ruta.id}`}
          onPress={() => {
            const dia = calendario.find((item) => item.id === ruta.dia_semana);
            if (dia) abrirDetalle(dia, ruta.id);
          }}
          style={estilos.avisoActivo}
        >
          <Route color={colores.white} size={23} />
          <View style={estilos.flexible}>
            <Text style={estilos.avisoActivoTitulo}>Recolector en recorrido</Text>
            <Text style={estilos.avisoActivoTexto}>
              {ruta.nombre} · {ruta.operacion.progreso_porcentaje}% · ETA siguiente{' '}
              {ruta.operacion.eta_siguiente_minutos || 'calculando'} min
            </Text>
          </View>
        </Pressable>
      ))}

      <View style={estilos.seccion}>
        <View style={estilos.tituloCalendarioFila}>
          <View style={estilos.tituloConIcono}>
            <CalendarDays color={colores.primary} size={23} />
            <Text style={estilos.tituloSeccion}>Calendario semanal</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Actualizar calendario"
            onPress={cargarRutas}
            style={estilos.botonActualizar}
          >
            {cargando ? (
              <ActivityIndicator color={colores.primary} />
            ) : (
              <RefreshCw color={colores.primary} size={19} />
            )}
          </Pressable>
        </View>

        {esCiudadano ? (
          <View style={estilos.selectorZona}>
            <View style={estilos.tituloConIcono}>
              <MapPin color={colores.primary} size={20} />
              <Text style={estilos.zonaTitulo}>Zona del calendario</Text>
            </View>
            {ubicaciones.length > 0 ? (
              <View style={estilos.zonasLista}>
                {ubicaciones.map((ubicacion) => {
                  const seleccionada = ubicacion.id === ubicacionSeleccionadaId;
                  return (
                    <View key={ubicacion.id} style={estilos.zonaFila}>
                      <Pressable
                        onPress={() => cambiarUbicacionSeleccionadaId(ubicacion.id)}
                        style={[estilos.zonaChip, seleccionada && estilos.zonaChipActiva]}
                      >
                        <Text style={[estilos.zonaNombre, seleccionada && estilos.zonaTextoActivo]}>
                          {ubicacion.nombre}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={[estilos.zonaDireccion, seleccionada && estilos.zonaTextoActivo]}
                        >
                          {ubicacion.direccion}
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityLabel={`Quitar zona ${ubicacion.nombre}`}
                        onPress={() => confirmarEliminarUbicacion(ubicacion)}
                        style={estilos.botonQuitarZona}
                      >
                        <Trash2 color={colores.danger} size={18} />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={estilos.zonaVacia}>
                Guarda una ubicación para ver únicamente las rutas cercanas a esa zona.
              </Text>
            )}
            <CampoTexto
              etiqueta="Nombre opcional"
              placeholder="Casa, trabajo o colonia"
              value={nombreUbicacion}
              onChangeText={cambiarNombreUbicacion}
              maxLength={80}
            />
            <Boton
              texto="Guardar mi ubicación actual"
              variante="secundario"
              cargando={guardandoUbicacion}
              alPresionar={guardarUbicacionActual}
            />
          </View>
        ) : null}

        <Text style={estilos.leyenda}>
          {esCiudadano && ubicacionSeleccionada
            ? `Solo se muestran rutas a ${Math.round(ubicacionSeleccionada.radio_m / 1000)} km de ${ubicacionSeleccionada.nombre}.`
            : 'Los días verdes tienen una recolección programada.'}
        </Text>
        {error ? <Text style={estilos.error}>{error}</Text> : null}
        {esCiudadano && ubicacionSeleccionada && !cargando && rutas.length === 0 ? (
          <Text style={estilos.sinRutasCercanas}>
            No tienes una ruta de recolección cercana registrada para esta zona.
          </Text>
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={estilos.calendario}
        >
          {calendario.map((dia) => {
            const tieneRuta = dia.rutas.length > 0;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${dia.nombre}, ${
                  tieneRuta ? `${dia.rutas.length} rutas` : 'sin recolección'
                }`}
                key={dia.id}
                onPress={() => abrirDetalle(dia)}
                style={[
                  estilos.tarjetaDia,
                  tieneRuta ? estilos.diaConRuta : estilos.diaSinRuta,
                ]}
              >
                <Text
                  style={[
                    estilos.textoDia,
                    tieneRuta && estilos.textoDiaActivo,
                  ]}
                >
                  {dia.corto}
                </Text>
                <View
                  style={[
                    estilos.indicadorDia,
                    tieneRuta && estilos.indicadorActivo,
                  ]}
                >
                  {tieneRuta ? (
                    <Route color={colores.white} size={20} />
                  ) : (
                    <Text style={estilos.guion}>—</Text>
                  )}
                </View>
                <Text
                  style={[
                    estilos.textoEstadoDia,
                    tieneRuta && estilos.textoEstadoActivo,
                  ]}
                >
                  {tieneRuta
                    ? dia.rutas.length === 1
                      ? dia.rutas[0].hora_aproximada
                      : `${dia.rutas.length} rutas`
                    : 'Sin ruta'}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={estilos.seccion}>
        <Text style={estilos.tituloSeccion}>Avisos de la comunidad</Text>
        {avisos.map((aviso) => (
          <View key={aviso.id} style={estilos.tarjetaAviso}>
            <View style={estilos.encabezadoAviso}>
              <Text style={estilos.tituloAviso}>{aviso.titulo}</Text>
              <Text style={estilos.fechaAviso}>{aviso.fecha}</Text>
            </View>
            <Text style={estilos.descripcionAviso}>{aviso.descripcion}</Text>
          </View>
        ))}
      </View>

      <Modal
        animationType="slide"
        transparent
        visible={Boolean(diaSeleccionado)}
        onRequestClose={cerrarDetalle}
      >
        <View style={estilos.fondoModal}>
          <View style={estilos.modal}>
            {diaSeleccionado ? (
              <>
                <Text style={estilos.tituloModal}>{diaSeleccionado.nombre}</Text>
                <Text style={estilos.subtituloModal}>
                  {diaSeleccionado.rutas.length > 0
                    ? 'Recolección programada'
                    : 'No hay rutas activas para este día'}
                </Text>

                <ScrollView
                  style={estilos.listaModal}
                  contentContainerStyle={estilos.listaModalContenido}
                >
                  {diaSeleccionado.rutas.map((ruta) => {
                    const mapaVisible = rutaSeleccionadaId === ruta.id;
                    const puntosRuta = (ruta.puntos_ruta || []).map((punto) => {
                      const contenedor = ruta.contenedores.find(
                        (item) => item.id === punto.contenedor_id,
                      );
                      return {
                        ...punto,
                        codigo_qr: contenedor?.codigo_qr,
                        direccion: punto.direccion || contenedor?.direccion,
                        estado: 'pendiente',
                      };
                    });
                    return (
                      <View key={ruta.id} style={estilos.rutaModal}>
                      <Text style={estilos.nombreRuta}>{ruta.nombre}</Text>
                      <View style={estilos.datoRuta}>
                        <Clock3 color={colores.primary} size={18} />
                        <Text style={estilos.textoDatoRuta}>
                          Aproximadamente a las {ruta.hora_aproximada}
                        </Text>
                      </View>
                      <View style={estilos.datoRuta}>
                        <MapPin color={colores.primary} size={18} />
                        <Text style={estilos.textoDatoRuta}>{ruta.zona}</Text>
                      </View>
                      <Text style={estilos.contenedoresRuta}>
                        {ruta.contenedores.length}{' '}
                        {ruta.contenedores.length === 1
                          ? 'contenedor incluido'
                          : 'contenedores incluidos'}
                      </Text>
                      {ruta.recolector ? (
                        <Text style={estilos.recolectorRuta}>
                          Responsable: {ruta.recolector.nombre}{' '}
                          {ruta.recolector.apellidos} · Placa:{' '}
                          {ruta.vehiculo?.placa || 'sin asignar'}
                        </Text>
                      ) : null}
                      <Text style={estilos.contenedoresRuta}>
                        Recorrido:{' '}
                        {ruta.distancia_m == null
                          ? 'pendiente'
                          : `${(ruta.distancia_m / 1000).toFixed(1)} km`}{' '}
                        · {ruta.duracion_minutos || 0} min estimados
                      </Text>
                      {ruta.operacion ? (
                        <View style={estilos.estadoOperacion}>
                          <Text style={estilos.textoEstadoOperacion}>
                            {etiquetasOperacion[ruta.operacion.estado]}
                          </Text>
                          <Text style={estilos.progresoOperacion}>
                            {ruta.operacion.progreso_porcentaje}% ·{' '}
                            {ruta.operacion.paradas_atendidas}/
                            {ruta.operacion.paradas_totales} paradas
                          </Text>
                          {ruta.operacion.estado === 'en_recorrido' ? (
                            <Text style={estilos.progresoOperacion}>
                              Siguiente parada en aproximadamente{' '}
                              {ruta.operacion.eta_siguiente_minutos || '—'} min ·{' '}
                              {ruta.operacion.distancia_siguiente_m == null
                                ? 'distancia calculándose'
                                : `${Math.round(ruta.operacion.distancia_siguiente_m)} m`}
                            </Text>
                          ) : null}
                        </View>
                      ) : null}
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${
                          mapaVisible ? 'Ocultar' : 'Ver'
                        } recorrido de ${ruta.nombre}`}
                        onPress={() =>
                          cambiarRutaSeleccionadaId((actual) =>
                            actual === ruta.id ? null : ruta.id,
                          )
                        }
                        style={[
                          estilos.botonMapa,
                          mapaVisible && estilos.botonMapaActivo,
                        ]}
                      >
                        <MapPinned
                          color={mapaVisible ? colores.white : colores.primary}
                          size={19}
                        />
                        <Text
                          style={[
                            estilos.textoBotonMapa,
                            mapaVisible && estilos.textoBotonMapaActivo,
                          ]}
                        >
                          {mapaVisible ? 'Ocultar mapa' : 'Ver recorrido en el mapa'}
                        </Text>
                        {mapaVisible ? (
                          <ChevronUp color={colores.white} size={18} />
                        ) : (
                          <ChevronDown color={colores.primary} size={18} />
                        )}
                      </Pressable>
                      {mapaVisible ? (
                        <View style={estilos.detalleMapa}>
                          <Text style={estilos.tituloMapa}>Mapa del recorrido</Text>
                          <Text style={estilos.ayudaMapa}>
                            La línea verde sigue las calles planeadas y los
                            contenedores aparecen numerados.
                          </Text>
                          <MapaRuta
                            paradas={ruta.contenedores.map((contenedor) => ({
                              ...contenedor,
                              estado: 'pendiente',
                            }))}
                            puntos={puntosRuta}
                            geometria={ruta.geometria}
                            ubicacionRecolector={
                              ruta.operacion?.estado === 'en_recorrido'
                                && ruta.operacion.latitud_actual != null
                                && ruta.operacion.longitud_actual != null
                                ? {
                                    latitude: ruta.operacion.latitud_actual,
                                    longitude: ruta.operacion.longitud_actual,
                                  }
                                : null
                            }
                            alto={240}
                          />
                        </View>
                      ) : null}
                      {ruta.descripcion ? (
                        <Text style={estilos.descripcionRuta}>{ruta.descripcion}</Text>
                      ) : null}
                      {esAdmin ? (
                        <View style={estilos.accionesAdminRuta}>
                          <Pressable
                            onPress={() => editarRutaComoAdmin(ruta)}
                            style={estilos.botonAdminEditar}
                          >
                            <Save color={colores.white} size={17} />
                            <Text style={estilos.textoBotonAdmin}>Editar y guardar</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => confirmarEliminarRuta(ruta)}
                            style={estilos.botonAdminEliminar}
                          >
                            <Trash2 color={colores.white} size={17} />
                            <Text style={estilos.textoBotonAdmin}>Eliminar</Text>
                          </Pressable>
                        </View>
                      ) : null}
                      </View>
                    );
                  })}
                </ScrollView>

                {diaSeleccionado.rutas.length > 0 ? (
                  <Text style={estilos.notaModal}>
                    Ten preparada tu basura antes del horario indicado; la hora
                    puede variar según el recorrido.
                  </Text>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  style={estilos.botonCerrar}
                  onPress={cerrarDetalle}
                >
                  <Text style={estilos.textoBotonCerrar}>Cerrar</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </PantallaBase>
  );
}

const estilos = StyleSheet.create({
  flexible: { flex: 1 },
  encabezado: { marginBottom: espaciado.xl, marginTop: espaciado.sm },
  titulo: { color: colores.primary, fontSize: 26, fontWeight: '900' },
  subtitulo: {
    marginTop: espaciado.xs,
    color: colores.muted,
    fontSize: 15,
    lineHeight: 21,
  },
  avisoActivo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    marginBottom: espaciado.lg,
    padding: espaciado.md,
    borderRadius: 15,
    backgroundColor: '#2196F3',
  },
  avisoActivoTitulo: { color: colores.white, fontSize: 15, fontWeight: '900' },
  avisoActivoTexto: { color: colores.white, fontSize: 12, lineHeight: 17 },
  seccion: { marginBottom: espaciado.xxl },
  tituloCalendarioFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaciado.md,
  },
  tituloSeccion: {
    color: colores.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: espaciado.md,
  },
  tituloConIcono: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
  },
  leyenda: {
    marginBottom: espaciado.md,
    color: colores.muted,
    fontSize: 13,
  },
  selectorZona: {
    gap: espaciado.sm,
    marginBottom: espaciado.md,
    padding: espaciado.md,
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 15,
    backgroundColor: colores.surface,
  },
  zonaTitulo: { color: colores.text, fontSize: 15, fontWeight: '900' },
  zonasLista: { gap: espaciado.sm },
  zonaFila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
  zonaChip: {
    flex: 1,
    padding: espaciado.sm,
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 12,
    backgroundColor: colores.white,
  },
  zonaChipActiva: { borderColor: colores.primary, backgroundColor: colores.primary },
  zonaNombre: { color: colores.text, fontSize: 13, fontWeight: '900' },
  zonaDireccion: { color: colores.muted, fontSize: 11 },
  zonaTextoActivo: { color: colores.white },
  botonQuitarZona: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#FFF1F0',
  },
  zonaVacia: { color: colores.muted, fontSize: 12, lineHeight: 17 },
  sinRutasCercanas: {
    marginBottom: espaciado.md,
    padding: espaciado.md,
    color: colores.muted,
    fontSize: 13,
    borderRadius: 12,
    backgroundColor: colores.surface,
  },
  botonActualizar: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 13,
    backgroundColor: colores.white,
  },
  error: {
    marginBottom: espaciado.md,
    padding: espaciado.md,
    color: colores.danger,
    fontSize: 13,
    borderRadius: 12,
    backgroundColor: '#FFF1F0',
  },
  calendario: { paddingBottom: espaciado.sm },
  tarjetaDia: {
    minWidth: 105,
    alignItems: 'center',
    gap: espaciado.sm,
    marginRight: espaciado.sm,
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.lg,
    borderWidth: 1,
    borderRadius: 16,
  },
  diaConRuta: { borderColor: colores.primary, backgroundColor: '#EAF7EE' },
  diaSinRuta: { borderColor: colores.border, backgroundColor: colores.surface },
  textoDia: { color: colores.muted, fontSize: 15, fontWeight: '900' },
  textoDiaActivo: { color: colores.primaryDark },
  indicadorDia: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colores.border,
  },
  indicadorActivo: { backgroundColor: colores.primary },
  guion: { color: colores.muted, fontSize: 18, fontWeight: '900' },
  textoEstadoDia: { color: colores.muted, fontSize: 12, fontWeight: '800' },
  textoEstadoActivo: { color: colores.primaryDark },
  tarjetaAviso: {
    marginBottom: espaciado.md,
    padding: espaciado.lg,
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 12,
    backgroundColor: colores.white,
  },
  encabezadoAviso: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: espaciado.md,
    marginBottom: espaciado.sm,
  },
  tituloAviso: { flex: 1, color: colores.text, fontSize: 15, fontWeight: '800' },
  fechaAviso: { color: colores.primary, fontSize: 12, fontWeight: '800' },
  descripcionAviso: { color: colores.muted, fontSize: 14, lineHeight: 20 },
  fondoModal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modal: {
    maxHeight: '82%',
    padding: espaciado.xl,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colores.white,
  },
  tituloModal: {
    color: colores.text,
    fontSize: 23,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtituloModal: {
    marginTop: espaciado.xs,
    marginBottom: espaciado.lg,
    color: colores.muted,
    fontSize: 14,
    textAlign: 'center',
  },
  listaModal: { maxHeight: 360 },
  listaModalContenido: { gap: espaciado.md },
  rutaModal: {
    gap: espaciado.sm,
    padding: espaciado.lg,
    borderWidth: 1,
    borderColor: colores.primary,
    borderRadius: 15,
    backgroundColor: '#F4FBF6',
  },
  nombreRuta: { color: colores.text, fontSize: 17, fontWeight: '900' },
  datoRuta: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
  textoDatoRuta: { flex: 1, color: colores.text, fontSize: 14, fontWeight: '700' },
  contenedoresRuta: { color: colores.primaryDark, fontSize: 12, fontWeight: '800' },
  recolectorRuta: { color: colores.text, fontSize: 12, fontWeight: '800' },
  estadoOperacion: {
    gap: 3,
    padding: espaciado.sm,
    borderRadius: 10,
    backgroundColor: '#E8F3FC',
  },
  textoEstadoOperacion: { color: '#1769AA', fontSize: 13, fontWeight: '900' },
  progresoOperacion: { color: '#1769AA', fontSize: 11, fontWeight: '700' },
  botonMapa: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    paddingHorizontal: espaciado.md,
    borderWidth: 1,
    borderColor: colores.primary,
    borderRadius: 12,
    backgroundColor: colores.white,
  },
  botonMapaActivo: { backgroundColor: colores.primary },
  textoBotonMapa: { flex: 1, color: colores.primary, fontSize: 13, fontWeight: '900' },
  textoBotonMapaActivo: { color: colores.white },
  detalleMapa: { gap: espaciado.sm, marginTop: espaciado.xs },
  tituloMapa: { color: colores.text, fontSize: 15, fontWeight: '900' },
  ayudaMapa: { color: colores.muted, fontSize: 12, lineHeight: 17 },
  descripcionRuta: { color: colores.muted, fontSize: 13, lineHeight: 18 },
  accionesAdminRuta: { flexDirection: 'row', gap: espaciado.sm, marginTop: espaciado.sm },
  botonAdminEditar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 11,
    borderRadius: 11,
    backgroundColor: colores.primary,
  },
  botonAdminEliminar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 11,
    borderRadius: 11,
    backgroundColor: colores.danger,
  },
  textoBotonAdmin: { color: colores.white, fontSize: 11, fontWeight: '900' },
  notaModal: {
    marginTop: espaciado.lg,
    marginBottom: espaciado.lg,
    color: colores.muted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  botonCerrar: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colores.primary,
  },
  textoBotonCerrar: { color: colores.white, fontSize: 16, fontWeight: '900' },
});
