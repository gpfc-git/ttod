# Criterio de animación de las palabras

Objetivo: una manera mejor de enseñar y animar las palabras. Las letras tienen que
presentarse mucho mejor que con la animación genérica que había.

Esto vale para el hero y para el resto de vistas. No hace falta volver a
pedirlo en cada una: es criterio de aceptación.

## Lo que se hace

**Tinta que empapa el papel.** Cada palabra se revela a través de una máscara de tinta real:
14 estados de una aguada recortada del rollo de Dong Qichang (CC0, Cleveland 1959.46),
apilados en `public/visual-system/tinta/difusion-tinta.webp`. Cada estado es binario, así que
la palabra nunca se queda a medio opaco: llega a manchas y se junta.

Dos modos, los dos ligados al scroll:

- **`niebla`** — el recorrido del paisaje. La frase emerge casi entera y pasa de pálida a
  tinta llena; con `velocidad` va con su capa del parallax.
- **`tinta`** — las citas. Palabra a palabra, y la palabra clave en el rojo del sello
  (`clave="..."`).

## Lo que está prohibido

- El genérico **fade-up palabra a palabra** (`opacity` escalonada). Era lo que había en el
  hero y es lo primero que se quitó.
- **`blur` de CSS** para simular niebla: deja el texto sucio y ya se descartó. La
  niebla es tono (`color-mix` hacia el papel), no desenfoque.
- Polígonos, triángulos o manchas dibujadas a mano. La textura sale de la obra real.

## Cómo se usa

```astro
import TextoTinta from '../components/TextoTinta.astro';

<TextoTinta as="p"  modo="niebla" velocidad={0.6} texto={intro} />
<TextoTinta as="blockquote" modo="tinta" clave="simplicidad" lang="es" texto={cita} />
```

Con `manual` el componente no se engancha solo: lo conduce quien lo pone, escribiendo `--p`
(0 a 13) en cada `.tinta__p`. Hace falta **dentro de una escena fijada** (el hero), donde el
texto no sube por la pantalla y un disparador propio se quedaría clavado en el mismo progreso.
`ValleHero.astro` es el ejemplo: pinta desde su propia línea de tiempo con `pintaTinta()`.

La cuenta vive una sola vez en `src/lib/tinta.ts`.

## Lo que hay que comprobar antes de entregar

1. **La máscara enmascara.** Se lee por **luminancia** (`mask-mode: luminance`): la hoja
   guarda la tinta en gris y un WebP sin canal alfa es opaco de punta a punta, así que por
   alfa la máscara no esconde nada y las palabras salen enteras desde el paso 0. Pasó: la
   máscara se aplicaba y no se notaba. Mídelo en pantalla, no en el código.
2. **La pestaña tiene que estar visible** al medir: con la pestaña oculta no hay
   `requestAnimationFrame`, GSAP se congela y todo parece roto sin estarlo.
3. **Legible a 390 px** y entero al final del recorrido.
4. **Sin movimiento** (`prefers-reduced-motion`) y **sin la hoja descargada**: texto quieto y
   completo. Una máscara que no carga dejaría el elemento invisible, y eso sería perder el
   texto por un archivo.
5. El `lang` de la cita se conserva aunque no sea el de la página.

## Descartado (por si se reconsidera)

- Pincelada que escribe el texto de izquierda a derecha.
- «Palabras entre las montañas» como pieza aparte: se quedó dentro del modo `niebla`, que ya
  mueve la frase con su capa.
