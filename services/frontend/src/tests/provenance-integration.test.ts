import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';

import type { WisdomEntry } from '../types/domain';

const { fetchWisdom } = vi.hoisted(() => ({ fetchWisdom: vi.fn() }));
vi.mock('../content/wisdom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../content/wisdom')>();
  // loadWisdom from importOriginal closes over the real fetchWisdom; re-wrap so the
  // hoisted mock is what the routes exercise.
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

import IndexRoute from '../pages/[locale]/wisdom/index.astro';
import SlugRoute from '../pages/[locale]/wisdom/[slug].astro';
import SectionRoute from '../pages/[locale]/wisdom/sections/[section].astro';
import LevelRoute from '../pages/[locale]/wisdom/levels/[level].astro';
import TagRoute from '../pages/[locale]/wisdom/tags/[tag].astro';

const entry: WisdomEntry = {
  id: 'arch-001', section: 'architecture', level: 'advanced', tags: ['boundaries'],
  text: 'The module that knows its boundaries serves the whole.',
  teaches: 'Boundaries', related: [], origin: 'human', lang: 'en',
  rights: { license: 'CC-BY-NC-SA-4.0', holder: 'ruvebal@crea-comm.net' },
};

const render = async (Route: Parameters<AstroContainer['renderToString']>[0], path: string, params: Record<string, string>) => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Route, { params, request: new Request(`http://localhost${path}`) });
  const main = new JSDOM(html).window.document.querySelector('main');
  if (!main) throw new Error('route rendered no <main>');
  return main;
};

describe('provenance is visible with a real WisdomEntry fixture, in every view', () => {
  it('index card shows holder, license and origin', async () => {
    fetchWisdom.mockResolvedValue([entry]);
    const main = await render(IndexRoute, '/en/wisdom/', { locale: 'en' });
    // El corpus se presenta como estelas: la procedencia va grabada
    // en el colofón al pie de la losa, no en una tarjeta. Mismo dato, mismo
    // `dl` etiquetado, otro sitio.
    const card = main.querySelector('li.hoja');
    expect(card?.textContent).toContain('ruvebal@crea-comm.net');
    expect(card?.textContent).toContain('CC-BY-NC-SA-4.0');
    expect(card?.textContent).toContain('Human');
    expect(card?.querySelector('dl[aria-label="Provenance"]')).not.toBeNull();
  });

  it.each([
    ['section', SectionRoute, '/en/wisdom/sections/architecture/', { locale: 'en', section: 'architecture' }],
    ['level', LevelRoute, '/en/wisdom/levels/advanced/', { locale: 'en', level: 'advanced' }],
    ['tag', TagRoute, '/en/wisdom/tags/boundaries/', { locale: 'en', tag: 'boundaries' }],
  ] as const)('%s facet listing shows the same provenance', async (_facet, Route, path, params) => {
    fetchWisdom.mockResolvedValue([entry]);
    const main = await render(Route, path, params);
    const dl = main.querySelector('article.piedra dl[aria-label="Provenance"]');
    expect(dl?.textContent).toContain('ruvebal@crea-comm.net');
    expect(dl?.textContent).toContain('CC-BY-NC-SA-4.0');
    expect(dl?.textContent).toContain('Human');
  });

  it('detail page shows provenance in a labeled block', async () => {
    fetchWisdom.mockResolvedValue([entry]);
    const main = await render(SlugRoute, '/en/wisdom/arch-001/', { locale: 'en', slug: 'arch-001' });
    const dl = main.querySelector('dl[aria-label="Provenance"]');
    expect(dl?.textContent).toContain('ruvebal@crea-comm.net');
    expect(dl?.textContent).toContain('CC-BY-NC-SA-4.0');
    expect(dl?.textContent).toContain('Human');
  });

  it('missing rights/origin on the fixture does not break the detail page', async () => {
    const bare = { ...entry, rights: {} as WisdomEntry['rights'] };
    fetchWisdom.mockResolvedValue([bare]);
    const main = await render(SlugRoute, '/en/wisdom/arch-001/', { locale: 'en', slug: 'arch-001' });
    expect(main.querySelector('dl')).not.toBeNull();
    expect(main.textContent).toContain('Rubén Vega Balbás');
  });

  it('es: translated labels and origin value, same data source', async () => {
    fetchWisdom.mockResolvedValue([{ ...entry, lang: 'es' }]);
    const main = await render(SlugRoute, '/es/wisdom/arch-001/', { locale: 'es', slug: 'arch-001' });
    const dl = main.querySelector('dl[aria-label="Procedencia"]');
    expect(dl?.textContent).toContain('Humano');
  });
});
