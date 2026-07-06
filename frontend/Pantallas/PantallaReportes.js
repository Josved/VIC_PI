import { ClipboardCheck, Keyboard, QrCode } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { PantallaBase } from '../componentes/PantallaBase';
import { colores, espaciado } from '../componentes/tema';

export function PantallaReportes() {
  return (
    <PantallaBase>
      <View style={estilos.encabezado}>
        <QrCode color={colores.secondary} size={48} />
        <Text style={estilos.titulo}>Reportes de contenedor</Text>
        <Text style={estilos.subtitulo}>Base para QR, numero de serie, evidencia, motivo y confirmacion.</Text>
      </View>

      <View style={estilos.fila}>
        <QrCode color={colores.primary} size={28} />
        <Text style={estilos.elemento}>Escanear codigo QR</Text>
      </View>
      <View style={estilos.fila}>
        <Keyboard color={colores.secondary} size={28} />
        <Text style={estilos.elemento}>Captura manual de numero de serie</Text>
      </View>
      <View style={estilos.fila}>
        <ClipboardCheck color={colores.primary} size={28} />
        <Text style={estilos.elemento}>Formulario con evidencia y confirmacion</Text>
      </View>
    </PantallaBase>
  );
}

const estilos = StyleSheet.create({
  encabezado: {
    alignItems: 'center',
    gap: espaciado.md,
    marginBottom: espaciado.xl,
  },
  titulo: {
    color: colores.text,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitulo: {
    color: colores.muted,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  fila: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    padding: espaciado.lg,
    borderWidth: 1,
    borderColor: colores.border,
    borderRadius: 16,
    marginBottom: espaciado.md,
    backgroundColor: colores.surface,
  },
  elemento: {
    flex: 1,
    color: colores.text,
    fontSize: 17,
    fontWeight: '800',
  },
});
