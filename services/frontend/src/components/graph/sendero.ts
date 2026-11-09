// El sendero: el grafo de los aforismos como instrumento.
//
// Dato real: `GET /api/v1/graph` del backend de TTOD (el mismo endpoint que ya
// usa GraphIsland). Devuelve los nodos con su texto y su idioma, y las aristas
// con su tipo: `related` son las relaciones entre aforismos —el grafo que se
// dibuja— y `translation_of` apunta de la cita en español a su gemela en inglés,
// que es de donde sale el texto en el idioma de la página.
// La ficha de cada aforismo (nivel, etiquetas, qué enseña) vive en
// `GET /api/v1/wisdom/sample`, que devuelve el corpus entero; ese mismo endpoint
// sirve de respaldo para armar el grafo si `/api/v1/graph` no estuviera.
//
// Aquí solo hay funciones puras: construir el grafo, buscar el camino más corto
// y repartir los nodos en el espacio. El dibujo y el movimiento viven en el
// componente; así esto se puede medir sin navegador.

interface NodoApi {
  id: string;
  text: string;
  section: string;
  lang: string;
  origin?: string;
  status?: string;
}

interface AristaApi { source: string; target: string; rel: string }

export interface RespuestaGrafo { nodes: NodoApi[]; edges: AristaApi[] }

/** Forma de `/api/v1/wisdom/sample`: la ficha completa de cada cita. */
export interface EntradaCorpus {
  id: string;
  text: string;
  section: string;
  subsection?: string;
  level?: string;
  teaches?: string;
  tags?: string[];
  lang: string;
  related?: string[] | null;
  relation_edges?: Array<{ target: string; relation_type: string }> | null;
}

/** Convierte el corpus plano en la misma forma que da `/api/v1/graph`. */
export function desdeCorpus(entradas: EntradaCorpus[]): RespuestaGrafo {
  const edges: AristaApi[] = [];
  for (const entrada of entradas) {
    for (const target of entrada.related ?? []) edges.push({ source: entrada.id, target, rel: 'related' });
    for (const borde of entrada.relation_edges ?? []) {
      edges.push({ source: entrada.id, target: borde.target, rel: borde.relation_type || 'related' });
    }
  }
  const nodes = entradas.map((e) => ({ id: e.id, text: e.text, section: e.section, lang: e.lang }));
  return { nodes, edges };
}

export interface NodoSendero {
  /** Id canónico: el de la cita en inglés, que es la que trae las relaciones. */
  id: string;
  /** Texto en el idioma de la página (o el inglés si esa cita no está traducida). */
  texto: string;
  /** Id de la cita que se enseña (el español cuando existe), para enlazar a /wisdom. */
  idTexto: string;
  /** Idioma real del texto que se enseña: avisa cuando no hay traducción. */
  idiomaTexto: string;
  seccion: string;
  grado: number;
}

export interface GrafoSendero {
  nodos: NodoSendero[];
  /** Aristas sin repetir, siempre con `a` < `b` para que no haya duplicados. */
  aristas: Array<{ a: string; b: string }>;
  vecinos: Map<string, string[]>;
  /** Cuántas citas y cuántas aristas trae el corpus entero, para explicar la cuenta. */
  totales: { citas: number; aristas: number; traducciones: number };
}

