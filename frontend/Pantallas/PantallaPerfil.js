import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Boton } from '../componentes/Boton';
import { CampoTexto } from '../componentes/CampoTexto';
import { conexionApi, obtenerMensajeErrorApi } from '../componentes/conexionApi';
import { PantallaBase } from '../componentes/PantallaBase';
import { usarSesion } from '../componentes/ContextoSesion';
import { usarTutorial } from '../componentes/ContextoTutorial';
import { colores, espaciado } from '../componentes/tema';

const perfiles = {
  citizen: {
    etiqueta: 'Ciudadano',
    descripcion:
      'Puedes registrar o actualizar contenedores por QR, reportar incidencias y consultar tu calendario semanal.',
  },
  collector: {
    etiqueta: 'Recolector',
    descripcion:
      'Puedes crear rutas semanales, indicar horarios aproximados y atender reportes de la comunidad.',
  },
  admin: {
    etiqueta: 'Administrador',
    descripcion:
      'Puedes gestionar todas las rutas, contenedores y reportes del sistema.',
  },
};

export function PantallaPerfil({ navigation }) {
  const { cerrarSesion, refrescarUsuario, usuario } = usarSesion();
  const { abrirTutorial } = usarTutorial();
  const perfil = perfiles[usuario?.rol] || perfiles.citizen;
  const puedeGestionarRutas =
    usuario?.rol === 'collector' || usuario?.rol === 'admin';
  const [contrasenaActual, cambiarContrasenaActual] = useState('');
  const [contrasenaNueva, cambiarContrasenaNueva] = useState('');
  const [guardandoContrasena, cambiarGuardandoContrasena] = useState(false);
  const [mensajeContrasena, cambiarMensajeContrasena] = useState('');
  const [errorContrasena, cambiarErrorContrasena] = useState('');

  async function guardarContrasena() {
    if (contrasenaNueva.length < 8) {
      cambiarErrorContrasena('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    try {
      cambiarGuardandoContrasena(true);
      cambiarErrorContrasena('');
      cambiarMensajeContrasena('');
      await conexionApi.post('/autenticacion/cambiar-contrasena', {
        contrasena_actual: contrasenaActual,
        contrasena_nueva: contrasenaNueva,
      });
      await refrescarUsuario();
      cambiarContrasenaActual('');
      cambiarContrasenaNueva('');
      cambiarMensajeContrasena('Contraseña actualizada correctamente.');
    } catch (excepcion) {
      cambiarErrorContrasena(
        obtenerMensajeErrorApi(excepcion, 'No se pudo actualizar la contraseña.'),
      );
    } finally {
      cambiarGuardandoContrasena(false);
    }
  }

  return (
    <PantallaBase>
      <View style={estilos.encabezado}>
        <Text style={estilos.titulo}>Perfil</Text>
        <Text style={estilos.subtitulo}>{usuario ? `${usuario.nombre} ${usuario.apellidos}` : 'Sesión activa'}</Text>
        <Text style={estilos.correo}>{usuario?.correo}</Text>
      </View>
      <View style={estilos.tarjetaRol}>
        <Text style={estilos.rol}>{perfil.etiqueta}</Text>
        <Text style={estilos.descripcionRol}>{perfil.descripcion}</Text>
      </View>
      {usuario?.requiere_cambio_contrasena ? (
        <Text style={estilos.avisoContrasena}>
          Estás usando una contraseña temporal. Cámbiala antes de comenzar tu trabajo.
        </Text>
      ) : null}
      {puedeGestionarRutas ? (
        <View style={estilos.accion}>
          <Boton
            texto="Gestionar rutas semanales"
            alPresionar={() => navigation.navigate('Rutas')}
          />
        </View>
      ) : null}
      <View style={estilos.accion}>
        <Boton
          texto={`Ver tutorial de ${perfil.etiqueta.toLowerCase()}`}
          variante="secundario"
          alPresionar={abrirTutorial}
        />
      </View>
      <View style={estilos.seguridad}>
        <Text style={estilos.tituloSeguridad}>Cambiar contraseña</Text>
        <CampoTexto
          etiqueta="Contraseña actual"
          secureTextEntry
          value={contrasenaActual}
          onChangeText={cambiarContrasenaActual}
        />
        <CampoTexto
          etiqueta="Nueva contraseña"
          secureTextEntry
          value={contrasenaNueva}
          onChangeText={cambiarContrasenaNueva}
        />
        {errorContrasena ? (
          <Text style={estilos.error}>{errorContrasena}</Text>
        ) : null}
        {mensajeContrasena ? (
          <Text style={estilos.exito}>{mensajeContrasena}</Text>
        ) : null}
        <Boton
          texto="Actualizar contraseña"
          cargando={guardandoContrasena}
          alPresionar={guardarContrasena}
        />
      </View>
      <Boton texto="Cerrar sesión" variante="secundario" alPresionar={cerrarSesion} />
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
    color: colores.text,
    fontSize: 18,
    fontWeight: '800',
  },
  correo: {
    color: colores.muted,
    fontSize: 16,
  },
  tarjetaRol: {
    gap: espaciado.sm,
    marginBottom: espaciado.xl,
    padding: espaciado.lg,
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 16,
    backgroundColor: colores.surface,
  },
  rol: {
    alignSelf: 'flex-start',
    paddingHorizontal: espaciado.md,
    paddingVertical: 6,
    color: colores.white,
    fontSize: 13,
    fontWeight: '900',
    borderRadius: 999,
    backgroundColor: colores.primary,
  },
  descripcionRol: {
    color: colores.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  accion: {
    marginBottom: espaciado.md,
  },
  avisoContrasena: {
    marginBottom: espaciado.lg,
    padding: espaciado.md,
    color: '#7A4B00',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
    borderRadius: 13,
    backgroundColor: '#FFF4D6',
  },
  seguridad: {
    gap: espaciado.md,
    marginBottom: espaciado.xl,
    padding: espaciado.lg,
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 16,
    backgroundColor: colores.surface,
  },
  tituloSeguridad: {
    color: colores.text,
    fontSize: 18,
    fontWeight: '900',
  },
  error: { color: colores.danger, fontSize: 13, fontWeight: '700' },
  exito: { color: colores.primary, fontSize: 13, fontWeight: '800' },
});
