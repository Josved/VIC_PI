import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CalendarClock, Check, MapPin, Pencil, Power, Route } from 'lucide-react-native';

import { Boton } from '../componentes/Boton';
import { CampoTexto } from '../componentes/CampoTexto';
import { conexionApi, obtenerMensajeErrorApi } from '../componentes/conexionApi';
import { PantallaBase } from '../componentes/PantallaBase';
import { colores, espaciado } from '../componentes/tema';
import { usarContenedores } from '../componentes/usarContenedores';

const dias = [
  { id: 'lunes', etiqueta: 'Lun' },
  { id: 'martes', etiqueta: 'Mar' },
  { id: 'miercoles', etiqueta: 'Mié' },
  { id: 'jueves', etiqueta: 'Jue' },
  { id: 'viernes', etiqueta: 'Vie' },
  { id: 'sabado', etiqueta: 'Sáb' },
  { id: 'domingo', etiqueta: 'Dom' },
];

const nombresDia = Object.fromEntries(dias.map((dia) => [dia.id, dia.etiqueta]));

const formularioInicial = {
  nombre: '',
  zona: '',
  dia_semana: 'lunes',
  hora_aproximada: '08:00',
  descripcion: '',
};

export function PantallaRutas() {
  const {
    contenedores,
    cargando: cargandoContenedores,
    error: errorContenedores,
  } = usarContenedores();
  const [formulario, cambiarFormulario] = useState(formularioInicial);
  const [contenedorIds, cambiarContenedorIds] = useState([]);
  const [rutas, cambiarRutas] = useState([]);
  const [rutaEditandoId, cambiarRutaEditandoId] = useState(null);
  const [cargandoRutas, cambiarCargandoRutas] = useState(true);
  const [guardando, cambiarGuardando] = useState(false);
  const [actualizandoId, cambiarActualizandoId] = useState(null);
  const [error, cambiarError] = useState('');
  const [exito, cambiarExito] = useState('');

  const cargarRutas = useCallback(async () => {
    try {
      cambiarCargandoRutas(true);
      cambiarError('');
      const respuesta = await conexionApi.get('/rutas/mias');
      cambiarRutas(respuesta.data);
    } catch (excepcion) {
      cambiarError(
        obtenerMensajeErrorApi(excepcion, 'No fue posible cargar las rutas.'),
      );
    } finally {
      cambiarCargandoRutas(false);
    }
  }, []);

  useEffect(() => {
    cargarRutas();
  }, [cargarRutas]);

  function cambiarCampo(campo, valor) {
    cambiarFormulario((actual) => ({ ...actual, [campo]: valor }));
  }

  function alternarContenedor(id) {
    cambiarContenedorIds((actuales) =>
      actuales.includes(id)
        ? actuales.filter((actual) => actual !== id)
        : [...actuales, id],
    );
  }

  function limpiarFormulario() {
    cambiarFormulario(formularioInicial);
    cambiarContenedorIds([]);
    cambiarRutaEditandoId(null);
  }

  function editarRuta(ruta) {
    cambiarFormulario({
      nombre: ruta.nombre,
      zona: ruta.zona,
      dia_semana: ruta.dia_semana,
      hora_aproximada: ruta.hora_aproximada,
      descripcion: ruta.descripcion || '',
    });
    cambiarContenedorIds(ruta.contenedores.map((contenedor) => contenedor.id));
    cambiarRutaEditandoId(ruta.id);
    cambiarError('');
    cambiarExito('');
  }

  async function guardarRuta() {
    if (!formulario.nombre.trim() || !formulario.zona.trim()) {
      cambiarError('Escribe el nombre y la zona de la ruta.');
      return;
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(formulario.hora_aproximada)) {
      cambiarError('La hora debe tener formato de 24 horas, por ejemplo 08:30.');
      return;
    }
    if (contenedorIds.length === 0) {
      cambiarError('Selecciona al menos un contenedor para la ruta.');
      return;
    }

    const datos = {
      ...formulario,
      nombre: formulario.nombre.trim(),
      zona: formulario.zona.trim(),
      descripcion: formulario.descripcion.trim() || null,
      contenedor_ids: contenedorIds,
    };

    try {
      cambiarGuardando(true);
      cambiarError('');
      cambiarExito('');
      if (rutaEditandoId) {
        await conexionApi.patch(`/rutas/${rutaEditandoId}`, datos);
        cambiarExito('Ruta actualizada. El calendario ya muestra el nuevo horario.');
      } else {
        await conexionApi.post('/rutas', datos);
        cambiarExito('Ruta creada. Ya está visible en el calendario semanal.');
      }
      limpiarFormulario();
      await cargarRutas();
    } catch (excepcion) {
      cambiarError(
        obtenerMensajeErrorApi(excepcion, 'No fue posible guardar la ruta.'),
      );
    } finally {
      cambiarGuardando(false);
    }
  }

  async function alternarEstado(ruta) {
    try {
      cambiarActualizandoId(ruta.id);
      cambiarError('');
      await conexionApi.patch(`/rutas/${ruta.id}`, { activa: !ruta.activa });
      await cargarRutas();
    } catch (excepcion) {
      Alert.alert(
        'No se pudo actualizar',
        obtenerMensajeErrorApi(excepcion, 'Intenta nuevamente.'),
      );
    } finally {
      cambiarActualizandoId(null);
    }
  }

  return (
    <PantallaBase centrada={false}>
      <View style={estilos.encabezado}>
        <View style={estilos.iconoEncabezado}>
          <Route color={colores.white} size={28} />
        </View>
        <View style={estilos.flexible}>
          <Text style={estilos.titulo}>Rutas de recolección</Text>
          <Text style={estilos.subtitulo}>
            Define el recorrido, el día y la hora aproximada de paso.
          </Text>
        </View>
      </View>

      <View style={estilos.tarjetaFormulario}>
        <View style={estilos.filaTitulo}>
          <CalendarClock color={colores.primary} size={23} />
          <Text style={estilos.tituloSeccion}>
            {rutaEditandoId ? 'Editar ruta' : 'Crear ruta semanal'}
          </Text>
        </View>

        <CampoTexto
          etiqueta="Nombre de la ruta"
          placeholder="Ej. Ruta Centro"
          value={formulario.nombre}
          onChangeText={(valor) => cambiarCampo('nombre', valor)}
        />
        <CampoTexto
          etiqueta="Zona o colonia"
          placeholder="Ej. Barrio Centro"
          value={formulario.zona}
          onChangeText={(valor) => cambiarCampo('zona', valor)}
        />

        <View style={estilos.campo}>
          <Text style={estilos.etiqueta}>Día de recolección</Text>
          <View style={estilos.dias}>
            {dias.map((dia) => (
              <Pressable
                accessibilityRole="button"
                key={dia.id}
                onPress={() => cambiarCampo('dia_semana', dia.id)}
                style={[
                  estilos.dia,
                  formulario.dia_semana === dia.id && estilos.diaSeleccionado,
                ]}
              >
                <Text
                  style={[
                    estilos.textoDia,
                    formulario.dia_semana === dia.id &&
                      estilos.textoDiaSeleccionado,
                  ]}
                >
                  {dia.etiqueta}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <CampoTexto
          etiqueta="Hora aproximada (24 h)"
          placeholder="08:30"
          value={formulario.hora_aproximada}
          keyboardType="numbers-and-punctuation"
          maxLength={5}
          onChangeText={(valor) => cambiarCampo('hora_aproximada', valor)}
        />
        <CampoTexto
          etiqueta="Indicaciones (opcional)"
          placeholder="Punto de inicio o referencias"
          value={formulario.descripcion}
          multiline
          onChangeText={(valor) => cambiarCampo('descripcion', valor)}
          estilo={estilos.descripcion}
        />

        <View style={estilos.campo}>
          <Text style={estilos.etiqueta}>Contenedores del recorrido</Text>
          <Text style={estilos.ayuda}>
            Selecciona los puntos en el orden en que pasarás.
          </Text>
          {cargandoContenedores ? (
            <ActivityIndicator color={colores.primary} />
          ) : errorContenedores ? (
            <Text style={estilos.error}>{errorContenedores}</Text>
          ) : contenedores.length === 0 ? (
            <Text style={estilos.vacio}>
              Primero registra al menos un contenedor desde el mapa.
            </Text>
          ) : (
            <View style={estilos.listaContenedores}>
              {contenedores.map((contenedor) => {
                const seleccionado = contenedorIds.includes(contenedor.id);
                const orden = contenedorIds.indexOf(contenedor.id) + 1;
                return (
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: seleccionado }}
                    key={contenedor.id}
                    onPress={() => alternarContenedor(contenedor.id)}
                    style={[
                      estilos.contenedor,
                      seleccionado && estilos.contenedorSeleccionado,
                    ]}
                  >
                    <View
                      style={[
                        estilos.casilla,
                        seleccionado && estilos.casillaSeleccionada,
                      ]}
                    >
                      {seleccionado ? <Text style={estilos.orden}>{orden}</Text> : null}
                    </View>
                    <View style={estilos.flexible}>
                      <Text numberOfLines={1} style={estilos.codigo}>
                        {contenedor.codigo_qr}
                      </Text>
                      <Text style={estilos.coordenadas}>
                        {contenedor.latitud.toFixed(5)}, {contenedor.longitud.toFixed(5)}
                      </Text>
                    </View>
                    {seleccionado ? <Check color={colores.primary} size={20} /> : null}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {error ? <Text style={estilos.error}>{error}</Text> : null}
        {exito ? <Text style={estilos.exito}>{exito}</Text> : null}

        <Boton
          texto={rutaEditandoId ? 'Guardar cambios' : 'Crear ruta'}
          cargando={guardando}
          alPresionar={guardarRuta}
        />
        {rutaEditandoId ? (
          <Boton
            texto="Cancelar edición"
            variante="fantasma"
            alPresionar={limpiarFormulario}
          />
        ) : null}
      </View>

      <View style={estilos.filaTitulo}>
        <MapPin color={colores.primary} size={22} />
        <Text style={estilos.tituloSeccion}>Rutas programadas</Text>
      </View>

      {cargandoRutas ? (
        <ActivityIndicator color={colores.primary} size="large" />
      ) : rutas.length === 0 ? (
        <View style={estilos.vacioTarjeta}>
          <Text style={estilos.vacioTitulo}>Aún no hay rutas</Text>
          <Text style={estilos.vacio}>Crea la primera agenda semanal arriba.</Text>
        </View>
      ) : (
        <View style={estilos.listaRutas}>
          {rutas.map((ruta) => (
            <View
              key={ruta.id}
              style={[estilos.ruta, !ruta.activa && estilos.rutaInactiva]}
            >
              <View style={estilos.rutaEncabezado}>
                <View style={estilos.flexible}>
                  <Text style={estilos.rutaNombre}>{ruta.nombre}</Text>
                  <Text style={estilos.rutaHorario}>
                    {nombresDia[ruta.dia_semana]} · {ruta.hora_aproximada} · {ruta.zona}
                  </Text>
                </View>
                <View style={[estilos.estado, !ruta.activa && estilos.estadoInactivo]}>
                  <Text style={estilos.textoEstado}>
                    {ruta.activa ? 'Activa' : 'Pausada'}
                  </Text>
                </View>
              </View>
              <Text style={estilos.rutaDetalle}>
                {ruta.contenedores.length}{' '}
                {ruta.contenedores.length === 1 ? 'contenedor' : 'contenedores'}
                {ruta.descripcion ? ` · ${ruta.descripcion}` : ''}
              </Text>
              <View style={estilos.accionesRuta}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => editarRuta(ruta)}
                  style={estilos.botonRuta}
                >
                  <Pencil color={colores.primary} size={17} />
                  <Text style={estilos.textoBotonRuta}>Editar</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={actualizandoId === ruta.id}
                  onPress={() => alternarEstado(ruta)}
                  style={estilos.botonRuta}
                >
                  {actualizandoId === ruta.id ? (
                    <ActivityIndicator color={colores.secondary} />
                  ) : (
                    <Power color={colores.secondary} size={17} />
                  )}
                  <Text
                    style={[
                      estilos.textoBotonRuta,
                      { color: colores.secondary },
                    ]}
                  >
                    {ruta.activa ? 'Pausar' : 'Activar'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
    </PantallaBase>
  );
}

const estilos = StyleSheet.create({
  flexible: { flex: 1 },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    marginBottom: espaciado.xl,
  },
  iconoEncabezado: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: colores.primary,
  },
  titulo: { color: colores.text, fontSize: 26, fontWeight: '900' },
  subtitulo: { color: colores.muted, fontSize: 14, lineHeight: 20 },
  tarjetaFormulario: {
    gap: espaciado.lg,
    marginBottom: espaciado.xxl,
    padding: espaciado.lg,
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 18,
    backgroundColor: colores.surface,
  },
  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    marginBottom: espaciado.md,
  },
  tituloSeccion: { color: colores.text, fontSize: 19, fontWeight: '900' },
  campo: { gap: espaciado.sm },
  etiqueta: { color: colores.text, fontSize: 14, fontWeight: '800' },
  ayuda: { color: colores.muted, fontSize: 12, lineHeight: 17 },
  dias: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dia: {
    minWidth: 42,
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 11,
    backgroundColor: colores.white,
  },
  diaSeleccionado: {
    borderColor: colores.primary,
    backgroundColor: colores.primary,
  },
  textoDia: { color: colores.text, fontSize: 12, fontWeight: '800' },
  textoDiaSeleccionado: { color: colores.white },
  descripcion: {
    minHeight: 82,
    paddingTop: espaciado.md,
    textAlignVertical: 'top',
  },
  listaContenedores: { gap: espaciado.sm },
  contenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    padding: espaciado.md,
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 13,
    backgroundColor: colores.white,
  },
  contenedorSeleccionado: {
    borderColor: colores.primary,
    backgroundColor: '#EAF7EE',
  },
  casilla: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colores.border,
    borderRadius: 9,
  },
  casillaSeleccionada: {
    borderColor: colores.primary,
    backgroundColor: colores.primary,
  },
  orden: { color: colores.white, fontSize: 12, fontWeight: '900' },
  codigo: { color: colores.text, fontSize: 14, fontWeight: '900' },
  coordenadas: { color: colores.muted, fontSize: 11 },
  error: {
    padding: espaciado.md,
    color: colores.danger,
    fontSize: 13,
    borderRadius: 12,
    backgroundColor: '#FFF1F0',
  },
  exito: {
    padding: espaciado.md,
    color: colores.primaryDark,
    fontSize: 13,
    fontWeight: '700',
    borderRadius: 12,
    backgroundColor: '#EAF7EE',
  },
  vacio: { color: colores.muted, fontSize: 13, lineHeight: 19 },
  vacioTarjeta: {
    alignItems: 'center',
    gap: espaciado.xs,
    padding: espaciado.xl,
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 16,
    backgroundColor: colores.surface,
  },
  vacioTitulo: { color: colores.text, fontSize: 17, fontWeight: '900' },
  listaRutas: { gap: espaciado.md },
  ruta: {
    gap: espaciado.md,
    padding: espaciado.lg,
    borderWidth: 1,
    borderColor: colores.primary,
    borderRadius: 16,
    backgroundColor: '#F4FBF6',
  },
  rutaInactiva: {
    opacity: 0.68,
    borderColor: colores.border,
    backgroundColor: colores.surface,
  },
  rutaEncabezado: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espaciado.sm,
  },
  rutaNombre: { color: colores.text, fontSize: 17, fontWeight: '900' },
  rutaHorario: {
    marginTop: 3,
    color: colores.primaryDark,
    fontSize: 13,
    fontWeight: '800',
  },
  rutaDetalle: { color: colores.muted, fontSize: 13, lineHeight: 19 },
  estado: {
    paddingHorizontal: espaciado.sm,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colores.primary,
  },
  estadoInactivo: { backgroundColor: colores.muted },
  textoEstado: { color: colores.white, fontSize: 11, fontWeight: '900' },
  accionesRuta: { flexDirection: 'row', gap: espaciado.sm },
  botonRuta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.sm,
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 11,
    backgroundColor: colores.white,
  },
  textoBotonRuta: { color: colores.primary, fontSize: 13, fontWeight: '900' },
});
