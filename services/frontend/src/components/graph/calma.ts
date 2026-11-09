/**
 * Cuándo hay un hueco de verdad en el hilo.
 *
 * Las dos islas de `/graph` tienen una tarea que no se puede partir: levantar
 * la constelación en 3D (300–550 ms) y dibujar por primera vez el grafo del
 * código (151 ms de Svelte más 34 ms de colocar en pantalla; medido a 390 con
 * la CPU a 1/4, con una traza de DevTools). Puestas encima del dedo que está
 * bajando, cada una es un tirón que se ve.
 *
 * No se puede quitar ese trabajo, así que se elige *cuándo*: con la mano del
 * visitante quieta. Y la mano no se mide solo con el scroll — en una vista a
 * pantalla completa hay gestos que no mueven la página ni un píxel y que
 * igualmente son suyos —, así que también cuentan el dedo apoyado y el ratón
 * arrastrando.
 */
export function vigilarLaMano(): {
  /**
   * Hace `fn` cuando lleven `ms` sin que la mano toque nada, y como muy tarde
   * a los `tope` ms: la calma puede no llegar nunca.
   */
  cuandoHayaCalma: (ms: number, fn: () => void, tope?: number) => void;
  /** Deja de escuchar. */
  parar: () => void;
} {
  let ultimo = 0;
  let vivo = true;

  const apuntar = () => {
    ultimo = performance.now();
  };
  // Un ratón que solo pasea por encima no está pidiendo nada; uno que arrastra
  // con el botón apretado, y cualquier dedo apoyado, sí.
  const alMover = (e: PointerEvent) => {
    if (e.pointerType === 'touch' || e.buttons !== 0) apuntar();
  };

  window.addEventListener('scroll', apuntar, { passive: true });
  window.addEventListener('touchmove', apuntar, { passive: true });
  window.addEventListener('pointermove', alMover, { passive: true });

  return {
    /**
     * El tope no es un detalle: quien baja la página sin parar —y un gesto
     * sintético de prueba, que no para en 6 s— no tiene nunca «la mano
     * quieta», y sin tope el bloque se queda para siempre en «Cargando…».
     * Un tirón de 150 ms una vez es peor que nada; un bloque que no llega
     * nunca es peor que el tirón.
     */
    cuandoHayaCalma(ms, fn, tope = ms * 5) {
      const plazo = performance.now() + tope;
      const mirar = () => {
        if (!vivo) return;
        const ahora = performance.now();
        const falta = Math.min(ms - (ahora - ultimo), plazo - ahora);
        if (falta > 0) {
          window.setTimeout(mirar, falta);
          return;
        }
        fn();
      };
      mirar();
    },
    parar() {
      vivo = false;
      window.removeEventListener('scroll', apuntar);
      window.removeEventListener('touchmove', apuntar);
      window.removeEventListener('pointermove', alMover);
    },
  };
}
