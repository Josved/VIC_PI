import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Check,
  MapPin,
  Pencil,
  Power,
  Route,
  Search,
  Trash2,
  Truck,
} from 'lucide-react-native';

import { Boton } from '../componentes/Boton';
import { CampoTexto } from '../componentes/CampoTexto';
import { conexionApi, obtenerMensajeErrorApi } from '../componentes/conexionApi';
import { usarSesion } from '../componentes/ContextoSesion';
import { MapaRuta } from '../componentes/MapaRuta';
import { PanelRecorrido } from '../componentes/PanelRecorrido';
import { PantallaBase } from '../componentes/PantallaBase';
import { SelectorHora } from '../componentes/SelectorHora';
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

function textoDistancia(valor) {
  if (valor == null) return 'Sin distancia';
  return valor >= 1000 ? `${(valor / 1000).toFixed(1)} km` : `${Math.round(valor)} m`;
}

export function PantallaRutas({ route, navigation }) {
  const { usuario } = usarSesion();
  const esAdmin = usuario?.rol === 'admin';
  const { contenedores, cargando: cargandoContenedores } = usarContenedores();
  const [formulario, cambiarFormulario] = useState(formularioInicial);
  const [puntosRuta, cambiarPuntosRuta] = useState([]);
  const [rutas, cambiarRutas] = useState([]);
  const [recolectores, cambiarRecolectores] = useState([]);
  const [vehiculos, cambiarVehiculos] = useState([]);
  const [recolectorId, cambiarRecolectorId] = useState(null);
  const [vehiculoId, cambiarVehiculoId] = useState(null);
  const [optimizar, cambiarOptimizar] = useState(false);
  const [direccionBusqueda, cambiarDireccionBusqueda] = useState('');
  const [rutaEditandoId, cambiarRutaEditandoId] = useState(null);
  const [cargandoRutas, cambiarCargandoRutas] = useState(true);
  const [guardando, cambiarGuardando] = useState(false);
  const [actualizandoId, cambiarActualizandoId] = useState(null);
  const [error, cambiarError] = useState('');
  const [exito, cambiarExito] = useState('');
  const referenciaScroll = useRef(null);
  const posicionEditor = useRef(0);
  const ultimaSolicitudEdicion = useRef(null);

  const contenedorIds = useMemo(
    () =>
      puntosRuta
        .filter((punto) => punto.tipo === 'contenedor')
        .map((punto) => punto.contenedor_id),
    [puntosRuta],
  );

  const cargarRutas = useCallback(async () => {
    try {
      cambiarCargandoRutas(true);
      cambiarError('');
      const solicitudes = [conexionApi.get('/rutas/mias')];
      if (esAdmin) {
        solicitudes.push(
          conexionApi.get('/administracion/recolectores'),
          conexionApi.get('/administracion/vehiculos'),
        );
      }
      const [respuestaRutas, respuestaRecolectores, respuestaVehiculos] =
        await Promise.all(solicitudes);
      cambiarRutas(respuestaRutas.data);
      cambiarRecolectores(respuestaRecolectores?.data || []);
      cambiarVehiculos(respuestaVehiculos?.data || []);
    } catch (excepcion) {
      cambiarError(obtenerMensajeErrorApi(excepcion, 'No fue posible cargar las rutas.'));
    } finally {
      cambiarCargandoRutas(false);
    }
  }, [esAdmin]);

  useEffect(() => {
    cargarRutas();
  }, [cargarRutas]);

  useEffect(() => {
    const solicitud = route?.params?.solicitudEdicion;
    const rutaId = route?.params?.editarRutaId;
    if (
      !solicitud
      || solicitud === ultimaSolicitudEdicion.current
      || !rutaId
      || rutas.length === 0
    ) {
      return;
    }
    const ruta = rutas.find((item) => item.id === rutaId);
    ultimaSolicitudEdicion.current = solicitud;
    if (ruta) editarRuta(ruta);
    navigation.setParams({ editarRutaId: undefined, solicitudEdicion: undefined });
  }, [navigation, route?.params?.editarRutaId, route?.params?.solicitudEdicion, rutas]);

  function limpiarFormulario() {
    cambiarFormulario(formularioInicial);
    cambiarPuntosRuta([]);
    cambiarRecolectorId(null);
    cambiarVehiculoId(null);
    cambiarOptimizar(false);
    cambiarDireccionBusqueda('');
    cambiarRutaEditandoId(null);
  }

  function alternarContenedor(contenedor) {
    cambiarPuntosRuta((actuales) => {
      const existe = actuales.some(
        (punto) =>
          punto.tipo === 'contenedor' && punto.contenedor_id === contenedor.id,
      );
      if (existe) {
        return actuales.filter(
          (punto) =>
            !(punto.tipo === 'contenedor' && punto.contenedor_id === contenedor.id),
        );
      }
      return [
        ...actuales,
        {
          id: `contenedor-${contenedor.id}`,
          tipo: 'contenedor',
          contenedor_id: contenedor.id,
          latitud: contenedor.latitud,
          longitud: contenedor.longitud,
          direccion: contenedor.direccion_completa || null,
        },
      ];
    });
  }

  async function resolverDireccion(latitud, longitud) {
    try {
      const respuesta = await conexionApi.get('/geografia/direccion', {
        params: { latitud, longitud },
      });
      return respuesta.data.direccion_completa;
    } catch {
      return null;
    }
  }

  async function agregarPuntoMapa(coordenada) {
    const direccion = await resolverDireccion(
      coordenada.latitude,
      coordenada.longitude,
    );
    cambiarPuntosRuta((actuales) => [
      ...actuales,
      {
        id: `paso-${Date.now()}`,
        tipo: 'paso',
        contenedor_id: null,
        latitud: coordenada.latitude,
        longitud: coordenada.longitude,
        direccion,
      },
    ]);
  }

  async function agregarDireccion() {
    if (direccionBusqueda.trim().length < 3) {
      cambiarError('Escribe al menos tres caracteres de la dirección.');
      return;
    }
    try {
      cambiarGuardando(true);
      const respuesta = await conexionApi.get('/geografia/buscar', {
        params: { texto: direccionBusqueda.trim(), limite: 1 },
      });
      if (!respuesta.data.length) {
        cambiarError('No se encontró esa dirección.');
        return;
      }
      const resultado = respuesta.data[0];
      cambiarPuntosRuta((actuales) => [
        ...actuales,
        {
          id: `direccion-${Date.now()}`,
          tipo: 'paso',
          contenedor_id: null,
          latitud: resultado.latitud,
          longitud: resultado.longitud,
          direccion: resultado.direccion_completa,
        },
      ]);
      cambiarDireccionBusqueda('');
      cambiarError('');
    } catch (excepcion) {
      cambiarError(
        obtenerMensajeErrorApi(excepcion, 'No fue posible buscar la dirección.'),
      );
    } finally {
      cambiarGuardando(false);
    }
  }

  function moverPunto(indice, desplazamiento) {
    cambiarPuntosRuta((actuales) => {
      const destino = indice + desplazamiento;
      if (destino < 0 || destino >= actuales.length) return actuales;
      const copia = [...actuales];
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return copia;
    });
  }

  function eliminarPunto(indice) {
    cambiarPuntosRuta((actuales) => actuales.filter((_, posicion) => posicion !== indice));
  }

  function cambiarTipoPunto(indice) {
    cambiarPuntosRuta((actuales) =>
      actuales.map((punto, posicion) => {
        if (posicion !== indice || punto.tipo === 'contenedor') return punto;
        const siguiente = punto.tipo === 'paso' ? 'inicio' : punto.tipo === 'inicio' ? 'fin' : 'paso';
        return { ...punto, tipo: siguiente };
      }),
    );
  }

  function editarRuta(ruta) {
    cambiarFormulario({
      nombre: ruta.nombre,
      zona: ruta.zona,
      dia_semana: ruta.dia_semana,
      hora_aproximada: ruta.hora_aproximada,
      descripcion: ruta.descripcion || '',
    });
    cambiarPuntosRuta(
      (ruta.puntos_ruta.length ? ruta.puntos_ruta : ruta.contenedores).map(
        (punto, indice) => ({
          id: punto.id || `contenedor-${punto.contenedor_id || punto.id}-${indice}`,
          tipo: punto.tipo || 'contenedor',
          contenedor_id: punto.contenedor_id || (punto.tipo ? null : punto.id),
          latitud: punto.latitud,
          longitud: punto.longitud,
          direccion: punto.direccion || null,
        }),
      ),
    );
    cambiarRecolectorId(ruta.recolector?.id || null);
    cambiarVehiculoId(ruta.vehiculo?.id || null);
    cambiarRutaEditandoId(ruta.id);
    cambiarError('');
    cambiarExito('');
    setTimeout(() => {
      referenciaScroll.current?.scrollTo({
        y: Math.max(0, posicionEditor.current - 18),
        animated: true,
      });
    }, 50);
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
    if (esAdmin && !recolectorId) {
      cambiarError('Selecciona el recolector responsable.');
      return;
    }
    const datos = {
      ...formulario,
      nombre: formulario.nombre.trim(),
      zona: formulario.zona.trim(),
      descripcion: formulario.descripcion.trim() || null,
      contenedor_ids: contenedorIds,
      recolector_id: esAdmin ? recolectorId : undefined,
      vehiculo_id: esAdmin ? vehiculoId : undefined,
      optimizar_orden: optimizar,
      puntos_ruta: puntosRuta.map((punto) => ({
        tipo: punto.tipo,
        contenedor_id: punto.tipo === 'contenedor' ? punto.contenedor_id : null,
        latitud: punto.latitud,
        longitud: punto.longitud,
        direccion: punto.direccion || null,
      })),
    };
    try {
      cambiarGuardando(true);
      cambiarError('');
      cambiarExito('');
      if (rutaEditandoId) {
        await conexionApi.patch(`/rutas/${rutaEditandoId}`, datos);
        cambiarExito('Ruta actualizada y recalculada sobre calles.');
      } else {
        await conexionApi.post('/rutas', datos);
        cambiarExito('Ruta creada y publicada en el calendario.');
      }
      limpiarFormulario();
      await cargarRutas();
    } catch (excepcion) {
      cambiarError(obtenerMensajeErrorApi(excepcion, 'No fue posible guardar la ruta.'));
    } finally {
      cambiarGuardando(false);
    }
  }

  async function alternarEstado(ruta) {
    try {
      cambiarActualizandoId(ruta.id);
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
    <PantallaBase centrada={false} referenciaScroll={referenciaScroll}>
      <View style={estilos.encabezado}>
        <View style={estilos.iconoEncabezado}>
          <Route color={colores.white} size={28} />
        </View>
        <View style={estilos.flexible}>
          <Text style={estilos.titulo}>Rutas por calles reales</Text>
          <Text style={estilos.subtitulo}>
            Ordena paradas, agrega puntos de paso y asigna la placa.
          </Text>
        </View>
      </View>

      {usuario?.rol === 'collector' ? (
        <PanelRecorrido rutas={rutas} alActualizarRutas={cargarRutas} />
      ) : null}

      <View
        onLayout={(evento) => {
          posicionEditor.current = evento.nativeEvent.layout.y;
        }}
        style={[estilos.tarjeta, rutaEditandoId && estilos.tarjetaEditando]}
      >
        <View style={estilos.filaTitulo}>
          <CalendarClock color={colores.primary} size={23} />
          <Text style={estilos.tituloSeccion}>
            {rutaEditandoId ? 'Editar ruta' : 'Crear ruta semanal'}
          </Text>
        </View>
        <CampoTexto
          etiqueta="Nombre de la ruta"
          value={formulario.nombre}
          placeholder="Ej. Ruta Centro"
          onChangeText={(valor) => cambiarFormulario((actual) => ({ ...actual, nombre: valor }))}
        />
        <CampoTexto
          etiqueta="Zona o colonia"
          value={formulario.zona}
          placeholder="Ej. Centro"
          onChangeText={(valor) => cambiarFormulario((actual) => ({ ...actual, zona: valor }))}
        />
        <View style={estilos.campo}>
          <Text style={estilos.etiqueta}>Día de recolección</Text>
          <View style={estilos.chips}>
            {dias.map((dia) => (
              <Pressable
                key={dia.id}
                onPress={() =>
                  cambiarFormulario((actual) => ({ ...actual, dia_semana: dia.id }))
                }
                style={[
                  estilos.chip,
                  formulario.dia_semana === dia.id && estilos.chipActivo,
                ]}
              >
                <Text
                  style={[
                    estilos.textoChip,
                    formulario.dia_semana === dia.id && estilos.textoChipActivo,
                  ]}
                >
                  {dia.etiqueta}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <SelectorHora
          etiqueta="Hora aproximada"
          valor={formulario.hora_aproximada}
          alCambiar={(valor) =>
            cambiarFormulario((actual) => ({ ...actual, hora_aproximada: valor }))
          }
        />
        <CampoTexto
          etiqueta="Indicaciones"
          value={formulario.descripcion}
          multiline
          onChangeText={(valor) =>
            cambiarFormulario((actual) => ({ ...actual, descripcion: valor }))
          }
        />

        {esAdmin ? (
          <>
            <Selector
              titulo="Recolector responsable"
              elementos={recolectores}
              seleccionado={recolectorId}
              alSeleccionar={cambiarRecolectorId}
              etiqueta={(item) => `${item.nombre} ${item.apellidos}`}
            />
            <Selector
              titulo="Vehículo (solo placa)"
              elementos={vehiculos.filter((vehiculo) => vehiculo.activo)}
              seleccionado={vehiculoId}
              alSeleccionar={cambiarVehiculoId}
              etiqueta={(item) => item.placa}
              icono={<Truck color={colores.primary} size={18} />}
              permiteVaciar
            />
          </>
        ) : null}

        <View style={estilos.campo}>
          <Text style={estilos.etiqueta}>Contenedores</Text>
          <Text style={estilos.ayuda}>
            Selecciónalos en el orden de visita; después puedes moverlos.
          </Text>
          {cargandoContenedores ? (
            <ActivityIndicator color={colores.primary} />
          ) : (
            <View style={estilos.listaCompacta}>
              {contenedores.map((contenedor) => {
                const seleccionado = contenedorIds.includes(contenedor.id);
                return (
                  <Pressable
                    key={contenedor.id}
                    onPress={() => alternarContenedor(contenedor)}
                    style={[
                      estilos.itemSeleccion,
                      seleccionado && estilos.itemSeleccionado,
                    ]}
                  >
                    <View style={[estilos.casilla, seleccionado && estilos.casillaActiva]}>
                      {seleccionado ? <Check color={colores.white} size={15} /> : null}
                    </View>
                    <View style={estilos.flexible}>
                      <Text style={estilos.itemTitulo}>
                        {contenedor.colonia
                          || contenedor.calle
                          || contenedor.direccion_completa
                          || 'Zona sin identificar'}
                      </Text>
                      <Text numberOfLines={1} style={estilos.itemDetalle}>
                        {contenedor.codigo_qr}
                        {contenedor.direccion_completa
                          ? ` · ${contenedor.direccion_completa}`
                          : ''}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <View style={estilos.campo}>
          <Text style={estilos.etiqueta}>Agregar punto por dirección</Text>
          <View style={estilos.busqueda}>
            <View style={estilos.flexible}>
              <CampoTexto
                value={direccionBusqueda}
                placeholder="Calle, colonia, Querétaro"
                onChangeText={cambiarDireccionBusqueda}
              />
            </View>
            <Pressable onPress={agregarDireccion} style={estilos.botonIcono}>
              <Search color={colores.white} size={20} />
            </Pressable>
          </View>
          <Text style={estilos.ayuda}>
            También puedes tocar el mapa para agregar un punto por donde debe pasar.
          </Text>
          <MapaRuta
            puntos={puntosRuta}
            alAgregarPunto={agregarPuntoMapa}
            alEliminarPunto={eliminarPunto}
            alto={340}
          />
        </View>

        {puntosRuta.length > 0 ? (
          <View style={estilos.campo}>
            <Text style={estilos.etiqueta}>Secuencia del recorrido</Text>
            {puntosRuta.map((punto, indice) => (
              <View key={punto.id || indice} style={estilos.puntoFila}>
                <View style={estilos.numero}><Text style={estilos.numeroTexto}>{indice + 1}</Text></View>
                <View style={estilos.flexible}>
                  <Text style={estilos.itemTitulo}>
                    {punto.tipo === 'contenedor'
                      ? `Contenedor ${punto.contenedor_id}`
                      : punto.tipo === 'inicio'
                        ? 'Punto inicial'
                        : punto.tipo === 'fin'
                          ? 'Punto final'
                          : 'Punto de paso'}
                  </Text>
                  <Text numberOfLines={1} style={estilos.itemDetalle}>
                    {punto.direccion || `${punto.latitud.toFixed(5)}, ${punto.longitud.toFixed(5)}`}
                  </Text>
                </View>
                {punto.tipo !== 'contenedor' ? (
                  <Pressable onPress={() => cambiarTipoPunto(indice)} style={estilos.tipoPunto}>
                    <Text style={estilos.tipoPuntoTexto}>{punto.tipo}</Text>
                  </Pressable>
                ) : null}
                <Pressable disabled={indice === 0} onPress={() => moverPunto(indice, -1)}>
                  <ArrowUp color={indice === 0 ? colores.border : colores.primary} size={20} />
                </Pressable>
                <Pressable
                  disabled={indice === puntosRuta.length - 1}
                  onPress={() => moverPunto(indice, 1)}
                >
                  <ArrowDown
                    color={indice === puntosRuta.length - 1 ? colores.border : colores.primary}
                    size={20}
                  />
                </Pressable>
                <Pressable onPress={() => eliminarPunto(indice)}>
                  <Trash2 color={colores.danger} size={19} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        <Pressable
          onPress={() => cambiarOptimizar((valor) => !valor)}
          style={[estilos.optimizar, optimizar && estilos.optimizarActivo]}
        >
          <View style={[estilos.casilla, optimizar && estilos.casillaActiva]}>
            {optimizar ? <Check color={colores.white} size={15} /> : null}
          </View>
          <View style={estilos.flexible}>
            <Text style={estilos.itemTitulo}>Optimizar orden automáticamente</Text>
            <Text style={estilos.itemDetalle}>
              Se conserva el orden manual si agregaste puntos de paso.
            </Text>
          </View>
        </Pressable>

        {error ? <Text style={estilos.error}>{error}</Text> : null}
        {exito ? <Text style={estilos.exito}>{exito}</Text> : null}
        <Boton
          texto={rutaEditandoId ? 'Guardar y recalcular' : 'Crear y calcular ruta'}
          cargando={guardando}
          alPresionar={guardarRuta}
        />
        {rutaEditandoId ? (
          <Boton texto="Cancelar edición" variante="fantasma" alPresionar={limpiarFormulario} />
        ) : null}
      </View>

      <View style={estilos.filaTitulo}>
        <MapPin color={colores.primary} size={22} />
        <Text style={estilos.tituloSeccion}>Rutas programadas</Text>
      </View>
      {cargandoRutas ? (
        <ActivityIndicator color={colores.primary} size="large" />
      ) : rutas.length === 0 ? (
        <View style={estilos.tarjeta}><Text style={estilos.ayuda}>Aún no hay rutas.</Text></View>
      ) : (
        rutas.map((ruta) => (
          <View key={ruta.id} style={[estilos.tarjeta, !ruta.activa && estilos.inactiva]}>
            <View style={estilos.filaTitulo}>
              <View style={estilos.flexible}>
                <Text style={estilos.rutaNombre}>{ruta.nombre}</Text>
                <Text style={estilos.itemDetalle}>
                  {nombresDia[ruta.dia_semana]} · {ruta.hora_aproximada} · {ruta.zona}
                </Text>
              </View>
              <Text style={estilos.estado}>
                {ruta.activa ? 'Activa' : esAdmin ? 'Eliminada' : 'Pausada'}
              </Text>
            </View>
            <Text style={estilos.rutaDato}>
              {textoDistancia(ruta.distancia_m)} · {ruta.duracion_minutos || 0} min ·{' '}
              {ruta.contenedores.length} paradas
            </Text>
            <Text style={estilos.rutaDato}>
              Recolector: {ruta.recolector ? `${ruta.recolector.nombre} ${ruta.recolector.apellidos}` : 'Sin asignar'}
              {' · '}Placa: {ruta.vehiculo?.placa || 'Sin vehículo'}
            </Text>
            {ruta.estado_calculo_ruta !== 'calculada' ? (
              <Text style={estilos.aviso}>
                Recorrido de respaldo: {ruta.detalle_calculo_ruta || 'recalcula cuando haya conexión'}
              </Text>
            ) : null}
            <MapaRuta
              puntos={ruta.puntos_ruta}
              geometria={ruta.geometria}
              alto={260}
            />
            <View style={estilos.acciones}>
              <Pressable onPress={() => editarRuta(ruta)} style={estilos.botonSecundario}>
                <Pencil color={colores.primary} size={17} />
                <Text style={estilos.botonSecundarioTexto}>Editar</Text>
              </Pressable>
              <Pressable
                disabled={actualizandoId === ruta.id}
                onPress={() => alternarEstado(ruta)}
                style={estilos.botonSecundario}
              >
                <Power color={colores.secondary} size={17} />
                <Text style={[estilos.botonSecundarioTexto, { color: colores.secondary }]}>
                  {esAdmin
                    ? ruta.activa
                      ? 'Eliminar del calendario'
                      : 'Restaurar'
                    : ruta.activa
                      ? 'Pausar'
                      : 'Activar'}
                </Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </PantallaBase>
  );
}

function Selector({
  titulo,
  elementos,
  seleccionado,
  alSeleccionar,
  etiqueta,
  icono = null,
  permiteVaciar = false,
}) {
  return (
    <View style={estilos.campo}>
      <View style={estilos.filaTitulo}>{icono}<Text style={estilos.etiqueta}>{titulo}</Text></View>
      <View style={estilos.chips}>
        {permiteVaciar ? (
          <Pressable
            onPress={() => alSeleccionar(null)}
            style={[estilos.chip, seleccionado == null && estilos.chipActivo]}
          >
            <Text style={[estilos.textoChip, seleccionado == null && estilos.textoChipActivo]}>
              Sin asignar
            </Text>
          </Pressable>
        ) : null}
        {elementos.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => alSeleccionar(item.id)}
            style={[estilos.chip, seleccionado === item.id && estilos.chipActivo]}
          >
            <Text style={[estilos.textoChip, seleccionado === item.id && estilos.textoChipActivo]}>
              {etiqueta(item)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  iconoEncabezado: { width: 54, height: 54, borderRadius: 18, backgroundColor: colores.primary, alignItems: 'center', justifyContent: 'center' },
  flexible: { flex: 1 },
  titulo: { color: colores.text, fontSize: 26, fontWeight: '900' },
  subtitulo: { color: colores.muted, fontSize: 13, lineHeight: 19 },
  tarjeta: { gap: 14, padding: 18, marginBottom: 18, borderWidth: 1, borderColor: colores.border, borderRadius: 20, backgroundColor: colores.white },
  tarjetaEditando: { borderWidth: 2, borderColor: colores.primary },
  filaTitulo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tituloSeccion: { color: colores.text, fontSize: 18, fontWeight: '900' },
  campo: { gap: 8 },
  etiqueta: { color: colores.text, fontSize: 14, fontWeight: '800' },
  ayuda: { color: colores.muted, fontSize: 12, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: colores.border, borderRadius: 12, backgroundColor: colores.surface },
  chipActivo: { borderColor: colores.primary, backgroundColor: colores.primary },
  textoChip: { color: colores.text, fontSize: 12, fontWeight: '800' },
  textoChipActivo: { color: colores.white },
  listaCompacta: { gap: 8 },
  itemSeleccion: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderWidth: 1, borderColor: colores.border, borderRadius: 14 },
  itemSeleccionado: { borderColor: colores.primary, backgroundColor: '#F1F8F2' },
  casilla: { width: 23, height: 23, borderWidth: 1, borderColor: colores.border, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  casillaActiva: { borderColor: colores.primary, backgroundColor: colores.primary },
  itemTitulo: { color: colores.text, fontSize: 13, fontWeight: '800' },
  itemDetalle: { color: colores.muted, fontSize: 11, lineHeight: 16 },
  busqueda: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  botonIcono: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.primary },
  puntoFila: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colores.border },
  numero: { width: 27, height: 27, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.primary },
  numeroTexto: { color: colores.white, fontSize: 12, fontWeight: '900' },
  tipoPunto: { paddingHorizontal: 7, paddingVertical: 5, borderRadius: 8, backgroundColor: '#FFF3E0' },
  tipoPuntoTexto: { color: '#E65100', fontSize: 10, fontWeight: '900' },
  optimizar: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderWidth: 1, borderColor: colores.border, borderRadius: 14 },
  optimizarActivo: { borderColor: colores.primary, backgroundColor: '#F1F8F2' },
  error: { padding: 12, borderRadius: 10, color: colores.danger, backgroundColor: '#FFF0F0', fontWeight: '700' },
  exito: { padding: 12, borderRadius: 10, color: colores.primary, backgroundColor: '#E8F5E9', fontWeight: '700' },
  rutaNombre: { color: colores.text, fontSize: 18, fontWeight: '900' },
  rutaDato: { color: colores.text, fontSize: 13, lineHeight: 19 },
  estado: { color: colores.primary, fontSize: 12, fontWeight: '900' },
  aviso: { padding: 10, borderRadius: 10, color: '#8A5800', backgroundColor: '#FFF8E1', fontSize: 12 },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  botonSecundario: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: colores.border, borderRadius: 11 },
  botonSecundarioTexto: { color: colores.primary, fontSize: 12, fontWeight: '900' },
  inactiva: { opacity: 0.65 },
});
