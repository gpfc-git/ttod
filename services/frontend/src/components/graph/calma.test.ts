// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { vigilarLaMano } from './calma';

/**
 * Lo que esta prueba cuida es el caso que dejó el grafo del código en
 * «Cargando…» para siempre: una mano que no para nunca. La calma puede no
 * llegar; el bloque tiene que llegar igual.
 */
describe('vigilarLaMano', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	const mover = () => window.dispatchEvent(new Event('scroll'));

	it('espera a que la mano lleve quieta el rato pedido', () => {
		const mano = vigilarLaMano();
		const hecho = vi.fn();
		mano.cuandoHayaCalma(300, hecho);

		vi.advanceTimersByTime(200);
		mover();
		vi.advanceTimersByTime(200);
		expect(hecho).not.toHaveBeenCalled();

		vi.advanceTimersByTime(150);
		expect(hecho).toHaveBeenCalledTimes(1);
		mano.parar();
	});

	it('lo hace igual al llegar al tope, aunque la mano no pare nunca', () => {
		const mano = vigilarLaMano();
		const hecho = vi.fn();
		mano.cuandoHayaCalma(300, hecho, 1200);

		// Un dedo que baja la página sin soltar: un aviso cada 100 ms.
		for (let ms = 0; ms < 1200; ms += 100) {
			mover();
			vi.advanceTimersByTime(100);
		}
		expect(hecho).toHaveBeenCalledTimes(1);
		mano.parar();
	});

	it('no hace nada después de parar', () => {
		const mano = vigilarLaMano();
		const hecho = vi.fn();
		mano.cuandoHayaCalma(300, hecho, 600);
		mano.parar();

		vi.advanceTimersByTime(5000);
		expect(hecho).not.toHaveBeenCalled();
	});
});
