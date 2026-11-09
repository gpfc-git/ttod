// El vuelo del dragón dentro de un CieloRuyi: a dónde va la perla y cómo reacciona a los
// estados del oráculo (el bucle que lo pinta está en cielo.ts). Si el cielo tiene algo que rodear (data-rodea), el dragón nunca pasa por detrás: la perla
// recorre un arco por fuera (por los lados y por arriba; en el móvil, la franja libre de arriba)
// y la cabeza, si se acerca demasiado, sale por el borde más cercano (`salida` en dragon.ts).
import { Dragon, perla, type Caja } from './dragon';
import type { P } from './tinta';

export type Vuelo = ReturnType<typeof crearVuelo>;

export function crearVuelo(escena: HTMLElement, lienzo: HTMLCanvasElement) {
  const raiz = document.documentElement;
  const conPerla = escena.dataset.piensa === '1';
  // Estados del último mensaje del oráculo (OracleTerminal escribe <html data-oraculo>):
  // pensando → la perla arde y el dragón se enrosca encima del folio; escribiendo → brillo quieto
  // y vuelo lento encima; en-cola / apagado → la perla se apaga y el dragón vuelve a vagar.
  const estado = () => (conPerla ? raiz.dataset.oraculo ?? '' : '');
  const piensa = () => estado() === 'pensando' || estado() === 'escribiendo';
  const selector = escena.dataset.rodea;
  let vw = 0, vh = 0, dragon: Dragon;
  let perlaP: P = { x: 0, y: 0 };

  // Lo que hay que rodear y el borde de abajo de la cabecera, en coordenadas del lienzo. Se mide
  // como mucho dos veces por segundo (getBoundingClientRect fuerza diseño).
  let caja: Caja | null = null, techo = 0, medidaEn = -1e9;
  const medirCaja = (ahora: number) => {
    if (ahora - medidaEn < 500) return;
    medidaEn = ahora;
    const e = lienzo.getBoundingClientRect();
    const r = selector ? document.querySelector(selector)?.getBoundingClientRect() : null;
    caja = r && r.width ? { x: r.x - e.x, y: r.y - e.y, w: r.width, h: r.height } : null;
    const cab = document.querySelector('.ttod-site-header')?.getBoundingClientRect();
    techo = cab ? Math.max(0, cab.bottom - e.y) : 0;
  };

  // A dónde va la perla.
  let raton: P | null = null, ratonHasta = 0;
  const meta = (s: number): P => {
    const W = dragon?.W ?? 12, alto = Math.min(vh, innerHeight + 80);
    const c = caja;
    const arriba = techo + W * 2.5;
    if (c) {
      const libreArriba = Math.max(arriba + W * 4, c.y - W * 6);
      if (piensa()) {
        // Pensando: justo encima del folio, en el centro, dando vueltas cortas.
        const r = Math.min(vw * .2, 110);
        return { x: c.x + c.w / 2 + Math.cos(s * 1.3) * r, y: (arriba + libreArriba) / 2 + Math.sin(s * 1.3) * Math.min(r * .3, (libreArriba - arriba) / 2) };
      }
      const lado = Math.min(c.x, vw - c.x - c.w);
      if (lado < W * 10) {
        // Móvil: el folio ocupa el ancho. El dragón cruza la franja libre de arriba de lado a
        // lado y sale por los bordes de la pantalla, nunca por detrás del folio.
        return { x: vw * (.5 + .75 * Math.sin(s * .12)), y: arriba + (libreArriba - arriba) * (.5 + .4 * Math.sin(s * .37 + 1)) };
      }
      // Escritorio: un arco en ∩ alrededor del folio (baja por un lado, cruza por arriba, baja por
      // el otro) recorrido de ida y vuelta.
      const xi = c.x / 2, xd = c.x + c.w + lado / 2, fondoY = Math.min(alto - W * 5, c.y + c.h);
      const yA = (arriba + libreArriba) / 2;
      const tramos = [{ x: xi, y: fondoY }, { x: xi, y: yA }, { x: xd, y: yA }, { x: xd, y: fondoY }];
      const u = (.5 - .5 * Math.cos(s * .09)) * 3, k = Math.min(2, Math.floor(u)), f = u - k;
      return { x: tramos[k].x + (tramos[k + 1].x - tramos[k].x) * f, y: tramos[k].y + (tramos[k + 1].y - tramos[k].y) * f };
    }
    if (raton && performance.now() < ratonHasta) return raton;
    return { x: vw * (.5 + .36 * Math.sin(s * .13)), y: alto * (.36 + .22 * Math.sin(s * .21 + 1)) };
  };

  let brillo = 0, apagada = 0;
  const avanzar = (dt: number, s: number, ahora: number) => {
    medirCaja(ahora);
    const m = meta(s), e = estado();
    // El dragón va hacia el recorrido y la perla va siempre delante de su boca, a pocos cuerpos:
    // la persigue de cerca, nunca suelta por el cielo.
    const h = dragon.pts[0], dx = m.x - h.x, dy = m.y - h.y, d = Math.hypot(dx, dy) || 1;
    const lejos = Math.min(d, dragon.W * 5);
    const q = { x: h.x + dx / d * lejos, y: h.y + dy / d * lejos };
    perlaP = { x: perlaP.x + (q.x - perlaP.x) * Math.min(1, dt * 3), y: perlaP.y + (q.y - perlaP.y) * Math.min(1, dt * 3) };
    const k = Math.min(1, dt * 2);
    brillo += ((e === 'pensando' ? 1 : e === 'escribiendo' ? .55 : 0) - brillo) * k;
    apagada += ((e === 'en-cola' || e === 'apagado' ? 1 : 0) - apagada) * k;
    dragon.mover(dt, m, s, e === 'escribiendo' ? .7 : e === 'pensando' ? 1.4 : 1 - apagada * .35, caja ?? undefined);
  };
  const pintar = (ctx: CanvasRenderingContext2D, s: number) => {
    dragon.pintar(ctx, s);
    perla(ctx, perlaP, dragon.W, s, brillo, apagada);
  };
  // Con movimiento reducido no hay bucle: el estado se aplica de golpe.
  const fijarEstado = () => {
    const e = estado();
    brillo = e === 'pensando' ? 1 : e === 'escribiendo' ? .55 : 0;
    apagada = e === 'en-cola' || e === 'apagado' ? 1 : 0;
  };
  const medir = (w: number, h: number) => {
    vw = w; vh = h;
    medidaEn = -1e9; medirCaja(performance.now());
    // El grosor del dragón: protagonista, un 4,5 % de la pantalla (hasta 26 px), y algo menos si
    // la franja libre encima de lo que rodea es estrecha (tiene que caber sin tocarlo).
    let W = Math.max(10, Math.min(26, Math.min(vw, innerHeight) * .045));
    if (caja) W = Math.max(10, Math.min(W, (caja.y - techo) / 10));
    const ini = meta(0);
    dragon = new Dragon(W, ini.x - W * 20, ini.y);
    perlaP = { ...dragon.pts[0] };
    // Seis segundos de vuelo antes del primer cuadro: entra ya serpenteando, no estirado.
    const t0 = performance.now();
    for (let i = 0; i < 360; i++) avanzar(1 / 60, i / 60, t0);
  };
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = lienzo.getBoundingClientRect();
    raton = { x: e.clientX - r.x, y: e.clientY - r.y }; ratonHasta = performance.now() + 2500;
  }, { passive: true });
  return { medir, avanzar, pintar, fijarEstado };
}
