// El loong (龍) del Oráculo: cuerpo de serpiente sin alas, escamas, cuatro patas de garra,
// cuernos de ciervo, crin, bigotes largos y la perla que persigue. Tinta oscura con escamas de
// oro, a la manera de los «Nueve dragones» (rollo Ming, Met 47.18.86, tinta y oro sobre seda) y
// de Chen Rong (1244, MFA Boston): el cuerpo sale de la niebla de tinta y se mete en las nubes.
import { arrastrar, difAngulo } from './cadena';
import { trazo, type P } from './tinta';

const N = 66;
const TINTA = '#231a12';
const ORO = 'rgba(214,170,84,';
const ROJO = '#9b2f1d';

/** Medio ancho del cuerpo a lo largo (0 cabeza, 1 cola). */
function grosor(t: number) {
  const pecho = Math.min(1, .72 + t * 2.4);
  const cola = 1 - Math.max(0, (t - .38) / .62) ** 1.25 * .9;
  return pecho * cola;
}

export type Caja = { x: number; y: number; w: number; h: number };

/** Ángulo para salir de `caja` agrandada `m` por el lado más cercano, o null si `p` está fuera. */
export function salida(p: P, caja: Caja, m: number): number | null {
  const cx = caja.x + caja.w / 2, cy = caja.y + caja.h / 2, hw = caja.w / 2 + m, hh = caja.h / 2 + m;
  const dx = p.x - cx, dy = p.y - cy;
  if (Math.abs(dx) >= hw || Math.abs(dy) >= hh) return null;
  // Lo que falta hasta cada borde: se sale por el que esté más cerca.
  const fx = hw - Math.abs(dx), fy = hh - Math.abs(dy);
  return fx < fy ? (dx < 0 ? Math.PI : 0) : (dy < 0 ? -Math.PI / 2 : Math.PI / 2);
}

export class Dragon {
  /** Columna física (sigue a la cabeza) y cuerpo visible (la columna con la onda de serpiente). */
  eje: P[] = [];
  pts: P[] = [];
  ang: number[] = [];
  rumbo = 0;
  bigotes: P[][] = [[], []];
  constructor(public W: number, x: number, y: number) {
    for (let i = 0; i < N; i++) this.eje.push({ x: x - i * W * .9, y: y + Math.sin(i * .35) * W });
    for (const b of this.bigotes) for (let i = 0; i < 12; i++) b.push({ x, y });
    this.ondular(0);
  }

  /** Onda que recorre el cuerpo de la cabeza a la cola: las curvas en S de los dragones pintados. */
  private ondular(t: number) {
    const W = this.W, angE = arrastrar(this.eje, W * .9, .5);
    this.pts = this.eje.map((p, i) => {
      const env = Math.min(1, i / 10) * (1 - .35 * i / N);
      const d = Math.sin(t * 1.7 - i * .2) * W * 2.1 * env, a = angE[i] + Math.PI / 2;
      return { x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d };
    });
    this.ang = this.pts.map((_, i) => {
      const q = this.pts[Math.max(0, i - 1)], r = this.pts[Math.min(N - 1, i + 1)];
      return Math.atan2(q.y - r.y, q.x - r.x);
    });
  }

  /** Avanza dt segundos persiguiendo `meta` (la perla), con giro limitado y un leve serpenteo. */
  mover(dt: number, meta: P, t: number, prisa = 1, evita?: Caja) {
    const W = this.W, c = this.eje[0];
    // Si la cabeza entra en el margen de lo que hay que rodear, sale por el lado más cercano y
    // gira más rápido: el cuerpo sigue el camino de la cabeza, así que tampoco entra.
    const huida = evita ? salida(c, evita, W * 5) : null;
    const quiere = huida ?? Math.atan2(meta.y - c.y, meta.x - c.x);
    const dist = Math.hypot(meta.x - c.x, meta.y - c.y);
    const giro = (huida === null ? 1.5 : 5) * prisa * dt;
    this.rumbo += Math.max(-giro, Math.min(giro, difAngulo(this.rumbo, quiere)));
    const v = W * (2.6 + Math.min(2.5, dist / (W * 10))) * prisa;
    const ondula = this.rumbo + Math.sin(t * 1.3) * .3;
    this.eje[0] = { x: c.x + Math.cos(ondula) * v * dt, y: c.y + Math.sin(ondula) * v * dt };
    this.ondular(t);
    // Bigotes: dos cadenas sueltas colgadas del labio que se quedan atrás.
    const a = this.ang[0], h = this.pts[0];
    this.bigotes.forEach((b, k) => {
      const s = k ? 1 : -1;
      b[0] = { x: h.x + Math.cos(a) * W * 2.5 + Math.cos(a + s * 1.57) * W * .25, y: h.y + Math.sin(a) * W * 2.5 + Math.sin(a + s * 1.57) * W * .25 };
      for (let i = 1; i < b.length; i++) {
        const p = b[i], q = b[i - 1];
        // Un poco de onda propia para que floten, no que cuelguen.
        const ox = Math.cos(a + s * 1.2) * Math.sin(t * 2 + i * .6) * W * .05;
        const oy = Math.sin(a + s * 1.2) * Math.sin(t * 2 + i * .6) * W * .05;
        const dx = p.x + ox - q.x, dy = p.y + oy - q.y, l = Math.hypot(dx, dy) || 1;
        b[i] = { x: q.x + dx / l * W * .55, y: q.y + dy / l * W * .55 };
      }
    });
  }

