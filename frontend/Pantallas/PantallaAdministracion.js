import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { KeyRound, ShieldCheck, Truck, UserPlus, UsersRound } from 'lucide-react-native';

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

export function PantallaAdministracion() {
  const { usuario } = usarSesion();
  const [usuarios, cambiarUsuarios] = useState([]);
  const [incidencias, cambiarIncidencias] = useState([]);
  const [vehiculos, cambiarVehiculos] = useState([]);
  const [placa, cambiarPlaca] = useState('');
  const [formulario, cambiarFormulario] = useState(formularioInicial);
  const [usuarioClave, cambiarUsuarioClave] = useState(null);
  const [claveTemporal, cambiarClaveTemporal] = useState('');
  const [cargando, cambiarCargando] = useState(true);
  const [procesando, cambiarProcesando] = useState(false);
  const [error, cambiarError] = useState('');
  const [exito, cambiarExito] = useState('');

  const cargar = useCallback(async () => {
    try {
      cambiarCargando(true);
      cambiarError('');
      const [respuestaUsuarios, respuestaIncidencias, respuestaVehiculos] = await Promise.all([
        conexionApi.get('/administracion/usuarios'),
        conexionApi.get('/operacion/incidencias'),
        conexionApi.get('/administracion/vehiculos'),
      ]);
      cambiarUsuarios(respuestaUsuarios.data);
      cambiarIncidencias(respuestaIncidencias.data);
      cambiarVehiculos(respuestaVehiculos.data);
    } catch (excepcion) {
      cambiarError(
        obtenerMensajeErrorApi(
          excepcion,
          'No fue posible cargar la administración.',
        ),
      );
    } finally {
      cambiarCargando(false);
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

      <View style={estilos.tituloFila}>
        <UsersRound color={colores.primary} size={22} />
        <Text style={estilos.tituloSeccion}>Usuarios registrados</Text>
      </View>

      {cargando ? (
        <ActivityIndicator color={colores.primary} size="large" />
      ) : (
        <View style={estilos.lista}>
          {usuarios.map((item) => (
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
  separacion: { marginTop: espaciado.xxl },
  vacio: {
    padding: espaciado.lg,
    color: colores.muted,
    textAlign: 'center',
    borderRadius: 14,
    backgroundColor: colores.surface,
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
