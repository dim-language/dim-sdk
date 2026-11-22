// Wiring DOM peta zoom: klik, hover, dan zoom diteruskan ke SDK Rust, lalu hasilnya digambar ulang. Aturan
// keadaan (apa yang terbuka, alur mana yang disorot, panah mana yang disematkan) ada di `dim::map::view`.

import { createMap, emptyView, type Box, type DimMap, type MapLanguage, type MapView, type MapViewModel } from '../engine.js';
import type { DimModel } from '../model.js';
import { render } from './render.js';

export interface ZoomMapElements {
	/** Pembungkus semua bagian di bawah; klik di dalamnya didengarkan di sini. */
	root: HTMLElement;
	stage: HTMLElement;
	routes: HTMLElement;
	routeCount?: HTMLElement | null;
	/** Judul dan langkah alur yang disorot. */
	flows?: HTMLElement | null;
	/** Tombol alur. */
	flowButtons?: HTMLElement | null;
}

/** Penyebab peta digambar ulang, supaya pemakai bisa memutuskan apakah pandangan perlu diatur ulang. */
export type RenderCause = 'model' | 'zoom' | 'flow' | 'route';

export interface ZoomMapOptions {
	/** Prefix id unik untuk marker SVG kalau ada lebih dari satu peta di halaman. */
	uid: string;
	/** Skala kamera awal dan cara memusatkan kamera ke satu kotak. */
	camera: { scale: number; focus(box: Box, minimumScale: number): void };
	/** Id alur yang langsung disorot. */
	flow?: string | null;
	language?: MapLanguage;
	/** Dipanggil setiap kali peta selesai digambar. */
	onRender?(info: { width: number; height: number; cause: RenderCause }): void;
}

export interface ZoomMap {
	setModel(model: DimModel): void;
	setZoom(scale: number): void;
	getBox(id: string): Box | undefined;
	getState(): MapView;
}

export function createZoomMap(els: ZoomMapElements, options: ZoomMapOptions): ZoomMap {
	const { root, stage, routes, routeCount, flows, flowButtons } = els;
	const { uid, onRender, camera } = options;
	const language = options.language ?? 'id';

	let map: DimMap | null = null;
	let scale = camera.scale;
	let state: MapView = emptyView(options.flow ?? null);
	let vm: MapViewModel | null = null;

	// Sorotan sementara saat hover/fokus di daftar relasi; `null` kembali ke yang dihitung Rust.
	const highlight = (index: number | null) => {
		stage.querySelectorAll('.zm-edge').forEach((el) => {
			const i = Number(el.getAttribute('data-route'));
			const on = index === null ? (vm?.edges[i]?.hot ?? false) : i === index;
			el.classList.toggle('is-route', on);
			el.setAttribute('marker-end', `url(#${uid}-arrow${on ? '-route' : ''})`);
		});
	};

	const draw = (cause: RenderCause, focusSelector?: string) => {
		if (!map) return;
		vm = map.view(state, language);
		const out = render(vm, uid, { pinned: state.pinned });
		stage.style.setProperty('--zm-w', String(out.width));
		stage.style.setProperty('--zm-h', String(out.height));
		stage.innerHTML = out.stage;
		routes.innerHTML = out.routes;
		if (routeCount) routeCount.textContent = String(out.routeCount);
		if (flowButtons && cause !== 'zoom') flowButtons.innerHTML = out.flowButtons;
		if (flows) flows.innerHTML = out.flowDetails;
		if (focusSelector) {
			root.querySelector<HTMLElement>(focusSelector)?.focus({ preventScroll: true });
			// Fokus yang dipindah program tidak dihitung sebagai pratinjau hover.
			highlight(null);
		}
		onRender?.({ width: out.width, height: out.height, cause });
	};

	const focusBox = (target: Element) => {
		const id = target.closest<HTMLElement>('[data-zoom-to]')?.dataset.zoomTo;
		const box = id === undefined ? undefined : map?.box(id);
		if (box && map) camera.focus(box, map.openingScale(box.id));
	};

	root.addEventListener('click', (ev) => {
		if (!map) return;
		const target = ev.target as HTMLElement;
		const flowButton = target.closest<HTMLButtonElement>('.zm-flow');
		if (flowButton) {
			const id = flowButton.dataset.flow!;
			state = map.selectFlow(state, id);
			draw('flow', `[data-flow="${CSS.escape(id)}"]`);
			return;
		}
		if (stage.contains(target) && target.closest('[data-zoom-to]')) {
			// Klik dengan mouse dibiarkan untuk menyeret dan dobel klik; Enter/Spasi memperbesar kotak.
			if (ev.detail === 0) focusBox(target);
			return;
		}
		const route = routes.contains(target) ? target.closest<HTMLButtonElement>('.zm-route') : null;
		if (route) {
			const i = Number(route.dataset.route);
			state = map.pin(state, i);
			draw('route', `.zm-route[data-route="${i}"]`);
		}
	});
	stage.addEventListener('dblclick', (ev) => focusBox(ev.target as Element));

	// Hover/fokus di daftar relasi menyorot panahnya di peta.
	const preview = (ev: Event) => {
		const route = (ev.target as HTMLElement).closest<HTMLElement>('.zm-route');
		if (route) highlight(Number(route.dataset.route));
	};
	const restore = () => highlight(null);
	routes.addEventListener('mouseover', preview);
	routes.addEventListener('focusin', preview);
	routes.addEventListener('mouseleave', restore);
	routes.addEventListener('focusout', restore);

	return {
		setModel(model) {
			const next = createMap(model);
			if (map) state = next.carry(state);
			state = next.atZoom(state, scale).state;
			map?.free();
			map = next;
			draw('model');
		},
		setZoom(next) {
			if (!map) return;
			scale = next;
			const zoomed = map.atZoom(state, scale);
			if (!zoomed.changed) return;
			// Kotak yang sedang difokus bisa hilang; fokus pindah ke kotak yang sekarang menampilkannya.
			const active = root.ownerDocument.activeElement;
			const activeId = stage.contains(active) ? (active as HTMLElement).dataset.zoomTo : undefined;
			const focus = activeId ? `[data-zoom-to="${CSS.escape(map.visible(zoomed.state, activeId))}"]` : undefined;
			state = zoomed.state;
			draw('zoom', focus);
		},
		getBox(id) {
			return map?.box(id);
		},
		getState() {
			return { ...state, expanded: [...state.expanded] };
		},
	};
}
