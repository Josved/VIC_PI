import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import {
  eliminarDatoSeguro,
  guardarDatoSeguro,
  leerDatoSeguro,
} from './almacenamientoSeguro';
import { conexionApi, guardarTokenAutorizacion } from './conexionApi';

const CLAVE_SESION = '@vic/sesion';
const ContextoSesion = createContext(null);

export function ProveedorSesion({ children }) {
  const [sesion, cambiarSesion] = useState(null);
  const [cargando, cambiarCargando] = useState(true);

  useEffect(() => {
    async function cargarSesionGuardada() {
      try {
        const textoSesion = await leerDatoSeguro(CLAVE_SESION);
        if (textoSesion) {
          const sesionGuardada = JSON.parse(textoSesion);
          if (!sesionGuardada?.token_acceso || !sesionGuardada?.usuario) {
            throw new Error('Sesión guardada incompleta');
          }
          guardarTokenAutorizacion(sesionGuardada.token_acceso);
          const respuesta = await conexionApi.get('/autenticacion/mi-usuario');
          const sesionActualizada = {
            ...sesionGuardada,
            usuario: respuesta.data,
          };
          cambiarSesion(sesionActualizada);
          await guardarDatoSeguro(CLAVE_SESION, JSON.stringify(sesionActualizada));
        }
      } catch {
        guardarTokenAutorizacion(null);
        cambiarSesion(null);
        await eliminarDatoSeguro(CLAVE_SESION);
      } finally {
        cambiarCargando(false);
      }
    }

    cargarSesionGuardada();
  }, []);

  async function guardarSesion(nuevaSesion) {
    cambiarSesion(nuevaSesion);
    guardarTokenAutorizacion(nuevaSesion.token_acceso);
    await guardarDatoSeguro(CLAVE_SESION, JSON.stringify(nuevaSesion));
  }

  async function iniciarSesion(datos) {
    const respuesta = await conexionApi.post('/autenticacion/iniciar-sesion', datos);
    await guardarSesion(respuesta.data);
  }

  async function registrarCuenta(datos) {
    const respuesta = await conexionApi.post('/autenticacion/registro', datos);
    await guardarSesion(respuesta.data);
  }

  async function pedirRecuperacionContrasena(correo) {
    await conexionApi.post('/autenticacion/recuperar-contrasena', { correo });
  }

  async function restablecerContrasena(datos) {
    await conexionApi.post('/autenticacion/restablecer-contrasena', datos);
  }

  async function cerrarSesion() {
    cambiarSesion(null);
    guardarTokenAutorizacion(null);
    await eliminarDatoSeguro(CLAVE_SESION);
  }

  async function refrescarUsuario() {
    if (!sesion?.token_acceso) {
      return null;
    }
    const respuesta = await conexionApi.get('/autenticacion/mi-usuario');
    const nuevaSesion = { ...sesion, usuario: respuesta.data };
    cambiarSesion(nuevaSesion);
    await guardarDatoSeguro(CLAVE_SESION, JSON.stringify(nuevaSesion));
    return respuesta.data;
  }

  const datosSesion = useMemo(
    () => ({
      usuario: sesion?.usuario || null,
      token: sesion?.token_acceso || null,
      cargando,
      iniciarSesion,
      registrarCuenta,
      pedirRecuperacionContrasena,
      restablecerContrasena,
      refrescarUsuario,
      cerrarSesion,
    }),
    [cargando, sesion],
  );

  return <ContextoSesion.Provider value={datosSesion}>{children}</ContextoSesion.Provider>;
}

export function usarSesion() {
  const contexto = useContext(ContextoSesion);
  if (!contexto) {
    throw new Error('usarSesion debe usarse dentro de ProveedorSesion');
  }

  return contexto;
}
