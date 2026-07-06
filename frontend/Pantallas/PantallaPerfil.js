import { StyleSheet, Text, View } from 'react-native';

import { Boton } from '../componentes/Boton';
import { PantallaBase } from '../componentes/PantallaBase';
import { usarSesion } from '../componentes/ContextoSesion';
import { colores, espaciado } from '../componentes/tema';

export function PantallaPerfil() {
  const { cerrarSesion, usuario } = usarSesion();

  return (
    <PantallaBase>
      <View style={estilos.encabezado}>
        <Text style={estilos.titulo}>Perfil</Text>
        <Text style={estilos.subtitulo}>{usuario ? `${usuario.nombre} ${usuario.apellidos}` : 'Sesion activa'}</Text>
        <Text style={estilos.correo}>{usuario?.correo}</Text>
      </View>
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
});
