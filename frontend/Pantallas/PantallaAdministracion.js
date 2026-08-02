import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ClipboardCheck, KeyRound, ShieldCheck, Truck, UserPlus, UsersRound } from 'lucide-react-native';

import { Boton } from '../componentes/Boton';
import { CampoTexto } from '../componentes/CampoTexto';
import { conexionApi, obtenerMensajeErrorApi } from '../componentes/conexionApi';
import { usarSesion } from '../componentes/ContextoSesion';
import { PantallaBase } from '../componentes/PantallaBase';
import { colores, espaciado } from '../componentes/tema';

const roles = [
  { id: 'citizen', etiqueta: 'Ciudadano' },
  { id: 'collector', etiqueta: 'Recolector' },
  { id: 'admin', etiqueta: 'Admin' },
];

const etiquetasIncidencia = {
  contenedor_bloqueado: 'Contenedor bloqueado',
  contenedor_danado: 'Contenedor dañado',
  calle_cerrada: 'Calle cerrada',
  exceso_basura: 'Exceso de basura',
  sin_acceso: 'Sin acceso',
  vehiculo: 'Problema del vehículo',
  otro: 'Otro',
};

const formularioInicial = {
  nombre: '',
  apellidos: '',
  correo: '',
  contrasena_temporal: '',
  rol: 'collector',
};

const formularioContenedorInicial = {
  codigo_qr: '',
  latitud: '',
  longitud: '',
  precision_m: '',
  direccion_completa: '',
  calle: '',
  numero: '',
  colonia: '',
  codigo_postal: '',
  municipio: '',
};

