import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CalendarDays, Clock3, MapPin, RefreshCw, Route } from 'lucide-react-native';

import { conexionApi, obtenerMensajeErrorApi } from '../componentes/conexionApi';
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

export function PantallaInicio() {
  const [rutas, cambiarRutas] = useState([]);
  const [cargando, cambiarCargando] = useState(true);
  const [error, cambiarError] = useState('');
  const [diaSeleccionado, cambiarDiaSeleccionado] = useState(null);
  const estadosAnteriores = useRef(null);

  useEffect(() => {
    prepararNotificacionesLocales().catch(() => null);
  }, []);

  const cargarRutas = useCallback(async () => {
    try {
      cambiarCargando(true);
      cambiarError('');
      const respuesta = await conexionApi.get('/rutas');
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
  }, []);

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

  function abrirDetalle(dia) {
    cambiarDiaSeleccionado(dia);
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
            if (dia) abrirDetalle(dia);
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

        <Text style={estilos.leyenda}>
          Los días verdes tienen una recolección programada.
        </Text>
        {error ? <Text style={estilos.error}>{error}</Text> : null}

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
        onRequestClose={() => cambiarDiaSeleccionado(null)}
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
                  {diaSeleccionado.rutas.map((ruta) => (
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
                      {ruta.operacion?.estado === 'en_recorrido' ? (
                        <MapaRuta
                          paradas={ruta.contenedores.map((contenedor) => ({
                            ...contenedor,
                            estado: 'pendiente',
                          }))}
                          geometria={ruta.geometria}
                          ubicacionRecolector={
                            ruta.operacion.latitud_actual != null
                              && ruta.operacion.longitud_actual != null
                              ? {
                                  latitude: ruta.operacion.latitud_actual,
                                  longitude: ruta.operacion.longitud_actual,
                                }
                              : null
                          }
                        />
                      ) : null}
                      {ruta.descripcion ? (
                        <Text style={estilos.descripcionRuta}>{ruta.descripcion}</Text>
                      ) : null}
                    </View>
                  ))}
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
                  onPress={() => cambiarDiaSeleccionado(null)}
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
  descripcionRuta: { color: colores.muted, fontSize: 13, lineHeight: 18 },
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
