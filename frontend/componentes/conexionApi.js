import axios from 'axios';

export const URL_API = process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export const conexionApi = axios.create({
  baseURL: URL_API,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function guardarTokenAutorizacion(token) {
  if (token) {
    conexionApi.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete conexionApi.defaults.headers.common.Authorization;
}

export function obtenerMensajeErrorApi(error, mensajePorDefecto) {
  const detalle = error?.response?.data?.detail;

  if (typeof detalle === 'string') {
    return detalle;
  }

  if (Array.isArray(detalle) && detalle[0]?.msg) {
    return detalle[0].msg;
  }

  if (error?.code === 'ECONNABORTED') {
    return 'El servidor tardó demasiado en responder. Revisa tu conexión e inténtalo nuevamente.';
  }

  if (!error?.response || error?.code === 'ERR_NETWORK') {
    return 'No se pudo conectar con el servidor VIC. Revisa tu conexión a Internet y confirma que el servidor esté encendido.';
  }

  if (error.response.status >= 500) {
    return 'El servidor VIC presentó un problema. Espera un momento e inténtalo nuevamente.';
  }

  return mensajePorDefecto;
}
