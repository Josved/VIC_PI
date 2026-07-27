import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { CircleCheck, ClipboardCheck, Search, X } from 'lucide-react-native';

import { Boton } from '../componentes/Boton';
import { CampoTexto } from '../componentes/CampoTexto';
import { PantallaBase } from '../componentes/PantallaBase';
import { conexionApi, obtenerMensajeErrorApi } from '../componentes/conexionApi';
import { usarContenedores } from '../componentes/usarContenedores';
import { colores, espaciado } from '../componentes/tema';

const motivosDisponibles = [
  { id: 'lleno', etiqueta: 'Lleno' },
  { id: 'danado', etiqueta: 'Danado' },
  { id: 'sucio', etiqueta: 'Sucio' },
  { id: 'ubicacion_incorrecta', etiqueta: 'Ubicacion incorrecta' },
  { id: 'otro', etiqueta: 'Otro' },
];

const etiquetaEstadoReporte = {
  pendiente: 'Pendiente',
  en_revision: 'En revision',
  resuelto: 'Resuelto',
};

const colorEstadoReporte = {
  pendiente: colores.secondary,
  en_revision: colores.primary,
  resuelto: colores.success,
};

export function PantallaReportes() {
  const { contenedores } = usarContenedores();
  const [busquedaSerie, cambiarBusquedaSerie] = useState('');
  const [contenedorId, cambiarContenedorId] = useState(null);
  const [motivo, cambiarMotivo] = useState(null);
  const [comentario, cambiarComentario] = useState('');
  const [evidenciaUrl, cambiarEvidenciaUrl] = useState('');
  const [enviando, cambiarEnviando] = useState(false);
  const [errorFormulario, cambiarErrorFormulario] = useState('');
  const [exito, cambiarExito] = useState(false);

  const [misReportes, cambiarMisReportes] = useState([]);
  const [cargandoReportes, cambiarCargandoReportes] = useState(true);

  const [permisoCamara, solicitarPermisoCamara] = useCameraPermissions();
  const [escaneando, cambiarEscaneando] = useState(false);
  const [errorEscaneo, cambiarErrorEscaneo] = useState('');
  const escaneoBloqueado = useRef(false);

  const contenedoresFiltrados = useMemo(() => {
    const texto = busquedaSerie.trim().toLowerCase();
    if (!texto) {
      return contenedores;
    }
    return contenedores.filter(
      (contenedor) => contenedor.serie.toLowerCase().includes(texto) || contenedor.nombre.toLowerCase().includes(texto),
    );
  }, [contenedores, busquedaSerie]);

  const contenedorSeleccionado = contenedores.find((contenedor) => contenedor.id === contenedorId) || null;

  const cargarMisReportes = useCallback(async () => {
    try {
      cambiarCargandoReportes(true);
      const respuesta = await conexionApi.get('/reportes/mios');
      cambiarMisReportes(respuesta.data);
    } catch {
      // Si falla la carga del historial, el formulario de reporte sigue funcionando igual.
    } finally {
      cambiarCargandoReportes(false);
    }
  }, []);

  useEffect(() => {
    cargarMisReportes();
  }, [cargarMisReportes]);

  function reiniciarFormulario() {
    cambiarBusquedaSerie('');
    cambiarContenedorId(null);
    cambiarMotivo(null);
    cambiarComentario('');
    cambiarEvidenciaUrl('');
  }

  async function abrirEscaner() {
    cambiarErrorEscaneo('');
    let permisoActual = permisoCamara;
    if (!permisoActual?.granted) {
      permisoActual = await solicitarPermisoCamara();
    }
    if (!permisoActual?.granted) {
      cambiarErrorEscaneo('Necesitas dar permiso de camara para escanear el codigo QR.');
      return;
    }
    escaneoBloqueado.current = false;
    cambiarEscaneando(true);
  }

  function manejarCodigoEscaneado(resultado) {
    if (escaneoBloqueado.current) {
      return;
    }
    escaneoBloqueado.current = true;
    cambiarEscaneando(false);

    const serieEscaneada = resultado.data.trim();
    const contenedorEncontrado = contenedores.find(
      (contenedor) => contenedor.serie.toLowerCase() === serieEscaneada.toLowerCase(),
    );

    if (!contenedorEncontrado) {
      cambiarErrorEscaneo('El codigo escaneado no corresponde a ningun contenedor registrado.');
      return;
    }

    cambiarBusquedaSerie(contenedorEncontrado.serie);
    cambiarContenedorId(contenedorEncontrado.id);
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
      cambiarEnviando(true);
      await conexionApi.post('/reportes', {
        contenedor_id: contenedorId,
        motivo,
        comentario: comentario.trim() || undefined,
        evidencia_url: evidenciaUrl.trim() || undefined,
      });
      cambiarExito(true);
      reiniciarFormulario();
      cargarMisReportes();
    } catch (error) {
      cambiarErrorFormulario(obtenerMensajeErrorApi(error, 'No se pudo enviar el reporte.'));
    } finally {
      cambiarEnviando(false);
    }
  }

  if (exito) {
    return (
      <PantallaBase>
        <View style={estilos.confirmacion}>
          <CircleCheck color={colores.primary} size={56} />
          <Text style={estilos.tituloConfirmacion}>Reporte enviado</Text>
          <Text style={estilos.textoConfirmacion}>Gracias, el equipo dara seguimiento a tu reporte.</Text>
          <Boton texto="Enviar otro reporte" alPresionar={() => cambiarExito(false)} />
        </View>
      </PantallaBase>
    );
  }

  if (escaneando) {
    return (
      <SafeAreaView style={estilos.pantallaCamara}>
        <CameraView
          style={estilos.camara}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={manejarCodigoEscaneado}
        />
        <View style={estilos.marcoCamara} pointerEvents="none" />
        <Text style={estilos.textoCamara}>Apunta al codigo QR del contenedor</Text>
        <Pressable accessibilityRole="button" style={estilos.botonCerrarCamara} onPress={() => cambiarEscaneando(false)}>
          <X color={colores.white} size={26} />
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <PantallaBase centrada={false}>
      <View style={estilos.encabezado}>
        <ClipboardCheck color={colores.secondary} size={44} />
        <Text style={estilos.titulo}>Reportar contenedor</Text>
        <Text style={estilos.subtitulo}>Escanea el codigo QR del contenedor o buscalo por numero de serie o nombre.</Text>
      </View>

      <Boton texto="Escanear codigo QR" alPresionar={abrirEscaner} />
      <View style={estilos.separador} />

      <CampoTexto
        etiqueta="Buscar por numero de serie o nombre"
        value={busquedaSerie}
        onChangeText={cambiarBusquedaSerie}
        autoCapitalize="none"
        estilo={estilos.campoBusqueda}
      />
      {errorEscaneo ? <Text style={estilos.error}>{errorEscaneo}</Text> : null}

      <View style={estilos.listaContenedores}>
        {contenedoresFiltrados.length === 0 ? (
          <Text style={estilos.vacio}>No se encontro ningun contenedor con ese criterio.</Text>
        ) : (
          contenedoresFiltrados.map((contenedor) => {
            const seleccionado = contenedor.id === contenedorId;
            return (
              <Pressable
                accessibilityRole="button"
                key={contenedor.id}
                onPress={() => cambiarContenedorId(contenedor.id)}
                style={[estilos.tarjetaContenedor, seleccionado && estilos.tarjetaContenedorSeleccionada]}
              >
                <Search color={seleccionado ? colores.white : colores.primary} size={18} />
                <View style={estilos.infoContenedor}>
                  <Text style={[estilos.nombreContenedor, seleccionado && estilos.textoSeleccionado]}>{contenedor.nombre}</Text>
                  <Text style={[estilos.serieContenedor, seleccionado && estilos.textoSeleccionado]}>{contenedor.serie}</Text>
                </View>
              </Pressable>
            );
          })
        )}
      </View>

      <Text style={estilos.tituloSeccion}>Motivo</Text>
      <View style={estilos.motivos}>
        {motivosDisponibles.map((opcion) => {
          const seleccionado = opcion.id === motivo;
          return (
            <Pressable
              accessibilityRole="button"
              key={opcion.id}
              onPress={() => cambiarMotivo(opcion.id)}
              style={[estilos.chipMotivo, seleccionado && estilos.chipMotivoSeleccionado]}
            >
              <Text style={[estilos.textoChip, seleccionado && estilos.textoChipSeleccionado]}>{opcion.etiqueta}</Text>
            </Pressable>
          );
        })}
      </View>

      <CampoTexto
        etiqueta="Comentario (opcional)"
        value={comentario}
        onChangeText={cambiarComentario}
        maxLength={500}
      />
      <CampoTexto
        etiqueta="Enlace de evidencia (opcional)"
        value={evidenciaUrl}
        onChangeText={cambiarEvidenciaUrl}
        autoCapitalize="none"
        maxLength={300}
      />

      {errorFormulario ? <Text style={estilos.error}>{errorFormulario}</Text> : null}

      <Boton texto="Enviar reporte" alPresionar={enviarReporte} cargando={enviando} />

      <Text style={estilos.tituloSeccion}>Mis reportes</Text>
      {cargandoReportes ? (
        <ActivityIndicator color={colores.primary} />
      ) : misReportes.length === 0 ? (
        <Text style={estilos.vacio}>Todavia no has enviado reportes.</Text>
      ) : (
        <View style={estilos.listaReportes}>
          {misReportes.map((reporte) => {
            const contenedorDelReporte = contenedores.find((contenedor) => contenedor.id === reporte.contenedor_id);
            return (
              <View key={reporte.id} style={estilos.tarjetaReporte}>
                <View style={[estilos.puntoEstado, { backgroundColor: colorEstadoReporte[reporte.estado] }]} />
                <View style={estilos.infoReporte}>
                  <Text style={estilos.nombreReporte}>{contenedorDelReporte?.nombre || `Contenedor #${reporte.contenedor_id}`}</Text>
                  <Text style={estilos.textoReporte}>{motivosDisponibles.find((opcion) => opcion.id === reporte.motivo)?.etiqueta}</Text>
                </View>
                <Text style={[estilos.estadoReporte, { color: colorEstadoReporte[reporte.estado] }]}>
                  {etiquetaEstadoReporte[reporte.estado]}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </PantallaBase>
  );
}

const estilos = StyleSheet.create({
  encabezado: {
    alignItems: 'center',
    gap: espaciado.md,
    marginBottom: espaciado.xl,
  },
  titulo: {
    color: colores.text,
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitulo: {
    color: colores.muted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 21,
  },
  separador: {
    height: espaciado.lg,
  },
  campoBusqueda: {
    marginBottom: espaciado.md,
  },
  pantallaCamara: {
    flex: 1,
    backgroundColor: colores.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  camara: {
    ...StyleSheet.absoluteFillObject,
  },
  marcoCamara: {
    width: 240,
    height: 240,
    borderWidth: 3,
    borderColor: colores.white,
    borderRadius: 24,
  },
  textoCamara: {
    position: 'absolute',
    bottom: 120,
    color: colores.white,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    paddingHorizontal: espaciado.xl,
  },
  botonCerrarCamara: {
    position: 'absolute',
    top: espaciado.xxl,
    right: espaciado.xl,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  listaContenedores: {
    gap: espaciado.sm,
    marginBottom: espaciado.xl,
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
  nombreContenedor: {
    color: colores.text,
    fontSize: 15,
    fontWeight: '900',
  },
  serieContenedor: {
    color: colores.muted,
    fontSize: 13,
  },
  textoSeleccionado: {
    color: colores.white,
  },
  vacio: {
    color: colores.muted,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: espaciado.lg,
  },
  tituloSeccion: {
    color: colores.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: espaciado.md,
  },
  motivos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaciado.sm,
    marginBottom: espaciado.lg,
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
  error: {
    color: colores.danger,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: espaciado.md,
  },
  listaReportes: {
    gap: espaciado.sm,
    marginTop: espaciado.md,
  },
  tarjetaReporte: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    padding: espaciado.md,
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 14,
    backgroundColor: colores.white,
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
    fontSize: 15,
    fontWeight: '900',
  },
  textoReporte: {
    color: colores.muted,
    fontSize: 13,
  },
  estadoReporte: {
    fontSize: 13,
    fontWeight: '900',
  },
  confirmacion: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado.md,
  },
  tituloConfirmacion: {
    color: colores.text,
    fontSize: 24,
    fontWeight: '900',
  },
  textoConfirmacion: {
    color: colores.muted,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: espaciado.md,
  },
});
