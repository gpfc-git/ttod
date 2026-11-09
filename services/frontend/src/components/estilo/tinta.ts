// Pincel y nubes del Oráculo (canvas 2D, sin WebGL ni imágenes).
// El trazo de pincel es una cinta que engorda y adelgaza con la presión; las nubes son ruyi
// (如意, nubes de voluta de la pintura china) con aguada de techo de Tiepolo: el lado de la luz
// crema dorada y el vientre gris rosado.

export type P = { x: number; y: number };

/** Azar con semilla: la misma pantalla pinta siempre las mismas nubes. */
export function azar(semilla: number) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Trazo de pincel: rellena la cinta que rodea `pts` con un ancho que sigue `ancho(t)`, t de 0 a 1.
 * Por defecto la presión entra rápido y sale despacio, como un pincel que se levanta.
 */
export function trazo(
  ctx: CanvasRenderingContext2D, pts: P[], w: number,
  ancho: (t: number) => number = (t) => Math.min(1, t * 6) * (1 - t * t * .85),
  hasta = 1,
) {
  const n = pts.length;
  // `hasta` (0 a 1) pinta solo el principio del trazo, con el mismo grosor que tendrá entero:
  // así se ve el pincel avanzando.
  const m = Math.min(n, Math.ceil(n * hasta));
  if (m < 2) return;
  const izq: P[] = [], der: P[] = [];
  for (let i = 0; i < m; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let nx = -(b.y - a.y), ny = b.x - a.x;
    const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    const r = w * ancho(i / (n - 1)) * .5;
    izq.push({ x: pts[i].x + nx * r, y: pts[i].y + ny * r });
    der.push({ x: pts[i].x - nx * r, y: pts[i].y - ny * r });
  }
  ctx.beginPath();
  ctx.moveTo(izq[0].x, izq[0].y);
  for (let i = 1; i < m; i++) ctx.lineTo(izq[i].x, izq[i].y);
  for (let i = m - 1; i >= 0; i--) ctx.lineTo(der[i].x, der[i].y);
  ctx.closePath();
  ctx.fill();
}

/** Espiral de voluta: de fuera adentro, `vueltas` vueltas, en el sentido `giro` (1 o -1). */
function espiral(c: P, r: number, a0: number, vueltas: number, giro: number, cierre = .82): P[] {
  const pts: P[] = [];
  const pasos = Math.max(24, Math.round(vueltas * 36));
  for (let i = 0; i <= pasos; i++) {
    const t = i / pasos;
    const a = a0 + giro * t * vueltas * Math.PI * 2;
    const rr = r * (1 - cierre * t);
    pts.push({ x: c.x + Math.cos(a) * rr, y: c.y + Math.sin(a) * rr });
  }
  return pts;
}

const TINTA = '52,38,27';

/** Pincel seco: el trazo se abre en pelos que se cortan al final, como un pincel con poca tinta. */
function seco(ctx: CanvasRenderingContext2D, pts: P[], w: number, rnd: () => number, alfa = .7, hasta = 1) {
  const n = pts.length;
  // El cuerpo del trazo: cargado al entrar, se adelgaza y se seca hacia la punta.
  ctx.fillStyle = `rgba(${TINTA},${alfa * .9})`;
  trazo(ctx, pts, w, (t) => Math.min(1, t * 7) * (1 - t * .75), hasta);
  // La parte seca: pelos sueltos solo en la segunda mitad, donde el pincel se queda sin tinta.
  ctx.lineCap = 'round';
  const desde = Math.floor(n * .45);
  for (let h = 0; h < 4; h++) {
    const o = (h / 3 - .5) * w * .9;
    ctx.strokeStyle = `rgba(${TINTA},${alfa * (.25 + rnd() * .35)})`;
    ctx.lineWidth = Math.max(.6, w * (.05 + rnd() * .07));
    ctx.beginPath();
    let pinta = false;
    for (let i = desde; i < n * (.8 + rnd() * .2); i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let nx = -(b.y - a.y), ny = b.x - a.x; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      const x = pts[i].x + nx * o, y = pts[i].y + ny * o;
      if (rnd() < .12 || i > n * hasta) { pinta = false; continue; }
      if (pinta) ctx.lineTo(x, y); else { ctx.moveTo(x, y); pinta = true; }
    }
    ctx.stroke();
  }
}

