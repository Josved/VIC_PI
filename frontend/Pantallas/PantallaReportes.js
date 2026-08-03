import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  CircleCheck,
  ClipboardCheck,
  Eye,
  EyeOff,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
} from 'lucide-react-native';

import { Boton } from '../componentes/Boton';
import { CampoTexto } from '../componentes/CampoTexto';
import { conexionApi, obtenerMensajeErrorApi } from '../componentes/conexionApi';
import { EscanerQR } from '../componentes/EscanerQR';
import { usarSesion } from '../componentes/ContextoSesion';
import { PantallaBase } from '../componentes/PantallaBase';
import { colores, espaciado } from '../componentes/tema';
import { usarContenedores } from '../componentes/usarContenedores';

const motivosDisponibles = [
  { id: 'lleno', etiqueta: 'Lleno' },
  { id: 'danado', etiqueta: 'Dañado' },
  { id: 'sucio', etiqueta: 'Sucio' },
  { id: 'ubicacion_incorrecta', etiqueta: 'Ubicación incorrecta' },
  { id: 'otro', etiqueta: 'Otro' },
];

const etiquetaEstadoReporte = {
  pendiente: 'Pendiente',
  en_revision: 'En revisión',
  resuelto: 'Resuelto',
};

const colorEstadoReporte = {
  pendiente: colores.secondary,
  en_revision: colores.primary,
  resuelto: colores.success,
};

function etiquetaMotivo(motivo) {
  return (
    motivosDisponibles.find((opcion) => opcion.id === motivo)?.etiqueta ||
    motivo
  );
}