  private lado(i: number, s: number, k = 1): P {
    const p = this.pts[i], a = this.ang[i] + s * Math.PI / 2, w = this.W * grosor(i / (N - 1)) * k;
    return { x: p.x + Math.cos(a) * w, y: p.y + Math.sin(a) * w };
  }

  private pata(ctx: CanvasRenderingContext2D, i: number, s: number, t: number) {
    const W = this.W, a = this.ang[i];
    const raiz = this.lado(i, s, .7);
    const mueve = Math.sin(t * 3.2 + i * .7 + (s > 0 ? 0 : Math.PI)) * .45;
    const a1 = a + s * 2.05 + mueve;           // muslo hacia fuera y atrás
    const rod = { x: raiz.x + Math.cos(a1) * W * 1.6, y: raiz.y + Math.sin(a1) * W * 1.6 };
    const a2 = a1 - s * 1.25 + mueve * .5;     // la pierna vuelve hacia delante
    const pie = { x: rod.x + Math.cos(a2) * W * 1.25, y: rod.y + Math.sin(a2) * W * 1.25 };
    ctx.fillStyle = TINTA;
    trazo(ctx, curva(raiz, rod, pie), W * .9, (u) => 1 - u * .6);
    // Mechones del codo, como llamas.
    ctx.fillStyle = 'rgba(35,26,18,.85)';
    for (let k = 0; k < 3; k++) {
      const b = a1 + Math.PI + s * (.3 + k * .35);
      trazo(ctx, curva(rod, { x: rod.x + Math.cos(b) * W * .9, y: rod.y + Math.sin(b) * W * .9 }, { x: rod.x + Math.cos(b + s * .6) * W * 1.5, y: rod.y + Math.sin(b + s * .6) * W * 1.5 }), W * .3);
    }
    // Garra: cuatro dedos abiertos que se cierran en gancho; uñas de oro.
    for (let k = 0; k < 4; k++) {
      const b = a2 + (k - 1.5) * .45;
      const p1 = { x: pie.x + Math.cos(b) * W * .75, y: pie.y + Math.sin(b) * W * .75 };
      const p2 = { x: p1.x + Math.cos(b + s * 1.1) * W * .45, y: p1.y + Math.sin(b + s * 1.1) * W * .45 };
      ctx.fillStyle = TINTA; trazo(ctx, curva(pie, p1, p2), W * .32, (u) => 1 - u * .8);
      ctx.fillStyle = ORO + '.9)'; trazo(ctx, curva(p1, p2, { x: p2.x + Math.cos(b + s * 2.2) * W * .2, y: p2.y + Math.sin(b + s * 2.2) * W * .2 }), W * .14, (u) => 1 - u);
    }
  }