/** Construye el grafo con las citas del idioma pedido y las relaciones del corpus. */
export function construirGrafo(respuesta: RespuestaGrafo, idioma: string): GrafoSendero {
  const porId = new Map(respuesta.nodes.map((n) => [n.id, n]));

  // Traducciones: la arista `translation_of` va de la cita en un idioma a su
  // gemela, así que vale leída en cualquiera de los dos sentidos.
  const traduccion = new Map<string, NodoApi>();
  let traducciones = 0;
  for (const arista of respuesta.edges) {
    if (arista.rel !== 'translation_of') continue;
    traducciones += 1;
    const desde = porId.get(arista.source);
    const hasta = porId.get(arista.target);
    if (desde && desde.lang === idioma && hasta) traduccion.set(hasta.id, desde);
    if (hasta && hasta.lang === idioma && desde) traduccion.set(desde.id, hasta);
  }

  // Aristas: la relación es simétrica para leerla como un sendero, así que se
  // guarda una sola vez y ordenada.
  const vistas = new Set<string>();
  const aristas: Array<{ a: string; b: string }> = [];
  const vecinos = new Map<string, string[]>();
  const anota = (desde: string, hasta: string) => {
    const lista = vecinos.get(desde) ?? [];
    if (!lista.includes(hasta)) lista.push(hasta);
    vecinos.set(desde, lista);
  };
  for (const arista of respuesta.edges) {
    if (arista.rel !== 'related') continue;
    if (!porId.has(arista.source) || !porId.has(arista.target) || arista.source === arista.target) continue;
    const [a, b] = arista.source < arista.target ? [arista.source, arista.target] : [arista.target, arista.source];
    const clave = `${a}|${b}`;
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    aristas.push({ a, b });
    anota(a, b);
    anota(b, a);
  }

  // Solo se dibuja lo que está relacionado: un aforismo suelto no tiene sendero.
  const nodos: NodoSendero[] = [];
  for (const [id, lista] of vecinos) {
    const base = porId.get(id);
    if (!base) continue;
    const propia = traduccion.get(id);
    const mostrada = propia ?? base;
    nodos.push({
      id,
      texto: mostrada.text,
      idTexto: mostrada.id,
      idiomaTexto: mostrada.lang,
      seccion: base.section,
      grado: lista.length,
    });
  }
  // Comparación simple y no `localeCompare`: los ids son etiquetas ASCII
  // (`arch-060`, `img-074`), así que el orden es el mismo, y `localeCompare`
  // monta una tabla de idioma en cada una de las ~1.400 comparaciones. Era la
  // función más caricaturesca de la vista: 105 ms del hilo principal en medio
  // del scroll (medido a 390 con la CPU a 1/4, perfilando el muestreo).
  nodos.sort((uno, otro) => otro.grado - uno.grado || (uno.id < otro.id ? -1 : uno.id > otro.id ? 1 : 0));
  return {
    nodos,
    aristas,
    vecinos,
    totales: { citas: respuesta.nodes.length, aristas: respuesta.edges.length, traducciones },
  };
}

/**
 * Camino más corto entre dos aforismos (anchura primero: todas las relaciones
 * pesan igual). Devuelve la lista de ids incluidos los extremos, o `[]` si no
 * hay manera de ir de uno a otro — que pasa: el corpus tiene seis islas.
 */
export function caminoMasCorto(vecinos: Map<string, string[]>, origen: string, destino: string): string[] {
  if (!origen || !destino || !vecinos.has(origen) || !vecinos.has(destino)) return [];
  if (origen === destino) return [origen];
  const previo = new Map<string, string>([[origen, '']]);
  let frente = [origen];
  while (frente.length > 0) {
    const siguiente: string[] = [];
    for (const actual of frente) {
      for (const vecino of vecinos.get(actual) ?? []) {
        if (previo.has(vecino)) continue;
        previo.set(vecino, actual);
        if (vecino === destino) {
          const camino = [destino];
          let paso = actual;
          while (paso) {
            camino.unshift(paso);
            paso = previo.get(paso) ?? '';
          }
          return camino;
        }
        siguiente.push(vecino);
      }
    }
    frente = siguiente;
  }
  return [];
}

/**
 * La misma constelación, quieta y en dos dimensiones, para las máquinas que no
 * dibujan 3D. No es una imagen de respaldo: son los mismos 202 aforismos y las
 * mismas 332 relaciones, colocados aquí con las mismas fuerzas que usa la
 * librería en la escena —los unidos se atraen, todos se repelen— pero sin
 * WebGL, sin librería y sin un solo fotograma de animación.
 *
 * Es determinista a propósito: las posiciones de partida son una espiral de
 * ángulo áureo por orden de id, así que la misma lista da siempre el mismo
 * dibujo. Dos visitas enseñan la misma constelación, y una captura de prueba
 * vale para comparar.
 *
 * Coste medido con el corpus entero (202 nodos, 332 aristas, 220 pasadas):
 * 41 ms en esta máquina sin tarjeta gráfica. Se paga una vez, y solo en el
 * camino en el que no se van a pagar los 300–550 ms de levantar la escena 3D.
 */
