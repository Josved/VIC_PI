import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const opcionesSeguras = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

export async function leerDatoSeguro(clave) {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(clave);
  }

  const valorSeguro = await SecureStore.getItemAsync(clave);
  if (valorSeguro) {
    return valorSeguro;
  }

  const valorAnterior = await AsyncStorage.getItem(clave);
  if (valorAnterior) {
    await SecureStore.setItemAsync(clave, valorAnterior, opcionesSeguras);
    await AsyncStorage.removeItem(clave);
  }
  return valorAnterior;
}

export async function guardarDatoSeguro(clave, valor) {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(clave, valor);
    return;
  }
  await SecureStore.setItemAsync(clave, valor, opcionesSeguras);
  await AsyncStorage.removeItem(clave);
}

export async function eliminarDatoSeguro(clave) {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(clave);
    return;
  }
  await SecureStore.deleteItemAsync(clave);
  await AsyncStorage.removeItem(clave);
}
