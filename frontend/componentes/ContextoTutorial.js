import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { usarSesion } from './ContextoSesion';
import { guardarDatoSeguro, leerDatoSeguro } from './almacenamientoSeguro';

const VERSION_TUTORIAL = '1';
const ContextoTutorial = createContext(null);

const pasosComunes = {
  perfil: {
    icono: 'perfil',
    titulo: 'Tu perfil y seguridad',
    descripcion:
      'Desde Perfil puedes consultar tus permisos, cambiar tu contraseña y volver a abrir este tutorial cuando lo necesites.',
    detalles: [
      'No compartas tu contraseña ni los códigos recibidos por correo.',
      'Cierra la sesión si utilizas un dispositivo compartido.',
    ],
  },
};

const pasosPorRol = {
  citizen: [
    {
      icono: 'bienvenida',
      titulo: 'Bienvenido a VIC',
      descripcion:
        'Como ciudadano puedes conocer la recolección cercana, localizar contenedores y dar seguimiento a tus reportes.',
      detalles: [
        'VIC utiliza tu ubicación para mostrar información útil de tu zona.',
        'Puedes revisar este tutorial nuevamente desde Perfil.',
      ],
    },
    {
      icono: 'calendario',
      titulo: 'Tu calendario semanal',
      descripcion:
        'En Inicio verás únicamente las rutas próximas a una ubicación que hayas guardado.',
      detalles: [
        'Guarda una o varias ubicaciones frecuentes.',
        'Toca un día de recolección para ver el recorrido completo en el mapa.',
        'Si no existe una ruta cercana, VIC te lo indicará claramente.',
      ],
    },
    {
      icono: 'mapa',
      titulo: 'Mapa y contenedores',
      descripcion:
        'La pestaña Mapa muestra tu dirección aproximada y los contenedores cercanos con nombres basados en su zona.',
      detalles: [
        'Toca un contenedor para consultar su información.',
        'Escanea su QR para registrarlo o actualizar su ubicación cuando corresponda.',
      ],
    },
    {
      icono: 'reporte',
      titulo: 'Envía y consulta reportes',
      descripcion:
        'Describe el problema y revisa después su estado, comentarios y respuesta desde Reportes.',
      detalles: [
        'El ciudadano crea y consulta reportes; no puede tomarlos ni resolverlos.',
        'Usa “Ver más” para abrir el detalle y acercar la ubicación.',
      ],
    },
    pasosComunes.perfil,
  ],
  collector: [
    {
      icono: 'bienvenida',
      titulo: 'Panel del recolector',
      descripcion:
        'Como recolector puedes ejecutar recorridos, registrar evidencias y apoyar en la atención de incidencias.',
      detalles: [
        'El administrador asigna y supervisa rutas, usuarios y recursos.',
        'Tu actividad queda vinculada a tu cuenta.',
      ],
    },
    {
      icono: 'ruta',
      titulo: 'Consulta y comienza tu ruta',
      descripcion:
        'En Rutas revisa el día, horario aproximado, placas del vehículo y puntos del recorrido antes de iniciar.',
      detalles: [
        'Selecciona la ruta asignada y confirma el inicio del recorrido.',
        'Activa la ubicación para compartir el avance mientras la ruta esté activa.',
      ],
    },
    {
      icono: 'mapa',
      titulo: 'Sigue el recorrido real',
      descripcion:
        'El mapa ordena los puntos de recolección y te ayuda a identificar la siguiente parada por su dirección.',
      detalles: [
        'Comprueba el punto seleccionado antes de marcar una recolección.',
        'Finaliza la ruta solamente después de revisar todas las paradas.',
      ],
    },
    {
      icono: 'camara',
      titulo: 'Registra evidencia',
      descripcion:
        'Toma una fotografía desde la parada para demostrar la recolección o documentar una incidencia.',
      detalles: [
        'La evidencia debe corresponder al lugar y momento del servicio.',
        'Agrega un comentario breve que explique cualquier problema.',
      ],
    },
    {
      icono: 'reporte',
      titulo: 'Atiende reportes correctamente',
      descripcion:
        'Puedes revisar reportes disponibles, pero nunca tomar o resolver un reporte creado por ti mismo.',
      detalles: [
        'Otro recolector o un administrador debe atender tu reporte.',
        'Un reporte nuevo permanece pendiente hasta que alguien autorizado lo gestione.',
      ],
    },
    pasosComunes.perfil,
  ],
  admin: [
    {
      icono: 'bienvenida',
      titulo: 'Centro de administración VIC',
      descripcion:
        'Como administrador tienes control integral para corregir, organizar y supervisar la operación.',
      detalles: [
        'Tus acciones administrativas quedan protegidas por tu sesión y permisos.',
        'Revisa cuidadosamente antes de editar o eliminar información.',
      ],
    },
    {
      icono: 'usuarios',
      titulo: 'Usuarios y permisos',
      descripcion:
        'En Admin puedes crear cuentas operativas, cambiar roles y administrar el acceso de ciudadanos y recolectores.',
      detalles: [
        'Los recolectores no se registran libremente: un administrador les asigna la cuenta.',
        'Asigna solamente los permisos necesarios para cada persona.',
      ],
    },
    {
      icono: 'contenedor',
      titulo: 'Contenedores y vehículos',
      descripcion:
        'Crea y edita contenedores usando una dirección reconocible, y registra los vehículos mediante sus placas.',
      detalles: [
        'Puedes eliminar elementos incorrectos y restaurarlos desde el historial.',
        'Verifica la posición en el mapa antes de guardar un contenedor.',
      ],
    },
    {
      icono: 'calendario',
      titulo: 'Rutas y calendario',
      descripcion:
        'Gestiona días, horas válidas, zonas, paradas y asignaciones que aparecerán en el calendario ciudadano.',
      detalles: [
        'Al editar una ruta, el mapa te lleva a sus contenedores y puntos guardados.',
        'Puedes corregir, eliminar y restaurar rutas desde la administración.',
      ],
    },
    {
      icono: 'reporte',
      titulo: 'Supervisa los reportes',
      descripcion:
        'Consulta el detalle, asigna responsables, responde, resuelve o reabre incidencias según su estado real.',
      detalles: [
        'Un reporte recién creado debe permanecer pendiente.',
        'Nadie puede tomar un reporte que haya creado personalmente.',
      ],
    },
    {
      icono: 'seguridad',
      titulo: 'Control y seguridad',
      descripcion:
        'Usa las herramientas administrativas para corregir datos sin perder trazabilidad y protege siempre las credenciales.',
      detalles: [
        'Confirma que los servicios estén saludables antes de una demostración.',
        'Mantén copias de seguridad y no publiques secretos en el repositorio.',
      ],
    },
    pasosComunes.perfil,
  ],
};

