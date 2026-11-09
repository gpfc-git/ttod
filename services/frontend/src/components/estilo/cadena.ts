// Física del cuerpo del dragón: una cadena de puntos a distancia fija donde cada eslabón sigue al
// anterior y no puede doblarse más de un ángulo máximo. Técnica de «procedural animation» de
// argonautcode/animal-proc-anim (Chain.java), licencia MIT:
//   Copyright (c) 2024 argonautcode — MIT License — https://github.com/argonautcode/animal-proc-anim
// Portada a TypeScript y reescrita para este dragón.
import type { P } from './tinta';

/** Ángulo de b relativo a a, entre -π y π. */
export const difAngulo = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

/**
 * Arrastra la cadena: `pts[0]` ya está en su sitio nuevo; el resto se recoloca a `paso` del
 * anterior sin doblarse más de `maxDoblez` radianes por articulación. Devuelve el ángulo de
 * cada eslabón (hacia la cabeza).
 */
export function arrastrar(pts: P[], paso: number, maxDoblez: number): number[] {
  const ang: number[] = new Array(pts.length);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    let th = Math.atan2(a.y - b.y, a.x - b.x);
    if (i > 1) {
      const d = difAngulo(ang[i - 1], th);
      if (Math.abs(d) > maxDoblez) th = ang[i - 1] + Math.sign(d) * maxDoblez;
    }
    ang[i] = th;
    pts[i] = { x: a.x - Math.cos(th) * paso, y: a.y - Math.sin(th) * paso };
  }
  ang[0] = ang[1];
  return ang;
}
