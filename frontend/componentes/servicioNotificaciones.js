import Constants from 'expo-constants';
import { Platform } from 'react-native';

const esExpoGo = Constants.appOwnership === 'expo';
let moduloNotificaciones = null;
let manejadorConfigurado = false;

async function cargarModuloNotificaciones() {
  if (Platform.OS === 'web' || esExpoGo) {
    return null;
  }
  if (!moduloNotificaciones) {
    moduloNotificaciones = await import('expo-notifications');
  }
  return moduloNotificaciones;
}

export async function prepararNotificacionesLocales() {
  const notificaciones = await cargarModuloNotificaciones();
  if (!notificaciones) {
    return { disponible: false, motivo: esExpoGo ? 'expo_go' : 'web' };
  }

  if (!manejadorConfigurado) {
    notificaciones.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    manejadorConfigurado = true;
  }

  const permisoActual = await notificaciones.getPermissionsAsync();
  const permiso = permisoActual.granted
    ? permisoActual
    : await notificaciones.requestPermissionsAsync();

  if (Platform.OS === 'android') {
    await notificaciones.setNotificationChannelAsync('default', {
      name: 'Avisos de recolección',
      importance: notificaciones.AndroidImportance.DEFAULT,
    });
  }

  return { disponible: permiso.granted, motivo: permiso.granted ? null : 'permiso' };
}

export async function mostrarNotificacionLocal({ titulo, cuerpo }) {
  const notificaciones = await cargarModuloNotificaciones();
  if (!notificaciones) {
    return false;
  }

  await notificaciones.scheduleNotificationAsync({
    content: { title: titulo, body: cuerpo },
    trigger: null,
  });
  return true;
}
