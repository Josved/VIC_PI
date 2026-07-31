# Evidencia de validación: mapas, GPS y QR

Fecha: 2026-07-30

## Auditoría por requisito

| Requisito | Evidencia actual | Estado |
| --- | --- | --- |
| Mostrar Google Maps en Android | Bundle Android generado; `PROVIDER_GOOGLE`; manifiesto nativo generado correctamente | Código validado; visual físico pendiente |
| Mostrar Google Maps en iOS | Bundle iOS generado; clave conectada a `ios.config.googleMapsApiKey` | Código validado; visual físico pendiente |
| Solicitar ubicación | Plugin, textos de permiso y permisos Android coarse/fine generados | Código validado; diálogo físico pendiente |
| Obtener GPS al escanear | `getCurrentPositionAsync` con precisión alta dentro del flujo QR | Bundle validado; GPS físico pendiente |
| Detectar QR | `CameraView`, filtro `qr`, bloqueo de eventos duplicados | Bundle validado; cámara física pendiente |
| Crear un contenedor nuevo | Prueba unitaria y prueba Docker por HTTP | Validado |
| Actualizar el mismo QR | Misma ID, acción `actualizado` y contador incrementado | Validado |
| Guardar cada detección | Dos escaneos produjeron dos filas de historial | Validado |
| Mostrar cercanos | Cálculo Haversine, filtro por radio y orden por distancia | API validada; representación física pendiente |
| Persistir en Docker | Tablas creadas en el volumen `vic_data` | Validado |
| Funcionar desde la LAN | Manifest Expo y `/salud` respondieron por `192.168.100.18` | Validado desde el host; teléfono pendiente |
| Preparar Windows para prueba física | Red Wi-Fi privada; firewall `VIC Mobile LAN` limitado a TCP `8081` y `18000`; ADB `37.0.1` instalado | Validado; dispositivo pendiente |
| Build interno con HTTP LAN | Android `usesCleartextTraffic=true`; iOS ATS local en preview | Configuración nativa validada |
| Producción segura respecto a HTTP | Android cleartext `false`; sin excepción ATS en production | Configuración validada |
| Todos los móviles soportados | Android 7+ e iOS 15.1+ empaquetan | Prueba física Android/iPhone pendiente |

## Resultados ejecutados

### Backend

```text
test_autenticacion_es_obligatoria ... ok
test_coordenadas_invalidas_son_rechazadas ... ok
test_qr_crea_actualiza_historial_y_cercania ... ok
Ran 3 tests
OK
```

### Docker, API y persistencia

```text
WEB_OK=True
QR_CREATE_OK=True
QR_UPDATE_OK=True
SAME_CONTAINER_OK=True
SCAN_COUNT=2
NEARBY_FOUND=True
CLEANUP_HISTORY=2
CLEANUP_CONTAINERS=1
CLEANUP_USERS=1
```

### Expo

```text
expo-doctor: 18/18 checks passed
Android bundle: exported
iOS bundle: exported
Web bundle: exported
Expo LAN manifest: HTTP 200
API LAN health: ok
```

### Estación de desarrollo y acceso LAN

```text
Wi-Fi: Private
Firewall: VIC Mobile LAN / TCP 8081,18000 / Private
Expo: http://192.168.100.18:8081 -> HTTP 200
API: http://192.168.100.18:18000/salud -> {"estado":"ok"}
Web Docker: http://192.168.100.18:18080 -> HTTP 200
ADB: 37.0.1-15733141
Dispositivos ADB: ninguno conectado
```

### Configuración nativa temporal

Se ejecutó `expo prebuild` de forma temporal y se comprobó:

```text
android.permission.ACCESS_COARSE_LOCATION
android.permission.ACCESS_FINE_LOCATION
android.permission.CAMERA
android:usesCleartextTraffic="true"
com.google.android.geo.API_KEY=<variable de compilación>
```

La carpeta nativa temporal y la clave ficticia de validación fueron retiradas.

## Condiciones que faltan para cerrar la validación

1. Proporcionar claves reales y restringidas de Google Maps para Android/iOS.
2. Instalar el build o abrir Expo Go en un Android físico.
3. Instalar el build o abrir Expo Go en un iPhone físico.
4. Escanear un QR real junto a un contenedor.
5. Repetir el escaneo desde otra posición y observar el marcador actualizado.
6. Confirmar la respuesta con permisos aceptados, rechazados y bloqueados.
7. Confirmar conectividad desde el teléfono conectado a la misma Wi-Fi; el host
   ya está en perfil privado y tiene una regla limitada a los puertos de Expo y
   de la API.