export function PantallaAdministracion() {
  const { usuario } = usarSesion();
  const [usuarios, cambiarUsuarios] = useState([]);
  const [incidencias, cambiarIncidencias] = useState([]);
  const [vehiculos, cambiarVehiculos] = useState([]);
  const [contenedoresAdmin, cambiarContenedoresAdmin] = useState([]);
  const [contenedorSeleccionado, cambiarContenedorSeleccionado] = useState(null);
  const [registrosContenedor, cambiarRegistrosContenedor] = useState([]);
  const [contenedorFormulario, cambiarContenedorFormulario] = useState(formularioContenedorInicial);
  const [nuevoContenedorFormulario, cambiarNuevoContenedorFormulario] = useState(formularioContenedorInicial);
  const [recolectores, cambiarRecolectores] = useState([]);
  const [busquedaContenedor, cambiarBusquedaContenedor] = useState('');
  const [placa, cambiarPlaca] = useState('');
  const [formulario, cambiarFormulario] = useState(formularioInicial);
  const [usuarioClave, cambiarUsuarioClave] = useState(null);
  const [busquedaUsuario, cambiarBusquedaUsuario] = useState('');
  const [filtroRolUsuario, cambiarFiltroRolUsuario] = useState('todos');
  const [filtroEstadoUsuario, cambiarFiltroEstadoUsuario] = useState('todos');
  const [claveTemporal, cambiarClaveTemporal] = useState('');
  const [reportes, cambiarReportes] = useState([]);
  const [cargandoReportes, cambiarCargandoReportes] = useState(true);
  const [errorReportes, cambiarErrorReportes] = useState('');
  const [actualizandoReporteId, cambiarActualizandoReporteId] = useState(null);
  const [filtroEstadoReporte, cambiarFiltroEstadoReporte] = useState('todos');
  const [busquedaReporte, cambiarBusquedaReporte] = useState('');
  const [busquedaRecolector, cambiarBusquedaRecolector] = useState('');
  const [registroEdicionId, cambiarRegistroEdicionId] = useState(null);
  const [registroEdicion, cambiarRegistroEdicion] = useState({
    latitud: '',
    longitud: '',
    precision_m: '',
  });
  const [nuevoRegistro, cambiarNuevoRegistro] = useState({
    latitud: '',
    longitud: '',
    precision_m: '',
  });
  const [registroProcesando, cambiarRegistroProcesando] = useState(false);
  const [cargando, cambiarCargando] = useState(true);
  const [procesando, cambiarProcesando] = useState(false);
  const [contenedorProcesando, cambiarContenedorProcesando] = useState(false);
  const [error, cambiarError] = useState('');
  const [exito, cambiarExito] = useState('');

  const cargar = useCallback(async () => {
    try {
      cambiarCargando(true);
      cambiarError('');
      cambiarErrorReportes('');
      cambiarCargandoReportes(true);
      const [respuestaUsuarios, respuestaIncidencias, respuestaVehiculos, respuestaContenedores, respuestaRecolectores, respuestaReportes] = await Promise.all([
        conexionApi.get('/administracion/usuarios'),
        conexionApi.get('/operacion/incidencias'),
        conexionApi.get('/administracion/vehiculos'),
        conexionApi.get('/contenedores'),
        conexionApi.get('/administracion/recolectores'),
        conexionApi.get('/reportes'),
      ]);
      cambiarUsuarios(respuestaUsuarios.data);
      cambiarIncidencias(respuestaIncidencias.data);
      cambiarVehiculos(respuestaVehiculos.data);
      cambiarContenedoresAdmin(respuestaContenedores.data);
      cambiarRecolectores(respuestaRecolectores.data);
      cambiarReportes(respuestaReportes.data);
    } catch (excepcion) {
      cambiarError(
        obtenerMensajeErrorApi(
          excepcion,
          'No fue posible cargar la administración.',
        ),
      );
    } finally {
      cambiarCargando(false);
      cambiarCargandoReportes(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function cambiarCampo(campo, valor) {
    cambiarFormulario((actual) => ({ ...actual, [campo]: valor }));
  }

  async function crearUsuario() {
    if (
      !formulario.nombre.trim()
      || !formulario.apellidos.trim()
      || !formulario.correo.trim()
      || formulario.contrasena_temporal.length < 8
    ) {
      cambiarError('Completa los datos y usa una contraseña temporal de 8 caracteres.');
      return;
    }
    try {
      cambiarProcesando(true);
      cambiarError('');
      cambiarExito('');
      await conexionApi.post('/administracion/usuarios', formulario);
      cambiarFormulario(formularioInicial);
      cambiarExito('Cuenta creada. El usuario deberá cambiar su contraseña temporal.');
      await cargar();
    } catch (excepcion) {
      cambiarError(
        obtenerMensajeErrorApi(excepcion, 'No se pudo crear la cuenta.'),
      );
    } finally {
      cambiarProcesando(false);
    }
  }

  async function actualizarUsuario(usuarioObjetivo, cambios) {
    try {
      cambiarProcesando(true);
      cambiarError('');
      await conexionApi.patch(
        `/administracion/usuarios/${usuarioObjetivo.id}`,
        cambios,
      );
      await cargar();
    } catch (excepcion) {
      Alert.alert(
        'No se pudo actualizar',
        obtenerMensajeErrorApi(excepcion, 'Revisa las rutas asignadas.'),
      );
    } finally {
      cambiarProcesando(false);
    }
  }

  async function restablecerClave() {
    if (!usuarioClave || claveTemporal.length < 8) {
      cambiarError('La contraseña temporal debe tener al menos 8 caracteres.');
      return;
    }
    try {
      cambiarProcesando(true);
      cambiarError('');
      await conexionApi.post(
        `/administracion/usuarios/${usuarioClave.id}/restablecer-contrasena`,
        { contrasena_temporal: claveTemporal },
      );
      cambiarExito(`Contraseña temporal creada para ${usuarioClave.nombre}.`);
      cambiarUsuarioClave(null);
      cambiarClaveTemporal('');
      await cargar();
    } catch (excepcion) {
      cambiarError(
        obtenerMensajeErrorApi(excepcion, 'No se pudo restablecer la contraseña.'),
      );
    } finally {
      cambiarProcesando(false);
    }
  }

  async function cargarRegistrosContenedor(contenedorId) {
    try {
      cambiarContenedorProcesando(true);
      cambiarError('');
      const respuesta = await conexionApi.get(`/contenedores/${contenedorId}/registros`);
      cambiarRegistrosContenedor(respuesta.data);
    } catch (excepcion) {
      cambiarError(
        obtenerMensajeErrorApi(excepcion, 'No se pudo cargar el historial del contenedor.'),
      );
    } finally {
      cambiarContenedorProcesando(false);
    }
  }

  function comenzarEdicionRegistro(registro) {
    cambiarRegistroEdicionId(registro.id);
    cambiarRegistroEdicion({
      latitud: String(registro.latitud),
      longitud: String(registro.longitud),
      precision_m: registro.precision_m ? String(registro.precision_m) : '',
    });
  }

  function cancelarEdicionRegistro() {
    cambiarRegistroEdicionId(null);
    cambiarRegistroEdicion({ latitud: '', longitud: '', precision_m: '' });
  }

  async function guardarRegistroHistorial(registroId) {
    if (!registroEdicion.latitud || !registroEdicion.longitud) {
      cambiarError('Latitud y longitud son obligatorias para el historial.');
      return;
    }
    if (!contenedorSeleccionado) {
      cambiarError('Selecciona un contenedor antes de guardar.');
      return;
    }
    try {
      cambiarRegistroProcesando(true);
      cambiarError('');
      await conexionApi.patch(
        `/contenedores/${contenedorSeleccionado.id}/registros/${registroId}`,
        {
          latitud: Number(registroEdicion.latitud),
          longitud: Number(registroEdicion.longitud),
          precision_m: registroEdicion.precision_m
            ? Number(registroEdicion.precision_m)
            : undefined,
        },
      );
      cambiarExito('Registro de historial actualizado.');
      cancelarEdicionRegistro();
      await cargarRegistrosContenedor(contenedorSeleccionado.id);
    } catch (excepcion) {
      cambiarError(
        obtenerMensajeErrorApi(excepcion, 'No se pudo actualizar el registro del historial.'),
      );
    } finally {
      cambiarRegistroProcesando(false);
    }
  }

  async function eliminarRegistroHistorial(registroId) {
    if (!contenedorSeleccionado) {
      cambiarError('Selecciona un contenedor antes de eliminar un registro.');
      return;
    }
    try {
      cambiarRegistroProcesando(true);
      cambiarError('');
      await conexionApi.delete(
        `/contenedores/${contenedorSeleccionado.id}/registros/${registroId}`,
      );
      cambiarExito('Registro de historial eliminado.');
      if (registroEdicionId === registroId) {
        cancelarEdicionRegistro();
      }
      await cargarRegistrosContenedor(contenedorSeleccionado.id);
    } catch (excepcion) {
      cambiarError(
        obtenerMensajeErrorApi(excepcion, 'No se pudo eliminar el registro del historial.'),
      );
    } finally {
      cambiarRegistroProcesando(false);
    }
  }

  function confirmarEliminacionRegistro(registroId) {
    Alert.alert(
      'Eliminar registro',
      'Esta ubicación desaparecerá del historial del contenedor.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => eliminarRegistroHistorial(registroId),
        },
      ],
    );
  }

  async function crearRegistroHistorial() {
    if (!contenedorSeleccionado) {
      cambiarError('Selecciona un contenedor para agregar un registro.');
      return;
    }
    if (!nuevoRegistro.latitud || !nuevoRegistro.longitud) {
      cambiarError('Latitud y longitud son obligatorias para el nuevo registro.');
      return;
    }
    try {
      cambiarRegistroProcesando(true);
      cambiarError('');
      await conexionApi.post(
        `/contenedores/${contenedorSeleccionado.id}/registros`,
        {
          latitud: Number(nuevoRegistro.latitud),
          longitud: Number(nuevoRegistro.longitud),
          precision_m: nuevoRegistro.precision_m
            ? Number(nuevoRegistro.precision_m)
            : undefined,
        },
      );
      cambiarExito('Registro de historial creado.');
      cambiarNuevoRegistro({ latitud: '', longitud: '', precision_m: '' });
      await cargarRegistrosContenedor(contenedorSeleccionado.id);
    } catch (excepcion) {
      cambiarError(
        obtenerMensajeErrorApi(excepcion, 'No se pudo crear el registro del historial.'),
      );
    } finally {
      cambiarRegistroProcesando(false);
    }
  }

  async function seleccionarContenedor(contenedor) {
    cancelarEdicionRegistro();
    cambiarContenedorSeleccionado(contenedor);
    cambiarContenedorFormulario({
      codigo_qr: contenedor.codigo_qr,
      latitud: String(contenedor.latitud),
      longitud: String(contenedor.longitud),
      precision_m: contenedor.precision_m ? String(contenedor.precision_m) : '',
      direccion_completa: contenedor.direccion_completa || '',
      calle: contenedor.calle || '',
      numero: contenedor.numero || '',
      colonia: contenedor.colonia || '',
      codigo_postal: contenedor.codigo_postal || '',
      municipio: contenedor.municipio || '',
    });
    cambiarNuevoRegistro({ latitud: '', longitud: '', precision_m: '' });
    await cargarRegistrosContenedor(contenedor.id);
  }

  async function actualizarContenedor() {
    if (!contenedorSeleccionado) {
      cambiarError('Selecciona un contenedor primero.');
      return;
    }
    try {
      cambiarContenedorProcesando(true);
      cambiarError('');
      const cambios = {
        latitud: Number(contenedorFormulario.latitud),
        longitud: Number(contenedorFormulario.longitud),
        precision_m: contenedorFormulario.precision_m
          ? Number(contenedorFormulario.precision_m)
          : undefined,
        direccion_completa: contenedorFormulario.direccion_completa.trim() || null,
        calle: contenedorFormulario.calle.trim() || null,
        numero: contenedorFormulario.numero.trim() || null,
        colonia: contenedorFormulario.colonia.trim() || null,
        codigo_postal: contenedorFormulario.codigo_postal.trim() || null,
        municipio: contenedorFormulario.municipio.trim() || null,
      };
      const respuesta = await conexionApi.patch(
        `/contenedores/${contenedorSeleccionado.id}`,
        cambios,
      );
      cambiarExito('Contenedor actualizado.');
      await cargar();
      seleccionarContenedor(respuesta.data);
    } catch (excepcion) {
      cambiarError(
        obtenerMensajeErrorApi(excepcion, 'No se pudo actualizar el contenedor.'),
      );
    } finally {
      cambiarContenedorProcesando(false);
    }
  }

  async function eliminarContenedor(id) {
    try {
      cambiarContenedorProcesando(true);
      cambiarError('');
      await conexionApi.delete(`/contenedores/${id}`);
      cambiarExito('Contenedor eliminado.');
      cambiarContenedorSeleccionado(null);
      cambiarRegistrosContenedor([]);
      cancelarEdicionRegistro();
      await cargar();
    } catch (excepcion) {
      cambiarError(
        obtenerMensajeErrorApi(excepcion, 'No se pudo eliminar el contenedor.'),
      );
    } finally {
      cambiarContenedorProcesando(false);
    }
  }

  function confirmarEliminacionContenedor(id) {
    Alert.alert(
      'Eliminar contenedor',
      'Esta acción no se puede deshacer. Solo se permitirá si el contenedor no está relacionado con reportes o rutas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => eliminarContenedor(id),
        },
      ],
    );
  }

  async function crearContenedor() {
    if (!nuevoContenedorFormulario.codigo_qr.trim()) {
      cambiarError('Ingresa el código QR del contenedor.');
      return;
    }
    if (!nuevoContenedorFormulario.latitud || !nuevoContenedorFormulario.longitud) {
      cambiarError('Completa latitud y longitud para el contenedor.');
      return;
    }

    try {
      cambiarContenedorProcesando(true);
      cambiarError('');
      const datos = {
        codigo_qr: nuevoContenedorFormulario.codigo_qr.trim(),
        latitud: Number(nuevoContenedorFormulario.latitud),
        longitud: Number(nuevoContenedorFormulario.longitud),
        precision_m: nuevoContenedorFormulario.precision_m
          ? Number(nuevoContenedorFormulario.precision_m)
          : undefined,
        direccion_completa: nuevoContenedorFormulario.direccion_completa || undefined,
        calle: nuevoContenedorFormulario.calle || undefined,
        numero: nuevoContenedorFormulario.numero || undefined,
        colonia: nuevoContenedorFormulario.colonia || undefined,
        codigo_postal: nuevoContenedorFormulario.codigo_postal || undefined,
        municipio: nuevoContenedorFormulario.municipio || undefined,
      };
      await conexionApi.post('/contenedores/registrar-qr', datos);
      cambiarExito('Contenedor registrado.');
      cambiarNuevoContenedorFormulario(formularioContenedorInicial);
      await cargar();
    } catch (excepcion) {
      cambiarError(
        obtenerMensajeErrorApi(excepcion, 'No se pudo crear el contenedor.'),
      );
    } finally {
      cambiarContenedorProcesando(false);
    }
  }

  async function crearVehiculo() {
    if (placa.trim().length < 3) {
      cambiarError('Escribe una placa válida.');
      return;
    }
    try {
      cambiarProcesando(true);
      cambiarError('');
      await conexionApi.post('/administracion/vehiculos', { placa: placa.trim() });
      cambiarPlaca('');
      cambiarExito('Vehículo registrado por placa.');
      await cargar();
    } catch (excepcion) {
      cambiarError(obtenerMensajeErrorApi(excepcion, 'No se pudo registrar la placa.'));
    } finally {
      cambiarProcesando(false);
    }
  }

  async function alternarVehiculo(vehiculo) {
    try {
      cambiarProcesando(true);
      await conexionApi.patch(`/administracion/vehiculos/${vehiculo.id}`, {
        activo: !vehiculo.activo,
      });
      await cargar();
    } catch (excepcion) {
      cambiarError(obtenerMensajeErrorApi(excepcion, 'No se pudo actualizar la placa.'));
    } finally {
      cambiarProcesando(false);
    }
  }

  async function actualizarEstadoReporte(reporteId, estado) {
    try {
      cambiarActualizandoReporteId(reporteId);
      cambiarErrorReportes('');
      await conexionApi.patch(`/reportes/${reporteId}/estado`, { estado });
      await cargar();
    } catch (excepcion) {
      cambiarErrorReportes(
        obtenerMensajeErrorApi(excepcion, 'No se pudo actualizar el estado del reporte.'),
      );
    } finally {
      cambiarActualizandoReporteId(null);
    }
  }

  return (
    <PantallaBase centrada={false}>
      <View style={estilos.encabezado}>
        <View style={estilos.icono}>
          <ShieldCheck color={colores.white} size={28} />
        </View>
        <View style={estilos.flexible}>
          <Text style={estilos.titulo}>Administración</Text>
          <Text style={estilos.subtitulo}>
            Controla quién puede trabajar como recolector o administrador.
          </Text>
        </View>
      </View>

      <View style={estilos.tarjeta}>
        <View style={estilos.tituloFila}>
          <UserPlus color={colores.primary} size={22} />
          <Text style={estilos.tituloSeccion}>Crear cuenta de personal</Text>
        </View>
        <CampoTexto
          etiqueta="Nombre"
          value={formulario.nombre}
          onChangeText={(valor) => cambiarCampo('nombre', valor)}
        />
        <CampoTexto
          etiqueta="Apellidos"
          value={formulario.apellidos}
          onChangeText={(valor) => cambiarCampo('apellidos', valor)}
        />
        <CampoTexto
          etiqueta="Correo"
          autoCapitalize="none"
          keyboardType="email-address"
          value={formulario.correo}
          onChangeText={(valor) => cambiarCampo('correo', valor)}
        />
        <CampoTexto
          etiqueta="Contraseña temporal"
          secureTextEntry
          value={formulario.contrasena_temporal}
          onChangeText={(valor) => cambiarCampo('contrasena_temporal', valor)}
        />
        <Text style={estilos.etiqueta}>Perfil autorizado</Text>
        <View style={estilos.chips}>
          {roles.map((rol) => (
            <Pressable
              accessibilityRole="button"
              key={rol.id}
              onPress={() => cambiarCampo('rol', rol.id)}
              style={[
                estilos.chip,
                formulario.rol === rol.id && estilos.chipActivo,
              ]}
            >
              <Text
                style={[
                  estilos.textoChip,
                  formulario.rol === rol.id && estilos.textoChipActivo,
                ]}
              >
                {rol.etiqueta}
              </Text>
            </Pressable>
          ))}
        </View>
        {error ? <Text style={estilos.error}>{error}</Text> : null}
        {exito ? <Text style={estilos.exito}>{exito}</Text> : null}
        <Boton
          texto="Crear cuenta autorizada"
          cargando={procesando}
          alPresionar={crearUsuario}
        />
      </View>

      <View style={estilos.tarjeta}>
        <View style={estilos.tituloFila}>
          <Truck color={colores.primary} size={22} />
          <Text style={estilos.tituloSeccion}>Vehículos por placa</Text>
        </View>
        <Text style={estilos.correo}>
          Para identificar el camión solo se guarda la placa y si está activo.
        </Text>
        <CampoTexto
          etiqueta="Placa"
          autoCapitalize="characters"
          placeholder="Ej. ABC-123-D"
          value={placa}
          onChangeText={cambiarPlaca}
        />
        <Boton
          texto="Registrar placa"
          cargando={procesando}
          alPresionar={crearVehiculo}
        />
        <View style={estilos.chips}>
          {vehiculos.map((vehiculo) => (
            <Pressable
              key={vehiculo.id}
              onPress={() => alternarVehiculo(vehiculo)}
              style={[
                estilos.chip,
                vehiculo.activo ? estilos.chipActivo : estilos.inactivo,
              ]}
            >
              <Text
                style={[
                  estilos.textoChip,
                  vehiculo.activo && estilos.textoChipActivo,
                ]}
              >
                {vehiculo.placa} · {vehiculo.activo ? 'activo' : 'inactivo'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={estilos.tarjeta}>
        <View style={estilos.tituloFila}>
          <ShieldCheck color={colores.primary} size={22} />
          <Text style={estilos.tituloSeccion}>Contenedores</Text>
        </View>
        <CampoTexto
          etiqueta="Buscar contenedor"
          placeholder="Código QR, calle o municipio"
          value={busquedaContenedor}
          onChangeText={cambiarBusquedaContenedor}
        />
        <View style={estilos.chips}>
          {contenedoresAdmin
            .filter((contenedor) =>
              `${contenedor.codigo_qr} ${contenedor.direccion_completa || ''} ${contenedor.calle || ''} ${contenedor.municipio || ''}`
                .toLowerCase()
                .includes(busquedaContenedor.toLowerCase()),
            )
            .slice(0, 20)
            .map((contenedor) => (
              <Pressable
                key={contenedor.id}
                onPress={() => seleccionarContenedor(contenedor)}
                style={[
                  estilos.chip,
                  contenedorSeleccionado?.id === contenedor.id && estilos.chipActivo,
                ]}
              >
                <Text
                  style={[
                    estilos.textoChip,
                    contenedorSeleccionado?.id === contenedor.id && estilos.textoChipActivo,
                  ]}
                >
                  {contenedor.codigo_qr}
                </Text>
              </Pressable>
            ))}
        </View>

        <View style={estilos.tarjetaContenedor}>
          <Text style={estilos.subtitulo}>Registrar nuevo contenedor</Text>
          <CampoTexto
            etiqueta="Código QR"
            value={nuevoContenedorFormulario.codigo_qr}
            onChangeText={(valor) => cambiarNuevoContenedorFormulario((actual) => ({ ...actual, codigo_qr: valor }))}
          />
          <CampoTexto
            etiqueta="Latitud"
            keyboardType="numeric"
            value={nuevoContenedorFormulario.latitud}
            onChangeText={(valor) => cambiarNuevoContenedorFormulario((actual) => ({ ...actual, latitud: valor }))}
          />
          <CampoTexto
            etiqueta="Longitud"
            keyboardType="numeric"
            value={nuevoContenedorFormulario.longitud}
            onChangeText={(valor) => cambiarNuevoContenedorFormulario((actual) => ({ ...actual, longitud: valor }))}
          />
          <CampoTexto
            etiqueta="Precisión (m)"
            keyboardType="numeric"
            value={nuevoContenedorFormulario.precision_m}
            onChangeText={(valor) => cambiarNuevoContenedorFormulario((actual) => ({ ...actual, precision_m: valor }))}
          />
          <CampoTexto
            etiqueta="Dirección completa"
            value={nuevoContenedorFormulario.direccion_completa}
            onChangeText={(valor) => cambiarNuevoContenedorFormulario((actual) => ({ ...actual, direccion_completa: valor }))}
          />
          <CampoTexto
            etiqueta="Calle"
            value={nuevoContenedorFormulario.calle}
            onChangeText={(valor) => cambiarNuevoContenedorFormulario((actual) => ({ ...actual, calle: valor }))}
          />
          <CampoTexto
            etiqueta="Número"
            value={nuevoContenedorFormulario.numero}
            onChangeText={(valor) => cambiarNuevoContenedorFormulario((actual) => ({ ...actual, numero: valor }))}
          />
          <CampoTexto
            etiqueta="Colonia"
            value={nuevoContenedorFormulario.colonia}
            onChangeText={(valor) => cambiarNuevoContenedorFormulario((actual) => ({ ...actual, colonia: valor }))}
          />
          <CampoTexto
            etiqueta="Código postal"
            value={nuevoContenedorFormulario.codigo_postal}
            onChangeText={(valor) => cambiarNuevoContenedorFormulario((actual) => ({ ...actual, codigo_postal: valor }))}
          />
          <CampoTexto
            etiqueta="Municipio"
            value={nuevoContenedorFormulario.municipio}
            onChangeText={(valor) => cambiarNuevoContenedorFormulario((actual) => ({ ...actual, municipio: valor }))}
          />
          <View style={estilos.acciones}>
            <Boton
              texto="Registrar contenedor"
              cargando={contenedorProcesando}
              alPresionar={crearContenedor}
            />
          </View>
        </View>

        {contenedorSeleccionado ? (
          <View style={estilos.tarjetaContenedor}>
            <Text style={estilos.subtitulo}>Editar contenedor seleccionado</Text>
            <CampoTexto
              etiqueta="Código QR"
              value={contenedorFormulario.codigo_qr}
              editable={false}
            />
            <CampoTexto
              etiqueta="Latitud"
              keyboardType="numeric"
              value={contenedorFormulario.latitud}
              onChangeText={(valor) => cambiarContenedorFormulario((actual) => ({ ...actual, latitud: valor }))}
            />
            <CampoTexto
              etiqueta="Longitud"
              keyboardType="numeric"
              value={contenedorFormulario.longitud}
              onChangeText={(valor) => cambiarContenedorFormulario((actual) => ({ ...actual, longitud: valor }))}
            />
            <CampoTexto
              etiqueta="Precisión (m)"
              keyboardType="numeric"
              value={contenedorFormulario.precision_m}
              onChangeText={(valor) => cambiarContenedorFormulario((actual) => ({ ...actual, precision_m: valor }))}
            />
            <CampoTexto
              etiqueta="Dirección completa"
              value={contenedorFormulario.direccion_completa}
              onChangeText={(valor) => cambiarContenedorFormulario((actual) => ({ ...actual, direccion_completa: valor }))}
            />
            <CampoTexto
              etiqueta="Calle"
              value={contenedorFormulario.calle}
              onChangeText={(valor) => cambiarContenedorFormulario((actual) => ({ ...actual, calle: valor }))}
            />
            <CampoTexto
              etiqueta="Número"
              value={contenedorFormulario.numero}
              onChangeText={(valor) => cambiarContenedorFormulario((actual) => ({ ...actual, numero: valor }))}
            />
            <CampoTexto
              etiqueta="Colonia"
              value={contenedorFormulario.colonia}
              onChangeText={(valor) => cambiarContenedorFormulario((actual) => ({ ...actual, colonia: valor }))}
            />
            <CampoTexto
              etiqueta="Código postal"
              value={contenedorFormulario.codigo_postal}
              onChangeText={(valor) => cambiarContenedorFormulario((actual) => ({ ...actual, codigo_postal: valor }))}
            />
            <CampoTexto
              etiqueta="Municipio"
              value={contenedorFormulario.municipio}
              onChangeText={(valor) => cambiarContenedorFormulario((actual) => ({ ...actual, municipio: valor }))}
            />
            <View style={estilos.acciones}>
              <Boton
                texto="Guardar cambios"
                cargando={contenedorProcesando}
                alPresionar={actualizarContenedor}
              />
              <Boton
                texto="Eliminar contenedor"
                variante="fantasma"
                alPresionar={() => confirmarEliminacionContenedor(contenedorSeleccionado.id)}
              />
            </View>
            <Text style={estilos.subtitulo}>Historial de ubicaciones</Text>
            <View style={estilos.tarjetaContenedor}>
              <Text style={estilos.etiqueta}>Agregar nuevo registro</Text>
              <CampoTexto
                etiqueta="Latitud"
                keyboardType="numeric"
                value={nuevoRegistro.latitud}
                onChangeText={(valor) => cambiarNuevoRegistro((actual) => ({ ...actual, latitud: valor }))}
              />
              <CampoTexto
                etiqueta="Longitud"
                keyboardType="numeric"
                value={nuevoRegistro.longitud}
                onChangeText={(valor) => cambiarNuevoRegistro((actual) => ({ ...actual, longitud: valor }))}
              />
              <CampoTexto
                etiqueta="Precisión (m)"
                keyboardType="numeric"
                value={nuevoRegistro.precision_m}
                onChangeText={(valor) => cambiarNuevoRegistro((actual) => ({ ...actual, precision_m: valor }))}
              />
              <View style={estilos.acciones}>
                <Boton
                  texto="Agregar registro"
                  cargando={registroProcesando}
                  alPresionar={crearRegistroHistorial}
                />
              </View>
            </View>
            {contenedorProcesando ? (
              <ActivityIndicator color={colores.primary} size="large" />
            ) : registrosContenedor.length === 0 ? (
              <Text style={estilos.vacio}>No hay registros para este contenedor.</Text>
            ) : (
              <View style={estilos.lista}>
                {registrosContenedor.map((registro) => (
              <View key={registro.id} style={estilos.registroContenedor}>
                {registroEdicionId === registro.id ? (
                  <>
                    <CampoTexto
                      etiqueta="Latitud"
                      keyboardType="numeric"
                      value={registroEdicion.latitud}
                      onChangeText={(valor) => cambiarRegistroEdicion((actual) => ({ ...actual, latitud: valor }))}
                    />
                    <CampoTexto
                      etiqueta="Longitud"
                      keyboardType="numeric"
                      value={registroEdicion.longitud}
                      onChangeText={(valor) => cambiarRegistroEdicion((actual) => ({ ...actual, longitud: valor }))}
                    />
                    <CampoTexto
                      etiqueta="Precisión (m)"
                      keyboardType="numeric"
                      value={registroEdicion.precision_m}
                      onChangeText={(valor) => cambiarRegistroEdicion((actual) => ({ ...actual, precision_m: valor }))}
                    />
                    <View style={estilos.acciones}>
                      <Boton
                        texto="Guardar registro"
                        cargando={registroProcesando}
                        alPresionar={() => guardarRegistroHistorial(registro.id)}
                      />
                      <Boton
                        texto="Cancelar"
                        variante="fantasma"
                        alPresionar={cancelarEdicionRegistro}
                      />
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={estilos.nombre}>
                      {registro.latitud.toFixed(5)}, {registro.longitud.toFixed(5)}
                    </Text>
                    <Text style={estilos.correo}>
                      Precisión: {registro.precision_m ?? 'N/A'} m
                    </Text>
                    <Text style={estilos.meta}>{new Date(registro.registrado_en).toLocaleString()}</Text>
                    <View style={estilos.acciones}>
                      <Pressable
                        accessibilityRole="button"
                        disabled={registroProcesando}
                        onPress={() => comenzarEdicionRegistro(registro)}
                        style={estilos.botonAccion}
                      >
                        <Text style={estilos.textoAccion}>Editar</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        disabled={registroProcesando}
                        onPress={() => confirmarEliminacionRegistro(registro.id)}
                        style={estilos.botonAccion}
                      >
                        <Text style={estilos.textoAccion}>Eliminar</Text>
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
            ))}
              </View>
            )}
          </View>
        ) : (
          <Text style={estilos.vacio}>Selecciona un contenedor para ver y editar sus detalles.</Text>
        )}
      </View>

      <View style={estilos.tituloFila}>
        <UsersRound color={colores.primary} size={22} />
        <Text style={estilos.tituloSeccion}>Usuarios registrados</Text>
      </View>
      <CampoTexto
        etiqueta="Buscar usuario"
        placeholder="Nombre, correo o rol"
        value={busquedaUsuario}
        onChangeText={cambiarBusquedaUsuario}
      />
      <View style={estilos.chips}>
        <Pressable
          accessibilityRole="button"
          onPress={() => cambiarFiltroRolUsuario('todos')}
          style={[
            estilos.chip,
            filtroRolUsuario === 'todos' && estilos.chipActivo,
          ]}
        >
          <Text
            style={[
              estilos.textoChip,
              filtroRolUsuario === 'todos' && estilos.textoChipActivo,
            ]}
          >
            Todos
          </Text>
        </Pressable>
        {roles.map((rol) => (
          <Pressable
            key={rol.id}
            accessibilityRole="button"
            onPress={() => cambiarFiltroRolUsuario(rol.id)}
            style={[
              estilos.chip,
              filtroRolUsuario === rol.id && estilos.chipActivo,
            ]}
          >
            <Text
              style={[
                estilos.textoChip,
                filtroRolUsuario === rol.id && estilos.textoChipActivo,
              ]}
            >
              {rol.etiqueta}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={estilos.chips}>
        <Pressable
          accessibilityRole="button"
          onPress={() => cambiarFiltroEstadoUsuario('todos')}
          style={[
            estilos.chip,
            filtroEstadoUsuario === 'todos' && estilos.chipActivo,
          ]}
        >
          <Text
            style={[
              estilos.textoChip,
              filtroEstadoUsuario === 'todos' && estilos.textoChipActivo,
            ]}
          >
            Todos
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => cambiarFiltroEstadoUsuario('activo')}
          style={[
            estilos.chip,
            filtroEstadoUsuario === 'activo' && estilos.chipActivo,
          ]}
        >
          <Text
            style={[
              estilos.textoChip,
              filtroEstadoUsuario === 'activo' && estilos.textoChipActivo,
            ]}
          >
            Activos
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => cambiarFiltroEstadoUsuario('suspendido')}
          style={[
            estilos.chip,
            filtroEstadoUsuario === 'suspendido' && estilos.chipActivo,
          ]}
        >
          <Text
            style={[
              estilos.textoChip,
              filtroEstadoUsuario === 'suspendido' && estilos.textoChipActivo,
            ]}
          >
            Suspendidos
          </Text>
        </Pressable>
      </View>

      {cargando ? (
        <ActivityIndicator color={colores.primary} size="large" />
      ) : (
        <View style={estilos.lista}>
          {usuarios
            .filter((item) =>
              `${item.nombre} ${item.apellidos} ${item.correo} ${item.rol}`
                .toLowerCase()
                .includes(busquedaUsuario.toLowerCase()),
            )
            .filter((item) =>
              filtroRolUsuario === 'todos' ? true : item.rol === filtroRolUsuario,
            )
            .filter((item) =>
              filtroEstadoUsuario === 'todos'
                ? true
                : filtroEstadoUsuario === 'activo'
                ? item.activo
                : !item.activo,
            )
            .map((item) => (
            <View key={item.id} style={[estilos.usuario, !item.activo && estilos.inactivo]}>
              <View style={estilos.usuarioCabecera}>
                <View style={estilos.flexible}>
                  <Text style={estilos.nombre}>
                    {item.nombre} {item.apellidos}
                    {item.id === usuario?.id ? ' (tú)' : ''}
                  </Text>
                  <Text style={estilos.correo}>{item.correo}</Text>
                </View>
                <View style={[estilos.estado, !item.activo && estilos.estadoSuspendido]}>
                  <Text style={estilos.textoEstado}>
                    {item.activo ? 'Activo' : 'Suspendido'}
                  </Text>
                </View>
              </View>

              <View style={estilos.chips}>
                {roles.map((rol) => (
                  <Pressable
                    accessibilityRole="button"
                    disabled={procesando || item.id === usuario?.id}
                    key={rol.id}
                    onPress={() => actualizarUsuario(item, { rol: rol.id })}
                    style={[estilos.chip, item.rol === rol.id && estilos.chipActivo]}
                  >
                    <Text
                      style={[
                        estilos.textoChip,
                        item.rol === rol.id && estilos.textoChipActivo,
                      ]}
                    >
                      {rol.etiqueta}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {item.requiere_cambio_contrasena ? (
                <Text style={estilos.temporal}>Contraseña temporal pendiente de cambio</Text>
              ) : null}

              <View style={estilos.acciones}>
                <Pressable
                  accessibilityRole="button"
                  disabled={procesando || item.id === usuario?.id}
                  onPress={() => actualizarUsuario(item, { activo: !item.activo })}
                  style={estilos.botonAccion}
                >
                  <Text style={estilos.textoAccion}>
                    {item.activo ? 'Suspender' : 'Reactivar'}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    cambiarUsuarioClave(item);
                    cambiarClaveTemporal('');
                  }}
                  style={estilos.botonAccion}
                >
                  <KeyRound color={colores.primary} size={16} />
                  <Text style={estilos.textoAccion}>Nueva clave</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      {usuarioClave ? (
        <View style={estilos.tarjetaClave}>
          <Text style={estilos.tituloSeccion}>
            Contraseña temporal para {usuarioClave.nombre}
          </Text>
          <CampoTexto
            etiqueta="Nueva contraseña temporal"
            secureTextEntry
            value={claveTemporal}
            onChangeText={cambiarClaveTemporal}
          />
          <Boton
            texto="Restablecer contraseña"
            cargando={procesando}
            alPresionar={restablecerClave}
          />
          <Boton
            texto="Cancelar"
            variante="fantasma"
            alPresionar={() => cambiarUsuarioClave(null)}
          />
        </View>
      ) : null}

      <View style={[estilos.tituloFila, estilos.separacion]}>
        <UsersRound color={colores.primary} size={22} />
        <Text style={estilos.tituloSeccion}>Recolectores activos</Text>
      </View>
      <CampoTexto
        etiqueta="Buscar recolector"
        placeholder="Nombre, correo o rol"
        value={busquedaRecolector}
        onChangeText={cambiarBusquedaRecolector}
      />
      {recolectores.length === 0 ? (
        <Text style={estilos.vacio}>No hay recolectores activos registrados.</Text>
      ) : (
        <View style={[estilos.lista, estilos.separacion]}>
          {recolectores
            .filter((item) =>
              `${item.nombre} ${item.apellidos} ${item.correo} ${item.rol}`
                .toLowerCase()
                .includes(busquedaRecolector.toLowerCase()),
            )
            .map((item) => (
              <View key={item.id} style={[estilos.usuario, !item.activo && estilos.inactivo]}>
                <View style={estilos.usuarioCabecera}>
                  <View style={estilos.flexible}>
                    <Text style={estilos.nombre}>
                      {item.nombre} {item.apellidos}
                    </Text>
                    <Text style={estilos.correo}>{item.correo}</Text>
                  </View>
                  <View style={[estilos.estado, !item.activo && estilos.estadoSuspendido]}>
                    <Text style={estilos.textoEstado}>
                      {item.activo ? 'Activo' : 'Suspendido'}
                    </Text>
                  </View>
                </View>
                <View style={estilos.chips}>
                  <Text style={estilos.textoChip}>{item.rol}</Text>
                </View>
                <View style={estilos.acciones}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={procesando}
                    onPress={() => actualizarUsuario(item, { activo: !item.activo })}
                    style={estilos.botonAccion}
                  >
                    <Text style={estilos.textoAccion}>
                      {item.activo ? 'Suspender' : 'Reactivar'}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={procesando}
                    onPress={() => cambiarUsuarioClave(item)}
                    style={estilos.botonAccion}
                  >
                    <KeyRound color={colores.primary} size={16} />
                    <Text style={estilos.textoAccion}>Nueva clave</Text>
                  </Pressable>
                </View>
              </View>
            ))}
        </View>
      )}
      <View style={[estilos.tituloFila, estilos.separacion]}>
        <ClipboardCheck color={colores.primary} size={22} />
        <Text style={estilos.tituloSeccion}>Reportes de contenedores</Text>
      </View>
      <CampoTexto
        etiqueta="Buscar reporte"
        placeholder="ID, motivo o contenedor"
        value={busquedaReporte}
        onChangeText={cambiarBusquedaReporte}
      />
      <View style={estilos.chips}>
        <Pressable
          accessibilityRole="button"
          onPress={() => cambiarFiltroEstadoReporte('todos')}
          style={[
            estilos.chip,
            filtroEstadoReporte === 'todos' && estilos.chipActivo,
          ]}
        >
          <Text
            style={[
              estilos.textoChip,
              filtroEstadoReporte === 'todos' && estilos.textoChipActivo,
            ]}
          >
            Todos
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => cambiarFiltroEstadoReporte('pendiente')}
          style={[
            estilos.chip,
            filtroEstadoReporte === 'pendiente' && estilos.chipActivo,
          ]}
        >
          <Text
            style={[
              estilos.textoChip,
              filtroEstadoReporte === 'pendiente' && estilos.textoChipActivo,
            ]}
          >
            Pendiente
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => cambiarFiltroEstadoReporte('en_revision')}
          style={[
            estilos.chip,
            filtroEstadoReporte === 'en_revision' && estilos.chipActivo,
          ]}
        >
          <Text
            style={[
              estilos.textoChip,
              filtroEstadoReporte === 'en_revision' && estilos.textoChipActivo,
            ]}
          >
            En revisión
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => cambiarFiltroEstadoReporte('resuelto')}
          style={[
            estilos.chip,
            filtroEstadoReporte === 'resuelto' && estilos.chipActivo,
          ]}
        >
          <Text
            style={[
              estilos.textoChip,
              filtroEstadoReporte === 'resuelto' && estilos.textoChipActivo,
            ]}
          >
            Resuelto
          </Text>
        </Pressable>
      </View>
      {errorReportes ? <Text style={estilos.error}>{errorReportes}</Text> : null}
      {cargandoReportes ? (
        <ActivityIndicator color={colores.primary} size="large" />
      ) : reportes.filter((reporte) =>
          `${reporte.id} ${reporte.motivo} ${reporte.contenedor_id}`
            .toLowerCase()
            .includes(busquedaReporte.toLowerCase()),
        )
        .filter((reporte) =>
          filtroEstadoReporte === 'todos'
            ? true
            : reporte.estado === filtroEstadoReporte,
        )
        .slice(0, 20).length === 0 ? (
        <Text style={estilos.vacio}>No hay reportes registrados.</Text>
      ) : (
        <View style={estilos.lista}>
          {reportes
            .filter((reporte) =>
              `${reporte.id} ${reporte.motivo} ${reporte.contenedor_id}`
                .toLowerCase()
                .includes(busquedaReporte.toLowerCase()),
            )
            .filter((reporte) =>
              filtroEstadoReporte === 'todos'
                ? true
                : reporte.estado === filtroEstadoReporte,
            )
            .slice(0, 20)
            .map((reporte) => (
            <View key={reporte.id} style={estilos.usuario}>
              <View style={estilos.usuarioCabecera}>
                <View style={estilos.flexible}>
                  <Text style={estilos.nombre}>
                    Contenedor #{reporte.contenedor_id}
                  </Text>
                  <Text style={estilos.correo}>{reporte.motivo}</Text>
                </View>
                <View style={[estilos.estado, reporte.estado === 'resuelto' ? estilos.estadoResuelto : reporte.estado === 'en_revision' ? estilos.estadoRevision : estilos.estadoPendiente]}>
                  <Text style={estilos.textoEstado}>
                    {reporte.estado === 'pendiente'
                      ? 'Pendiente'
                      : reporte.estado === 'en_revision'
                      ? 'En revisión'
                      : 'Resuelto'}
                  </Text>
                </View>
              </View>
              {reporte.comentario ? (
                <Text style={estilos.temporal}>{reporte.comentario}</Text>
              ) : null}
              <View style={estilos.acciones}>
                {reporte.estado === 'pendiente' ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={actualizandoReporteId === reporte.id}
                    onPress={() => actualizarEstadoReporte(reporte.id, 'en_revision')}
                    style={estilos.botonAccion}
                  >
                    <Text style={estilos.textoAccion}>Tomar</Text>
                  </Pressable>
                ) : null}
                {reporte.estado !== 'resuelto' ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={actualizandoReporteId === reporte.id}
                    onPress={() => actualizarEstadoReporte(reporte.id, 'resuelto')}
                    style={estilos.botonAccion}
                  >
                    <Text style={estilos.textoAccion}>Resolver</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={[estilos.tituloFila, estilos.separacion]}>
        <ShieldCheck color={colores.secondary} size={22} />
        <Text style={estilos.tituloSeccion}>Incidencias operativas recientes</Text>
      </View>
      {incidencias.length === 0 ? (
        <Text style={estilos.vacio}>No hay incidencias de recorridos.</Text>
      ) : (
        <View style={estilos.lista}>
          {incidencias.slice(0, 20).map((incidencia) => (
            <View key={incidencia.id} style={estilos.incidencia}>
              <Text style={estilos.nombre}>
                {etiquetasIncidencia[incidencia.tipo] || incidencia.tipo}
              </Text>
              <Text style={estilos.correo}>{incidencia.comentario}</Text>
              <Text style={estilos.meta}>
                Recorrido #{incidencia.ejecucion_id} · Recolector #{incidencia.recolector_id}
              </Text>
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
  icono: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: colores.primary,
  },
  titulo: { color: colores.text, fontSize: 27, fontWeight: '900' },
  subtitulo: { color: colores.muted, fontSize: 14, lineHeight: 20 },
  tarjeta: {
    gap: espaciado.md,
    marginBottom: espaciado.xxl,
    padding: espaciado.lg,
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 18,
    backgroundColor: colores.surface,
  },
  tituloFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    marginBottom: espaciado.md,
  },
  tituloSeccion: { color: colores.text, fontSize: 18, fontWeight: '900' },
  etiqueta: { color: colores.text, fontSize: 14, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.sm },
  chip: {
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.sm,
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 999,
    backgroundColor: colores.white,
  },
  chipActivo: { borderColor: colores.primary, backgroundColor: colores.primary },
  textoChip: { color: colores.text, fontSize: 12, fontWeight: '800' },
  textoChipActivo: { color: colores.white },
  error: {
    padding: espaciado.md,
    color: colores.danger,
    borderRadius: 12,
    backgroundColor: '#FFF1F0',
  },
  exito: {
    padding: espaciado.md,
    color: colores.primaryDark,
    fontWeight: '800',
    borderRadius: 12,
    backgroundColor: '#EAF7EE',
  },
  lista: { gap: espaciado.md },
  usuario: {
    gap: espaciado.md,
    padding: espaciado.lg,
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 16,
    backgroundColor: colores.white,
  },
  inactivo: { opacity: 0.7, backgroundColor: colores.surface },
  usuarioCabecera: { flexDirection: 'row', gap: espaciado.sm },
  nombre: { color: colores.text, fontSize: 15, fontWeight: '900' },
  correo: { color: colores.muted, fontSize: 13, lineHeight: 18 },
  estado: {
    alignSelf: 'flex-start',
    paddingHorizontal: espaciado.sm,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colores.primary,
  },
  estadoSuspendido: { backgroundColor: colores.muted },
  estadoPendiente: { backgroundColor: colores.secondary },
  estadoRevision: { backgroundColor: colores.primary },
  estadoResuelto: { backgroundColor: colores.success },
  textoEstado: { color: colores.white, fontSize: 10, fontWeight: '900' },
  temporal: { color: '#7A4B00', fontSize: 12, fontWeight: '800' },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.sm },
  botonAccion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.sm,
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 11,
    backgroundColor: colores.surface,
  },
  textoAccion: { color: colores.primary, fontSize: 12, fontWeight: '900' },
  tarjetaClave: {
    gap: espaciado.md,
    marginTop: espaciado.xl,
    padding: espaciado.lg,
    borderWidth: 1,
    borderColor: colores.secondary,
    borderRadius: 16,
    backgroundColor: '#FFF9F0',
  },
  tarjetaContenedor: {
    gap: espaciado.md,
    marginTop: espaciado.sm,
    padding: espaciado.lg,
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 16,
    backgroundColor: colores.surface,
  },
  separacion: { marginTop: espaciado.xxl },
  vacio: {
    padding: espaciado.lg,
    color: colores.muted,
    textAlign: 'center',
    borderRadius: 14,
    backgroundColor: colores.surface,
  },
  registroContenedor: {
    gap: 4,
    padding: espaciado.md,
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
  },
  incidencia: {
    gap: 4,
    padding: espaciado.md,
    borderLeftWidth: 4,
    borderLeftColor: colores.secondary,
    borderRadius: 12,
    backgroundColor: '#FFF9F0',
  },
  meta: { color: colores.muted, fontSize: 11, fontWeight: '700' },
});