/** Mancha de aguada: un círculo suave que se funde con el papel. */
function mancha(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, a: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(.6, `rgba(${rgb},${a * .55})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

type Lobulo = { c: P; r: number };
export type PlanNube = { manchas: [number, number, number, string, number][]; borde: P[]; interior: P[] | null; R: number; semilla: number };

/** Todo lo que tiene de azar una nube, decidido una vez: así se puede pintar a trozos (la
 *  aguada aparte, el contorno avanzando) y sale siempre igual. Una nube es una masa de aguada
 *  como en un techo de Tiepolo (luz crema dorada arriba, vientre gris rosado) y encima el
 *  contorno ruyi a pincel seco que se enrolla en voluta, como en la pintura china. */
export function planNube(c: P, R: number, rnd: () => number): PlanNube {
  const lado = rnd() < .5 ? -1 : 1;
  const k = 3 + Math.floor(rnd() * 3);
  const lobulos: Lobulo[] = [];
  for (let i = 0; i < k; i++) {
    const t = i / (k - 1) - .5;
    const r = R * (.3 + rnd() * .2) * (1 - Math.abs(t) * .4);
    lobulos.push({ c: { x: c.x + t * R * 1.45 + (rnd() - .5) * R * .12, y: c.y - Math.cos(t * Math.PI) * R * .3 + (rnd() - .5) * R * .15 }, r });
  }
  const manchas: PlanNube['manchas'] = [];
  // Aguada: muchas manchas, las de abajo frías y rosadas, las de arriba doradas.
  for (const l of lobulos) {
    for (let j = 0; j < 12; j++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * l.r * .7;
      const x = l.c.x + Math.cos(a) * d, y = l.c.y + Math.sin(a) * d * .8;
      const arriba = (l.c.y - y) / l.r; // 1 arriba, -1 abajo
      const rgb = arriba > .1 ? '255,240,206' : arriba > -.35 ? '244,222,192' : '190,162,160';
      manchas.push([x, y, l.r * (.6 + rnd() * .5), rgb, .45 + rnd() * .3]);
    }
  }
  // Base y cola: una franja de aguada larga que se deshilacha hacia un lado.
  for (let i = 0; i <= 26; i += 2) {
    const t = i / 26;
    const x = c.x + lado * R * .7 - lado * t * R * 2.2, y = c.y + R * .3 + Math.sin(t * Math.PI * 1.3) * R * .2;
    manchas.push([x, y, R * .36 * (1 - t * .75), t < .3 ? '240,220,194' : '214,192,180', .45 * (1 - t * .5)]);
  }
  // Contorno ruyi: una sola línea festoneada por encima de los lóbulos, de izquierda a derecha,
  // que en los dos extremos se enrolla hacia dentro en voluta.
  lobulos.sort((a, b) => a.c.x - b.c.x);
  const arco: P[] = [];
  for (const l of lobulos) {
    const r = l.r * .8;
    for (let j = 0; j <= 14; j++) {
      const a = Math.PI * (.98 + 1.04 * j / 14);
      arco.push({ x: l.c.x + Math.cos(a) * r, y: l.c.y + Math.sin(a) * r });
    }
  }
  const voluta = (l: Lobulo, g: number) => {
    const r2 = l.r * (.34 + rnd() * .1), a0 = g > 0 ? 0 : Math.PI;
    const cv = { x: l.c.x + (g > 0 ? 1 : -1) * l.r * .8 - Math.cos(a0) * r2, y: l.c.y };
    return espiral(cv, r2, a0, 1 + rnd() * .3, g, .78);
  };
  const borde = [...voluta(lobulos[0], -1).reverse(), ...arco, ...voluta(lobulos[lobulos.length - 1], 1)];
  // A veces, una voluta suelta dentro de la masa, más fina.
  let interior: P[] | null = null;
  if (rnd() < .6) {
    const l = lobulos[1 + Math.floor(rnd() * (lobulos.length - 2))];
    interior = espiral({ x: l.c.x, y: l.c.y + l.r * .15 }, l.r * .45, Math.PI * 1.1, 1.2, rnd() < .5 ? 1 : -1);
  }
  return { manchas, borde, interior, R, semilla: Math.floor(rnd() * 1e9) };
}

export function aguadaNube(ctx: CanvasRenderingContext2D, p: PlanNube, luz = 1) {
  for (const [x, y, r, rgb, a] of p.manchas) mancha(ctx, x, y, r, rgb, a * luz);
}

/** El contorno de pincel; `hasta` (0 a 1) lo deja a medio trazar. */
export function tintaNube(ctx: CanvasRenderingContext2D, p: PlanNube, luz = 1, hasta = 1) {
  const rnd = azar(p.semilla), a = .85 * Math.min(1, luz);
  seco(ctx, p.borde, p.R * .075, rnd, a, Math.min(1, hasta * 1.25));
  if (p.interior) seco(ctx, p.interior, p.R * .045, rnd, .6 * Math.min(1, luz), Math.max(0, hasta * 1.25 - .25));
}

/** Una nube entera, de una vez. */
export function nube(ctx: CanvasRenderingContext2D, c: P, R: number, rnd: () => number, luz = 1) {
  const p = planNube(c, R, rnd);
  aguadaNube(ctx, p, luz); tintaNube(ctx, p, luz);
}

/** Una voluta de humo: cinta muy fina y translúcida que sube ondulando y se abre. Se pinta una
 *  vez (con pasadas superpuestas que hacen de desenfoque) y luego solo se mueve. */
export function humo(ctx: CanvasRenderingContext2D, x: number, y: number, alto: number, rnd: () => number) {
  const fase = rnd() * 6, giro = rnd() < .5 ? -1 : 1;
  for (let pasada = 0; pasada < 4; pasada++) {
    const pts: P[] = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      pts.push({ x: x + giro * Math.sin(t * 5 + fase + pasada * .25) * alto * .06 * (.3 + t), y: y - t * alto });
    }
    ctx.fillStyle = `rgba(250,246,238,${.34 - pasada * .06})`;
    trazo(ctx, pts, alto * (.018 + pasada * .02), (t) => Math.min(1, t * 4) * (1 - t) ** .6 * (.6 + t));
  }
}
