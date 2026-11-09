import { describe, expect, it } from 'vitest';
import { plano2d, plano2dRecordado, planoGuardable } from './sendero';

const nodos = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `n${i}` }));

describe('plano2d', () => {
	it('coloca cada nodo dentro de la caja [0,1]', () => {
		const sitio = plano2d(nodos(40), [{ a: 'n0', b: 'n1' }], 60);
		expect(sitio.size).toBe(40);
		for (const { x, y } of sitio.values()) {
			expect(x).toBeGreaterThanOrEqual(0);
			expect(x).toBeLessThanOrEqual(1);
			expect(y).toBeGreaterThanOrEqual(0);
			expect(y).toBeLessThanOrEqual(1);
			expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
		}
	});

	it('da siempre el mismo dibujo con la misma lista', () => {
		const lista = nodos(30);
		const aristas = [
			{ a: 'n0', b: 'n5' },
			{ a: 'n5', b: 'n9' }
		];
		const uno = plano2d(lista, aristas, 50);
		const otro = plano2d(lista, aristas, 50);
		for (const [id, p] of uno) expect(otro.get(id)).toEqual(p);
	});

	it('deja más cerca a los que se llaman que a los que no', () => {
		// Dos racimos unidos por dentro y nada entre ellos.
		const lista = nodos(12);
		const aristas = [];
		for (let i = 0; i < 5; i += 1) aristas.push({ a: `n${i}`, b: `n${i + 1}` });
		for (let i = 6; i < 11; i += 1) aristas.push({ a: `n${i}`, b: `n${i + 1}` });
		const sitio = plano2d(lista, aristas, 300);
		const lejos = (a: string, b: string) =>
			Math.hypot(sitio.get(a)!.x - sitio.get(b)!.x, sitio.get(a)!.y - sitio.get(b)!.y);
		expect(lejos('n0', 'n1')).toBeLessThan(lejos('n0', 'n11'));
	});

	it('aguanta un grafo vacío y aristas que apuntan a nadie', () => {
		expect(plano2d([], [], 10).size).toBe(0);
		const sitio = plano2d(nodos(3), [{ a: 'n0', b: 'fantasma' }], 10);
		expect(sitio.size).toBe(3);
		for (const { x } of sitio.values()) expect(Number.isFinite(x)).toBe(true);
	});

	it('recordado da exactamente el mismo dibujo y la segunda vez no recalcula', () => {
		const datos = new Map<string, string>();
		const almacen = { getItem: (k: string) => datos.get(k) ?? null, setItem: (k: string, v: string) => void datos.set(k, v) };
		const lista = nodos(25);
		const aristas = [{ a: 'n0', b: 'n3' }, { a: 'n3', b: 'n7' }];
		const calculado = plano2d(lista, aristas);
		const primero = plano2dRecordado(lista, aristas, almacen, null);
		const segundo = plano2dRecordado(lista, aristas, almacen, null);
		for (const [id, p] of calculado) {
			expect(primero.get(id)).toEqual(p);
			expect(segundo.get(id)).toEqual(p);
		}
		// Otro grafo, otra huella: no se le sirve el dibujo del anterior.
		const otro = plano2dRecordado(lista, [{ a: 'n1', b: 'n2' }], almacen, null);
		expect(otro.get('n1')).toEqual(plano2d(lista, [{ a: 'n1', b: 'n2' }]).get('n1'));
	});

	it('usa el plano que incrusta el servidor solo si es del mismo grafo', () => {
		const lista = nodos(20);
		const aristas = [{ a: 'n0', b: 'n4' }];
		const delServidor = JSON.stringify(planoGuardable(lista, aristas));
		const usado = plano2dRecordado(lista, aristas, null, delServidor);
		for (const [id, p] of plano2d(lista, aristas)) expect(usado.get(id)).toEqual(p);
		// De otro grafo: se ignora y se calcula el de este.
		const ajeno = plano2dRecordado(lista, [{ a: 'n2', b: 'n3' }], null, delServidor);
		expect(ajeno.get('n2')).toEqual(plano2d(lista, [{ a: 'n2', b: 'n3' }]).get('n2'));
	});
});
