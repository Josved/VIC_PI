import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PantallaBase } from '../componentes/PantallaBase';
import { colores, espaciado } from '../componentes/tema';

const avisos = [
  {
    id: '1',
    titulo: 'Nuevo contenedor en el centro',
    fecha: 'Hoy, 10:00 AM',
    descripcion: 'Se ha instalado un nuevo punto verde en la plaza principal.',
  },
  {
    id: '2',
    titulo: 'Retraso en ruta norte',
    fecha: 'Ayer, 04:30 PM',
    descripcion: 'El camion de basura inorganica presenta un retraso de 30 minutos.',
  },
];

const calendario = [
  { id: '1', dia: 'Lunes', tipo: 'Organica', horario: '08:00 AM - 10:00 AM', color: colores.primary },
  { id: '2', dia: 'Martes', tipo: 'Inorganica', horario: '09:00 AM - 11:00 AM', color: '#2196F3' },
  { id: '3', dia: 'Miercoles', tipo: 'Reciclaje', horario: '07:00 AM - 09:00 AM', color: colores.secondary },
  { id: '4', dia: 'Jueves', tipo: 'Organica', horario: '08:00 AM - 10:00 AM', color: colores.primary },
  { id: '5', dia: 'Viernes', tipo: 'Inorganica', horario: '09:00 AM - 11:00 AM', color: '#2196F3' },
];

export function PantallaInicio() {
  const [detalleVisible, cambiarDetalleVisible] = useState(false);
  const [diaSeleccionado, cambiarDiaSeleccionado] = useState(null);

  function abrirDetalle(dia) {
    cambiarDiaSeleccionado(dia);
    cambiarDetalleVisible(true);
  }

  function cerrarDetalle() {
    cambiarDetalleVisible(false);
  }

  return (
    <PantallaBase centrada={false}>
      <View style={estilos.encabezado}>
        <Text style={estilos.titulo}>Inicio y Comunidad</Text>
        <Text style={estilos.subtitulo}>Hola de nuevo, mantengamos limpia nuestra ciudad.</Text>
      </View>

      <View style={estilos.seccion}>
        <Text style={estilos.tituloSeccion}>Ultimos Anuncios</Text>
        {avisos.map((aviso) => (
          <View key={aviso.id} style={estilos.tarjetaAviso}>
            <View style={estilos.encabezadoAviso}>
              <Text style={estilos.tituloAviso}>{aviso.titulo}</Text>
              <Text style={estilos.fechaAviso}>{aviso.fecha}</Text>
            </View>
            <Text style={estilos.descripcionAviso}>{aviso.descripcion}</Text>
          </View>
        ))}
      </View>

      <View style={estilos.seccion}>
        <Text style={estilos.tituloSeccion}>Calendario Semanal</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.calendario}>
          {calendario.map((dia) => (
            <Pressable
              accessibilityRole="button"
              key={dia.id}
              onPress={() => abrirDetalle(dia)}
              style={[estilos.tarjetaDia, { borderTopColor: dia.color }]}
            >
              <Text style={estilos.textoDia}>{dia.dia}</Text>
              <Text style={estilos.textoTipo}>{dia.tipo}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <Modal animationType="slide" transparent visible={detalleVisible} onRequestClose={cerrarDetalle}>
        <View style={estilos.fondoModal}>
          <View style={estilos.modal}>
            {diaSeleccionado ? (
              <>
                <Text style={estilos.tituloModal}>Detalle del {diaSeleccionado.dia}</Text>

                <View style={estilos.filaModal}>
                  <Text style={estilos.etiquetaModal}>Tipo de recoleccion:</Text>
                  <Text style={[estilos.valorModal, { color: diaSeleccionado.color }]}>{diaSeleccionado.tipo}</Text>
                </View>

                <View style={estilos.filaModal}>
                  <Text style={estilos.etiquetaModal}>Horario aproximado:</Text>
                  <Text style={estilos.valorModal}>{diaSeleccionado.horario}</Text>
                </View>

                <Text style={estilos.notaModal}>Recuerda sacar tus contenedores 15 minutos antes del horario indicado.</Text>

                <Pressable accessibilityRole="button" style={estilos.botonCerrar} onPress={cerrarDetalle}>
                  <Text style={estilos.textoBotonCerrar}>Cerrar Detalle</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </PantallaBase>
  );
}

const estilos = StyleSheet.create({
  encabezado: {
    marginBottom: espaciado.xl,
    marginTop: espaciado.sm,
  },
  titulo: {
    fontSize: 26,
    fontWeight: '900',
    color: colores.primary,
  },
  subtitulo: {
    fontSize: 15,
    color: colores.muted,
    marginTop: espaciado.xs,
  },
  seccion: {
    marginBottom: espaciado.xxl,
  },
  tituloSeccion: {
    fontSize: 18,
    fontWeight: '900',
    color: colores.text,
    marginBottom: espaciado.md,
  },
  tarjetaAviso: {
    backgroundColor: colores.white,
    padding: espaciado.lg,
    borderRadius: 12,
    marginBottom: espaciado.md,
    borderWidth: 1,
    borderColor: colores.border,
  },
  encabezadoAviso: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: espaciado.md,
    marginBottom: espaciado.sm,
  },
  tituloAviso: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: colores.text,
  },
  fechaAviso: {
    fontSize: 12,
    color: colores.muted,
  },
  descripcionAviso: {
    fontSize: 14,
    color: colores.muted,
    lineHeight: 20,
  },
  calendario: {
    paddingBottom: espaciado.sm,
  },
  tarjetaDia: {
    minWidth: 120,
    alignItems: 'center',
    backgroundColor: colores.white,
    padding: espaciado.lg,
    borderRadius: 12,
    marginRight: espaciado.md,
    borderWidth: 1,
    borderColor: colores.border,
    borderTopWidth: 4,
  },
  textoDia: {
    fontSize: 16,
    fontWeight: '900',
    color: colores.text,
    marginBottom: espaciado.xs,
  },
  textoTipo: {
    fontSize: 13,
    color: colores.muted,
  },
  fondoModal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modal: {
    backgroundColor: colores.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: espaciado.xl,
  },
  tituloModal: {
    fontSize: 22,
    fontWeight: '900',
    color: colores.text,
    marginBottom: espaciado.xl,
    textAlign: 'center',
  },
  filaModal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: espaciado.md,
    marginBottom: espaciado.md,
    borderBottomWidth: 1,
    borderBottomColor: colores.border,
    paddingBottom: espaciado.sm,
  },
  etiquetaModal: {
    flex: 1,
    fontSize: 15,
    color: colores.muted,
    fontWeight: '700',
  },
  valorModal: {
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
    color: colores.text,
    textAlign: 'right',
  },
  notaModal: {
    fontSize: 13,
    color: colores.muted,
    marginTop: espaciado.sm,
    marginBottom: espaciado.xl,
    textAlign: 'center',
  },
  botonCerrar: {
    backgroundColor: colores.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  textoBotonCerrar: {
    color: colores.white,
    fontSize: 16,
    fontWeight: '900',
  },
});
