import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Boton } from '../componentes/Boton';
import { CampoTexto } from '../componentes/CampoTexto';
import { PantallaBase } from '../componentes/PantallaBase';
import { obtenerMensajeErrorApi } from '../componentes/conexionApi';
import { usarSesion } from '../componentes/ContextoSesion';
import { colores, espaciado } from '../componentes/tema';

export function PantallaRecuperarContrasena({ navigation }) {
  const { pedirRecuperacionContrasena } = usarSesion();
  const [correo, setCorreo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  async function enviarSolicitud() {
    if (!correo) {
      setMensaje('Escribe tu correo para continuar.');
      return;
    }

    try {
      setCargando(true);
      await pedirRecuperacionContrasena(correo);
      setMensaje('Si el correo existe, se enviaran instrucciones de recuperacion.');
    } catch (error) {
      setMensaje(obtenerMensajeErrorApi(error, 'No se pudo solicitar la recuperacion.'));
    } finally {
      setCargando(false);
    }
  }

  return (
    <PantallaBase>
      <View style={estilos.encabezado}>
        <Text style={estilos.titulo}>Recuperar contrasena</Text>
        <Text style={estilos.subtitulo}>Ingresa tu correo para recibir instrucciones.</Text>
      </View>

      <View style={estilos.formulario}>
        <CampoTexto etiqueta="Correo" value={correo} onChangeText={setCorreo} autoCapitalize="none" keyboardType="email-address" />
        {mensaje ? <Text style={estilos.mensaje}>{mensaje}</Text> : null}
        <Boton texto="Enviar instrucciones" alPresionar={enviarSolicitud} cargando={cargando} />
        <Boton texto="Volver" variante="fantasma" alPresionar={() => navigation.goBack()} />
      </View>
    </PantallaBase>
  );
}

const estilos = StyleSheet.create({
  encabezado: {
    gap: espaciado.sm,
    marginBottom: espaciado.xl,
  },
  titulo: {
    color: colores.text,
    fontSize: 30,
    fontWeight: '900',
  },
  subtitulo: {
    color: colores.muted,
    fontSize: 16,
  },
  formulario: {
    gap: espaciado.lg,
  },
  mensaje: {
    color: colores.primary,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});
