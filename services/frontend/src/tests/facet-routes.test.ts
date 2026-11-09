import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';

import type { WisdomEntry } from '../types/domain';

const { fetchWisdom } = vi.hoisted(() => ({ fetchWisdom: vi.fn() }));

// Only fetchWisdom is faked: frequencies(), labels and isLocale stay real, so these tests exercise
// the reuse the task is actually about instead of a parallel reimplementation.
vi.mock('../content/wisdom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../content/wisdom')>();
  // loadWisdom from importOriginal closes over the real fetchWisdom; re-wrap so the
  // hoisted mock is what the facet routes exercise.
  return {
    ...mod,
    fetchWisdom,
    loadWisdom: async (locale: 'en' | 'es') => {
      try {
        return { entries: await fetchWisdom(locale), failed: false };
      } catch {
        return { entries: [], failed: true };
      }
    },
  };
});

import LevelRoute from '../pages/[locale]/wisdom/levels/[level].astro';
import SectionRoute from '../pages/[locale]/wisdom/sections/[section].astro';
import TagRoute from '../pages/[locale]/wisdom/tags/[tag].astro';
import WisdomIndexRoute from '../pages/[locale]/wisdom/index.astro';

const entry = (id: string, section: string, level: WisdomEntry['level'], tags: string[]): WisdomEntry => ({
  id, section, level, tags,
  text: `Aphorism ${id}`,
  teaches: `What ${id} teaches`,
  related: [],
  origin: 'human',
  lang: 'en',
  rights: { license: 'CC-BY-NC-SA-4.0', holder: 'ruvebal@crea-comm.net' },
});

const payload = [
  entry('arch-001', 'architecture', 'advanced', ['boundaries', 'coupling']),
  entry('arch-002', 'architecture', 'beginner', ['boundaries']),
  entry('wis-001', 'wisdom', 'master', ['simplicity']),
];

const render = async (Route: Parameters<AstroContainer['renderToString']>[0], path: string, params: Record<string, string>) => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Route, {
    params,
    request: new Request(`http://localhost${path}`),
  });
  const main = new JSDOM(html).window.document.querySelector('main');
  if (!main) throw new Error('route rendered no <main>');
  return main;
};

/* El corpus ya no son tarjetas: cada aforismo es una estela y su id va grabado
   al pie de la losa. Las facetas ya no son cuatro filas de píldoras sueltas:
   viven dentro de la única puerta «Filtrar», como filas con su recuento. */
const estelaIds = (main: Element) => [...main.querySelectorAll('article.piedra .piedra-id')].map((id) => id.textContent?.trim());
const filas = (main: Element, grupo: number) => {
  const grupos = main.querySelectorAll('.puerta-dentro .faceta-grupo');
  return [...grupos[grupo].querySelectorAll('.faceta-lista a')].map(
    (a) => `${a.querySelector('.faceta-nombre')?.textContent?.trim()} (${a.querySelector('.faceta-cuenta')?.textContent?.trim()})`
  );
};
const SECCIONES = 0, NIVELES = 1, ETIQUETAS = 2;
const hrefs = (main: Element, grupo: number) => {
  const grupos = main.querySelectorAll('.puerta-dentro .faceta-grupo');
  return [...grupos[grupo].querySelectorAll('.faceta-lista a')].map((a) => a.getAttribute('href'));
};

