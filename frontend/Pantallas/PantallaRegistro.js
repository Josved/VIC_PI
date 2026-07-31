import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Boton } from '../componentes/Boton';
import { CampoTexto } from '../componentes/CampoTexto';
import { PantallaBase } from '../componentes/PantallaBase';
import { obtenerMensajeErrorApi } from '../componentes/conexionApi';
import { usarSesion } from '../componentes/ContextoSesion';
import { colores, espaciado } from '../componentes/tema';

const LARGO_MAXIMO_NOMBRE = 50;
const PATRON_NOMBRE =
  /^[A-Za-zÁÉÍÓÚÑÜáéíóúñü]+(?:[ '-][A-Za-zÁÉÍÓÚÑÜáéíóúñü]+)*$/;

function validarNombre(valor) {
  const texto = valor.trim();
  return (
    texto.length >= 2 &&
    texto.length <= LARGO_MAXIMO_NOMBRE &&
    PATRON_NOMBRE.test(texto)
  );
}

export function PantallaRegistro({ navigation }) {
  const { registrarCuenta } = usarSesion();
  const [formulario, setFormulario] = useState({ nombre: '', apellidos: '', correo: '', contrasena: '' });
  const [cargando, setCargando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState('');

  function cambiarCampo(campo, valor) {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
  }

  async function crearCuenta() {
    if (!validarNombre(formulario.nombre) || !validarNombre(formulario.apellidos)) {
      setErrorFormulario(
        'Nombre y apellidos solo admiten letras, espacios, guion y apostrofe.',
      );
      return;
    }
    if (!formulario.correo) {
      setErrorFormulario('Escribe tu correo.');
      return;
    }
    if (formulario.contrasena.length < 6 || formulario.contrasena.length > 72) {
      setErrorFormulario('La contrasena debe tener entre 6 y 72 caracteres.');
      return;
    }

    try {
      setErrorFormulario('');
      setCargando(true);
      await registrarCuenta({
        nombre: formulario.nombre,
        apellidos: formulario.apellidos,
        correo: formulario.correo,
        contrasena: formulario.contrasena,
      });
    } catch (error) {
      setErrorFormulario(obtenerMensajeErrorApi(error, 'No se pudo crear la cuenta.'));
    } finally {
      setCargando(false);
    }
  }

  return (
    <PantallaBase>
      <View style={estilos.encabezado}>
        <Text style={estilos.titulo}>Crear cuenta</Text>
        <Text style={estilos.subtitulo}>Las cuentas nuevas se crean como ciudadano.</Text>
      </View>

      <View style={estilos.formulario}>
        <CampoTexto etiqueta="Nombre" value={formulario.nombre} onChangeText={(valor) => cambiarCampo('nombre', valor)} maxLength={LARGO_MAXIMO_NOMBRE} />
        <CampoTexto etiqueta="Apellidos" value={formulario.apellidos} onChangeText={(valor) => cambiarCampo('apellidos', valor)} maxLength={LARGO_MAXIMO_NOMBRE} />
        <CampoTexto etiqueta="Correo" value={formulario.correo} onChangeText={(valor) => cambiarCampo('correo', valor)} autoCapitalize="none" keyboardType="email-address" />
        <CampoTexto etiqueta="Contrasena" value={formulario.contrasena} onChangeText={(valor) => cambiarCampo('contrasena', valor)} secureTextEntry maxLength={72} />
        {errorFormulario ? <Text style={estilos.errorFormulario}>{errorFormulario}</Text> : null}
        <Boton texto="Registrarme" alPresionar={crearCuenta} cargando={cargando} />
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
  errorFormulario: {
    color: colores.danger,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});
