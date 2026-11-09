// El cielo vivo de CieloRuyi en UN lienzo: nubes ruyi que nacen dibujándose, respiran y se
// deshacen; volutas de humo; y el dragón si lo hay. Un solo lienzo porque en un móvil lento cada
// capa animada aparte (una por nube, una por voluta) costaba más de 40 ms por cuadro en el
// compositor (medido: Commit 42 ms de media). Pintar aquí es barato: las nubes y el
// humo se pintan una vez en lienzos de apoyo y luego solo se estampan; el pincel solo trabaja
// mientras una nube nace. Mientras se hace scroll no se pinta nada.
import { azar, planNube, aguadaNube, tintaNube, humo, type PlanNube } from './tinta';
import { crearVuelo, type Vuelo } from './vuelo';

type Nube = {
  plan: PlanNube; agua: HTMLCanvasElement; tinta: HTMLCanvasElement | null;
  x: number; y: number; w: number; h: number; luz: number; delante: boolean;
  nace: number; vive: number; periodo: number; fase: number;
};
type Voluta = { img: HTMLCanvasElement; x: number; y: number; alto: number; t0: number };

const NACER = 2.2, LAVAR = 3; // segundos que tarda el pincel en dibujar una nube y en deshacerla

function lienzoDe(w: number, h: number, k: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * k)); c.height = Math.max(1, Math.ceil(h * k));
  const x = c.getContext('2d')!; x.setTransform(k, 0, 0, k, 0, 0);
  return [c, x] as const;
}

/**
 * Cambia un lienzo ya pintado por una imagen igual (mismos atributos, mismo sitio) y lo esconde.
 * Un lienzo quieto sigue siendo una capa que el compositor tiene que subir; una imagen no. Se
 * vuelve a mostrar el lienzo para repintarlo (`descongelar`).
 */
export function congelar(lienzo: HTMLCanvasElement) {
  lienzo.toBlob((b) => {
    if (!b) return;
    let foto = lienzo.nextElementSibling as HTMLImageElement | null;
    if (!(foto instanceof HTMLImageElement) || !foto.dataset.foto) {
      foto = document.createElement('img');
      for (const a of Array.from(lienzo.attributes)) foto.setAttribute(a.name, a.value);
      foto.alt = ''; foto.dataset.foto = '1'; lienzo.after(foto);
    }
    const viejo = foto.src, img = foto;
    img.src = URL.createObjectURL(b);
    img.decode().then(() => { img.style.display = ''; lienzo.style.display = 'none'; if (viejo) URL.revokeObjectURL(viejo); }, () => {});
  });
}
const descongelar = (lienzo: HTMLCanvasElement) => {
  const foto = lienzo.nextElementSibling as HTMLElement | null;
  lienzo.style.display = '';
  if (foto?.dataset.foto) foto.style.display = 'none';
};

