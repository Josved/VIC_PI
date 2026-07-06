import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, MapPinned, QrCode, UserRound } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '../../features/auth/context/AuthContext';
import { ForgotPasswordScreen } from '../../features/auth/screens/ForgotPasswordScreen';
import { LoginScreen } from '../../features/auth/screens/LoginScreen';
import { RegisterScreen } from '../../features/auth/screens/RegisterScreen';
import { RoleSelectionScreen } from '../../features/auth/screens/RoleSelectionScreen';
import { HomeScreen } from '../../features/community/screens/HomeScreen';
import { ContainersScreen } from '../../features/containers/screens/ContainersScreen';
import { ReportsScreen } from '../../features/reports/screens/ReportsScreen';
import { ProfileScreen } from '../../features/profile/screens/ProfileScreen';
import { colors } from '../../shared/theme';
import { AuthStackParamList, MainTabParamList } from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTabs = createBottomTabNavigator<MainTabParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

function MainNavigator() {
  return (
    <MainTabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: styles.tabBar,
      }}
    >
      <MainTabs.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Inicio', tabBarIcon: ({ color }) => <Home color={color} size={22} /> }}
      />
      <MainTabs.Screen
        name="Containers"
        component={ContainersScreen}
        options={{ tabBarLabel: 'Mapa', tabBarIcon: ({ color }) => <MapPinned color={color} size={22} /> }}
      />
      <MainTabs.Screen
        name="Reports"
        component={ReportsScreen}
        options={{ tabBarLabel: 'Reportes', tabBarIcon: ({ color }) => <QrCode color={color} size={22} /> }}
      />
      <MainTabs.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Perfil', tabBarIcon: ({ color }) => <UserRound color={color} size={22} /> }}
      />
    </MainTabs.Navigator>
  );
}

export function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return <NavigationContainer>{user ? <MainNavigator /> : <AuthNavigator />}</NavigationContainer>;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  tabBar: {
    borderTopColor: colors.border,
    minHeight: 64,
    paddingTop: 8,
    paddingBottom: 8,
  },
});

