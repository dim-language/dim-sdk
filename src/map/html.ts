// Kerangka HTML komponen peta: panel samping dengan tab (langkah alur | relasi), kanvas dengan kontrol
// mengapung, dan data model untuk `mountMap`. Dirender di server; browser hanya menghidupkannya.

import { createMap, emptyView, type MapLanguage } from '../engine.js';
import type { DimModel } from '../model.js';
import { render } from './render.js';

/** Teks tombol dan label komponen. Teks peta sendiri (relasi, langkah) datang dari Rust. */
const ui = {
	id: {
		scale: 'Zoom peta',
		zoomIn: 'Perbesar peta',
		zoomOut: 'Perkecil peta',
		fit: 'Paskan ke layar',
		hint: 'Seret untuk menggeser peta. Klik dua kali kotak untuk memperbesarnya.',
		viewport: 'Peta arsitektur',
		flows: 'Alur',
		routes: 'Relasi di tampilan ini',
		side: 'Langkah alur dan relasi',
		steps: 'Langkah alur',
		relations: 'Relasi',
		pickFlow: 'Pilih alur di atas untuk melihat langkahnya.',
	},
	en: {
		scale: 'Map zoom',
		zoomIn: 'Zoom in',
		zoomOut: 'Zoom out',
		fit: 'Fit to view',
		hint: 'Drag to move the map. Double-click a box to zoom to it.',
		viewport: 'Architecture map',
		flows: 'Flows',
		routes: 'Relations in this view',
		side: 'Flow steps and relations',
		steps: 'Flow steps',
		relations: 'Relations',
		pickFlow: 'Pick a flow above to see its steps.',
	},
} satisfies Record<MapLanguage, Record<string, string>>;

export interface MapHtmlOptions {
	/** Id unik kalau ada lebih dari satu peta di halaman. */
	uid?: string;
	language?: MapLanguage;
	/** Id alur yang langsung disorot. */
	flow?: string | null;
	/** Elemen yang diperbesar saat peta pertama tampil; tanpa ini peta dipaskan ke layar. */
	focus?: string;
	/** Kelas tambahan untuk elemen terluar. */
	className?: string;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const icon = (path: string) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}" /></svg>`;

/**
 * Seluruh komponen peta sebagai HTML, siap dipasang dengan `mountMap`. Panggil setelah `initDim()`.
 * Elemen terluar memakai kelas `zm-map` dan atribut `data-zoom-map`.
 */
export function renderMapHtml(model: DimModel, options: MapHtmlOptions = {}): string {
	const uid = options.uid ?? 'zm';
	const language = options.language ?? 'id';
	const flow = options.flow ?? null;
	const text = ui[language];
	const map = createMap(model);
	let first;
	try {
		first = render(map.view(emptyView(flow), language), uid, { interactive: false });
	} finally {
		map.free();
	}
	const hasFlows = (model.flows?.length ?? 0) > 0;
	const count = `<span class="zm-relation-count">(<span data-route-count>${first.routeCount}</span>)</span>`;

	const tabs = hasFlows
		? `<div class="zm-tabs" role="tablist" aria-label="${text.side}" data-tabs>`
			+ `<button type="button" role="tab" id="${uid}-tab-flow" aria-controls="${uid}-panel-flow" aria-selected="${!!flow}" tabindex="${flow ? 0 : -1}" data-tab="flow">${text.steps}</button>`
			+ `<button type="button" role="tab" id="${uid}-tab-routes" aria-controls="${uid}-panel-routes" aria-selected="${!flow}" tabindex="${flow ? -1 : 0}" data-tab="routes">${text.relations} ${count}</button>`
			+ `</div>`
		: `<p class="zm-tabs zm-side-title" id="${uid}-tab-routes">${text.routes} ${count}</p>`;
	const flowPanel = hasFlows
		? `<div class="zm-tabpanel" role="tabpanel" id="${uid}-panel-flow" aria-labelledby="${uid}-tab-flow"${flow ? '' : ' hidden'} data-panel="flow">`
			+ `<div class="zm-flows zm-flow-details" aria-live="polite">${first.flowDetails}</div>`
			+ `<p class="zm-flow-empty">${text.pickFlow}</p></div>`
		: '';
	const routesPanel = `<div class="zm-tabpanel zm-routes zm-relations"${hasFlows ? ' role="tabpanel"' : ''} id="${uid}-panel-routes" aria-labelledby="${uid}-tab-routes"${hasFlows && flow ? ' hidden' : ''} data-panel="routes">`
		+ `<div class="zm-routes-body">${first.routes}</div></div>`;

	const controls = `<div class="zm-overlay" data-map-controls hidden>`
		+ `<p class="zm-hint" data-float>${text.hint}</p>`
		+ `<div class="zm-float-bar">`
		+ (hasFlows ? `<div class="zm-flows zm-float-flows" role="group" aria-label="${text.flows}" data-flow-buttons data-float></div>` : '')
		+ `<div class="zm-camera-controls" role="group" aria-label="${text.scale}" data-float>`
		+ `<button type="button" data-zoom-out aria-label="${text.zoomOut}" title="${text.zoomOut}">${icon('M5 12h14')}</button>`
		+ `<span data-zoom-value>50%</span>`
		+ `<button type="button" data-zoom-in aria-label="${text.zoomIn}" title="${text.zoomIn}">${icon('M5 12h14m-7-7v14')}</button>`
		+ `<button type="button" data-zoom-fit aria-label="${text.fit}" title="${text.fit}">${icon('M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5')}</button>`
		+ `</div></div></div>`;

	const data = JSON.stringify(model).replace(/</g, '\\u003c');
	const attrs = [
		`class="zm-map${options.className ? ` ${esc(options.className)}` : ''}"`,
		'data-zoom-map',
		`data-uid="${esc(uid)}"`,
		`data-language="${language}"`,
		`data-flow="${esc(flow ?? '')}"`,
		options.focus ? `data-start-at="${esc(options.focus)}"` : '',
	].filter(Boolean).join(' ');

	return `<div ${attrs}><div class="zm-frame"><div class="zm-body">`
		+ `<aside class="zm-side" aria-label="${text.side}">${tabs}${flowPanel}${routesPanel}</aside>`
		+ `<div class="zm-canvas">${controls}`
		+ `<div class="zm-viewport" tabindex="0" role="group" aria-label="${text.viewport}">`
		+ `<div class="zm-stage" style="--zm-w:${first.width};--zm-h:${first.height}">${first.stage}</div></div>`
		+ `</div></div></div>`
		+ `<script type="application/json" data-zoom-data>${data}</script></div>`;
}
