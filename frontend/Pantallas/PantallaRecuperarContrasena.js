import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Boton } from '../componentes/Boton';
import { CampoTexto } from '../componentes/CampoTexto';
import { PantallaBase } from '../componentes/PantallaBase';
import { obtenerMensajeErrorApi } from '../componentes/conexionApi';
import { usarSesion } from '../componentes/ContextoSesion';
import { colores, espaciado } from '../componentes/tema';

export function PantallaRecuperarContrasena({ navigation }) {
  const { pedirRecuperacionContrasena, restablecerContrasena } = usarSesion();
  const [correo, setCorreo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [contrasenaNueva, setContrasenaNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [codigoSolicitado, setCodigoSolicitado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [esError, setEsError] = useState(false);

  async function enviarSolicitud() {
    if (!correo.trim()) {
      setEsError(true);
      setMensaje('Escribe tu correo para continuar.');
      return;
    }

    try {
      setCargando(true);
      setEsError(false);
      await pedirRecuperacionContrasena(correo.trim());
      setCodigoSolicitado(true);
      setMensaje(
        'Si el correo está registrado, recibirás un código. Revisa también la carpeta de spam.',
      );
    } catch (error) {
      setEsError(true);
      setMensaje(obtenerMensajeErrorApi(error, 'No se pudo solicitar la recuperación.'));
    } finally {
      setCargando(false);
    }
  }

  async function cambiarContrasena() {
    if (codigo.trim().length !== 8) {
      setEsError(true);
      setMensaje('El código debe tener 8 caracteres.');
      return;
    }
    if (contrasenaNueva.length < 8 || contrasenaNueva.length > 72) {
      setEsError(true);
      setMensaje('La nueva contraseña debe tener entre 8 y 72 caracteres.');
      return;
    }
    if (contrasenaNueva !== confirmacion) {
      setEsError(true);
      setMensaje('Las contraseñas no coinciden.');
      return;
    }

    try {
      setCargando(true);
      setEsError(false);
      await restablecerContrasena({
        correo: correo.trim(),
        codigo: codigo.trim().toUpperCase(),
        contrasena_nueva: contrasenaNueva,
      });
      setCodigo('');
      setContrasenaNueva('');
      setConfirmacion('');
      setMensaje('Contraseña actualizada. Ya puedes iniciar sesión.');
      setTimeout(() => navigation.goBack(), 900);
    } catch (error) {
      setEsError(true);
      setMensaje(obtenerMensajeErrorApi(error, 'No se pudo cambiar la contraseña.'));
    } finally {
      setCargando(false);
    }
  }

  return (
    <PantallaBase>
      <View style={estilos.encabezado}>
        <Text style={estilos.titulo}>Recuperar contraseña</Text>
        <Text style={estilos.subtitulo}>
          {codigoSolicitado
            ? 'Escribe el código que enviamos a tu correo y crea una contraseña nueva.'
            : 'Ingresa tu correo para recibir un código de seguridad.'}
        </Text>
      </View>

      <View style={estilos.formulario}>
        <CampoTexto
          etiqueta="Correo"
          value={correo}
          onChangeText={setCorreo}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          editable={!codigoSolicitado}
        />

        {codigoSolicitado ? (
          <>
            <CampoTexto
              etiqueta="Código de 8 caracteres"
              value={codigo}
              onChangeText={(valor) => setCodigo(valor.toUpperCase())}
              autoCapitalize="characters"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={8}
            />
            <CampoTexto
              etiqueta="Nueva contraseña"
              value={contrasenaNueva}
              onChangeText={setContrasenaNueva}
              autoComplete="new-password"
              textContentType="newPassword"
              secureTextEntry
              maxLength={72}
            />
            <CampoTexto
              etiqueta="Confirmar contraseña"
              value={confirmacion}
              onChangeText={setConfirmacion}
              autoComplete="new-password"
              textContentType="newPassword"
              secureTextEntry
              maxLength={72}
            />
          </>
        ) : null}

        {mensaje ? (
          <Text style={[estilos.mensaje, esError && estilos.mensajeError]}>{mensaje}</Text>
        ) : null}

        <Boton
          texto={codigoSolicitado ? 'Cambiar contraseña' : 'Enviar código'}
          alPresionar={codigoSolicitado ? cambiarContrasena : enviarSolicitud}
          cargando={cargando}
        />
        {codigoSolicitado ? (
          <Boton
            texto="Solicitar otro código"
            variante="fantasma"
            alPresionar={enviarSolicitud}
            cargando={cargando}
          />
        ) : null}
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
  mensajeError: {
    color: colores.danger,
  },
});
