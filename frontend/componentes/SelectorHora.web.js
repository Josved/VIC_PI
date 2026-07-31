import { Clock3 } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colores, espaciado } from './tema';

export function SelectorHora({ etiqueta, valor, alCambiar }) {
  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <View style={estilos.selector}>
        <Clock3 color={colores.primary} size={21} />
        <input
          aria-label={etiqueta}
          type="time"
          value={valor}
          step="300"
          onChange={(evento) => alCambiar(evento.target.value)}
          style={estiloEntrada}
        />
      </View>
      <Text style={estilos.ayuda}>Selecciona una hora válida en intervalos de cinco minutos.</Text>
    </View>
  );
}

const estiloEntrada = {
  flex: 1,
  width: '100%',
  border: 0,
  outline: 'none',
  color: colores.text,
  backgroundColor: 'transparent',
  fontFamily: 'inherit',
  fontSize: 18,
  fontWeight: 800,
};

const estilos = StyleSheet.create({
  contenedor: { gap: espaciado.xs },
  etiqueta: { color: colores.text, fontSize: 14, fontWeight: '800' },
  selector: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    paddingHorizontal: espaciado.lg,
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 14,
    backgroundColor: colores.surface,
  },
  ayuda: { color: colores.muted, fontSize: 12 },
});
