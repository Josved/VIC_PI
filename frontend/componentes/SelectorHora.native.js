import DateTimePicker from '@react-native-community/datetimepicker';
import { Clock3 } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colores, espaciado } from './tema';

function convertirAFecha(valor) {
  const [horas, minutos] = valor.split(':').map(Number);
  const fecha = new Date();
  fecha.setHours(horas || 0, minutos || 0, 0, 0);
  return fecha;
}

function convertirAHora(fecha) {
  const horas = String(fecha.getHours()).padStart(2, '0');
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  return `${horas}:${minutos}`;
}

export function SelectorHora({ etiqueta, valor, alCambiar }) {
  const [visible, cambiarVisible] = useState(false);

  function manejarCambio(evento, fecha) {
    if (Platform.OS === 'android') {
      cambiarVisible(false);
    }
    if (evento.type !== 'dismissed' && fecha) {
      alCambiar(convertirAHora(fecha));
    }
  }

  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${etiqueta}: ${valor}`}
        onPress={() => cambiarVisible(true)}
        style={estilos.selector}
      >
        <Clock3 color={colores.primary} size={21} />
        <Text style={estilos.hora}>{valor}</Text>
        <Text style={estilos.accion}>Elegir hora</Text>
      </Pressable>
      {visible ? (
        <View style={estilos.reloj}>
          <DateTimePicker
            value={convertirAFecha(valor)}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            is24Hour
            minuteInterval={5}
            onChange={manejarCambio}
          />
          {Platform.OS === 'ios' ? (
            <Pressable onPress={() => cambiarVisible(false)} style={estilos.confirmar}>
              <Text style={estilos.confirmarTexto}>Confirmar</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

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
  hora: { flex: 1, color: colores.text, fontSize: 18, fontWeight: '900' },
  accion: { color: colores.primary, fontSize: 12, fontWeight: '800' },
  reloj: {
    padding: espaciado.sm,
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 14,
    backgroundColor: colores.white,
  },
  confirmar: { alignSelf: 'flex-end', padding: espaciado.sm },
  confirmarTexto: { color: colores.primary, fontWeight: '900' },
});
