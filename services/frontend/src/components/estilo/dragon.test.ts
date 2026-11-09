import { describe, expect, it } from 'vitest';
import { salida } from './dragon';

describe('salida', () => {
  const folio = { x: 100, y: 200, w: 400, h: 300 };
  it('fuera del margen no hace nada', () => {
    expect(salida({ x: 20, y: 100 }, folio, 50)).toBeNull();
  });
  it('dentro, sale por el borde más cercano', () => {
    expect(salida({ x: 110, y: 350 }, folio, 50)).toBe(Math.PI);      // izquierda
    expect(salida({ x: 300, y: 190 }, folio, 50)).toBe(-Math.PI / 2); // arriba
    expect(salida({ x: 495, y: 360 }, folio, 50)).toBe(0);            // derecha
  });
});
