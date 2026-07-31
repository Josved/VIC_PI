import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { QrCode, X } from 'lucide-react-native';

import { colores, espaciado } from './tema';

export function EscanerQR({
  visible,
  procesando,
  alCancelar,
  alDetectar,
  titulo = 'Registrar contenedor',
  indicacion = 'Centra el QR del contenedor dentro del recuadro',
  textoProcesando = 'Obteniendo GPS y guardando…',
}) {
  const [permiso, solicitarPermiso] = useCameraPermissions();
  const [bloqueado, cambiarBloqueado] = useState(false);
  const bloqueoInmediato = useRef(false);

  useEffect(() => {
    if (visible) {
      bloqueoInmediato.current = false;
      cambiarBloqueado(false);
    }
  }, [visible]);

  async function manejarCodigo({ data }) {
    if (bloqueoInmediato.current || bloqueado || procesando) {
      return;
    }

    bloqueoInmediato.current = true;
    cambiarBloqueado(true);
    try {
      await alDetectar(data);
    } finally {
      bloqueoInmediato.current = false;
      cambiarBloqueado(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={alCancelar}
    >
      <View style={estilos.pantalla}>
        <View style={estilos.barra}>
          <View style={estilos.tituloFila}>
            <QrCode color={colores.white} size={24} />
            <Text style={estilos.titulo}>{titulo}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar escáner"
            onPress={alCancelar}
            style={estilos.cerrar}
          >
            <X color={colores.white} size={26} />
          </Pressable>
        </View>

        {!permiso ? (
          <View style={estilos.mensaje}>
            <ActivityIndicator color={colores.primary} size="large" />
            <Text style={estilos.textoMensaje}>Revisando permiso de cámara…</Text>
          </View>
        ) : !permiso.granted ? (
          <View style={estilos.mensaje}>
            <QrCode color={colores.primary} size={58} />
            <Text style={estilos.tituloPermiso}>Se necesita la cámara</Text>
            <Text style={estilos.textoMensaje}>
              VIC usa la cámara únicamente para leer el código QR del contenedor.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={solicitarPermiso}
              style={estilos.botonPermiso}
            >
              <Text style={estilos.textoBoton}>Permitir cámara</Text>
            </Pressable>
          </View>
        ) : (
          <View style={estilos.camaraContenedor}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={bloqueado || procesando ? undefined : manejarCodigo}
            />
            <View pointerEvents="none" style={estilos.superposicion}>
              <View style={estilos.marco} />
              <Text style={estilos.indicacion}>{indicacion}</Text>
            </View>
            {procesando ? (
              <View style={estilos.procesando}>
                <ActivityIndicator color={colores.white} size="large" />
                <Text style={estilos.textoProcesando}>{textoProcesando}</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: '#071A12',
  },
  barra: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espaciado.lg,
    paddingTop: espaciado.sm,
    backgroundColor: '#071A12',
  },
  tituloFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
  },
  titulo: {
    color: colores.white,
    fontSize: 19,
    fontWeight: '900',
  },
  cerrar: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  camaraContenedor: {
    flex: 1,
  },
  superposicion: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espaciado.xl,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  marco: {
    width: '78%',
    maxWidth: 330,
    aspectRatio: 1,
    borderWidth: 4,
    borderColor: colores.secondary,
    borderRadius: 24,
    backgroundColor: 'transparent',
  },
  indicacion: {
    marginTop: espaciado.xl,
    color: colores.white,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  procesando: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado.md,
    backgroundColor: 'rgba(7,26,18,0.78)',
  },
  textoProcesando: {
    color: colores.white,
    fontSize: 16,
    fontWeight: '800',
  },
  mensaje: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado.md,
    padding: espaciado.xl,
    backgroundColor: colores.white,
  },
  tituloPermiso: {
    color: colores.text,
    fontSize: 24,
    fontWeight: '900',
  },
  textoMensaje: {
    maxWidth: 420,
    color: colores.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  botonPermiso: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: espaciado.xl,
    borderRadius: 14,
    backgroundColor: colores.primary,
  },
  textoBoton: {
    color: colores.white,
    fontSize: 15,
    fontWeight: '900',
  },
});