export function PantallaReportes() {
  const { usuario } = usarSesion();
  const {
    contenedores,
    cargando: cargandoContenedores,
    error: errorContenedores,
    recargar: recargarContenedores,
  } = usarContenedores();
  const esGestor = usuario?.rol === 'collector' || usuario?.rol === 'admin';

  const [busquedaCodigo, cambiarBusquedaCodigo] = useState('');
  const [contenedorId, cambiarContenedorId] = useState(null);
  const [motivo, cambiarMotivo] = useState(null);
  const [comentario, cambiarComentario] = useState('');
  const [enviando, cambiarEnviando] = useState(false);
  const [errorFormulario, cambiarErrorFormulario] = useState('');
  const [exito, cambiarExito] = useState('');
  const [escanerVisible, cambiarEscanerVisible] = useState(false);
  const [errorEscaneo, cambiarErrorEscaneo] = useState('');

  const [reportes, cambiarReportes] = useState([]);
  const [cargandoReportes, cambiarCargandoReportes] = useState(true);
  const [errorReportes, cambiarErrorReportes] = useState('');
  const [actualizandoId, cambiarActualizandoId] = useState(null);
  const [respuestas, cambiarRespuestas] = useState({});
  const [reporteExpandidoId, cambiarReporteExpandidoId] = useState(null);

  const contenedoresFiltrados = useMemo(() => {
    const texto = busquedaCodigo.trim().toLowerCase();
    if (!texto) {
      return contenedores;
    }
    return contenedores.filter(
      (contenedor) =>
        contenedor.codigo_qr.toLowerCase().includes(texto) ||
        String(contenedor.id).includes(texto),
    );
  }, [busquedaCodigo, contenedores]);

  const contenedorSeleccionado =
    contenedores.find((contenedor) => contenedor.id === contenedorId) || null;

  const cargarReportes = useCallback(async () => {
    try {
      cambiarCargandoReportes(true);
      cambiarErrorReportes('');
      const ruta = esGestor ? '/reportes' : '/reportes/mios';
      const respuesta = await conexionApi.get(ruta);
      cambiarReportes(respuesta.data);
    } catch (excepcion) {
      cambiarErrorReportes(
        obtenerMensajeErrorApi(
          excepcion,
          'No fue posible cargar los reportes.',
        ),
      );
    } finally {
      cambiarCargandoReportes(false);
    }
  }, [esGestor]);

  useEffect(() => {
    cargarReportes();
  }, [cargarReportes]);

  function reiniciarFormulario() {
    cambiarBusquedaCodigo('');
    cambiarContenedorId(null);
    cambiarMotivo(null);
    cambiarComentario('');
  }

  async function manejarCodigoEscaneado(codigoQr) {
    cambiarEscanerVisible(false);
    cambiarErrorEscaneo('');
    const codigo = codigoQr.trim().toLowerCase();
    const encontrado = contenedores.find(
      (contenedor) => contenedor.codigo_qr.toLowerCase() === codigo,
    );

    if (!encontrado) {
      cambiarErrorEscaneo(
        'El QR no corresponde a un contenedor registrado. Puedes registrarlo primero desde el mapa y volver a reportarlo.',
      );
      return;
    }

    cambiarBusquedaCodigo(encontrado.codigo_qr);
    cambiarContenedorId(encontrado.id);
  }

  async function enviarReporte() {
    if (!contenedorId) {
      cambiarErrorFormulario('Elige el contenedor que quieres reportar.');
      return;
    }
    if (!motivo) {
      cambiarErrorFormulario('Elige un motivo para el reporte.');
      return;
    }

    try {
      cambiarErrorFormulario('');
      cambiarExito('');
      cambiarEnviando(true);
      await conexionApi.post('/reportes', {
        contenedor_id: contenedorId,
        motivo,
        comentario: comentario.trim() || null,
      });
      cambiarExito('Reporte enviado. El equipo ya puede darle seguimiento.');
      reiniciarFormulario();
      await cargarReportes();
    } catch (excepcion) {
      cambiarErrorFormulario(
        obtenerMensajeErrorApi(excepcion, 'No se pudo enviar el reporte.'),
      );
    } finally {
      cambiarEnviando(false);
    }
  }

  async function actualizarEstado(reporteId, estado) {
    if (!esGestor) {
      cambiarErrorReportes('Solo recolectores y administradores pueden atender reportes.');
      return;
    }

    const reporteActual = reportes.find((reporte) => reporte.id === reporteId);
    if (
      usuario?.rol === 'collector'
      && reporteActual?.usuario_id === usuario.id
    ) {
      cambiarErrorReportes('No puedes tomar ni resolver un reporte creado por ti. Debe atenderlo otra persona.');
      return;
    }
    const respuesta =
      respuestas[reporteId]?.trim() || reporteActual?.respuesta?.trim() || '';
    if (estado === 'resuelto' && !respuesta) {
      cambiarErrorReportes('Escribe una respuesta para el ciudadano antes de resolver el reporte.');
      return;
    }

    try {
      cambiarActualizandoId(reporteId);
      cambiarErrorReportes('');
      await conexionApi.patch(`/reportes/${reporteId}/estado`, {
        estado,
        respuesta: respuesta || null,
      });
      cambiarRespuestas((actuales) => {
        const siguientes = { ...actuales };
        delete siguientes[reporteId];
        return siguientes;
      });
      await cargarReportes();
    } catch (excepcion) {
      cambiarErrorReportes(
        obtenerMensajeErrorApi(
          excepcion,
          'No fue posible actualizar el reporte.',
        ),
      );
    } finally {
      cambiarActualizandoId(null);
    }
  }

  async function refrescarTodo() {
    await Promise.all([recargarContenedores(), cargarReportes()]);
  }

  return (
    <>
      <PantallaBase centrada={false}>
        <View style={estilos.encabezado}>
          <ClipboardCheck color={colores.secondary} size={44} />
          <View style={estilos.textoEncabezado}>
            <Text style={estilos.titulo}>Reportar contenedor</Text>
            <Text style={estilos.subtitulo}>
              Escanea el QR o búscalo por código para registrar una incidencia.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Actualizar contenedores y reportes"
            onPress={refrescarTodo}
            style={estilos.botonActualizar}
          >
            <RefreshCw color={colores.primary} size={22} />
          </Pressable>
        </View>

        <Boton
          texto="Escanear QR para reportar"
          alPresionar={() => {
            cambiarErrorEscaneo('');
            cambiarEscanerVisible(true);
          }}
        />

        <View style={estilos.separador} />
        <CampoTexto
          etiqueta="Buscar por código QR o ID"
          value={busquedaCodigo}
          onChangeText={cambiarBusquedaCodigo}
          autoCapitalize="none"
        />

        {errorEscaneo ? <Text style={estilos.error}>{errorEscaneo}</Text> : null}
        {errorContenedores ? (
          <Text style={estilos.error}>{errorContenedores}</Text>
        ) : null}

        <Text style={estilos.tituloSeccion}>Selecciona un contenedor</Text>
        {cargandoContenedores ? (
          <ActivityIndicator color={colores.primary} />
        ) : contenedoresFiltrados.length === 0 ? (
          <Text style={estilos.vacio}>No se encontró ningún contenedor.</Text>
        ) : (
          <View style={estilos.listaContenedores}>
            {contenedoresFiltrados.slice(0, 30).map((contenedor) => {
              const seleccionado = contenedor.id === contenedorId;
              return (
                <Pressable
                  accessibilityRole="button"
                  key={contenedor.id}
                  onPress={() => cambiarContenedorId(contenedor.id)}
                  style={[
                    estilos.tarjetaContenedor,
                    seleccionado && estilos.tarjetaContenedorSeleccionada,
                  ]}
                >
                  <Search
                    color={seleccionado ? colores.white : colores.primary}
                    size={18}
                  />
                  <View style={estilos.infoContenedor}>
                    <Text
                      numberOfLines={1}
                      style={[
                        estilos.codigoContenedor,
                        seleccionado && estilos.textoSeleccionado,
                      ]}
                    >
                      {contenedor.codigo_qr}
                    </Text>
                    <Text
                      style={[
                        estilos.idContenedor,
                        seleccionado && estilos.textoSeleccionado,
                      ]}
                    >
                      Contenedor #{contenedor.id} · registrado{' '}
                      {contenedor.veces_registrado}{' '}
                      {contenedor.veces_registrado === 1 ? 'vez' : 'veces'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {contenedorSeleccionado ? (
          <View style={estilos.seleccionActual}>
            <CircleCheck color={colores.primary} size={21} />
            <Text numberOfLines={2} style={estilos.textoSeleccionActual}>
              Seleccionado: {contenedorSeleccionado.codigo_qr}
            </Text>
          </View>
        ) : null}

        <Text style={estilos.tituloSeccion}>Motivo</Text>
        <View style={estilos.motivos}>
          {motivosDisponibles.map((opcion) => {
            const seleccionado = opcion.id === motivo;
            return (
              <Pressable
                accessibilityRole="button"
                key={opcion.id}
                onPress={() => cambiarMotivo(opcion.id)}
                style={[
                  estilos.chipMotivo,
                  seleccionado && estilos.chipMotivoSeleccionado,
                ]}
              >
                <Text
                  style={[
                    estilos.textoChip,
                    seleccionado && estilos.textoChipSeleccionado,
                  ]}
                >
                  {opcion.etiqueta}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={estilos.camposOpcionales}>
          <CampoTexto
            etiqueta="Comentario (opcional)"
            value={comentario}
            onChangeText={cambiarComentario}
            maxLength={500}
            multiline
          />
        </View>

        {errorFormulario ? (
          <Text style={estilos.error}>{errorFormulario}</Text>
        ) : null}
        {exito ? (
          <View style={estilos.exito}>
            <CircleCheck color={colores.success} size={22} />
            <Text style={estilos.textoExito}>{exito}</Text>
          </View>
        ) : null}

        <Boton
          texto="Enviar reporte"
          alPresionar={enviarReporte}
          cargando={enviando}
        />

        <View style={estilos.tituloBandeja}>
          {esGestor ? (
            <ShieldCheck color={colores.primary} size={24} />
          ) : (
            <ClipboardCheck color={colores.primary} size={24} />
          )}
          <Text style={estilos.tituloSeccionSinMargen}>
            {esGestor ? 'Reportes recibidos' : 'Mis reportes'}
          </Text>
        </View>

        {errorReportes ? <Text style={estilos.error}>{errorReportes}</Text> : null}
        {cargandoReportes ? (
          <ActivityIndicator color={colores.primary} />
        ) : reportes.length === 0 ? (
          <Text style={estilos.vacio}>
            {esGestor
              ? 'Todavía no hay reportes registrados.'
              : 'Todavía no has enviado reportes.'}
          </Text>
        ) : (
          <View style={estilos.listaReportes}>
            {reportes.map((reporte) => {
              const contenedor = contenedores.find(
                (item) => item.id === reporte.contenedor_id,
              );
              const expandido = reporteExpandidoId === reporte.id;
              const reportePropio = reporte.usuario_id === usuario?.id;
              const asignadoAOtraPersona = Boolean(
                usuario?.rol === 'collector'
                && reporte.atendido_por_id
                && reporte.atendido_por_id !== usuario.id,
              );
              const puedeAtender = usuario?.rol === 'admin'
                || (!reportePropio && !asignadoAOtraPersona);
              return (
                <View key={reporte.id} style={estilos.tarjetaReporte}>
                  <View style={estilos.encabezadoReporte}>
                    <View
                      style={[
                        estilos.puntoEstado,
                        {
                          backgroundColor:
                            colorEstadoReporte[reporte.estado] || colores.muted,
                        },
                      ]}
                    />
                    <View style={estilos.infoReporte}>
                      <Text numberOfLines={2} style={estilos.nombreReporte}>
                        {contenedor?.codigo_qr ||
                          `Contenedor #${reporte.contenedor_id}`}
                      </Text>
                      <Text style={estilos.textoReporte}>
                        {etiquetaMotivo(reporte.motivo)}
                        {esGestor ? ` · usuario #${reporte.usuario_id}` : ''}
                      </Text>
                    </View>
                    <Text
                      style={[
                        estilos.estadoReporte,
                        {
                          color:
                            colorEstadoReporte[reporte.estado] || colores.muted,
                        },
                      ]}
                    >
                      {etiquetaEstadoReporte[reporte.estado] || reporte.estado}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => cambiarReporteExpandidoId(expandido ? null : reporte.id)}
                    style={estilos.botonVerMas}
                  >
                    {expandido ? (
                      <EyeOff color={colores.primary} size={17} />
                    ) : (
                      <Eye color={colores.primary} size={17} />
                    )}
                    <Text style={estilos.textoVerMas}>{expandido ? 'Ocultar' : 'Ver más'}</Text>
                  </Pressable>

                  {expandido ? (
                    <>
                      <View style={estilos.detalleReporte}>
                        <Text style={estilos.etiquetaDetalle}>
                          {esGestor ? 'Comentario del ciudadano' : 'Lo que escribiste'}
                        </Text>
                        <Text style={estilos.comentarioReporte}>
                          {reporte.comentario || 'Sin comentario adicional.'}
                        </Text>
                      </View>

                      {!esGestor || reporte.respuesta ? (
                        <View style={estilos.respuestaReporte}>
                          <Text style={estilos.etiquetaRespuesta}>Respuesta del equipo</Text>
                          <Text style={estilos.textoRespuesta}>
                            {reporte.respuesta
                              || (reporte.estado === 'pendiente'
                                ? 'Tu reporte está pendiente de revisión.'
                                : reporte.estado === 'en_revision'
                                  ? 'El equipo está revisando tu reporte y responderá aquí.'
                                  : 'El reporte fue resuelto.')}
                          </Text>
                        </View>
                      ) : null}

                      {esGestor && reportePropio && usuario?.rol === 'collector' ? (
                        <Text style={estilos.avisoReportePropio}>
                          Creaste este reporte. Debe tomarlo otro recolector o un administrador.
                        </Text>
                      ) : null}

                      {asignadoAOtraPersona ? (
                        <Text style={estilos.avisoReportePropio}>
                          Este reporte ya está siendo atendido por otro recolector.
                        </Text>
                      ) : null}

                      {esGestor && puedeAtender && reporte.estado !== 'resuelto' ? (
                        <View style={estilos.gestionReporte}>
                          <CampoTexto
                            etiqueta="Respuesta para el ciudadano"
                            value={respuestas[reporte.id] ?? reporte.respuesta ?? ''}
                            onChangeText={(valor) =>
                              cambiarRespuestas((actuales) => ({
                                ...actuales,
                                [reporte.id]: valor,
                              }))
                            }
                            placeholder="Explica qué se hizo o cómo se resolverá"
                            maxLength={1000}
                            multiline
                          />
                          <View style={estilos.accionesReporte}>
                            {reporte.estado === 'pendiente' ? (
                              <View style={estilos.accionReporte}>
                                <Boton
                                  texto="Tomar"
                                  variante="secundario"
                                  cargando={actualizandoId === reporte.id}
                                  alPresionar={() => actualizarEstado(reporte.id, 'en_revision')}
                                />
                              </View>
                            ) : null}
                            <View style={estilos.accionReporte}>
                              <Boton
                                texto="Responder y resolver"
                                cargando={actualizandoId === reporte.id}
                                alPresionar={() => actualizarEstado(reporte.id, 'resuelto')}
                              />
                            </View>
                          </View>
                        </View>
                      ) : null}

                      {usuario?.rol === 'admin' && reporte.estado === 'resuelto' ? (
                        <Pressable
                          onPress={() => actualizarEstado(reporte.id, 'pendiente')}
                          style={estilos.botonReabrir}
                        >
                          <RotateCcw color={colores.primary} size={17} />
                          <Text style={estilos.textoVerMas}>Reabrir reporte</Text>
                        </Pressable>
                      ) : null}
                    </>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </PantallaBase>

      <EscanerQR
        visible={escanerVisible}
        procesando={false}
        titulo="Seleccionar para reporte"
        indicacion="Centra el QR del contenedor que quieres reportar"
        textoProcesando="Buscando contenedor…"
        alCancelar={() => cambiarEscanerVisible(false)}
        alDetectar={manejarCodigoEscaneado}
      />
    </>
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
    fontSize: 26,
    fontWeight: '900',
  },
  subtitulo: {
    color: colores.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  botonActualizar: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colores.border,
    backgroundColor: colores.white,
  },
  separador: {
    height: espaciado.lg,
  },
  tituloSeccion: {
    color: colores.text,
    fontSize: 18,
    fontWeight: '900',
    marginTop: espaciado.xl,
    marginBottom: espaciado.md,
  },
  tituloSeccionSinMargen: {
    color: colores.text,
    fontSize: 20,
    fontWeight: '900',
  },
  listaContenedores: {
    gap: espaciado.sm,
  },
  tarjetaContenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    padding: espaciado.md,
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 14,
    backgroundColor: colores.white,
  },
  tarjetaContenedorSeleccionada: {
    borderColor: colores.primary,
    backgroundColor: colores.primary,
  },
  infoContenedor: {
    flex: 1,
  },
  codigoContenedor: {
    color: colores.text,
    fontSize: 15,
    fontWeight: '900',
  },
  idContenedor: {
    color: colores.muted,
    fontSize: 12,
    marginTop: 2,
  },
  textoSeleccionado: {
    color: colores.white,
  },
  seleccionActual: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    marginTop: espaciado.md,
    padding: espaciado.md,
    borderRadius: 14,
    backgroundColor: '#EAF7EE',
  },
  textoSeleccionActual: {
    flex: 1,
    color: colores.text,
    fontSize: 14,
    fontWeight: '800',
  },
  motivos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaciado.sm,
  },
  chipMotivo: {
    paddingVertical: espaciado.sm,
    paddingHorizontal: espaciado.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colores.border,
    backgroundColor: colores.white,
  },
  chipMotivoSeleccionado: {
    backgroundColor: colores.secondary,
    borderColor: colores.secondary,
  },
  textoChip: {
    color: colores.text,
    fontWeight: '700',
    fontSize: 13,
  },
  textoChipSeleccionado: {
    color: colores.white,
  },
  camposOpcionales: {
    gap: espaciado.md,
    marginVertical: espaciado.lg,
  },
  error: {
    color: colores.danger,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginVertical: espaciado.sm,
  },
  exito: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    padding: espaciado.md,
    marginBottom: espaciado.md,
    borderRadius: 14,
    backgroundColor: '#EAF7EE',
  },
  textoExito: {
    flex: 1,
    color: colores.text,
    fontSize: 14,
    fontWeight: '800',
  },
  tituloBandeja: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    marginTop: espaciado.xxl,
    marginBottom: espaciado.md,
  },
  vacio: {
    color: colores.muted,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: espaciado.lg,
  },
  listaReportes: {
    gap: espaciado.md,
    paddingBottom: espaciado.lg,
  },
  tarjetaReporte: {
    gap: espaciado.sm,
    padding: espaciado.md,
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 14,
    backgroundColor: colores.white,
  },
  encabezadoReporte: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
  },
  puntoEstado: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  infoReporte: {
    flex: 1,
  },
  nombreReporte: {
    color: colores.text,
    fontSize: 14,
    fontWeight: '900',
  },
  textoReporte: {
    color: colores.muted,
    fontSize: 12,
    marginTop: 2,
  },
  estadoReporte: {
    fontSize: 12,
    fontWeight: '900',
  },
  botonVerMas: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: colores.border,
  },
  textoVerMas: { color: colores.primary, fontSize: 12, fontWeight: '900' },
  comentarioReporte: {
    color: colores.text,
    fontSize: 13,
    lineHeight: 19,
  },
  detalleReporte: {
    gap: 4,
    paddingTop: espaciado.sm,
    borderTopWidth: 1,
    borderTopColor: colores.border,
  },
  etiquetaDetalle: { color: colores.muted, fontSize: 11, fontWeight: '800' },
  respuestaReporte: {
    gap: 4,
    padding: espaciado.md,
    borderRadius: 12,
    backgroundColor: '#EAF7EE',
  },
  etiquetaRespuesta: { color: colores.primary, fontSize: 12, fontWeight: '900' },
  textoRespuesta: { color: colores.text, fontSize: 13, lineHeight: 19 },
  avisoReportePropio: {
    padding: espaciado.md,
    color: '#8A5800',
    fontSize: 12,
    lineHeight: 17,
    borderRadius: 12,
    backgroundColor: '#FFF3CD',
  },
  gestionReporte: { gap: espaciado.sm },
  accionesReporte: {
    flexDirection: 'row',
    gap: espaciado.sm,
  },
  accionReporte: {
    flex: 1,
  },
  botonReabrir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: espaciado.sm,
    borderWidth: 1,
    borderColor: colores.primary,
    borderRadius: 11,
  },
});