export function plano2d(
  nodos: Array<{ id: string }>,
  aristas: Array<{ a: string; b: string }>,
  pasadas = 220
): Map<string, { x: number; y: number }> {
  const n = nodos.length;
  const sitio = new Map<string, { x: number; y: number }>();
  if (n === 0) return sitio;

  // Espiral de ángulo áureo: reparte n puntos por el disco sin amontonarlos en
  // el centro, y sin un solo número al azar.
  const AUREO = Math.PI * (3 - Math.sqrt(5));
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  const indice = new Map<string, number>();
  nodos.forEach((nodo, i) => {
    const radio = Math.sqrt((i + 0.5) / n);
    x[i] = radio * Math.cos(i * AUREO);
    y[i] = radio * Math.sin(i * AUREO);
    indice.set(nodo.id, i);
  });

  const pares = aristas
    .map(({ a, b }) => [indice.get(a), indice.get(b)] as [number | undefined, number | undefined])
    .filter((p): p is [number, number] => p[0] !== undefined && p[1] !== undefined);

  const k = Math.sqrt(1 / n); // distancia de reposo entre dos aforismos
  const dx = new Float64Array(n);
  const dy = new Float64Array(n);

  for (let pasada = 0; pasada < pasadas; pasada += 1) {
    dx.fill(0);
    dy.fill(0);
    // Todos se repelen.
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        let ex = x[i] - x[j];
        let ey = y[i] - y[j];
        let d2 = ex * ex + ey * ey;
        if (d2 < 1e-6) {
          // Dos cuerpos exactamente encimados no sabrían hacia dónde separarse:
          // se les da una dirección fija, distinta para cada pareja.
          ex = (i - j) * 1e-3;
          ey = (i + j) * 1e-3;
          d2 = ex * ex + ey * ey;
        }
        const fuerza = (k * k) / d2;
        dx[i] += ex * fuerza;
        dy[i] += ey * fuerza;
        dx[j] -= ex * fuerza;
        dy[j] -= ey * fuerza;
      }
    }
    // Los unidos se atraen.
    for (const [i, j] of pares) {
      const ex = x[i] - x[j];
      const ey = y[i] - y[j];
      const d = Math.hypot(ex, ey) || 1e-3;
      const fuerza = d / k;
      dx[i] -= (ex / d) * fuerza;
      dy[i] -= (ey / d) * fuerza;
      dx[j] += (ex / d) * fuerza;
      dy[j] += (ey / d) * fuerza;
    }
    // Enfriando: el primer paso coloca, los últimos afinan. Y un poco de
    // gravedad al centro para que las islas sueltas no se vayan al infinito.
    const paso = 0.1 * (1 - pasada / pasadas) ** 1.2;
    for (let i = 0; i < n; i += 1) {
      const largo = Math.hypot(dx[i], dy[i]) || 1;
      x[i] += (dx[i] / largo) * Math.min(largo, 1) * paso - x[i] * 0.012;
      y[i] += (dy[i] / largo) * Math.min(largo, 1) * paso - y[i] * 0.012;
    }
  }

  // A la caja [0,1]: el dibujo se escala solo al hueco que tenga.
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < n; i += 1) {
    if (x[i] < minX) minX = x[i];
    if (x[i] > maxX) maxX = x[i];
    if (y[i] < minY) minY = y[i];
    if (y[i] > maxY) maxY = y[i];
  }
  const ancho = maxX - minX || 1;
  const alto = maxY - minY || 1;
  nodos.forEach((nodo, i) => {
    sitio.set(nodo.id, { x: (x[i] - minX) / ancho, y: (y[i] - minY) / alto });
  });
  return sitio;
}

/**
 * `plano2d` recordado entre visitas. El cálculo es determinista (mismo grafo, mismo
 * dibujo) y caro: 202 nodos × 220 pasadas son ~30 ms de hilo a CPU completa
 * (sin freno) y unos 120 ms en un móvil con la CPU a 1/4, justo al abrir
 * la vista. La segunda visita con el mismo grafo lo lee en vez de rehacerlo.
 * La huella cubre ids y aristas: si el corpus cambia, se calcula de nuevo.
 */
