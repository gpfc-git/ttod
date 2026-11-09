// Geometría del diagrama de llamadas del grafo de código.
// Referencias: fichas técnicas de llamadas (pkg.go.dev, Alpine,
// Arch, crates.io, deps.dev) y la forma de un sankey: quien llama a un lado, el símbolo
// en medio, a quién llama al otro, y entre medias un cauce por fichero cuyo grosor es
// el número de llamadas que trae. Nunca se dibuja el grafo entero: con 869 funciones
// y 1096 llamadas eso es una mancha.
//
// Las cajas son HTML (botones de verdad, plegables, legibles por un lector de
// pantalla); los cauces son un SVG que se dibuja encima midiendo dónde quedó cada
// caja. Las medidas son píxeles de pantalla: el SVG no se escala nunca.
import { area, curveBumpX, curveBumpY } from 'd3-shape';

type Clase = 'f' | 'c' | 'm' | 'i';

export interface Simbolo {
	n: string;
	t: Clase;
	f: string;
	l: number;
	L: number;
	g: string;
	a?: number;
	c?: number;
	p?: string;
	b?: string[];
}

/** Un vecino: índice del símbolo y si la llamada se resolvió por nombre (heurística). */
export type Vecino = [number, boolean];

export interface Grupo {
	fichero: string;
	lista: Vecino[];
	/** Cuántas de esas llamadas son heurísticas: si son todas, el cauce va punteado. */
	heuristicas: number;
}

/** Llamadas → quién llama a cada símbolo y a quién llama cada símbolo. */
export function adyacencia(llamadas: Array<[number, number] | [number, number, number]>) {
	const entrantes = new Map<number, Vecino[]>();
	const salientes = new Map<number, Vecino[]>();
	for (const [a, b, h] of llamadas) {
		const heuristica = h === 1;
		if (!salientes.has(a)) salientes.set(a, []);
		if (!entrantes.has(b)) entrantes.set(b, []);
		salientes.get(a)!.push([b, heuristica]);
		entrantes.get(b)!.push([a, heuristica]);
	}
	return { entrantes, salientes };
}

/** Agrupa vecinos por el fichero donde viven, el fichero con más llamadas primero. */
export function agrupa(vecinos: Vecino[], simbolos: Simbolo[]): Grupo[] {
	const porFichero = new Map<string, Vecino[]>();
	for (const v of vecinos) {
		const fichero = simbolos[v[0]]?.f ?? '';
		if (!porFichero.has(fichero)) porFichero.set(fichero, []);
		porFichero.get(fichero)!.push(v);
	}
	return [...porFichero.entries()]
		.map(([fichero, lista]) => ({
			fichero,
			lista,
			heuristicas: lista.filter((v) => v[1]).length
		}))
		.sort((a, b) => b.lista.length - a.lista.length || a.fichero.localeCompare(b.fichero));
}

/**
 * Grosor de cada cauce: tantos píxeles por llamada (hasta `porLlamada`), y si no
 * caben en el presupuesto, se reparte en proporción. Así una sola llamada es un
 * hilo y no un río, y el más gordo es siempre el fichero que más llama.
 */
export function grosores(cuentas: number[], presupuesto: number, minimo = 2, porLlamada = 3) {
	const total = cuentas.reduce((n, c) => n + c, 0);
	if (total === 0) return cuentas.map(() => 0);
	const paso = Math.min(porLlamada, presupuesto / total);
	return cuentas.map((c) => Math.max(minimo, c * paso));
}

export interface Punto {
	x: number;
	y: number;
}

export interface Caja {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface Cauce {
	/** Posición del grupo en su lado: sirve para encender el cauce del grupo que se toca. */
	k: number;
	lado: 'entrada' | 'salida';
	d: string;
	w: number;
	heuristica: boolean;
}

interface TramoX {
	x: number;
	y0: number;
	y1: number;
}
interface TramoY {
	y: number;
	x0: number;
	x1: number;
}
// El cauce es una superficie, no una línea: nace fino en la boca del fichero y
// llega al símbolo con todo su grosor, como un afluente. `area` + `curveBump`
// de d3-shape dan las dos orillas con tangentes limpias en cada extremo.
const orillasX = area<TramoX>()
	.x((p) => p.x)
	.y0((p) => p.y0)
	.y1((p) => p.y1)
	.curve(curveBumpX);
const orillasY = area<TramoY>()
	.y((p) => p.y)
	.x0((p) => p.x0)
	.x1((p) => p.x1)
	.curve(curveBumpY);
/** Grosor del cauce en la boca: un hilo, para que no tape el rótulo del fichero. */
const HILO = 3;

/**
 * Los cauces de un lado. `bocas` es dónde nace cada grupo (medido en pantalla) y
 * `centro` la caja del símbolo. En horizontal entran por el canto izquierdo del
 * centro y salen por el derecho, apilados como en un sankey; en vertical (móvil)
 * bajan por el margen izquierdo, que hace de río: cada fichero es un afluente que
 * se une al tronco y entra por arriba en el símbolo; por debajo, el tronco se
 * reparte otra vez hacia lo que llama.
 */
export function cauces(
	lado: 'entrada' | 'salida',
	bocas: Punto[],
	grupos: Grupo[],
	centro: Caja,
	vertical: boolean,
	presupuesto: number
): Cauce[] {
	const anchos = grosores(
		grupos.slice(0, bocas.length).map((g) => g.lista.length),
		presupuesto
	);
	const total = anchos.reduce((n, w) => n + w, 0);
	let acumulado = 0;
	return bocas.map((b, k) => {
		const w = anchos[k];
		const medio = acumulado + w / 2;
		acumulado += w;
		const heuristica = grupos[k].heuristicas === grupos[k].lista.length;
		const hilo = Math.min(w, HILO);
		let d: string | null;
		if (!vertical) {
			const y = centro.y + centro.h / 2 - total / 2 + medio;
			const boca = { x: b.x, y0: b.y - hilo / 2, y1: b.y + hilo / 2 };
			const llega = {
				x: lado === 'entrada' ? centro.x : centro.x + centro.w,
				y0: y - w / 2,
				y1: y + w / 2
			};
			d = orillasX(lado === 'entrada' ? [boca, llega] : [llega, boca]);
		} else {
			// El carril de cada afluente, centrado bajo las bocas, que comparten x.
			const x = b.x - total / 2 + medio;
			const borde = lado === 'entrada' ? centro.y : centro.y + centro.h;
			const giro = lado === 'entrada' ? b.y + 22 : b.y - 22;
			const tramos: TramoY[] = [
				{ y: b.y, x0: b.x - hilo / 2, x1: b.x + hilo / 2 },
				{ y: giro, x0: x - w / 2, x1: x + w / 2 },
				{ y: borde, x0: x - w / 2, x1: x + w / 2 }
			];
			d = orillasY(lado === 'entrada' ? tramos : tramos.reverse());
		}
		return { k, lado, d: d ?? '', w, heuristica };
	});
}

/** Nombre recortado para caber; el nombre entero va en el `aria-label` o el `title`. */
export function recorta(texto: string, maximo: number) {
	return texto.length > maximo ? `${texto.slice(0, maximo - 1)}…` : texto;
}

/** Ruta corta: las dos últimas carpetas y el fichero. */
export function rutaCorta(ruta: string) {
	const partes = ruta.split('/');
	return partes.length <= 3 ? ruta : `…/${partes.slice(-2).join('/')}`;
}
