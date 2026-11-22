import { describe, expect, test } from 'bun:test';
import { initDim, type DimModel, type DimNode } from '../src/index.ts';
import { createZoomMap, mountMap, renderMapHtml, type ZoomMapOptions } from '../src/map/index.ts';

await initDim();

const node = (id: string, kind: DimNode['kind'], parent: string | null = null): DimNode => ({
	id,
	kind,
	name: id.split('.').pop()!,
	parent,
	tech: null,
	external: false,
});

function model(extra: DimNode[] = [], withFlow = true): DimModel {
	return {
		version: '0.3',
		nodes: [
			node('user', 'person'),
			node('shop', 'system'),
			node('shop.web', 'container', 'shop'),
			node('shop.api', 'container', 'shop'),
			node('shop.api.orders', 'component', 'shop.api'),
			...extra,
		],
		edges: [
			{ id: 'visit', from: 'user', to: 'shop.web', label: null, op: 'use', data: [] },
			{ id: 'post', from: 'shop.web', to: 'shop.api.orders', label: null, op: 'call', data: [] },
		],
		flows: withFlow ? [{ id: 'f', name: 'Belanja', description: null, steps: [{ edge: 'visit', label: null }] }] : [],
	};
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
		map.setModel(model([node('shop.api.orders.repo', 'code', 'shop.api.orders')], false));
		expect(map.getState().flow).toBeNull();
		expect(map.getState().expanded).toContain('shop');
	});

	test('boxes and relations carry English labels from Rust', () => {
		const { map, els } = mount('en', 1.5);
		map.setModel(model());
		expect(els.stage.querySelector('[data-zoom-to="shop.web"]')?.getAttribute('aria-label')).toBe('Zoom to web');
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
		expect(JSON.parse(root.querySelector('[data-zoom-data]')!.textContent!).nodes).toHaveLength(5);
		// HTML dari server belum bisa ditekan.
		expect(root.querySelector('.zm-stage button')).toBeNull();
	});

	test('without flows there is a relations title instead of tabs', () => {
		document.body.innerHTML = renderMapHtml(model([], false));
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