export function plano2dRecordado(
  nodos: Array<{ id: string }>,
  aristas: Array<{ a: string; b: string }>,
  almacen: Pick<Storage, 'getItem' | 'setItem'> | null = almacenLocal(),
  incrustado: string | null = planoIncrustado(),
): Map<string, { x: number; y: number }> {
  const huella = huellaPlano(nodos, aristas);
  // Primera visita: el servidor ya lo calculó y lo dejó en la página (ver
  // `lib/grafo.server.ts`). Mismo cálculo, misma huella; si no coincide (el
  // grafo cambió entre medias), se calcula aquí como siempre.
  try {
    const delServidor = JSON.parse(incrustado ?? 'null') as PlanoGuardado | null;
    if (delServidor?.huella === huella && delServidor.pares.length === nodos.length) {
      return new Map(delServidor.pares.map(([id, x, y]) => [id, { x, y }]));
    }
  } catch {
    // Ilegible: se sigue con lo de siempre.
  }
  try {
    const guardado = JSON.parse(almacen?.getItem(CLAVE_PLANO) ?? 'null') as PlanoGuardado | null;
    if (guardado?.huella === huella && guardado.pares.length === nodos.length) {
      return new Map(guardado.pares.map(([id, x, y]) => [id, { x, y }]));
    }
  } catch {
    // Sin almacén o con algo ilegible dentro: se calcula, que es lo de siempre.
  }
  const sitio = plano2d(nodos, aristas);
  try {
    almacen?.setItem(CLAVE_PLANO, JSON.stringify(planoGuardable(nodos, aristas, sitio)));
  } catch {
    // Almacén lleno o bloqueado: la próxima visita lo volverá a calcular.
  }
  return sitio;
}

const CLAVE_PLANO = 'ttod-plano2d';

/** El plano listo para guardarse o incrustarse en la página. */
export type PlanoGuardado = { huella: string; pares: [string, number, number][] };

export function planoGuardable(
  nodos: Array<{ id: string }>,
  aristas: Array<{ a: string; b: string }>,
  sitio = plano2d(nodos, aristas),
): PlanoGuardado {
  return { huella: huellaPlano(nodos, aristas), pares: [...sitio].map(([id, p]) => [id, p.x, p.y]) };
}

/** Id del `<script type="application/json">` con el plano que calcula el servidor. */
export const ID_PLANO_INCRUSTADO = 'ttod-plano2d';

function planoIncrustado(): string | null {
  return typeof document === 'undefined' ? null : document.getElementById(ID_PLANO_INCRUSTADO)?.textContent ?? null;
}

function huellaPlano(nodos: Array<{ id: string }>, aristas: Array<{ a: string; b: string }>): string {
  return huellaDe(`${nodos.map((n) => n.id).join(',')}|${aristas.map(({ a, b }) => `${a}>${b}`).join(',')}`);
}

function almacenLocal(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** FNV-1a de 32 bits: basta para distinguir un grafo de otro, no es seguridad. */
function huellaDe(texto: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i += 1) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${texto.length}-${(h >>> 0).toString(16)}`;
}

/** Las trece secciones del corpus, cada una con su tinta. El color es familia,
 *  no decoración: dice de qué habla el aforismo antes de leerlo. */
const TINTAS: Record<string, string> = {
  images: '#c9a227',
  architecture: '#6f8f7a',
  'code-craft': '#c07b3f',
  'qa-tooling': '#8d93b8',
  wisdom: '#e0cb92',
  'remote-repo': '#a8719a',
  devops: '#7fa8ad',
  debugging: '#c0603f',
  ux: '#a9b36a',
  accessibility: '#d7a583',
  javascript: '#bfae73',
  networking: '#7399bd',
  operations: '#b39a74',
};

export function tintaDeSeccion(seccion: string): string {
  return TINTAS[seccion] ?? '#8a8270';
}

/** Primeras palabras de una cita, para rótulos y listas desplegables. */
export function resumen(texto: string, limite = 64): string {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  return limpio.length <= limite ? limpio : `${limpio.slice(0, limite - 1).trimEnd()}…`;
}
