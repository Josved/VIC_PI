import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Boton } from '../componentes/Boton';
import { CampoTexto } from '../componentes/CampoTexto';
import { PantallaBase } from '../componentes/PantallaBase';
import { LogoVIC } from '../componentes/LogoVIC';
import { obtenerMensajeErrorApi } from '../componentes/conexionApi';
import { usarSesion } from '../componentes/ContextoSesion';
import { colores, espaciado } from '../componentes/tema';

export function PantallaInicioSesion({ navigation }) {
  const { iniciarSesion } = usarSesion();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState('');

  async function entrar() {
    if (!correo || !contrasena) {
      setErrorFormulario('Escribe tu correo y contrasena.');
      return;
    }

    try {
      setErrorFormulario('');
      setCargando(true);
      await iniciarSesion({ correo, contrasena });
    } catch (error) {
      setErrorFormulario(obtenerMensajeErrorApi(error, 'No se pudo iniciar sesion. Revisa que el backend este ejecutandose.'));
    } finally {
      setCargando(false);
    }
  }

  return (
    <PantallaBase>
      <View style={estilos.encabezado}>
        <LogoVIC />
        <Text style={estilos.titulo}>Bienvenido a VIC</Text>
        <Text style={estilos.subtitulo}>Gestiona reciclaje, comunidad y reportes desde una sola app.</Text>
      </View>

      <View style={estilos.formulario}>
        <CampoTexto etiqueta="Correo" value={correo} onChangeText={setCorreo} autoCapitalize="none" keyboardType="email-address" />
        <CampoTexto etiqueta="Contrasena" value={contrasena} onChangeText={setContrasena} secureTextEntry />
        {errorFormulario ? <Text style={estilos.errorFormulario}>{errorFormulario}</Text> : null}
        <Boton texto="Iniciar sesion" alPresionar={entrar} cargando={cargando} />
        <Boton texto="Recuperar contrasena" variante="fantasma" alPresionar={() => navigation.navigate('RecuperarContrasena')} />
        <Boton texto="Crear cuenta" variante="secundario" alPresionar={() => navigation.navigate('SeleccionRol')} />
      </View>
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
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitulo: {
    color: colores.muted,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
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
