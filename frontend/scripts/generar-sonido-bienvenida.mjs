import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const directorio = dirname(fileURLToPath(import.meta.url));
const salida = resolve(directorio, '../assets/audio/bienvenida-vic.wav');
const frecuenciaMuestreo = 44100;
const duracion = 1.1;
const muestras = Math.floor(frecuenciaMuestreo * duracion);
const datos = Buffer.alloc(muestras * 2);

const envolvente = (tiempo, inicio, fin) => {
  if (tiempo < inicio || tiempo > fin) return 0;
  const posicion = (tiempo - inicio) / (fin - inicio);
  return Math.sin(Math.PI * posicion) ** 1.7;
};

for (let indice = 0; indice < muestras; indice += 1) {
  const tiempo = indice / frecuenciaMuestreo;
  const primerAcorde = envolvente(tiempo, 0, 0.66);
  const segundoAcorde = envolvente(tiempo, 0.34, 1.08);

  const onda =
    primerAcorde *
      (Math.sin(2 * Math.PI * 523.25 * tiempo) * 0.58 +
        Math.sin(2 * Math.PI * 659.25 * tiempo) * 0.3) +
    segundoAcorde *
      (Math.sin(2 * Math.PI * 659.25 * tiempo) * 0.34 +
        Math.sin(2 * Math.PI * 783.99 * tiempo) * 0.5 +
        Math.sin(2 * Math.PI * 1174.66 * tiempo) * 0.12);

  const valor = Math.max(-1, Math.min(1, onda * 0.2));
  datos.writeInt16LE(Math.round(valor * 32767), indice * 2);
}

const encabezado = Buffer.alloc(44);
encabezado.write('RIFF', 0);
encabezado.writeUInt32LE(36 + datos.length, 4);
encabezado.write('WAVE', 8);
encabezado.write('fmt ', 12);
encabezado.writeUInt32LE(16, 16);
encabezado.writeUInt16LE(1, 20);
encabezado.writeUInt16LE(1, 22);
encabezado.writeUInt32LE(frecuenciaMuestreo, 24);
encabezado.writeUInt32LE(frecuenciaMuestreo * 2, 28);
encabezado.writeUInt16LE(2, 32);
encabezado.writeUInt16LE(16, 34);
encabezado.write('data', 36);
encabezado.writeUInt32LE(datos.length, 40);

mkdirSync(dirname(salida), { recursive: true });
writeFileSync(salida, Buffer.concat([encabezado, datos]));
console.log(`Sonido generado: ${salida}`);
