// Menghidupkan HTML dari `renderMapHtml` di browser: kamera, tab panel samping, dan kontrol mengapung.

import { initDim } from '../engine.js';
import type { DimModel } from '../model.js';
import { createCamera } from './camera.js';
import { createZoomMap, type ZoomMap } from './controller.js';

/** Tab panel samping (Langkah alur | Relasi), pola tablist ARIA dengan aktivasi otomatis. */
function setupTabs(root: HTMLElement) {
	const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-tabs] [role="tab"]')];
	const select = (tab: HTMLButtonElement, focus = false) => {
		for (const t of tabs) {
			const on = t === tab;
			t.setAttribute('aria-selected', String(on));
			t.tabIndex = on ? 0 : -1;
			const panel = root.querySelector<HTMLElement>(`[data-panel="${t.dataset.tab}"]`);
			if (panel) panel.hidden = !on;
		}
		if (focus) tab.focus();
	};
	for (const tab of tabs) {
		tab.addEventListener('click', () => select(tab));
		tab.addEventListener('keydown', (event) => {
			const i = tabs.indexOf(tab);
			const next = ({ ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 } as Record<string, number>)[event.key];
			if (next === undefined) return;
			event.preventDefault();
			select(tabs[(next + tabs.length) % tabs.length], true);
		});
	}
	return (name: string) => {
		const tab = tabs.find((t) => t.dataset.tab === name);
		if (tab) select(tab);
	};
}

/** Pasang satu peta. `initDim()` harus sudah selesai. */
export function mountMap(root: HTMLElement): ZoomMap | undefined {
	const raw = root.querySelector<HTMLScriptElement>('[data-zoom-data]')?.textContent;
	const viewport = root.querySelector<HTMLElement>('.zm-viewport');
	const stage = root.querySelector<HTMLElement>('.zm-stage');
	const routes = root.querySelector<HTMLElement>('.zm-routes-body');
	const routeCount = root.querySelector<HTMLElement>('[data-route-count]');
	const flows = root.querySelector<HTMLElement>('.zm-flow-details');
	const flowButtons = root.querySelector<HTMLElement>('[data-flow-buttons]');
	const toolbar = root.querySelector<HTMLElement>('[data-map-controls]');
	const zoomOut = root.querySelector<HTMLButtonElement>('[data-zoom-out]');
	const zoomIn = root.querySelector<HTMLButtonElement>('[data-zoom-in]');
	const zoomFit = root.querySelector<HTMLButtonElement>('[data-zoom-fit]');
	const zoomValue = root.querySelector<HTMLElement>('[data-zoom-value]');
	if (!raw || !viewport || !stage || !routes || !toolbar || !zoomOut || !zoomIn || !zoomFit || !zoomValue) return;

	const model: DimModel = JSON.parse(raw);
	const showTab = setupTabs(root);
	// Kontrol mengapung menutup sebagian kanvas; `fit` menaruh peta di sela-selanya. Kontrol di setengah atas
	// kanvas menambah inset atas, sisanya inset bawah.
	const floating = [...root.querySelectorAll<HTMLElement>('[data-float]')];
	const GAP = 8;
	const insets = () => {
		const box = viewport.getBoundingClientRect();
		let top = 0;
		let bottom = 0;
		for (const el of floating) {
			if (!el.offsetParent) continue;
			const r = el.getBoundingClientRect();
			if (r.top + r.height / 2 < box.top + box.height / 2) top = Math.max(top, r.bottom - box.top + GAP);
			else bottom = Math.max(bottom, box.bottom - r.top + GAP);
		}
		return { top, bottom };
	};
	const camera = createCamera(viewport, stage, (scale) => {
		zoomValue.textContent = `${Math.round(scale * 100)}%`;
		zoomOut.disabled = scale <= 0.1;
		zoomIn.disabled = scale >= 3;
		map.setZoom(scale);
	}, insets);
	const map = createZoomMap(
		{ root, stage, routes, routeCount, flows, flowButtons },
		{
			uid: root.dataset.uid ?? 'zm',
			camera: { scale: 0, focus: camera.focus },
			flow: root.dataset.flow || null,
			language: root.dataset.language === 'en' ? 'en' : 'id',
			onRender: ({ width, height, cause }) => {
				camera.setSize(width, height);
				// Memilih alur langsung menampilkan langkahnya.
				if (cause === 'flow' && flows?.childElementCount) showTab('flow');
			},
		},
	);
	map.setModel(model);
	viewport.setAttribute('data-ready', '');
	toolbar.hidden = false;
	zoomOut.addEventListener('click', camera.zoomOut);
	zoomIn.addEventListener('click', camera.zoomIn);
	zoomFit.addEventListener('click', camera.fit);
	const start = root.dataset.startAt ? map.getBox(root.dataset.startAt) : undefined;
	if (start) camera.focus(start, 1.25);
	else camera.fit();
	return map;
}

/** Muat WASM lalu pasang setiap `[data-zoom-map]` di `scope`. */
export async function mountAll(scope: ParentNode = document): Promise<void> {
	await initDim();
	for (const root of scope.querySelectorAll<HTMLElement>('[data-zoom-map]')) {
		try {
			mountMap(root);
		} catch (error) {
			console.error('Could not mount DIM map', error);
		}
	}
}