describe('wisdom facet routes', () => {
  it('lists only the entries of the requested section', async () => {
    fetchWisdom.mockResolvedValue(payload);
    const main = await render(SectionRoute, '/en/wisdom/sections/architecture/', { locale: 'en', section: 'architecture' });
    expect(estelaIds(main)).toEqual(['arch-001', 'arch-002']);
  });

  it('counts sibling facets from the whole payload, not from the filtered slice', async () => {
    fetchWisdom.mockResolvedValue(payload);
    const main = await render(SectionRoute, '/en/wisdom/sections/architecture/', { locale: 'en', section: 'architecture' });
    // 'Wisdom (1)' can only appear if frequencies() ran on the unfiltered payload.
    expect(filas(main, SECCIONES)).toEqual(['Architecture (2)', 'Wisdom (1)']);
    expect(main.querySelector('.faceta-lista a[href="/en/wisdom/sections/wisdom/"]')).not.toBeNull();
  });

  it('marks the current facet with aria-current, not with colour alone', async () => {
    fetchWisdom.mockResolvedValue(payload);
    const main = await render(SectionRoute, '/en/wisdom/sections/architecture/', { locale: 'en', section: 'architecture' });
    const current = main.querySelectorAll('.faceta-lista a[aria-current="page"]');
    expect(current).toHaveLength(1);
    expect(current[0].querySelector('.faceta-nombre')?.textContent?.trim()).toBe('Architecture');
  });

  it('opens the filter gate when a facet is already applied, and leaves it shut otherwise', async () => {
    fetchWisdom.mockResolvedValue(payload);
    const facet = await render(SectionRoute, '/en/wisdom/sections/architecture/', { locale: 'en', section: 'architecture' });
    expect(facet.querySelector('details.puerta')?.hasAttribute('open')).toBe(true);

    // La portada del corpus ya no filtra: es el armario, y cada volumen es la
    // faceta. Ni una puerta de filtro ni cuatro bloques de píldoras.
    const index = await render(WisdomIndexRoute, '/en/wisdom/', { locale: 'en' });
    expect(index.querySelectorAll('details.puerta')).toHaveLength(0);
    expect(index.querySelectorAll('details.libro').length).toBeGreaterThan(0);
  });

  it('filters by tag membership and offers every sibling tag', async () => {
    fetchWisdom.mockResolvedValue(payload);
    const main = await render(TagRoute, '/en/wisdom/tags/boundaries/', { locale: 'en', tag: 'boundaries' });
    expect(estelaIds(main)).toEqual(['arch-001', 'arch-002']);
    // Las etiquetas de la puerta van de más grabadas a menos.
    expect(filas(main, ETIQUETAS)).toEqual(['boundaries (2)', 'coupling (1)', 'simplicity (1)']);
  });

  it('links each stele tag to its locale-scoped facet route', async () => {
    fetchWisdom.mockResolvedValue(payload);
    const main = await render(WisdomIndexRoute, '/en/wisdom/', { locale: 'en' });
    const boundaries = main.querySelector('.armario-facetas a[href="/en/wisdom/tags/boundaries/"]');
    expect(boundaries?.textContent).toContain('boundaries');
  });

  it('filters by level and offers every sibling level', async () => {
    fetchWisdom.mockResolvedValue(payload);
    const main = await render(LevelRoute, '/en/wisdom/levels/master/', { locale: 'en', level: 'master' });
    expect(estelaIds(main)).toEqual(['wis-001']);
    expect(filas(main, NIVELES)).toEqual(['Advanced (1)', 'Beginner (1)', 'Master (1)']);
  });

  it('shows a translated empty state, never a blank page, for a facet with no matches', async () => {
    fetchWisdom.mockResolvedValue(payload);

    const english = await render(SectionRoute, '/en/wisdom/sections/nope/', { locale: 'en', section: 'nope' });
    expect(estelaIds(english)).toEqual([]);
    expect(english.querySelector('.ttod-empty')?.textContent).toContain('No English wisdom entry carries this facet yet.');
    expect(english.querySelector('.ttod-empty a')?.getAttribute('href')).toBe('/en/wisdom/');

    const spanish = await render(SectionRoute, '/es/wisdom/sections/nope/', { locale: 'es', section: 'nope' });
    expect(spanish.querySelector('.ttod-empty')?.textContent).toContain('Ninguna entrada de sabiduría en español tiene esta faceta todavía.');
    expect(spanish.querySelector('.ttod-empty a')?.getAttribute('href')).toBe('/es/wisdom/');
  });

  it('keeps the locale prefix on every sibling link', async () => {
    fetchWisdom.mockResolvedValue(payload);
    const main = await render(SectionRoute, '/es/wisdom/sections/architecture/', { locale: 'es', section: 'architecture' });
    expect(hrefs(main, SECCIONES)).toEqual(['/es/wisdom/sections/architecture/', '/es/wisdom/sections/wisdom/']);
  });
});
