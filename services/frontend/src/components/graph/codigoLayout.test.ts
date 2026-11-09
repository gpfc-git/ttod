import { describe, expect, it } from 'vitest';
import { adyacencia, agrupa, cauces, grosores, recorta, rutaCorta, type Simbolo } from './codigoLayout';

const simbolos: Simbolo[] = [
	{ n: 'validate_root', t: 'f', f: 'ttod_core/repository.py', l: 10, L: 20, g: 'python' },
	{ n: 'load', t: 'f', f: 'ttod_core/repository.py', l: 30, L: 44, g: 'python' },
	{ n: 'main', t: 'f', f: 'cli.py', l: 1, L: 9, g: 'python' },
	{ n: '(sin nombre)', t: 'f', f: '', l: 0, L: 0, g: 'python' }
];

describe('adyacencia', () => {
	it('separa quién llama de a quién se llama y marca las heurísticas', () => {
		const { entrantes, salientes } = adyacencia([
			[2, 0],
			[1, 0, 1]
		]);
		expect(entrantes.get(0)).toEqual([
			[2, false],
			[1, true]
		]);
		expect(salientes.get(2)).toEqual([[0, false]]);
		expect(entrantes.has(2)).toBe(false);
	});
});

describe('agrupa', () => {
	it('un grupo por fichero, el que más llama primero, con sus heurísticas contadas', () => {
		const g = agrupa(
			[
				[2, false],
				[0, true],
				[1, true]
			],
			simbolos
		);
		expect(g.map((x) => [x.fichero, x.lista.length, x.heuristicas])).toEqual([
			['ttod_core/repository.py', 2, 2],
			['cli.py', 1, 0]
		]);
	});
});

describe('grosores', () => {
	it('reparte el presupuesto en proporción y nunca baja del mínimo', () => {
		expect(grosores([3, 1], 40, 2, Infinity)).toEqual([30, 10]);
		// Una sola llamada es un hilo de 3 px, no un río de todo el presupuesto.
		expect(grosores([1], 40)).toEqual([3]);
		expect(grosores([99, 1], 30, 2)[1]).toBe(2);
		expect(grosores([], 30)).toEqual([]);
	});
});

describe('cauces', () => {
	const centro = { x: 400, y: 100, w: 300, h: 120 };
	const grupos = agrupa(
		[
			[0, false],
			[1, false],
			[2, true]
		],
		simbolos
	);

	it('en horizontal entran por el canto izquierdo y salen por el derecho', () => {
		const bocas = [
			{ x: 300, y: 60 },
			{ x: 300, y: 200 }
		];
		const entra = cauces('entrada', bocas, grupos, centro, false, 60);
		expect(entra).toHaveLength(2);
		expect(entra[0].d.startsWith('M300,61.5')).toBe(true);
		expect(entra[0].d).toContain('400,');
		// El fichero con dos llamadas lleva el doble de tinta que el de una.
		expect(entra[0].w).toBeCloseTo(entra[1].w * 2);
		// Todas las de `cli.py` son heurísticas: ese cauce va punteado.
		expect(entra[1].heuristica).toBe(true);
		const sale = cauces('salida', [{ x: 800, y: 50 }], grupos, centro, false, 60);
		expect(sale[0].d.startsWith('M700,')).toBe(true);
		expect(sale[0].d).toContain('800,');
	});

	it('en vertical bajan hasta el canto de arriba y salen por el de abajo', () => {
		const entra = cauces('entrada', [{ x: 22, y: 10 }], grupos, centro, true, 30);
		// Nace como un hilo de 3 px en la boca y llega al canto de arriba (y = 100).
		expect(entra[0].d.startsWith('M23.5,10')).toBe(true);
		expect(entra[0].d).toContain(',100');
		const sale = cauces('salida', [{ x: 22, y: 400 }], grupos, centro, true, 30);
		expect(sale[0].d).toContain(',220');
		expect(sale[0].d).toContain(',400');
	});
});

describe('texto', () => {
	it('recorta nombres largos y deja cortos los que caben', () => {
		expect(recorta('test_proposal_accept_rejects_unknown_reviewer', 20)).toBe('test_proposal_accep…');
		expect(recorta('load', 20)).toBe('load');
	});

	it('acorta rutas largas y respeta las cortas', () => {
		expect(rutaCorta('services/frontend/src/components/graph/layout.ts')).toBe('…/graph/layout.ts');
		expect(rutaCorta('cli.py')).toBe('cli.py');
	});
});
