import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { URL_API } from './conexionApi';
import { encolarSolicitud } from './colaOffline';

const TAREA_RASTREO = 'vic-rastreo-recorrido';
const CLAVE_EJECUCION = '@vic/ejecucion-rastreo';
const CLAVE_SESION = '@vic/sesion';

if (!TaskManager.isTaskDefined(TAREA_RASTREO)) {
  TaskManager.defineTask(TAREA_RASTREO, async ({ data, error }) => {
    if (error || !data?.locations?.length) {
      return;
    }
    const [ejecucionId, textoSesion] = await Promise.all([
      AsyncStorage.getItem(CLAVE_EJECUCION),
      AsyncStorage.getItem(CLAVE_SESION),
    ]);
    if (!ejecucionId || !textoSesion) {
      return;
    }
    const sesion = JSON.parse(textoSesion);
    const posicion = data.locations[data.locations.length - 1];
    const cuerpo = {
      latitud: posicion.coords.latitude,
      longitud: posicion.coords.longitude,
      precision_m: posicion.coords.accuracy ?? null,
    };
    const url = `/operacion/ejecuciones/${ejecucionId}/ubicacion`;
    try {
      const respuesta = await fetch(`${URL_API}${url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sesion.token_acceso}`,
        },
        body: JSON.stringify(cuerpo),
      });
      if (!respuesta.ok && respuesta.status >= 500) {
        await encolarSolicitud('post', url, cuerpo);
      }
    } catch {
      await encolarSolicitud('post', url, cuerpo);
    }
  });
}

export async function iniciarRastreoSegundoPlano(ejecucionId) {
  await AsyncStorage.setItem(CLAVE_EJECUCION, String(ejecucionId));
  const disponible = await Location.isBackgroundLocationAvailableAsync();
  if (!disponible) {
    return false;
  }
  const permiso = await Location.requestBackgroundPermissionsAsync();
  if (!permiso.granted) {
    return false;
  }
  const iniciado = await Location.hasStartedLocationUpdatesAsync(TAREA_RASTREO);
  if (!iniciado) {
    await Location.startLocationUpdatesAsync(TAREA_RASTREO, {
      accuracy: Location.Accuracy.High,
      distanceInterval: 25,
      timeInterval: 20000,
      deferredUpdatesDistance: 50,
      foregroundService: {
        notificationTitle: 'VIC está registrando el recorrido',
        notificationBody: 'La ubicación se comparte durante la ruta activa.',
        notificationColor: '#2E7D32',
      },
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
    });
  }
  return true;
}

export async function detenerRastreoSegundoPlano() {
  try {
    const iniciado = await Location.hasStartedLocationUpdatesAsync(TAREA_RASTREO);
    if (iniciado) {
      await Location.stopLocationUpdatesAsync(TAREA_RASTREO);
    }
  } finally {
    await AsyncStorage.removeItem(CLAVE_EJECUCION);
  }
}
