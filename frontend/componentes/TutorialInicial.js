import {
  CalendarDays,
  Camera,
  CircleCheck,
  Container,
  FileWarning,
  MapPinned,
  Route,
  ShieldCheck,
  UserRound,
  UsersRound,
} from 'lucide-react-native';
import { Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { usarTutorial } from './ContextoTutorial';
import { colores, espaciado } from './tema';

const iconos = {
  bienvenida: CircleCheck,
  calendario: CalendarDays,
  camara: Camera,
  contenedor: Container,
  mapa: MapPinned,
  perfil: UserRound,
  reporte: FileWarning,
  ruta: Route,
  seguridad: ShieldCheck,
  usuarios: UsersRound,
};

export function TutorialInicial() {
  const {
    avanzarTutorial,
    cerrarTutorial,
    etiquetaRol,
    pasoActual,
    pasos,
    retrocederTutorial,
    visible,
  } = usarTutorial();
  const paso = pasos[pasoActual] || pasos[0];
  const Icono = iconos[paso.icono] || CircleCheck;
  const esUltimo = pasoActual === pasos.length - 1;

  return (
    <Modal
      animationType="fade"
      onRequestClose={cerrarTutorial}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <SafeAreaView style={estilos.fondo}>
        <View style={estilos.tarjeta}>
          <View style={estilos.encabezado}>
            <View>
              <Text style={estilos.sobretitulo}>Tutorial de {etiquetaRol}</Text>
              <Text style={estilos.contador}>Paso {pasoActual + 1} de {pasos.length}</Text>
            </View>
            <Pressable
              accessibilityLabel="Omitir tutorial"
              accessibilityRole="button"
              hitSlop={10}
              onPress={cerrarTutorial}
            >
              <Text style={estilos.omitir}>Omitir</Text>
            </Pressable>
          </View>

          <View style={estilos.progresoFondo}>
            <View
              style={[
                estilos.progreso,
                { width: `${((pasoActual + 1) / pasos.length) * 100}%` },
              ]}
            />
          </View>

          <ScrollView
            contentContainerStyle={estilos.contenido}
            showsVerticalScrollIndicator={false}
          >
            <View style={estilos.icono}>
              <Icono color={colores.primary} size={42} strokeWidth={2.2} />
            </View>
            <Text style={estilos.titulo}>{paso.titulo}</Text>
            <Text style={estilos.descripcion}>{paso.descripcion}</Text>
            <View style={estilos.lista}>
              {paso.detalles.map((detalle) => (
                <View key={detalle} style={estilos.filaDetalle}>
                  <CircleCheck color={colores.primary} size={20} />
                  <Text style={estilos.detalle}>{detalle}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={estilos.acciones}>
            {pasoActual > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={retrocederTutorial}
                style={[estilos.boton, estilos.botonAnterior]}
              >
                <Text style={estilos.textoAnterior}>Anterior</Text>
              </Pressable>
            ) : (
              <View style={estilos.espacioBoton} />
            )}
            <Pressable
              accessibilityRole="button"
              onPress={avanzarTutorial}
              style={[estilos.boton, estilos.botonSiguiente]}
            >
              <Text style={estilos.textoSiguiente}>{esUltimo ? 'Finalizar' : 'Siguiente'}</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fondo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espaciado.lg,
    backgroundColor: 'rgba(8, 35, 25, 0.74)',
  },
  tarjeta: {
    width: '100%',
    maxWidth: 560,
    maxHeight: Platform.OS === 'web' ? 680 : '92%',
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: colores.white,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espaciado.xl,
    paddingTop: espaciado.xl,
    paddingBottom: espaciado.md,
  },
  sobretitulo: {
    color: colores.text,
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  contador: {
    marginTop: 3,
    color: colores.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  omitir: {
    color: colores.primary,
    fontSize: 14,
    fontWeight: '900',
  },
  progresoFondo: {
    height: 5,
    marginHorizontal: espaciado.xl,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: colores.border,
  },
  progreso: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colores.secondary,
  },
  contenido: {
    alignItems: 'center',
    padding: espaciado.xl,
    paddingBottom: espaciado.lg,
  },
  icono: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espaciado.lg,
    borderRadius: 28,
    backgroundColor: '#EAF6ED',
  },
  titulo: {
    color: colores.text,
    fontSize: 25,
    fontWeight: '900',
    textAlign: 'center',
  },
  descripcion: {
    marginTop: espaciado.md,
    color: colores.muted,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  lista: {
    width: '100%',
    gap: espaciado.md,
    marginTop: espaciado.xl,
    padding: espaciado.lg,
    borderRadius: 16,
    backgroundColor: colores.surface,
  },
  filaDetalle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espaciado.md,
  },
  detalle: {
    flex: 1,
    color: colores.text,
    fontSize: 14,
    lineHeight: 21,
  },
  acciones: {
    flexDirection: 'row',
    gap: espaciado.md,
    padding: espaciado.xl,
    paddingTop: espaciado.md,
    borderTopWidth: 1,
    borderTopColor: colores.border,
  },
  boton: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espaciado.md,
    borderRadius: 14,
  },
  botonAnterior: {
    borderWidth: 1,
    borderColor: colores.border,
    backgroundColor: colores.white,
  },
  botonSiguiente: {
    backgroundColor: colores.primary,
  },
  textoAnterior: {
    color: colores.text,
    fontSize: 15,
    fontWeight: '900',
  },
  textoSiguiente: {
    color: colores.white,
    fontSize: 15,
    fontWeight: '900',
  },
  espacioBoton: { flex: 1 },
});
