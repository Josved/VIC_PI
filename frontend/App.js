import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Home, MapPinned, QrCode, Route, ShieldCheck, UserRound } from 'lucide-react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ProveedorSesion, usarSesion } from './componentes/ContextoSesion';
import { colores } from './componentes/tema';
import { PantallaContenedores } from './Pantallas/PantallaContenedores';
import { PantallaAdministracion } from './Pantallas/PantallaAdministracion';
import { PantallaRecuperarContrasena } from './Pantallas/PantallaRecuperarContrasena';
import { PantallaInicio } from './Pantallas/PantallaInicio';
import { PantallaInicioSesion } from './Pantallas/PantallaInicioSesion';
import { PantallaCarga } from './Pantallas/Pantalla_Carga';
import { PantallaPerfil } from './Pantallas/PantallaPerfil';
import { PantallaRegistro } from './Pantallas/PantallaRegistro';
import { PantallaVerificarCorreo } from './Pantallas/PantallaVerificarCorreo';
import { PantallaReportes } from './Pantallas/PantallaReportes';
import { PantallaRutas } from './Pantallas/PantallaRutas';

const PilaSesion = createNativeStackNavigator();
const PestanasPrincipales = createBottomTabNavigator();

function NavegadorSesion() {
  return (
    <PilaSesion.Navigator screenOptions={{ headerShown: false }}>
      <PilaSesion.Screen name="InicioSesion" component={PantallaInicioSesion} />
      <PilaSesion.Screen name="Registro" component={PantallaRegistro} />
      <PilaSesion.Screen name="VerificarCorreo" component={PantallaVerificarCorreo} />
      <PilaSesion.Screen name="RecuperarContrasena" component={PantallaRecuperarContrasena} />
    </PilaSesion.Navigator>
  );
}

function NavegadorPrincipal() {
  const { usuario } = usarSesion();
  const puedeGestionarRutas =
    usuario?.rol === 'collector' || usuario?.rol === 'admin';

  return (
    <PestanasPrincipales.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colores.primary,
        tabBarInactiveTintColor: colores.muted,
        tabBarStyle: {
          borderTopColor: colores.border,
          minHeight: 64,
          paddingTop: 8,
          paddingBottom: 8,
        },
      }}
    >
      <PestanasPrincipales.Screen
        name="Inicio"
        component={PantallaInicio}
        options={{ tabBarLabel: 'Inicio', tabBarIcon: ({ color }) => <Home color={color} size={22} /> }}
      />
      <PestanasPrincipales.Screen
        name="Contenedores"
        component={PantallaContenedores}
        options={{ tabBarLabel: 'Mapa', tabBarIcon: ({ color }) => <MapPinned color={color} size={22} /> }}
      />
      <PestanasPrincipales.Screen
        name="Reportes"
        component={PantallaReportes}
        options={{ tabBarLabel: 'Reportes', tabBarIcon: ({ color }) => <QrCode color={color} size={22} /> }}
      />
      {puedeGestionarRutas ? (
        <PestanasPrincipales.Screen
          name="Rutas"
          component={PantallaRutas}
          options={{
            tabBarLabel: 'Rutas',
            tabBarIcon: ({ color }) => <Route color={color} size={22} />,
          }}
        />
      ) : null}
      {usuario?.rol === 'admin' ? (
        <PestanasPrincipales.Screen
          name="Administracion"
          component={PantallaAdministracion}
          options={{
            tabBarLabel: 'Admin',
            tabBarIcon: ({ color }) => <ShieldCheck color={color} size={22} />,
          }}
        />
      ) : null}
      <PestanasPrincipales.Screen
        name="Perfil"
        component={PantallaPerfil}
        options={{ tabBarLabel: 'Perfil', tabBarIcon: ({ color }) => <UserRound color={color} size={22} /> }}
      />
    </PestanasPrincipales.Navigator>
  );
}

function NavegadorRaiz() {
  const { usuario, cargando } = usarSesion();

  if (cargando) {
    return <PantallaCarga />;
  }

  return <NavigationContainer>{usuario ? <NavegadorPrincipal /> : <NavegadorSesion />}</NavigationContainer>;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ProveedorSesion>
        <NavegadorRaiz />
        <StatusBar style="dark" />
      </ProveedorSesion>
    </SafeAreaProvider>
  );
}