  pintar(ctx: CanvasRenderingContext2D, t: number) {
    const W = this.W, pts = this.pts;
    const izq: P[] = [], der: P[] = [];
    for (let i = 0; i < N; i++) { izq.push(this.lado(i, -1)); der.push(this.lado(i, 1)); }
    // Niebla de tinta alrededor (las aguadas de Chen Rong): dos cintas anchas muy transparentes.
    const s = W * 9;
    for (let i = 2; i < N; i += 5) ctx.drawImage(niebla(), pts[i].x - s / 2, pts[i].y - s / 2, s, s);

    // Patas de atrás del cuerpo (el lado de abajo de la pantalla queda detrás).
    this.pata(ctx, 9, 1, t); this.pata(ctx, 31, 1, t);

    // Aleta dorsal: pinceladas cortas que se levantan del lomo hacia atrás.
    ctx.fillStyle = TINTA;
    for (let i = 3; i < N - 4; i += 2) {
      const b = izq[i], a = this.ang[i] - Math.PI / 2, g = grosor(i / (N - 1));
      const h = W * (.5 + .25 * Math.sin(i * 1.7)) * g + W * .12;
      const atras = this.ang[i] + Math.PI;
      trazo(ctx, curva(b, { x: b.x + Math.cos(a) * h * .7, y: b.y + Math.sin(a) * h * .7 }, { x: b.x + Math.cos(a) * h + Math.cos(atras) * W * .7, y: b.y + Math.sin(a) * h + Math.sin(atras) * W * .7 }, 6), W * .32 * g + 1, (u) => 1 - u);
    }

    // El cuerpo.
    ctx.beginPath();
    ctx.moveTo(izq[0].x, izq[0].y);
    for (let i = 1; i < N - 1; i++) ctx.quadraticCurveTo(izq[i].x, izq[i].y, (izq[i].x + izq[i + 1].x) / 2, (izq[i].y + izq[i + 1].y) / 2);
    ctx.lineTo(pts[N - 1].x, pts[N - 1].y);
    for (let i = N - 2; i > 0; i--) ctx.quadraticCurveTo(der[i].x, der[i].y, (der[i].x + der[i - 1].x) / 2, (der[i].y + der[i - 1].y) / 2);
    ctx.closePath();
    ctx.fillStyle = 'rgba(35,26,18,.35)'; ctx.lineWidth = W * .25; ctx.strokeStyle = 'rgba(35,26,18,.25)'; ctx.stroke();
    ctx.fillStyle = TINTA; ctx.fill();
    // Volumen: el costado de la luz en sepia, como la tinta diluida de Chen Rong.
    ctx.fillStyle = 'rgba(122,99,71,.55)';
    trazo(ctx, pts.slice(1, N - 3).map((_, j) => this.lado(j + 1, 1, .45)), W * .9, (u) => grosor(u) * Math.min(1, u * 8));

    // Vientre: placas de ocre en el lado de la luz.
    ctx.strokeStyle = 'rgba(216,186,128,.6)';
    ctx.lineWidth = Math.max(1, W * .09);
    ctx.beginPath();
    for (let i = 2; i < N - 4; i++) {
      const a = this.lado(i, 1, .92), b = this.lado(i, 1, .45);
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();

    // Escamas: medias lunas de oro, en filas alternas, abiertas hacia la cola.
    ctx.lineWidth = Math.max(.8, W * .07);
    for (let fila = 0; fila < 2; fila++) {
      ctx.strokeStyle = fila ? 'rgba(236,214,166,.28)' : ORO + '.55)';
      ctx.beginPath();
      for (let i = 2; i < N - 2; i++) {
        const g = grosor(i / (N - 1)), a = this.ang[i], r = W * .3 * g + .4;
        const filas = fila ? [-.32, .25] : [-.62, -.02, .55];
        for (const k of filas) {
          const p = pts[i], o = a + Math.PI / 2, d = fila ? W * .45 : 0;
          const cx = p.x + Math.cos(o) * k * W * g - Math.cos(a) * d, cy = p.y + Math.sin(o) * k * W * g - Math.sin(a) * d;
          ctx.moveTo(cx + Math.cos(a + Math.PI * .6) * r, cy + Math.sin(a + Math.PI * .6) * r);
          ctx.arc(cx, cy, r, a + Math.PI * .6, a + Math.PI * 1.4);
        }
      }
      ctx.stroke();
    }
    // Un filo de luz dorada sobre el lomo, como el brillo de los techos.
    ctx.fillStyle = ORO + '.35)';
    trazo(ctx, izq.slice(1, N - 6).map((p, i) => ({ x: p.x * .8 + pts[i + 1].x * .2, y: p.y * .8 + pts[i + 1].y * .2 })), W * .22);

    // Cola: abanico de llamas.
    const ct = pts[N - 1], ac = this.ang[N - 1] + Math.PI;
    ctx.fillStyle = TINTA;
    for (let k = -2; k <= 2; k++) {
      const b = ac + k * .32 + Math.sin(t * 2 + k) * .12;
      trazo(ctx, curva(ct, { x: ct.x + Math.cos(b) * W * 1.4, y: ct.y + Math.sin(b) * W * 1.4 }, { x: ct.x + Math.cos(b + .5) * W * 2.6, y: ct.y + Math.sin(b + .5) * W * 2.6 }), W * .55);
    }

    // Patas del lado de delante.
    this.pata(ctx, 8, -1, t); this.pata(ctx, 30, -1, t);
    this.cabeza(ctx, t);
  }

  private cabeza(ctx: CanvasRenderingContext2D, t: number) {
    const W = this.W, h = this.pts[0], a = this.ang[0];
    // Bigotes primero, que salen por detrás del hocico.
    ctx.fillStyle = TINTA;
    for (const b of this.bigotes) trazo(ctx, b, W * .28, (u) => (1 - u) ** .7);
    ctx.save();
    ctx.translate(h.x, h.y); ctx.rotate(a); ctx.scale(W * 1.3, W * 1.3);
    // Crin: llamas largas que se van hacia atrás y ondean.
    for (let k = 0; k < 9; k++) {
      const y0 = -.85 + k * .21, o = Math.sin(t * 2.4 + k * .9) * .35;
      ctx.fillStyle = k % 2 ? 'rgba(35,26,18,.9)' : '#3a2a1c';
      trazo(ctx, [{ x: -.1, y: y0 }, { x: -1.4, y: y0 * 1.5 + o * .5 }, { x: -2.6, y: y0 * 1.9 + o }, { x: -3.6 - (k % 3) * .4, y: y0 * 2.1 + o * 1.6 }], .62, (u) => Math.min(1, u * 4) * (1 - u) ** .8);
    }
    // Cuernos de ciervo, con un candil.
    for (const s of [-1, 1]) {
      ctx.fillStyle = s < 0 ? '#5a4128' : '#6f5230';
      const r0 = { x: .2, y: -.75 * (s < 0 ? 1 : .55) }, r1 = { x: -1.1, y: r0.y - 1.0 }, r2 = { x: -2.4, y: r0.y - 1.35 };
      trazo(ctx, curva(r0, r1, r2), .38, (u) => 1 - u * .8);
      trazo(ctx, curva(r1, { x: r1.x - .1, y: r1.y - .5 }, { x: r1.x + .3, y: r1.y - .95 }), .22, (u) => 1 - u * .9);
    }
    // Cráneo y hocico, mandíbula abierta con la boca roja.
    ctx.fillStyle = ROJO;
    ctx.beginPath(); ctx.moveTo(.9, .05); ctx.quadraticCurveTo(2.2, .1, 2.9, .2); ctx.quadraticCurveTo(2.1, .5, .9, .32); ctx.fill();
    ctx.fillStyle = TINTA;
    ctx.beginPath();
    ctx.moveTo(-.5, -.8);
    ctx.bezierCurveTo(.2, -1.25, .9, -1.1, 1.3, -.75);   // frente
    ctx.quadraticCurveTo(2.1, -.6, 2.7, -.62);            // caña de la nariz
    ctx.bezierCurveTo(3.25, -.66, 3.35, -.1, 3.05, .02);   // la trufa
    ctx.quadraticCurveTo(2.0, -.02, .9, .05);             // labio de arriba
    ctx.quadraticCurveTo(.5, .4, -.3, .7);
    ctx.quadraticCurveTo(-.8, .2, -.5, -.8);
    ctx.fill();
    // Mandíbula.
    ctx.beginPath();
    ctx.moveTo(.9, .32); ctx.quadraticCurveTo(2.0, .5, 2.75, .32);
    ctx.quadraticCurveTo(2.7, .75, 2.0, .82); ctx.quadraticCurveTo(.8, .95, -.2, .85); ctx.fill();
    // Barba bajo la quijada.
    for (let k = 0; k < 4; k++) trazo(ctx, [{ x: 1.8 - k * .45, y: .8 }, { x: 1.5 - k * .5, y: 1.3 + Math.sin(t * 2 + k) * .1 }, { x: 1.0 - k * .55, y: 1.65 }], .22);
    // Colmillo, ceja y orificio en oro; el ojo encendido.
    ctx.fillStyle = '#efe4c8';
    ctx.beginPath(); ctx.moveTo(2.4, .05); ctx.quadraticCurveTo(2.5, .32, 2.35, .45); ctx.quadraticCurveTo(2.3, .25, 2.25, .06); ctx.fill();
    ctx.fillStyle = ORO + '.9)';
    trazo(ctx, [{ x: .3, y: -.95 }, { x: .9, y: -1.05 }, { x: 1.5, y: -.8 }], .16);
    trazo(ctx, espiral0(2.85, -.42, .2), .09);
    trazo(ctx, [{ x: 1.2, y: .12 }, { x: 2.0, y: .14 }, { x: 2.8, y: .1 }], .06);
    ctx.fillStyle = '#e8b64e';
    ctx.beginPath(); ctx.ellipse(1.05, -.62, .26, .17, -.15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#120c08';
    ctx.beginPath(); ctx.ellipse(1.1, -.62, .1, .13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff6e0';
    ctx.beginPath(); ctx.arc(1.14, -.67, .035, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

let sprite: HTMLCanvasElement | null = null;
/** Mancha de niebla de tinta, pintada una vez y estampada a lo largo del cuerpo. */
function niebla() {
  if (sprite) return sprite;
  sprite = document.createElement('canvas'); sprite.width = sprite.height = 128;
  const c = sprite.getContext('2d')!;
  let a = 3;
  const r = () => ((a = (a * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 26; i++) {
    const x = 64 + (r() - .5) * 60, y = 64 + (r() - .5) * 60, rr = 14 + r() * 34;
    const g = c.createRadialGradient(x, y, 0, x, y, rr);
    g.addColorStop(0, 'rgba(48,40,34,.07)'); g.addColorStop(1, 'rgba(48,40,34,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, rr, 0, Math.PI * 2); c.fill();
  }
  return sprite;
}

/** Curva cuadrática muestreada (para los trazos de patas, cola y cuernos). */
function curva(a: P, b: P, c: P, n = 10): P[] {
  const out: P[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push({ x: u * u * a.x + 2 * u * t * b.x + t * t * c.x, y: u * u * a.y + 2 * u * t * b.y + t * t * c.y });
  }
  return out;
}
function espiral0(x: number, y: number, r: number): P[] {
  const out: P[] = [];
  for (let i = 0; i <= 16; i++) { const t = i / 16, a = Math.PI + t * Math.PI * 2.2; out.push({ x: x + Math.cos(a) * r * (1 - .7 * t), y: y + Math.sin(a) * r * (1 - .7 * t) }); }
  return out;
}

/** La perla llameante que el dragón persigue; `brillo` sube mientras el oráculo piensa. */
export function perla(ctx: CanvasRenderingContext2D, p: P, W: number, t: number, brillo: number, apagada = 0) {
  // Apagada (mensaje en cola o con error): sin llamas ni halo, una perla gris de ceniza.
  if (apagada > .98) {
    const g = ctx.createRadialGradient(p.x - W * .3, p.y - W * .3, W * .1, p.x, p.y, W * .9);
    g.addColorStop(0, '#e9e4da'); g.addColorStop(1, '#8f877a');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, W * .9, 0, Math.PI * 2); ctx.fill();
    return;
  }
  ctx.globalAlpha = 1 - apagada * .8;
  const r = W * (.9 + brillo * .35);
  const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * (5 + brillo * 6));
  halo.addColorStop(0, `rgba(255,226,150,${.55 + brillo * .35})`);
  halo.addColorStop(.35, `rgba(240,170,80,${.16 + brillo * .2})`);
  halo.addColorStop(1, 'rgba(240,170,80,0)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(p.x, p.y, r * (5 + brillo * 6), 0, Math.PI * 2); ctx.fill();
  // Llamas: lenguas de bermellón de largo distinto que suben y se curvan, no un aro.
  for (let k = 0; k < 3; k++) {
    const a0 = -Math.PI / 2 + (k - 1) * .7 + Math.sin(t * 2.3 + k * 1.7) * .18;
    const largo = r * (1.3 + (k % 2 ? .9 : .4) + brillo * .7 + Math.sin(t * 3 + k) * .25);
    const pts: P[] = [];
    for (let i = 0; i <= 10; i++) {
      const u = i / 10, a = a0 + Math.sin(u * 3 + t * 2.5 + k) * .35 * u;
      pts.push({ x: p.x + Math.cos(a0) * r * .8 + Math.cos(a) * largo * u, y: p.y + Math.sin(a0) * r * .8 + Math.sin(a) * largo * u - u * u * r * .5 });
    }
    ctx.fillStyle = k % 2 ? `rgba(196,74,40,${.7 + brillo * .25})` : `rgba(160,46,28,${.8 + brillo * .2})`;
    trazo(ctx, pts, r * (1.3 - Math.abs(k - 1) * .3), (u) => Math.min(1, u * 5) * (1 - u) ** 1.3);
  }
  const g = ctx.createRadialGradient(p.x - r * .3, p.y - r * .35, r * .1, p.x, p.y, r);
  g.addColorStop(0, '#fffaf0'); g.addColorStop(.6, '#f3dfb0'); g.addColorStop(1, '#c99a4e');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}
