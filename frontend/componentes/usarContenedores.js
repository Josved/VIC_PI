import { useCallback, useEffect, useState } from 'react';

import { conexionApi, obtenerMensajeErrorApi } from './conexionApi';

export function usarContenedores() {
  const [contenedores, cambiarContenedores] = useState([]);
  const [cargando, cambiarCargando] = useState(true);
  const [error, cambiarError] = useState('');

  const cargar = useCallback(async () => {
    try {
      cambiarCargando(true);
      cambiarError('');
      const respuesta = await conexionApi.get('/contenedores');
      cambiarContenedores(respuesta.data);
    } catch (excepcion) {
      cambiarError(
        obtenerMensajeErrorApi(
          excepcion,
          'No se pudieron cargar los contenedores.',
        ),
      );
    } finally {
      cambiarCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { contenedores, cargando, error, recargar: cargar };
}
