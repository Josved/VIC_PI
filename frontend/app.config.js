const claveAndroid =
  process.env.GOOGLE_MAPS_ANDROID_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
const claveIos =
  process.env.GOOGLE_MAPS_IOS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
const permitirHttpLan = process.env.VIC_ALLOW_INSECURE_HTTP === 'true';

module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    ...(claveAndroid
      ? {
          config: {
            ...config.android?.config,
            googleMaps: { apiKey: claveAndroid },
          },
        }
      : {}),
  },
  ios: {
    ...config.ios,
    infoPlist: {
      ...config.ios?.infoPlist,
      ...(permitirHttpLan
        ? {
            NSAppTransportSecurity: {
              ...config.ios?.infoPlist?.NSAppTransportSecurity,
              NSAllowsLocalNetworking: true,
              NSAllowsArbitraryLoads: true,
            },
          }
        : {}),
    },
    ...(claveIos
      ? {
          config: {
            ...config.ios?.config,
            googleMapsApiKey: claveIos,
          },
        }
      : {}),
  },
  plugins: [
    '@react-native-community/datetimepicker',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'VIC usa tu ubicación para registrar contenedores y mostrar recorridos.',
        locationAlwaysAndWhenInUsePermission:
          'VIC comparte la ubicación del recolector mientras exista un recorrido activo.',
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
        isIosBackgroundLocationEnabled: true,
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission:
          'VIC usa la cámara para escanear el código QR de los contenedores.',
        recordAudioAndroid: false,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'VIC usa tus fotografías como evidencia de una incidencia.',
        cameraPermission:
          'VIC usa la cámara para capturar evidencia de una incidencia.',
      },
    ],
    ['expo-notifications', { color: '#2E7D32' }],
    [
      'expo-build-properties',
      {
        android: { usesCleartextTraffic: permitirHttpLan },
      },
    ],
  ],
});
