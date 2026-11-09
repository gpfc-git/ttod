// Exporta el grafo de código que CodeGraphContext indexó sobre este repo a un
// JSON estático que sirve la propia web (`public/data/grafo-codigo.json`).
// Así la vista /graph no depende de Neo4j ni del backend de TTOD: el dato viaja
// con el sitio. Fuente: la API de `cgc visualize` (CodeGraphContext).
//
//   node scripts/exportar-grafo-codigo.mjs <url-api> [ruta-repo]
//   (url-api: la de `cgc visualize`, terminada en /api/graph; ruta-repo: por
//   defecto, la raíz de este repositorio)
//
// Qué se queda y qué no (ver docs/DEV_PLAN/group-3/DECISION-grafo.md):
// CodeGraphContext marca como `Class` las clases CSS de un HTML generado
// (1898 de las 2030) y como `Function` las reglas de un .css. Eso no es código
// que llame a nada: se descarta y se cuenta aparte, para que las cifras de la
// vista sean las del código real.
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = process.argv[2];
if (!API) {
	console.error('Uso: node scripts/exportar-grafo-codigo.mjs <url-api-de-cgc> [ruta-repo]');
	process.exit(1);
}
const REPO = process.argv[3] ?? fileURLToPath(new URL('../../..', import.meta.url)).replace(/\/$/, '');
const SALIDA = fileURLToPath(new URL('../public/data/grafo-codigo.json', import.meta.url));

const LENGUAJES = new Set(['python', 'typescript', 'javascript']);
const CLASE = { Function: 'f', Class: 'c', Interface: 'i' };

const respuesta = await fetch(`${API}?repo_path=${encodeURIComponent(REPO)}`);
if (!respuesta.ok) throw new Error(`La API de CodeGraphContext respondió ${respuesta.status}. ¿Está en marcha cgc visualize?`);
const bruto = await respuesta.json();

const rel = (ruta) => relative(REPO, ruta).split('\\').join('/');
const esCodigo = (n) =>
	CLASE[n.type] &&
	LENGUAJES.has(n.properties?.lang) &&
	n.properties?.type !== 'css_class' &&
	n.properties?.is_dependency === false;

const codigo = bruto.nodes.filter(esCodigo);
// Módulo = las dos primeras carpetas de la ruta; es el agrupador que usa la vista.
const moduloDe = (ruta) => {
	const partes = rel(ruta).split('/');
	return partes.length > 2 ? partes.slice(0, 2).join('/') : partes.slice(0, 1).join('/');
};

const indice = new Map(codigo.map((n, i) => [n.id, i]));
const simbolos = codigo.map((n) => {
	const p = n.properties ?? {};
	const s = {
		n: n.name || '(sin nombre)',
		// El indexador crea un nodo «función» por fichero entero (el cuerpo del
		// módulo): se marca aparte para no contarlo como una función escrita.
		t: p.context_type === 'module' ? 'm' : CLASE[n.type],
		f: rel(p.path ?? n.file ?? ''),
		l: p.line_number ?? 0,
		L: p.end_line ?? p.line_number ?? 0,
		g: p.lang,
	};
	if (Array.isArray(p.args) && p.args.length) s.a = p.args.length;
	if (p.cyclomatic_complexity > 1) s.c = p.cyclomatic_complexity;
	if (p.class_context) s.p = p.class_context; // la clase que lo contiene
	if (Array.isArray(p.bases) && p.bases.length) s.b = p.bases;
	return s;
});

const llamadas = [];
const vistas = new Set();
for (const e of bruto.links) {
	if (e.type !== 'CALLS' && e.type !== 'HEURISTIC_CALLS') continue;
	const a = indice.get(e.source);
	const b = indice.get(e.target);
	if (a === undefined || b === undefined || a === b) continue;
	const clave = `${a}>${b}`;
	if (vistas.has(clave)) continue;
	vistas.add(clave);
	llamadas.push(e.type === 'CALLS' ? [a, b] : [a, b, 1]);
}

const herencias = [];
for (const e of bruto.links) {
	if (e.type !== 'INHERITS') continue;
	const a = indice.get(e.source);
	const b = indice.get(e.target);
	if (a !== undefined && b !== undefined) herencias.push([a, b]);
}

const repo = bruto.nodes.find((n) => n.type === 'Repository')?.properties ?? {};
const ficheros = new Set(simbolos.map((s) => s.f));
const cuenta = (t) => simbolos.filter((s) => s.t === t).length;
const descartados = bruto.nodes.filter((n) => CLASE[n.type] && !esCodigo(n)).length;

const salida = {
	generado: new Date().toISOString(),
	fuente: 'CodeGraphContext (cgc), índice local del repositorio ttod',
	repo: {
		nombre: repo.name ?? 'ttod',
		commit: (repo.commit_hash ?? '').slice(0, 7),
		indexado: repo.indexed_at ?? null,
	},
	resumen: {
		ficheros: ficheros.size,
		modulos_cuerpo: cuenta('m'),
		funciones: cuenta('f'),
		clases: cuenta('c'),
		interfaces: cuenta('i'),
		llamadas: llamadas.length,
		herencias: herencias.length,
		descartados, // selectores CSS que el indexador etiquetó como clases/funciones
	},
	modulos: [...new Set(simbolos.map((s) => moduloDe(`${REPO}/${s.f}`)))]
		.map((m) => ({
			id: m,
			simbolos: simbolos.filter((s) => s.f.startsWith(`${m}/`) || s.f === m).length,
			ficheros: [...ficheros].filter((f) => f.startsWith(`${m}/`) || f === m).length,
		}))
		.sort((a, b) => b.simbolos - a.simbolos),
	simbolos,
	llamadas,
	herencias,
};

await mkdir(dirname(SALIDA), { recursive: true });
await writeFile(SALIDA, JSON.stringify(salida));
console.log(
	`${SALIDA}\n${salida.resumen.funciones} funciones · ${salida.resumen.clases} clases · ` +
		`${salida.resumen.interfaces} interfaces · ${salida.resumen.ficheros} ficheros · ` +
		`${salida.resumen.llamadas} llamadas · ${descartados} selectores CSS descartados`
);
