import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colores, espaciado } from './tema';

export function PantallaBase({ children, centrada = true, referenciaScroll = null }) {
  return (
    <SafeAreaView style={estilos.areaSegura}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={estilos.flexible}>
        <ScrollView
          ref={referenciaScroll}
          contentContainerStyle={estilos.contenido}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[estilos.interior, centrada && estilos.centrada]}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  areaSegura: {
    flex: 1,
    backgroundColor: colores.background,
  },
  flexible: {
    flex: 1,
  },
  contenido: {
    flexGrow: 1,
    padding: espaciado.xl,
  },
  interior: {
    flex: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  centrada: {
    justifyContent: 'center',
  },
});
