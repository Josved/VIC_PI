import { StyleSheet, Text, View } from 'react-native';

import { Boton } from '../componentes/Boton';
import { PantallaBase } from '../componentes/PantallaBase';
import { usarSesion } from '../componentes/ContextoSesion';
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
  const { cerrarSesion, usuario } = usarSesion();
  const perfil = perfiles[usuario?.rol] || perfiles.citizen;
  const puedeGestionarRutas =
    usuario?.rol === 'collector' || usuario?.rol === 'admin';

  return (
    <PantallaBase>
      <View style={estilos.encabezado}>
        <Text style={estilos.titulo}>Perfil</Text>
        <Text style={estilos.subtitulo}>{usuario ? `${usuario.nombre} ${usuario.apellidos}` : 'Sesion activa'}</Text>
        <Text style={estilos.correo}>{usuario?.correo}</Text>
      </View>
      <View style={estilos.tarjetaRol}>
        <Text style={estilos.rol}>{perfil.etiqueta}</Text>
        <Text style={estilos.descripcionRol}>{perfil.descripcion}</Text>
      </View>
      {puedeGestionarRutas ? (
        <View style={estilos.accion}>
          <Boton
            texto="Gestionar rutas semanales"
            alPresionar={() => navigation.navigate('Rutas')}
          />
        </View>
      ) : null}
      <Boton texto="Cerrar sesion" variante="secundario" alPresionar={cerrarSesion} />
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
});
