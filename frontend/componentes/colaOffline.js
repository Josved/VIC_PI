import AsyncStorage from '@react-native-async-storage/async-storage';

import { conexionApi } from './conexionApi';

const CLAVE_COLA = '@vic/cola-offline';
const LIMITE_SOLICITUDES = 300;
let operacionPendiente = Promise.resolve();

async function leerCola() {
  const texto = await AsyncStorage.getItem(CLAVE_COLA);
  if (!texto) {
    return [];
  }
  try {
    const datos = JSON.parse(texto);
    return Array.isArray(datos) ? datos : [];
  } catch {
    await AsyncStorage.removeItem(CLAVE_COLA);
    return [];
  }
}

function ejecutarEnSerie(operacion) {
  const resultado = operacionPendiente.then(operacion, operacion);
  operacionPendiente = resultado.catch(() => undefined);
  return resultado;
}

export async function encolarSolicitud(metodo, url, datos) {
  return ejecutarEnSerie(async () => {
    const cola = await leerCola();
    cola.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      metodo,
      url,
      datos,
      creado_en: new Date().toISOString(),
    });
    await AsyncStorage.setItem(
      CLAVE_COLA,
      JSON.stringify(cola.slice(-LIMITE_SOLICITUDES)),
    );
  });
}

export async function ejecutarConRespaldo(metodo, url, datos = undefined) {
  try {
    const respuesta = await conexionApi.request({ method: metodo, url, data: datos });
    return { respuesta, encolada: false };
  } catch (error) {
    if (!error.response) {
      await encolarSolicitud(metodo, url, datos);
      return { respuesta: null, encolada: true };
    }
    throw error;
  }
}

export async function sincronizarCola() {
  return ejecutarEnSerie(async () => {
    const cola = await leerCola();
    if (cola.length === 0) {
      return { enviadas: 0, pendientes: 0 };
    }
    const pendientes = [];
    let enviadas = 0;
    for (const solicitud of cola) {
      try {
        await conexionApi.request({
          method: solicitud.metodo,
          url: solicitud.url,
          data: solicitud.datos,
        });
        enviadas += 1;
      } catch (error) {
        if (!error.response || error.response.status >= 500) {
          pendientes.push(solicitud);
        }
      }
    }
    await AsyncStorage.setItem(CLAVE_COLA, JSON.stringify(pendientes));
    return { enviadas, pendientes: pendientes.length };
  });
}

export async function cantidadPendiente() {
  return ejecutarEnSerie(async () => (await leerCola()).length);
}
