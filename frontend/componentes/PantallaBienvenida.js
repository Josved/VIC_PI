import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';

import { colores } from './tema';

const logoVic = require('../assets/branding/vic-logo-master.png');
const sonidoBienvenida = require('../assets/audio/bienvenida-vic.wav');
const usarControladorNativo = Platform.OS !== 'web';

export function PantallaBienvenida({ onFinalizar }) {
  const opacidad = useRef(new Animated.Value(0)).current;
  const escalaLogo = useRef(new Animated.Value(0.76)).current;
  const desplazamiento = useRef(new Animated.Value(18)).current;
  const progreso = useRef(new Animated.Value(0)).current;
  const reproductor = useAudioPlayer(sonidoBienvenida, { downloadFirst: true });
  const finalizada = useRef(false);

  useEffect(() => {
    let activa = true;

    const reproducirSonido = async () => {
      if (Platform.OS === 'web') {
        return;
      }

      try {
        await setAudioModeAsync({
          playsInSilentMode: false,
          interruptionMode: 'mixWithOthers',
        });
        reproductor.volume = 0.3;
        reproductor.play();
      } catch {
        // Algunos navegadores bloquean sonidos automáticos hasta el primer toque.
      }
    };

    reproducirSonido();

    const entrada = Animated.parallel([
      Animated.timing(opacidad, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: usarControladorNativo,
      }),
      Animated.spring(escalaLogo, {
        toValue: 1,
        friction: 6,
        tension: 65,
        useNativeDriver: usarControladorNativo,
      }),
      Animated.timing(desplazamiento, {
        toValue: 0,
        duration: 550,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: usarControladorNativo,
      }),
    ]);

    const animacion = Animated.parallel([
      Animated.sequence([
        entrada,
        Animated.delay(1250),
        Animated.timing(opacidad, {
          toValue: 0,
          duration: 350,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: usarControladorNativo,
        }),
      ]),
      Animated.timing(progreso, {
        toValue: 1,
        duration: 2050,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
    ]);

    animacion.start(({ finished }) => {
      if (activa && finished && !finalizada.current) {
        finalizada.current = true;
        onFinalizar();
      }
    });

    return () => {
      activa = false;
      animacion.stop();
    };
  }, [desplazamiento, escalaLogo, onFinalizar, opacidad, progreso, reproductor]);

  const anchoProgreso = progreso.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={estilos.capa} accessibilityLabel="Bienvenido a VIC">
      <View style={estilos.haloSuperior} />
      <View style={estilos.haloInferior} />

      <Animated.View
        style={[
          estilos.contenido,
          {
            opacity: opacidad,
            transform: [
              { translateY: desplazamiento },
              { scale: escalaLogo },
            ],
          },
        ]}
      >
        <View style={estilos.logoContenedor}>
          <Image source={logoVic} style={estilos.logo} resizeMode="contain" />
        </View>
        <Text style={estilos.titulo}>Bienvenido a VIC</Text>
        <Text style={estilos.subtitulo}>Gestión inteligente de residuos</Text>

        <View style={estilos.barra}>
          <Animated.View style={[estilos.barraActiva, { width: anchoProgreso }]} />
        </View>
        <Text style={estilos.cargando}>Preparando tu comunidad...</Text>
      </Animated.View>
    </View>
  );
}

const estilos = StyleSheet.create({
  capa: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    elevation: 10000,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#F5FBF6',
  },
  haloSuperior: {
    position: 'absolute',
    width: 340,
    height: 340,
    top: -185,
    right: -120,
    borderRadius: 170,
    backgroundColor: '#DDF4E3',
  },
  haloInferior: {
    position: 'absolute',
    width: 300,
    height: 300,
    bottom: -185,
    left: -130,
    borderRadius: 150,
    backgroundColor: '#FFF0DC',
  },
  contenido: {
    width: '86%',
    maxWidth: 420,
    alignItems: 'center',
  },
  logoContenedor: {
    width: 154,
    height: 154,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 42,
    backgroundColor: colores.white,
    shadowColor: '#0A592A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 22,
    elevation: 8,
  },
  logo: {
    width: 126,
    height: 126,
  },
  titulo: {
    marginTop: 30,
    color: colores.text,
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitulo: {
    marginTop: 8,
    color: colores.muted,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  barra: {
    width: 230,
    height: 7,
    marginTop: 32,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#DCE9DF',
  },
  barraActiva: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colores.primary,
  },
  cargando: {
    marginTop: 12,
    color: colores.primaryDark,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
