import { StyleSheet, Text, View } from 'react-native';
import { ShieldCheck, Truck, UserRound } from 'lucide-react-native';

import { Boton } from '../componentes/Boton';
import { PantallaBase } from '../componentes/PantallaBase';
import { usarSesion } from '../componentes/ContextoSesion';
import { colores, espaciado } from '../componentes/tema';

const rolesDisponibles = [
  { id: 'citizen', title: 'Ciudadano', description: 'Consulta avisos y reporta contenedores.', icon: UserRound },
  { id: 'collector', title: 'Recolector', description: 'Da seguimiento a rutas y alertas.', icon: Truck },
  { id: 'admin', title: 'Administrador', description: 'Supervisa usuarios y actividad.', icon: ShieldCheck },
];

export function PantallaSeleccionRol({ navigation }) {
  const { rolSeleccionado, cambiarRolSeleccionado } = usarSesion();

  return (
    <PantallaBase>
      <View style={estilos.encabezado}>
        <Text style={estilos.titulo}>Selecciona tu rol</Text>
        <Text style={estilos.subtitulo}>Esto ayuda a preparar la experiencia de la app segun tus actividades.</Text>
      </View>

      <View style={estilos.roles}>
        {rolesDisponibles.map((rol) => {
          const Icono = rol.icon;
          const estaSeleccionado = rolSeleccionado === rol.id;

          return (
            <View key={rol.id} style={[estilos.tarjetaRol, estaSeleccionado && estilos.tarjetaRolSeleccionada]}>
              <Icono color={estaSeleccionado ? colores.white : colores.primary} size={30} />
              <View style={estilos.textoRol}>
                <Text style={[estilos.tituloRol, estaSeleccionado && estilos.tituloRolSeleccionado]}>{rol.title}</Text>
                <Text style={[estilos.descripcionRol, estaSeleccionado && estilos.descripcionRolSeleccionada]}>{rol.description}</Text>
              </View>
              <Boton
                texto={estaSeleccionado ? 'Elegido' : 'Elegir'}
                variante={estaSeleccionado ? 'secundario' : 'principal'}
                alPresionar={() => cambiarRolSeleccionado(rol.id)}
              />
            </View>
          );
        })}
      </View>

      <View style={estilos.acciones}>
        <Boton texto="Continuar al registro" alPresionar={() => navigation.navigate('Registro')} />
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
    lineHeight: 22,
  },
  roles: {
    gap: espaciado.md,
  },
  tarjetaRol: {
    gap: espaciado.md,
    padding: espaciado.lg,
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 16,
    backgroundColor: colores.surface,
  },
  tarjetaRolSeleccionada: {
    backgroundColor: colores.primary,
    borderColor: colores.primary,
  },
  textoRol: {
    gap: espaciado.xs,
  },
  tituloRol: {
    color: colores.text,
    fontSize: 18,
    fontWeight: '900',
  },
  tituloRolSeleccionado: {
    color: colores.white,
  },
  descripcionRol: {
    color: colores.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  descripcionRolSeleccionada: {
    color: colores.white,
  },
  acciones: {
    gap: espaciado.md,
    marginTop: espaciado.xl,
  },
});