const etiquetasRol = {
  citizen: 'ciudadano',
  collector: 'recolector',
  admin: 'administrador',
};

function obtenerClave(usuario) {
  return `@vic/tutorial/${VERSION_TUTORIAL}/${usuario.rol}/${usuario.id}`;
}

export function ProveedorTutorial({ children }) {
  const { usuario } = usarSesion();
  const [visible, cambiarVisible] = useState(false);
  const [pasoActual, cambiarPasoActual] = useState(0);

  const pasos = pasosPorRol[usuario?.rol] || pasosPorRol.citizen;

  useEffect(() => {
    let vigente = true;

    async function comprobarTutorial() {
      cambiarVisible(false);
      cambiarPasoActual(0);
      if (!usuario?.id || !usuario?.rol) return;

      try {
        const completado = await leerDatoSeguro(obtenerClave(usuario));
        if (vigente) cambiarVisible(completado !== 'completado');
      } catch {
        if (vigente) cambiarVisible(true);
      }
    }

    comprobarTutorial();
    return () => {
      vigente = false;
    };
  }, [usuario?.id, usuario?.rol]);

  async function cerrarTutorial() {
    if (usuario?.id && usuario?.rol) {
      try {
        await guardarDatoSeguro(obtenerClave(usuario), 'completado');
      } catch {
        // El tutorial puede cerrarse aunque el almacenamiento local no esté disponible.
      }
    }
    cambiarVisible(false);
    cambiarPasoActual(0);
  }

  function abrirTutorial() {
    cambiarPasoActual(0);
    cambiarVisible(true);
  }

  function avanzarTutorial() {
    if (pasoActual >= pasos.length - 1) {
      cerrarTutorial();
      return;
    }
    cambiarPasoActual((paso) => paso + 1);
  }

  function retrocederTutorial() {
    cambiarPasoActual((paso) => Math.max(0, paso - 1));
  }

  const valor = useMemo(
    () => ({
      abrirTutorial,
      avanzarTutorial,
      cerrarTutorial,
      etiquetaRol: etiquetasRol[usuario?.rol] || etiquetasRol.citizen,
      pasoActual,
      pasos,
      retrocederTutorial,
      visible,
    }),
    [pasoActual, pasos, usuario?.rol, visible],
  );

  return <ContextoTutorial.Provider value={valor}>{children}</ContextoTutorial.Provider>;
}

export function usarTutorial() {
  const contexto = useContext(ContextoTutorial);
  if (!contexto) {
    throw new Error('usarTutorial debe usarse dentro de ProveedorTutorial');
  }
  return contexto;
}
