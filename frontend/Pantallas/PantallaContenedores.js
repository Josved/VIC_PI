import { useMemo, useState } from 'react';
import { LocateFixed, Lock, MapPinned, Navigation, Recycle, Route, Trash2 } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Boton } from '../componentes/Boton';
import { PantallaBase } from '../componentes/PantallaBase';
import { colores, espaciado } from '../componentes/tema';

const contenedores = [
  {
    id: 'c1',
    nombre: 'Contenedor A1',
    zona: 'Entrada principal',
    tipo: 'Reciclaje',
    estado: 'Disponible',
    llenado: 35,
    distancia: '120 m',
    serie: 'VIC-A1-001',
    horario: '08:00 AM - 06:00 PM',
    ubicacion: { arriba: '23%', izquierda: '18%' },
  },
  {
    id: 'c2',
    nombre: 'Contenedor B2',
    zona: 'Cafeteria',
    tipo: 'Organico',
    estado: 'Casi lleno',
    llenado: 82,
    distancia: '260 m',
    serie: 'VIC-B2-014',
    horario: '07:00 AM - 05:00 PM',
    ubicacion: { arriba: '48%', izquierda: '64%' },
  },
  {
    id: 'c3',
    nombre: 'Contenedor C3',
    zona: 'Biblioteca',
    tipo: 'Inorganico',
    estado: 'Mantenimiento',
    llenado: 15,
    distancia: '410 m',
    serie: 'VIC-C3-021',
    horario: '09:00 AM - 04:00 PM',
    ubicacion: { arriba: '68%', izquierda: '34%' },
  },
];

const colorEstado = {
  Disponible: colores.primary,
  'Casi lleno': colores.secondary,
  Mantenimiento: colores.danger,
};

