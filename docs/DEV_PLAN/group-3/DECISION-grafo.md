# Decisión: el sendero y el grafo del código viven en `/graph/path`

Equipo 3 · octubre de 2026

## Dónde vive cada grafo

- **`/graph`** es el grafo de conocimiento del Equipo 2 (`GraphIsland.svelte`) y no se toca: ni
  su página, ni sus pruebas e2e, ni su contrato con `/api/v1/graph`.
- **`/graph/path`** es la vista del Equipo 3: arriba, el sendero entre dos aforismos; debajo, el
  grafo del código de este repositorio. Se llega desde la puerta «Grafo» de la portada y desde el
  pie; la vista enlaza de vuelta a `/graph`.

Una ruta propia en vez de un interruptor dentro de `/graph`: son dos instrumentos distintos. El del
Equipo 2 se filtra por etiqueta y guarda el nodo elegido en la URL; el nuestro elige dos citas y
lee el camino entre ellas, y el del código se busca por símbolo. Compartir controles obligaría a
tocar el módulo de otro equipo.

## El sendero entre dos aforismos

Tres ideas, antes de construir:

- **A · El sendero** (elegida). Eliges dos aforismos y se enciende el camino más corto entre ellos;
  el resto se apaga. El camino **se imprime debajo como una sola lección**, en orden, con las citas
  enteras y el enlace a cada ficha: dos aforismos cualesquiera producen un razonamiento encadenado.
- **B · El mapa de secciones**: islas por sección con zoom semántico. Descartada: enseña la
  taxonomía, que ya está en `/wisdom`.
- **C · La constelación que se escribe sola**: animación de entrada. Descartada: espectáculo de una
  vez; a la segunda visita estorba.

Datos, todos del backend real: `GET /api/v1/graph` (460 nodos y 665 aristas: 435 `related` y 230
`translation_of`) y `GET /api/v1/wisdom/sample` para la ficha de cada cita. De ahí salen **202
aforismos con alguna relación y 332 relaciones**; el texto se enseña en el idioma de la página
siguiendo `translation_of`, y si una cita no está traducida se dice. Camino más corto por anchura
(BFS) en `src/components/graph/sendero.ts`, con pruebas.

Dibujo: `3d-force-graph` (WebGL) cuando el navegador lo tiene. Mientras la librería llega, o sin
WebGL, la constelación se pinta plana en un lienzo 2D con las posiciones ya calculadas en el
servidor (`src/lib/grafo.server.ts`), así que siempre hay algo que tocar. Los dos extremos también
se eligen con el buscador, y la ficha de cada nodo es HTML, no lienzo.

### Referencias

- **danmaps, Advent of Code 2025, día 11**: dos extremos, el camino encendido,
  el resto apagado, leyenda con muestras y la cuenta real. Lo que no se toma: el neón sobre negro.
- **Memotron** (grafo con panel de detalle): controles mínimos y el detalle fuera del lienzo, nunca
  encima.

## El grafo del código

CodeGraphContext indexó este repositorio y `services/frontend/scripts/exportar-grafo-codigo.mjs`
vuelca de ahí un JSON estático a `public/data/grafo-codigo.json` (unos 140 kB): símbolos, ficheros y
llamadas. **No hay endpoint nuevo**: el grafo del código solo cambia cuando cambia el repositorio.
El JSON es una foto del índice (el commit va dentro, en `repo.commit`); para refrescarlo se vuelve
a correr el script con `cgc visualize` en marcha.

El ovillo entero no se pinta nunca: 869 funciones y 1096 llamadas a la vez dan una mancha. Se
enseña un símbolo cada vez, con quién lo llama a un lado y a quién llama al otro, agrupados por
fichero (estructura de Sourcetrail). Los selectores CSS que el indexador etiquetó como clases o
funciones se dejan fuera y se cuentan aparte.

## Backend: `/api/v1/graph` con caché

El grafo se servía volviendo a leer y validar el YAML de 450 kB en cada petición (~1 s). Ahora
`SnapshotService.graph_bytes()` guarda el resultado y solo lo recalcula si cambia el fichero
(fecha y sha256), y la respuesta lleva `ETag` y `Cache-Control: max-age=60`, con 304 si el
navegador ya lo tiene. El cuerpo es byte a byte el mismo; lo cubren dos pruebas nuevas en
`services/backend/tests/test_backend.py`.
