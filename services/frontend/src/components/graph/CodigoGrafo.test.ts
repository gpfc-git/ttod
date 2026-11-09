// @vitest-environment jsdom
// Peor caso del grafo de código (break-ui): fichero que no está, grafo vacío,
// símbolo sin nombre, símbolo con cientos de llamantes.
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, unmount, type Component } from 'svelte';
import CodigoGrafo from './CodigoGrafo.svelte';

const base = {
	generado: '2026-10-16T00:00:00.000Z',
	fuente: 'CodeGraphContext',
	repo: { nombre: 'ttod', commit: 'd9a403c', indexado: '2026-10-16T17:34:40Z' },
	resumen: {
		ficheros: 1,
		modulos_cuerpo: 0,
		funciones: 2,
		clases: 0,
		interfaces: 0,
		llamadas: 1,
		herencias: 0,
		descartados: 0
	},
	modulos: [{ id: 'ttod_core', simbolos: 2, ficheros: 1 }]
};

let montado: Record<string, unknown> | null = null;
function pinta() {
	const host = document.createElement('div');
	document.body.append(host);
	montado = mount(CodigoGrafo as unknown as Component, { target: host, props: { lang: 'es' } });
	return host;
}

function sirve(cuerpo: unknown, ok = true) {
	// jsdom no trae matchMedia y el componente lo usa para saber si va en vertical.
	// `bind:clientWidth` usa ResizeObserver, que jsdom no trae.
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		}
	);
	vi.stubGlobal('matchMedia', (consulta: string) => ({
		matches: false,
		media: consulta,
		addEventListener() {},
		removeEventListener() {}
	}));
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => ({ ok, json: async () => cuerpo }) as unknown as Response)
	);
}

afterEach(() => {
	if (montado) unmount(montado);
	montado = null;
	document.body.innerHTML = '';
	vi.unstubAllGlobals();
});

const espera = () => new Promise((listo) => setTimeout(listo, 0));

describe('CodigoGrafo con datos de peor caso', () => {
	it('avisa, sin romperse, cuando el fichero del grafo no está', async () => {
		sirve({}, false);
		const host = pinta();
		await espera();
		const alerta = host.querySelector('[role="alert"]');
		expect(alerta).toHaveTextContent('No se pudo cargar el fichero del grafo de código.');
		// Y se puede repetir sin recargar la página.
		expect(alerta?.querySelector('button')).toHaveTextContent('Volver a intentarlo');
	});

	it('dice que el grafo está vacío en vez de dibujar un lienzo en blanco', async () => {
		sirve({ ...base, simbolos: [], llamadas: [] });
		const host = pinta();
		await espera();
		expect(host.textContent).toContain('El grafo indexado todavía no tiene símbolos.');
		expect(host.querySelector('.rio')).toBeNull();
	});

	it('un símbolo sin nombre y sin vecinos se enseña igual, y se dice que está aislado', async () => {
		sirve({
			...base,
			simbolos: [{ n: '(sin nombre)', t: 'f', f: '', l: 0, L: 0, g: 'python' }],
			llamadas: []
		});
		const host = pinta();
		await espera();
		expect(host.querySelector('#codigo-centro-nombre')).toHaveTextContent('(sin nombre)');
		expect(host.textContent).toContain('no tiene llamadas indexadas');
	});

	it('con 300 llamantes agrupa por fichero, enseña un tramo y abre el resto', async () => {
		const simbolos = [
			{ n: 'load', t: 'f', f: 'ttod_core/repository.py', l: 30, L: 44, g: 'python' },
			...Array.from({ length: 300 }, (_, i) => ({
				n: `llamante_${i}`,
				t: 'f',
				f: `tests/test_${i % 7}.py`,
				l: i,
				L: i + 2,
				g: 'python'
			}))
		];
		sirve({
			...base,
			simbolos,
			llamadas: Array.from({ length: 300 }, (_, i) => [i + 1, 0])
		});
		const host = pinta();
		await espera();
		const entrada = host.querySelector('.rio__lado--entrada')!;
		expect(entrada.querySelector('h3')).toHaveTextContent('La llaman (300) · 7 ficheros');
		expect(entrada.querySelectorAll('summary')).toHaveLength(7);
		// Cada fichero dice cuántas llamadas trae, separado del nombre.
		expect(entrada.querySelector('summary')).toHaveTextContent('tests/test_0.py · 43');
		// El cero se enseña: no llama a nada, y lo dice.
		expect(host.querySelector('.rio__lado--salida h3')).toHaveTextContent('Llama a (0)');
		const abierto = entrada.querySelector('details[open]')!;
		expect(abierto.querySelectorAll('.rio__funcion')).toHaveLength(6);
		const abre = abierto.querySelector('.codigo__mas') as HTMLButtonElement;
		expect(abre).toHaveTextContent('Ver los 43');
		abre.click();
		await espera();
		expect(abierto.querySelectorAll('.rio__funcion')).toHaveLength(43);
	});
});
