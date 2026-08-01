import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Boton } from '../componentes/Boton';
import { CampoTexto } from '../componentes/CampoTexto';
import { PantallaBase } from '../componentes/PantallaBase';
import { obtenerMensajeErrorApi } from '../componentes/conexionApi';
import { usarSesion } from '../componentes/ContextoSesion';
import { colores, espaciado } from '../componentes/tema';

export function PantallaVerificarCorreo({ navigation, route }) {
  const { verificarCorreo, reenviarVerificacion } = usarSesion();
  const correoInicial = route.params?.correo || '';
  const [correo, setCorreo] = useState(correoInicial);
  const [codigo, setCodigo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState(
    correoInicial ? 'Te enviamos un código. Revisa también la carpeta de spam.' : '',
  );
  const [esError, setEsError] = useState(false);

  async function confirmar() {
    if (!correo.trim()) {
      setEsError(true);
      setMensaje('Escribe el correo con el que creaste tu cuenta.');
      return;
    }
    if (codigo.trim().length !== 8) {
      setEsError(true);
      setMensaje('El código debe tener 8 caracteres.');
      return;
    }

    try {
      setCargando(true);
      setEsError(false);
      await verificarCorreo({
        correo: correo.trim(),
        codigo: codigo.trim().toUpperCase(),
      });
    } catch (error) {
      setEsError(true);
      setMensaje(obtenerMensajeErrorApi(error, 'No se pudo verificar el correo.'));
    } finally {
      setCargando(false);
    }
  }

  async function reenviar() {
    if (!correo.trim()) {
      setEsError(true);
      setMensaje('Escribe tu correo para solicitar otro código.');
      return;
    }

    try {
      setCargando(true);
      setEsError(false);
      await reenviarVerificacion(correo.trim());
      setMensaje(
        'Si la cuenta está pendiente, recibirás otro código. Espera un minuto antes de volver a solicitarlo.',
      );
    } catch (error) {
      setEsError(true);
      setMensaje(obtenerMensajeErrorApi(error, 'No se pudo solicitar otro código.'));
    } finally {
      setCargando(false);
    }
  }

  return (
    <PantallaBase>
      <View style={estilos.encabezado}>
        <Text style={estilos.titulo}>Verifica tu correo</Text>
        <Text style={estilos.subtitulo}>
          Introduce el código que VIC envió a tu correo para activar la cuenta.
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
          editable={!correoInicial}
        />
        <CampoTexto
          etiqueta="Código de 8 caracteres"
          value={codigo}
          onChangeText={(valor) => setCodigo(valor.toUpperCase())}
          autoCapitalize="characters"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={8}
        />
        {mensaje ? (
          <Text style={[estilos.mensaje, esError && estilos.mensajeError]}>{mensaje}</Text>
        ) : null}
        <Boton texto="Verificar y entrar" alPresionar={confirmar} cargando={cargando} />
        <Boton texto="Reenviar código" variante="fantasma" alPresionar={reenviar} cargando={cargando} />
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
