import { describe, expect, test } from 'bun:test';
import { compileProject, initDim, type DimModel } from '../src/index.ts';
import { createZoomMap, mountMap, renderMapHtml, type ZoomMapOptions } from '../src/map/index.ts';

await initDim();

const config = 'dim "0.6";\n\nstyle role app { icon browser; background blue; }\n';

/** Model kecil dari sumber 0.6: orang, satu sistem dengan dua container, dan satu flow. */
function model(extra = '', withFlow = true): DimModel {
	const main = `dim "0.6";

person user "user";

system shop "shop" {
  container web "web" { role app; }

  container api "api" {
    role service;
    paradigm procedural;

    component orders "orders" {
      description "Orders.";
${extra}
    }
  }
}

visit: user -> shop.web { op use; }
post: shop.web -> shop.api.orders { op call; }
${withFlow ? 'flow f "Belanja" { step visit; }' : ''}
`;
	const out = compileProject('main.dim', { 'dim.config': config, 'main.dim': main });
	if (!out.model) throw new Error(JSON.stringify(out.diagnostics));
	return out.model;
}

function mount(language: ZoomMapOptions['language'] = 'id', scale = 0.2) {
	document.body.innerHTML = `
		<div id="root">
			<div class="flow-buttons"></div><span class="route-count"></span>
			<div class="zm-stage"></div><div class="routes"></div><div class="flows"></div>
		</div>`;
	const root = document.getElementById('root')!;
	const els = {
		root,
		stage: root.querySelector<HTMLElement>('.zm-stage')!,
		routes: root.querySelector<HTMLElement>('.routes')!,
		routeCount: root.querySelector<HTMLElement>('.route-count')!,
		flows: root.querySelector<HTMLElement>('.flows')!,
		flowButtons: root.querySelector<HTMLElement>('.flow-buttons')!,
	};
	const renders: string[] = [];
	const map = createZoomMap(els, { uid: 't', camera: { scale, focus() {} }, language, onRender: (s) => renders.push(s.cause) });
	return { map, els, renders };
}

const click = (el: Element | null) => (el as HTMLElement).click();

describe('createZoomMap', () => {
	test('a flow button highlights the flow and shows its steps', () => {
		const { map, els } = mount();
		map.setModel(model());
		expect(els.routeCount.textContent).toBe('1');
		expect(els.flows.innerHTML).toBe('');
		click(els.flowButtons.querySelector('.zm-flow'));
		expect(map.getState().flow).toBe('f');
		expect(els.flows.textContent).toContain('Langkah Belanja');
		expect(els.flowButtons.querySelector('.zm-flow')?.getAttribute('aria-pressed')).toBe('true');
		expect(els.stage.querySelector('.zm-edge.is-route')).not.toBeNull();
	});

	test('zooming in opens elements, and a relation opens its detail and lights its arrow', () => {
		const { map, els, renders } = mount();
		map.setModel(model());
		click(els.flowButtons.querySelector('.zm-flow'));
		map.setZoom(1.5);
		expect(renders.at(-1)).toBe('zoom');
		expect(els.routeCount.textContent).toBe('2');
		const route = els.routes.querySelector('.zm-route[data-route="1"]')!;
		click(route);
		const pinned = els.routes.querySelector('.zm-route[data-route="1"]')!;
		const detail = document.getElementById(pinned.getAttribute('aria-controls')!)!;
		expect(pinned.getAttribute('aria-expanded')).toBe('true');
		expect(detail.hidden).toBe(false);
		expect(map.getState()).toMatchObject({ flow: 'f', pinned: 1 });
		expect(els.stage.querySelector('.zm-edge.is-route')?.getAttribute('data-route')).toBe('1');
		click(els.routes.querySelector('.zm-route[data-route="1"]'));
		expect(els.stage.querySelector('.zm-edge.is-route')?.getAttribute('data-route')).toBe('0');
	});

	test('a new model keeps what still exists and drops the rest', () => {
		const { map } = mount('id', 1.5);
		map.setModel(model());
		click(document.querySelector('.zm-flow'));
		map.setModel(model('      function save "save()" { description "Saves."; }', false));
		expect(map.getState().flow).toBeNull();
		expect(map.getState().expanded).toContain('shop');
	});

	test('boxes and relations carry English labels from Rust', () => {
		const { map, els } = mount('en', 1.5);
		map.setModel(model());
		const web = els.stage.querySelector('[data-zoom-to="shop.web"]')!;
		expect(web.getAttribute('aria-label')).toBe('Zoom to web');
		// Latar dan ikon dari `style role app` di dim.config.
		expect(web.getAttribute('data-background')).toBe('blue');
		expect(web.querySelector('.zm-icon')?.getAttribute('data-icon')).toBe('browser');
		expect(els.stage.querySelector('.zm-region .zm-kind')?.textContent).toBe('System');
		expect(els.routes.querySelector('.sr-only')?.textContent).toBe('to');
	});
});

describe('renderMapHtml', () => {
	test('renders tabs, panels, floating controls and the model', () => {
		const html = renderMapHtml(model(), { uid: 'm', language: 'en', flow: 'f', focus: 'shop' });
		document.body.innerHTML = html;
		const root = document.querySelector<HTMLElement>('[data-zoom-map]')!;
		expect(root.dataset).toMatchObject({ uid: 'm', language: 'en', flow: 'f', startAt: 'shop' });
		expect(root.querySelector('#m-tab-flow')?.getAttribute('aria-selected')).toBe('true');
		expect(root.querySelector<HTMLElement>('[data-panel="routes"]')?.hidden).toBe(true);
		expect(root.querySelector('.zm-flow-details')?.textContent).toContain('Belanja steps');
		expect(root.querySelector('[data-zoom-fit]')?.getAttribute('aria-label')).toBe('Fit to view');
		expect(JSON.parse(root.querySelector('[data-zoom-data]')!.textContent!).elements).toHaveLength(5);
		// HTML dari server belum bisa ditekan.
		expect(root.querySelector('.zm-stage button')).toBeNull();
	});

	test('without flows there is a relations title instead of tabs', () => {
		document.body.innerHTML = renderMapHtml(model('', false));
		expect(document.querySelector('[data-tabs]')).toBeNull();
		expect(document.querySelector('.zm-side-title')?.textContent).toContain('Relasi di tampilan ini');
	});

	test('mountMap switches to the steps tab when a flow is picked', () => {
		document.body.innerHTML = renderMapHtml(model(), { uid: 'm' });
		const root = document.querySelector<HTMLElement>('[data-zoom-map]')!;
		const map = mountMap(root)!;
		expect(root.querySelector<HTMLElement>('[data-map-controls]')?.hidden).toBe(false);
		expect(root.querySelector('[data-tab="routes"]')?.getAttribute('aria-selected')).toBe('true');
		click(root.querySelector('.zm-float-flows .zm-flow'));
		expect(map.getState().flow).toBe('f');
		expect(root.querySelector('[data-tab="flow"]')?.getAttribute('aria-selected')).toBe('true');
		expect(root.querySelector<HTMLElement>('[data-panel="flow"]')?.hidden).toBe(false);
	});
});
