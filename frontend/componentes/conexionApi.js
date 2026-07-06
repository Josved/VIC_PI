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

  return mensajePorDefecto;
}
