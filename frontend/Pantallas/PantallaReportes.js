import { MapPinned, QrCode, ScanLine } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Boton } from '../componentes/Boton';
import { PantallaBase } from '../componentes/PantallaBase';
import { colores, espaciado } from '../componentes/tema';

export function PantallaReportes({ navigation }) {
  return (
    <PantallaBase>
      <View style={estilos.encabezado}>
        <QrCode color={colores.secondary} size={48} />
        <Text style={estilos.titulo}>Registrar un contenedor</Text>
        <Text style={estilos.subtitulo}>
          Escanea el QR en el lugar donde está instalado. VIC guardará el GPS
          del teléfono y actualizará su posición en el mapa.
        </Text>
      </View>

      <View style={estilos.fila}>
        <ScanLine color={colores.primary} size={28} />
        <View style={estilos.textoFila}>
          <Text style={estilos.elemento}>1. Escanea el código QR</Text>
          <Text style={estilos.descripcion}>La cámara detecta únicamente códigos QR.</Text>
        </View>
      </View>
      <View style={estilos.fila}>
        <MapPinned color={colores.secondary} size={28} />
        <View style={estilos.textoFila}>
          <Text style={estilos.elemento}>2. Confirma tu ubicación</Text>
          <Text style={estilos.descripcion}>
            Se toma una lectura GPS de alta precisión en ese momento.
          </Text>
        </View>
      </View>
      <View style={estilos.fila}>
        <QrCode color={colores.primary} size={28} />
        <View style={estilos.textoFila}>
          <Text style={estilos.elemento}>3. Alta o actualización</Text>
          <Text style={estilos.descripcion}>
            Si el QR ya existe, su ubicación se reemplaza y queda un registro histórico.
          </Text>
        </View>
      </View>

      <Boton
        texto="Ir al mapa y escanear"
        alPresionar={() => navigation.navigate('Contenedores')}
      />
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
    color: colores.text,
    fontSize: 16,
    fontWeight: '900',
  },
  textoFila: {
    flex: 1,
  },
  descripcion: {
    marginTop: 2,
    color: colores.muted,
    fontSize: 13,
    lineHeight: 18,
  },
});