export function PantallaContenedores() {
  const [idSeleccionado, cambiarSeleccionado] = useState(contenedores[0].id);
  const [permisoUbicacion, cambiarPermisoUbicacion] = useState(false);

  const contenedorSeleccionado = useMemo(
    () => contenedores.find((contenedor) => contenedor.id === idSeleccionado) || contenedores[0],
    [idSeleccionado],
  );

  const contenedoresCercanos = permisoUbicacion ? contenedores : contenedores.slice(0, 2);

  return (
    <PantallaBase centrada={false}>
      <View style={estilos.encabezado}>
        <MapPinned color={colores.primary} size={42} />
        <View style={estilos.textoEncabezado}>
          <Text style={estilos.titulo}>Contenedores y mapa</Text>
          <Text style={estilos.subtitulo}>Consulta ubicaciones, detalles y contenedores cercanos.</Text>
        </View>
      </View>

      <View style={estilos.mapa}>
        <Text style={estilos.tituloMapa}>Mapa de contenedores</Text>
        <View style={estilos.rutaHorizontal} />
        <View style={estilos.rutaVertical} />
        {contenedores.map((contenedor) => {
          const seleccionado = contenedor.id === contenedorSeleccionado.id;
          return (
            <Pressable
              accessibilityRole="button"
              key={contenedor.id}
              onPress={() => cambiarSeleccionado(contenedor.id)}
              style={[
                estilos.pinMapa,
                {
                  top: contenedor.ubicacion.arriba,
                  left: contenedor.ubicacion.izquierda,
                  backgroundColor: colorEstado[contenedor.estado],
                },
                seleccionado && estilos.pinSeleccionado,
              ]}
            >
              <Trash2 color={colores.white} size={18} />
            </Pressable>
          );
        })}
      </View>

      <View style={estilos.permiso}>
        <View style={estilos.iconoPermiso}>
          {permisoUbicacion ? <LocateFixed color={colores.primary} size={24} /> : <Lock color={colores.secondary} size={24} />}
        </View>
        <View style={estilos.textoPermiso}>
          <Text style={estilos.tituloPermiso}>
            {permisoUbicacion ? 'Ubicacion activada' : 'Ubicacion pendiente'}
          </Text>
          <Text style={estilos.descripcionPermiso}>
            {permisoUbicacion
              ? 'Mostrando contenedores cercanos segun tu posicion.'
              : 'Activa la ubicacion para ordenar los contenedores cercanos.'}
          </Text>
        </View>
        <Boton
          texto={permisoUbicacion ? 'Activa' : 'Activar'}
          variante={permisoUbicacion ? 'fantasma' : 'secundario'}
          alPresionar={() => cambiarPermisoUbicacion(true)}
        />
      </View>

      <Text style={estilos.tituloSeccion}>Lista de contenedores</Text>
      <View style={estilos.lista}>
        {contenedores.map((contenedor) => {
          const seleccionado = contenedor.id === contenedorSeleccionado.id;
          return (
            <Pressable
              accessibilityRole="button"
              key={contenedor.id}
              onPress={() => cambiarSeleccionado(contenedor.id)}
              style={[estilos.tarjetaLista, seleccionado && estilos.tarjetaListaSeleccionada]}
            >
              <View style={[estilos.puntoEstado, { backgroundColor: colorEstado[contenedor.estado] }]} />
              <View style={estilos.infoLista}>
                <Text style={estilos.nombreContenedor}>{contenedor.nombre}</Text>
                <Text style={estilos.zonaContenedor}>{contenedor.zona}</Text>
              </View>
              <Text style={estilos.distancia}>{contenedor.distancia}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={estilos.tituloSeccion}>Detalle de contenedor</Text>
      <View style={estilos.detalle}>
        <View style={estilos.detalleEncabezado}>
          <View style={[estilos.iconoDetalle, { backgroundColor: colorEstado[contenedorSeleccionado.estado] }]}>
            <Recycle color={colores.white} size={26} />
          </View>
          <View style={estilos.detalleTitulo}>
            <Text style={estilos.nombreDetalle}>{contenedorSeleccionado.nombre}</Text>
            <Text style={estilos.textoDetalle}>{contenedorSeleccionado.zona}</Text>
          </View>
        </View>

        <View style={estilos.barraLlenado}>
          <View style={[estilos.progresoLlenado, { width: `${contenedorSeleccionado.llenado}%`, backgroundColor: colorEstado[contenedorSeleccionado.estado] }]} />
        </View>
        <Text style={estilos.porcentaje}>{contenedorSeleccionado.llenado}% de capacidad</Text>

        <FilaDetalle etiqueta="Estado" valor={contenedorSeleccionado.estado} />
        <FilaDetalle etiqueta="Tipo" valor={contenedorSeleccionado.tipo} />
        <FilaDetalle etiqueta="Numero de serie" valor={contenedorSeleccionado.serie} />
        <FilaDetalle etiqueta="Horario" valor={contenedorSeleccionado.horario} />
      </View>

      <Text style={estilos.tituloSeccion}>Contenedores cercanos</Text>
      <View style={estilos.cercanos}>
        {contenedoresCercanos.map((contenedor) => (
          <View key={contenedor.id} style={estilos.cercano}>
            <Navigation color={colorEstado[contenedor.estado]} size={20} />
            <View style={estilos.infoCercano}>
              <Text style={estilos.nombreCercano}>{contenedor.nombre}</Text>
              <Text style={estilos.textoCercano}>{contenedor.zona}</Text>
            </View>
            <Text style={estilos.distancia}>{contenedor.distancia}</Text>
          </View>
        ))}
      </View>

      <View style={estilos.ruta}>
        <Route color={colores.primary} size={22} />
        <Text style={estilos.textoRuta}>Selecciona un contenedor en el mapa o en la lista para ver su detalle.</Text>
      </View>
    </PantallaBase>
  );
}

function FilaDetalle({ etiqueta, valor }) {
  return (
    <View style={estilos.filaDetalle}>
      <Text style={estilos.etiquetaDetalle}>{etiqueta}</Text>
      <Text style={estilos.valorDetalle}>{valor}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    marginBottom: espaciado.xl,
  },
  textoEncabezado: {
    flex: 1,
  },
  titulo: {
    color: colores.text,
    fontSize: 28,
    fontWeight: '900',
  },
  subtitulo: {
    color: colores.muted,
    fontSize: 15,
    lineHeight: 21,
  },
  mapa: {
    height: 230,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 18,
    backgroundColor: '#EAF7EE',
    marginBottom: espaciado.lg,
    padding: espaciado.lg,
  },
  tituloMapa: {
    color: colores.text,
    fontSize: 16,
    fontWeight: '900',
  },
  rutaHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '54%',
    height: 18,
    backgroundColor: '#D7E5DC',
  },
  rutaVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '42%',
    width: 18,
    backgroundColor: '#D7E5DC',
  },
  pinMapa: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colores.white,
  },
  pinSeleccionado: {
    transform: [{ scale: 1.18 }],
    borderColor: colores.text,
  },
  permiso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    padding: espaciado.md,
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 16,
    backgroundColor: colores.surface,
    marginBottom: espaciado.xl,
  },
  iconoPermiso: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.white,
  },
  textoPermiso: {
    flex: 1,
  },
  tituloPermiso: {
    color: colores.text,
    fontSize: 15,
    fontWeight: '900',
  },
  descripcionPermiso: {
    color: colores.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  tituloSeccion: {
    color: colores.text,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: espaciado.md,
  },
  lista: {
    gap: espaciado.sm,
    marginBottom: espaciado.xl,
  },
  tarjetaLista: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    padding: espaciado.md,
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 14,
    backgroundColor: colores.white,
  },
  tarjetaListaSeleccionada: {
    borderColor: colores.primary,
    backgroundColor: colores.surface,
  },
  puntoEstado: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  infoLista: {
    flex: 1,
  },
  nombreContenedor: {
    color: colores.text,
    fontSize: 16,
    fontWeight: '900',
  },
  zonaContenedor: {
    color: colores.muted,
    fontSize: 13,
  },
  distancia: {
    color: colores.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  detalle: {
    gap: espaciado.md,
    padding: espaciado.lg,
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 18,
    backgroundColor: colores.surface,
    marginBottom: espaciado.xl,
  },
  detalleEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
  },
  iconoDetalle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detalleTitulo: {
    flex: 1,
  },
  nombreDetalle: {
    color: colores.text,
    fontSize: 18,
    fontWeight: '900',
  },
  textoDetalle: {
    color: colores.muted,
    fontSize: 14,
  },
  barraLlenado: {
    height: 12,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: colores.white,
  },
  progresoLlenado: {
    height: '100%',
    borderRadius: 999,
  },
  porcentaje: {
    color: colores.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  filaDetalle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: espaciado.md,
    borderTopWidth: 1,
    borderTopColor: colores.border,
    paddingTop: espaciado.sm,
  },
  etiquetaDetalle: {
    color: colores.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  valorDetalle: {
    flex: 1,
    color: colores.text,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'right',
  },
  cercanos: {
    gap: espaciado.sm,
    marginBottom: espaciado.lg,
  },
  cercano: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    padding: espaciado.md,
    borderRadius: 14,
    backgroundColor: colores.white,
    borderWidth: 1,
    borderColor: colores.border,
  },
  infoCercano: {
    flex: 1,
  },
  nombreCercano: {
    color: colores.text,
    fontSize: 15,
    fontWeight: '900',
  },
  textoCercano: {
    color: colores.muted,
    fontSize: 13,
  },
  ruta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    padding: espaciado.md,
    borderRadius: 14,
    backgroundColor: colores.surface,
  },
  textoRuta: {
    flex: 1,
    color: colores.muted,
    fontSize: 13,
    lineHeight: 18,
  },
});
