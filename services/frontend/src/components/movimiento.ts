// El movimiento de la portada y de Sabiduría (hacían falta más
// animaciones), con el pincel y el ritmo del oráculo.
//
// Reglas, medidas con la CPU frenada 4×:
// - Sólo `transform` y `opacity`; nada que repinte en cada fotograma.
// - Sin ScrollTrigger: un único IntersectionObserver dispara cada cosa una
//   vez al llegar (el kit quitó ScrollTrigger de `letras.ts` por lo mismo).
// - Cada entrada dura menos de 0,6 s y acaba a contraste pleno: el texto
//   nunca se queda a media tinta.
// - Con movimiento reducido no se hace nada: todo está ya en su sitio.
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { azar, planNube, aguadaNube, tintaNube } from './estilo/tinta';

gsap.registerPlugin(SplitText);

const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const acciones = new WeakMap<Element, () => void>();
let vigia: IntersectionObserver | null = null;
/** Llama a `fn` una sola vez, cuando `el` asoma por abajo de la pantalla. */
export function alLlegar(el: Element | null, fn: () => void) {
  if (!el || quieto()) return;
  vigia ??= new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      if (!e.isIntersecting) continue;
      vigia!.unobserve(e.target);
      acciones.get(e.target)?.();
      acciones.delete(e.target);
    }
  });
  acciones.set(el, fn);
  vigia.observe(el);
}

/** Las líneas suben desde detrás de su propia máscara, una tras otra. */
export function subirLineas(el: Element | null, retraso = 0) {
  if (!el || quieto()) return;
  // Se parte y se esconde ya, para que al asomar no haya un parpadeo de
  // texto entero que desaparece y vuelve a subir.
  // Por líneas el texto queda entero y en orden dentro de cada línea: no hace falta etiqueta, y un
  // aria-label en un <p> no está permitido (axe: aria-prohibited-attr).
  const partes = SplitText.create(el, { type: 'lines', mask: 'lines', aria: 'none' });
  gsap.set(partes.lines, { yPercent: 105 });
  alLlegar(el, () => {
    gsap.to(partes.lines, {
      yPercent: 0, duration: .5, ease: 'power3.out', delay: retraso,
      stagger: .05, onComplete: () => partes.revert(),
    });
  });
}

/** Un folio (o cualquier caja) sube y se asienta. Sólo `transform`: nunca
 *  pasa por transparente, así que se lee desde el primer fotograma. */
export function asentar(el: Element | null, { y = 36, rotar = 0, retraso = 0 } = {}) {
  if (!el || quieto()) return;
  gsap.set(el, { y, rotate: rotar });
  alLlegar(el, () => {
    gsap.to(el, { y: 0, rotate: 0, duration: .55, ease: 'back.out(1.6)', delay: retraso, clearProps: 'transform' });
  });
}

/** Varios hijos que se asientan en fila (los libros de la balda). */
export function asentarEnFila(caja: Element | null, hijos: string, { y = 24 } = {}) {
  if (!caja || quieto()) return;
  const piezas = caja.querySelectorAll(hijos);
  gsap.set(piezas, { y });
  alLlegar(caja, () => {
    gsap.to(piezas, { y: 0, duration: .5, ease: 'back.out(1.7)', stagger: .04, clearProps: 'transform' });
  });
}

// --- Nubes ruyi --------------------------------------------------------
// Cada `[data-nube]` nace a pincel cuando se ve —el contorno avanza a pincel
// seco y luego entra la aguada—, respira (CSS), se lava y vuelve a nacer con
// otra forma. El pincel sólo pinta con la página quieta: pintar el lienzo en
// cada fotograma de scroll costaba fotogramas de más de 50 ms.
const lineas = new Set<gsap.core.Timeline>();
const pendientes = new Set<() => void>();
let espera = 0;
let moviendo = false;
let escuchando = false;
const enReposo = (f: () => void) => (moviendo ? pendientes.add(f) : f());

export function nubesRuyi(raiz: ParentNode = document) {
  const cajas = raiz.querySelectorAll<HTMLElement>('[data-nube]');
  if (!cajas.length) return;
  const quieta = quieto();
  const dpr = Math.min(devicePixelRatio || 1, 2);
  if (!escuchando && !quieta) {
    escuchando = true;
    addEventListener('scroll', () => {
      moviendo = true;
      lineas.forEach((l) => l.pause());
      clearTimeout(espera);
      espera = window.setTimeout(() => {
        moviendo = false;
        lineas.forEach((l) => l.resume());
        pendientes.forEach((f) => f());
        pendientes.clear();
      }, 220);
    }, { passive: true });
  }
  cajas.forEach((caja) => {
    const rnd = azar(Number(caja.dataset.nube) || 7);
    const dentro = document.createElement('div');
    const agua = document.createElement('canvas');
    const tinta = document.createElement('canvas');
    dentro.append(agua, tinta);
    caja.append(dentro);
    let visible = false;
    let viva = false;

    const nacer = () => {
      viva = true;
      const w = caja.clientWidth, h = caja.clientHeight;
      const R = w / 7.4;
      const plan = planNube({ x: R * 3.7, y: R * 1.5 }, R, azar(Math.floor(rnd() * 1e9)));
      const ka = dpr * .5;
      agua.width = Math.ceil(w * ka); agua.height = Math.ceil(h * ka);
      const ca = agua.getContext('2d')!; ca.setTransform(ka, 0, 0, ka, 0, 0); aguadaNube(ca, plan, 1);
      tinta.width = Math.ceil(w * dpr); tinta.height = Math.ceil(h * dpr);
      const ct = tinta.getContext('2d')!;
      const pinta = (hasta: number) => {
        ct.setTransform(1, 0, 0, 1, 0, 0); ct.clearRect(0, 0, tinta.width, tinta.height);
        ct.setTransform(dpr, 0, 0, dpr, 0, 0); tintaNube(ct, plan, 1, hasta);
      };
      if (quieta) { pinta(1); return; }
      pinta(0);
      const p = { t: 0 };
      const linea = gsap.timeline({ onComplete: () => { lineas.delete(linea); viva = false; if (visible) enReposo(nacer); } });
      lineas.add(linea);
      linea
        .set([agua, tinta], { opacity: 1, scale: 1, y: 0 })
        .set(agua, { opacity: 0 })
        .to(p, { t: 1, duration: 2.2, ease: 'power2.inOut', onUpdate: () => pinta(p.t) })
        .to(agua, { opacity: 1, duration: 1.6, ease: 'power1.out' }, .9)
        .to(tinta, { opacity: 0, duration: 2.4, ease: 'sine.in' }, `+=${7 + rnd() * 5}`)
        .to(agua, { opacity: 0, scale: 1.15, y: -h * .1, duration: 3, ease: 'sine.inOut' }, '<.4')
        .set({}, {}, '+=1');
    };
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !viva) { viva = true; enReposo(nacer); }
    }, { rootMargin: '0px 0px -10% 0px' }).observe(caja);
  });
}
