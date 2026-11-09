// Letras que se entintan (estilo cielo ruyi): cada letra llega como tinta fresca —en oro, un poco
// baja y ladeada— y se asienta en su color, una tras otra, como un pincel que escribe. GSAP
// SplitText (gratuito para uso comercial desde 2025: https://gsap.com/standard-license/).
// Al acabar se deshace la división: el texto vuelve a ser el que era (los lectores de pantalla y
// React no ven nunca los trozos). Con movimiento reducido no se hace nada: el texto está quieto.
// Sin ScrollTrigger a propósito: un oyente de scroll más obliga a pasar cada cuadro del scroll por
// el hilo principal, y en el móvil lento eso se notaba.
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// Por palabras el texto se sigue leyendo entero sin etiqueta: un aria-label en un <p> o <span>
// no está permitido (axe: aria-prohibited-attr). Por letras sí hace falta, y solo se usa en títulos.

/** Entinta `el` letra a letra ('chars', títulos) o palabra a palabra ('words', frases largas). */
export function entintar(el: Element | null, { retraso = 0, por = 'chars' as 'chars' | 'words' } = {}) {
  if (!el || quieto()) return;
  const partes = SplitText.create(el, { type: por === 'chars' ? 'words,chars' : 'words', aria: por === 'words' ? 'none' : 'auto' });
  const piezas = por === 'chars' ? partes.chars : partes.words;
  gsap.from(piezas, {
    // Nunca desde opacidad 0: así el título cuenta para el LCP desde el primer cuadro.
    opacity: .15, yPercent: 35, rotate: por === 'chars' ? -6 : 0, color: '#c9a04a',
    duration: por === 'chars' ? .9 : 1.1, ease: 'power3.out', delay: retraso,
    stagger: { each: por === 'chars' ? .035 : .06 },
    onComplete: () => partes.revert(),
  });
}
