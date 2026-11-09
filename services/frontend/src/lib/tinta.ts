/**
 * La tinta que empapa el papel, compartida entre `TextoTinta.astro`
 * —que se engancha solo al scroll— y `ValleHero.astro` —que la lleva de la
 * mano desde su propia línea de tiempo, porque dentro de una escena fijada el
 * texto no sube por la pantalla y un disparador propio nunca avanzaría—.
 */

const HOJA_TINTA = '/visual-system/tinta/difusion-tinta.webp';

/** Estados de la aguada apilados en la hoja. */
const PASOS_TINTA = 14;

/**
 * Cuánto del recorrido se reparte entre palabras. En una cita la tinta avanza
 * palabra a palabra; en el paisaje la frase emerge casi entera, porque lo que
 * cuenta es que salga de la niebla, no que se deletree.
 */
export const REPARTO = { tinta: 0.62, niebla: 0.25 } as const;

/**
 * Hasta que la hoja no está descargada no se esconde ni una palabra: una
 * máscara que no carga deja el elemento invisible, y eso sería perder el texto
 * por un archivo.
 *
 * La hoja se baja **una sola vez**. Antes eran dos consumidores —este
 * guion, que decide si la máscara se activa, y el `mask-image` del CSS, que
 * entra después con `[data-tinta-listo]`— y, como `public/` se sirve con
 * `max-age=0`, el segundo revalidaba y el servidor contestaba 200 con el
 * fichero entero: 322 + 321 KB medidos en la portada a 390. Ahora se baja aquí,
 * en prioridad baja (la primera imagen de la portada, que es el LCP, va antes
 * que una máscara de texto), y el CSS pinta desde esta misma copia a través de
 * `--tinta-hoja`. Una petición, y sin depender de las cabeceras de caché.
 */
let pendiente: Promise<boolean> | undefined;

/** El nombre de la variable que lleva la hoja ya descargada al CSS. */
const VAR_HOJA = '--tinta-hoja';

export function cargaHojaTinta(): Promise<boolean> {
  if (!pendiente) {
    pendiente = (async () => {
      try {
        const respuesta = await fetch(HOJA_TINTA, { priority: 'low' } as RequestInit);
        if (!respuesta.ok) return false;
        const copia = URL.createObjectURL(await respuesta.blob());
        document.documentElement.style.setProperty(VAR_HOJA, `url("${copia}")`);
        return true;
      } catch {
        // Sin hoja no hay máscara, y el texto se queda entero y legible.
        return false;
      }
    })();
  }
  return pendiente;
}

/**
 * Enciende la máscara **un bloque por fotograma**. Cuando la hoja
 * llega, encender todos a la vez obligaba al navegador a aplicar la máscara a
 * varios cientos de palabras en el mismo fotograma: un solo fotograma de 50 ms
 * en medio del scroll, el único que se salía del presupuesto de móvil. Cada
 * bloque es un trabajo pequeño; repartidos, ninguno se nota.
 *
 * Bloque por bloque, en orden: el primero —el que se está viendo— se enciende
 * en el fotograma siguiente, igual que antes.
 */
export function enciendeTinta(bloques: HTMLElement[], antesDeCadaUno?: (el: HTMLElement) => void) {
  let i = 0;
  const siguiente = () => {
    if (i >= bloques.length) return;
    const el = bloques[i++];
    antesDeCadaUno?.(el);
    el.dataset.tintaListo = '1';
    if (i < bloques.length) requestAnimationFrame(siguiente);
  };
  requestAnimationFrame(siguiente);
}

/**
 * Escribe en cada palabra qué estado de la aguada le toca. Cada estado es
 * binario, así que la palabra nunca se queda a medio opaco: no hay fundido y
 * no hay desenfoque, hay tinta que llega a manchas y se junta.
 */
/**
 * Qué estado tiene escrito ya cada palabra. La aguada son 14 estados y el scroll
 * llama en cada fotograma: sin esto, 13 de cada 14 escrituras ponían el número
 * que ya estaba, y cada una invalida el estilo de su palabra (en la
 * portada eran 66 ms de hilo en cinco segundos de scroll). Vive en una
 * propiedad del propio elemento, no en un atributo, para no tocar el DOM por
 * escribir el apunte.
 */
const ESCRITO = Symbol('paso de tinta');
type Palabra = HTMLElement & { [ESCRITO]?: number };

export function pintaTinta(palabras: HTMLElement[], avance: number, reparto: number, pasos = PASOS_TINTA) {
  const total = palabras.length;
  for (let i = 0; i < total; i++) {
    const desde = (i / total) * reparto;
    const p = (avance - desde) / (1 - reparto);
    const paso = Math.round(Math.min(1, Math.max(0, p)) * (pasos - 1));
    const palabra = palabras[i] as Palabra;
    if (palabra[ESCRITO] === paso) continue;
    palabra[ESCRITO] = paso;
    palabra.style.setProperty('--p', String(paso));
  }
}

/**
 * Devuelve las palabras a su estado por defecto —tinta llena— y borra el
 * apunte: quien quita la máscara tiene que quitar también la memoria, o la
 * siguiente pasada se creería que ya está escrito lo que acaba de borrar.
 */
export function olvidaTinta(palabras: HTMLElement[]) {
  for (const palabra of palabras as Palabra[]) {
    delete palabra[ESCRITO];
    palabra.style.removeProperty('--p');
  }
}
