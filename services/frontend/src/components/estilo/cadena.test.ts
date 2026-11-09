import { describe, expect, it } from 'vitest';
import { arrastrar, difAngulo } from './cadena';

describe('arrastrar', () => {
  it('mantiene el paso entre eslabones y no dobla más del máximo', () => {
    const pts = Array.from({ length: 20 }, (_, i) => ({ x: -i * 10, y: 0 }));
    pts[0] = { x: -5, y: 40 }; // la cabeza da un giro brusco hacia abajo
    const ang = arrastrar(pts, 10, .4);
    for (let i = 1; i < pts.length; i++) {
      expect(Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)).toBeCloseTo(10, 6);
      if (i > 1) expect(Math.abs(difAngulo(ang[i - 1], ang[i]))).toBeLessThanOrEqual(.4 + 1e-9);
    }
  });
});