export function cielo(escena: HTMLElement, lienzo: HTMLCanvasElement, dpr: number) {
  const ctx = lienzo.getContext('2d')!;
  const quieto = matchMedia('(prefers-reduced-motion: reduce)');
  const rnd = azar(Number(escena.dataset.semilla) || 7);
  const vuelo: Vuelo | null = lienzo.dataset.dragon ? crearVuelo(escena, lienzo) : null;
  let vw = 0, vh = 0, reloj = 0;
  let nubes: Nube[] = [], volutas: Voluta[] = [];

  const nueva = (i: number, total: number, ahora: number): Nube => {
    const R = Math.min(vw, innerHeight) * (vw < 700 ? .24 : .16) * (.7 + rnd() * .5);
    const w = R * 7.4, h = R * 2.7, ox = R * 3.7, oy = R * 1.5;
    const x = ((i + .2 + rnd() * .6) / total) * vw;
    const y = vh * (.1 + rnd() * .8);
    const plan = planNube({ x: ox, y: oy }, R, azar(Math.floor(rnd() * 1e9)));
    const delante = x < vw * .2 || x > vw * .8;
    const luz = delante ? 1.3 : .9;
    const [agua, ca] = lienzoDe(w, h, dpr * .5); // la aguada es difusa: basta media densidad
    aguadaNube(ca, plan, luz);
    return { plan, agua, tinta: null, x: x - ox, y: y - oy, w, h, luz, delante, nace: ahora, vive: 7 + rnd() * 7, periodo: 9 + rnd() * 6, fase: rnd() * 6 };
  };

  // Pinta una nube en su momento: naciendo (pincel avanzando + aguada que entra), viva
  // (respira), deshaciéndose (la tinta se lava, la aguada se abre y sube).
  const pintarNube = (n: Nube, t: number) => {
    const edad = t - n.nace;
    const resp = Math.sin((t + n.fase) * Math.PI * 2 / n.periodo);
    let a = 1, esc = 1 + resp * .01, dy = resp * n.h * .02, tinta = 1, hasta = 1;
    if (edad < NACER) { hasta = edad / NACER; a = Math.max(0, (edad - .9) / 1.3); }
    const fin = edad - NACER - n.vive;
    if (fin > 0) { const f = Math.min(1, fin / LAVAR); tinta = 1 - Math.min(1, f * 1.4); a = 1 - f; esc += f * .18; dy -= f * n.h * .12; }
    const cx = n.x + n.w / 2 + resp * n.w * .012, cy = n.y + n.h / 2 + dy;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(esc, esc); ctx.translate(-n.w / 2, -n.h / 2);
    if (a > 0) { ctx.globalAlpha = Math.min(1, a); ctx.drawImage(n.agua, 0, 0, n.w, n.h); }
    if (tinta > 0) {
      ctx.globalAlpha = tinta;
      if (hasta < 1) tintaNube(ctx, n.plan, n.luz, hasta);
      else {
        if (!n.tinta) { const [c, x] = lienzoDe(n.w, n.h, dpr); tintaNube(x, n.plan, n.luz, 1); n.tinta = c; }
        ctx.drawImage(n.tinta, 0, 0, n.w, n.h);
      }
    }
    ctx.restore();
    return fin < LAVAR; // false: ya se deshizo
  };

  const pintarHumo = (v: Voluta, t: number) => {
    const u = ((t - v.t0) % 16) / 16; // sube en 16 s, se abre y se deshace
    if (u < 0) return;
    const a = Math.min(1, u / .3) * (1 - Math.max(0, (u - .55) / .45)) * .85;
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(v.x, v.y - u * v.alto * .6); ctx.scale(.8 + u * .7, 1);
    ctx.drawImage(v.img, -v.alto * .15, -v.alto, v.alto * .3, v.alto);
    ctx.restore();
  };

  const montar = (ahora: number) => {
    vw = lienzo.clientWidth; vh = lienzo.clientHeight;
    lienzo.width = Math.round(vw * dpr); lienzo.height = Math.round(vh * dpr);
    const total = vw < 700 ? 4 : 6;
    // Las primeras nacen escalonadas al cargar.
    nubes = Array.from({ length: total }, (_, i) => { const n = nueva(i, total, ahora); n.nace = ahora + i * .6; return n; });
    volutas = Array.from({ length: vw < 700 ? 2 : 3 }, (_, i) => {
      const alto = vh * (.35 + rnd() * .2);
      const [img, c] = lienzoDe(alto * .3, alto, dpr * .75);
      humo(c, alto * .15, alto, alto * .95, azar(Math.floor(rnd() * 1e9)));
      return { img, x: vw * (.12 + rnd() * .76), y: vh * (.75 + rnd() * .25), alto, t0: ahora + i * 4 };
    });
    vuelo?.medir(vw, vh);
  };

  const pintar = (t: number) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);
    nubes.forEach((n, i) => { if (!n.delante && t >= n.nace && !pintarNube(n, t)) nubes[i] = nueva(i, nubes.length, t + .5 + rnd() * 2); });
    volutas.forEach((v) => pintarHumo(v, t));
    vuelo?.pintar(ctx, t);
    nubes.forEach((n, i) => { if (n.delante && t >= n.nace && !pintarNube(n, t)) nubes[i] = nueva(i, nubes.length, t + .5 + rnd() * 2); });
  };

  // El bucle: solo con el cielo a la vista, la pestaña visible, sin movimiento reducido y sin
  // scroll en curso. Mientras se hace scroll el bucle se para del todo (no basta con no pintar:
  // un requestAnimationFrame vivo obliga al navegador a sincronizar cada cuadro del scroll con el
  // hilo principal, y en el móvil lento eso eran 60 ms por cuadro); sigue medio segundo después de soltar.
  // Y si el aparato no llega (la mediana de cada tanda de 12 cuadros pasa de 25 ms: un móvil sin GPU
  // o muy estrangulado), el cielo se queda quieto, ya dibujado: mejor quieto que a tirones. Solo
  // la perla cambia cuando cambia el estado del oráculo. En un móvil emulado (sin GPU, CPU
  // 4×) pasa esto; en un móvil con GPU los cuadros salen a 16 ms (8 a 120 Hz) y sigue animado.
  let previo = 0, vivo = false, visible = true, coste = 0, cuadro = 0, rodando = false, suelta = 0, torpe = false;
  const intervalos: number[] = [];
  const alRodar = () => {
    rodando = true; parar();
    clearTimeout(suelta);
    suelta = window.setTimeout(() => { rodando = false; arrancar(); }, 500);
  };
  addEventListener('scroll', alRodar, { passive: true });
  const bucle = (ahora: number) => {
    if (!vivo) return;
    if (previo) {
      intervalos.push(ahora - previo);
      if (intervalos.length === 12) {
        const m = [...intervalos].sort((a, b) => a - b)[6];
        intervalos.length = 0;
        if (m > 25) { torpe = true; parar(); removeEventListener('scroll', alRodar); quietoYa(); return; }
      }
    }
    const dt = previo ? Math.min(.05, (ahora - previo) / 1000) : 1 / 60;
    previo = ahora;
    reloj += dt;
    vuelo?.avanzar(dt, reloj, ahora);
    // Si pintar cuesta más de 8 ms de media (un móvil lento), se pinta un cuadro sí y otro no.
    if (!(coste > 8 && (cuadro++ & 1))) {
      const t0 = performance.now(); pintar(reloj);
      coste = coste * .9 + (performance.now() - t0) * .1;
    }
    requestAnimationFrame(bucle);
  };
  const arrancar = () => { if (!vivo && !torpe && !rodando && !quieto.matches && !document.hidden && visible) { vivo = true; previo = 0; requestAnimationFrame(bucle); } };
  const parar = () => { vivo = false; };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) arrancar(); else parar(); }).observe(lienzo);
  document.addEventListener('visibilitychange', () => (document.hidden ? parar() : arrancar()));
  // Movimiento reducido: un solo cuadro con las nubes ya dibujadas y todo quieto.
  const quietoYa = () => {
    descongelar(lienzo);
    // Quieto se pinta una sola vez: entonces a 2× aunque la pantalla sea de 1× (nítido al ampliar
    // y en pantallas retina conectadas después), con el contorno de tinta repintado a esa densidad.
    if (dpr < 2) { dpr = 2; lienzo.width = Math.round(vw * dpr); lienzo.height = Math.round(vh * dpr); nubes.forEach((n) => { n.tinta = null; }); }
    nubes.forEach((n) => { n.nace = reloj - NACER - 1; n.vive = 1e9; }); vuelo?.fijarEstado(); pintar(reloj);
    congelar(lienzo);
  };
  quieto.addEventListener('change', () => (quieto.matches ? (parar(), quietoYa()) : (descongelar(lienzo), arrancar())));
  if (vuelo) new MutationObserver(() => { if (quieto.matches || torpe) quietoYa(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-oraculo'] });
  let espera = 0;
  addEventListener('resize', () => {
    clearTimeout(espera);
    espera = window.setTimeout(() => {
      descongelar(lienzo);
      if (Math.abs(lienzo.clientWidth - vw) > 1 || Math.abs(lienzo.clientHeight - vh) > 120) { montar(reloj); if (quieto.matches || torpe) quietoYa(); else pintar(reloj); }
    }, 150);
  });

  montar(reloj);
  if (quieto.matches) quietoYa(); else { pintar(reloj); arrancar(); }
}
