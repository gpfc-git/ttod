// Las capas del móvil son un recorte de las del escritorio: los
// mismos píxeles, la misma gradación, el 39 % de los bytes. Si alguien vuelve a
// graduar el valle y no repite el recorte, el móvil enseñaría un color y el
// escritorio otro —y eso es exactamente el fallo que se evita—. Aquí se
// comprueba con la huella del fichero, no de memoria.
//
// Si este test falla: vuelve a recortar la franja de `movil.json` de cada capa
// de 3136 px a 1380 de ancho y actualiza sus huellas.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import source from './ValleHero.astro?raw';

const VALLE = fileURLToPath(new URL('../../public/visual-system/valle/', import.meta.url));
const manifiesto = JSON.parse(readFileSync(`${VALLE}movil.json`, 'utf8')) as {
  franja: [number, number];
  capas: Record<string, { origen: string; huella_origen: string; recorte: string; ancho: number }>;
};

const huella = (nombre: string) =>
  createHash('sha256').update(readFileSync(`${VALLE}${nombre}`)).digest('hex');

describe('las capas de móvil del valle', () => {
  it('salen de las capas que se sirven hoy en escritorio', () => {
    for (const [capa, d] of Object.entries(manifiesto.capas)) {
      expect(huella(d.origen), `${capa}: ${d.origen} cambió sin repetir el recorte`).toBe(
        d.huella_origen,
      );
    }
  });

  it('dejan margen de sobra sobre lo que se ve en un marco vertical', () => {
    // En vertical el alto nunca es menor que el ancho, así que `cover` deja ver
    // como mucho 1 / 2,333 = 42,9 % del ancho de la pintura, centrado: la
    // ventana más ancha posible es 28,6 %–71,4 %.
    const [desde, hasta] = manifiesto.franja;
    expect(desde).toBeLessThanOrEqual(0.286);
    expect(hasta).toBeGreaterThanOrEqual(0.714);
  });

  it('las pide el hero solo en vertical, y con su tamaño declarado', () => {
    expect(source).toContain('media="(orientation: portrait) and (max-width: 900px)"');
    expect(source).toContain('${ART}/valle-${c.n}-movil.webp');
    expect(source).toContain('width="1380"');
    for (const d of Object.values(manifiesto.capas)) expect(d.ancho).toBe(1380);
  });
});
