// `@dim/sdk`: wrapper untuk SDK Rust (`crates/dim`) lewat WASM (`crates/dim-web`). Tidak ada aturan atau teks
// di sini; setiap fungsi hanya memindahkan JSON. Tanpa DOM, jadi bisa dipakai di browser, Node, dan Bun.

import init, { WebMap, compileProject as compile, formatFile as format } from '../wasm/dim_web.js';
import type { DimModel, DimSpan } from './model.js';

export interface Diagnostic extends DimSpan {
	severity: 'error' | 'warning';
	code: string;
	message: string;
}

export interface CompiledProject {
	model: DimModel | null;
	diagnostics: Diagnostic[];
	files: string[];
}

export interface FormattedFile {
	text: string | null;
	diagnostics: Diagnostic[];
}

/** Bahasa teks peta. */
export type MapLanguage = 'id' | 'en';

/** Kotak di layout penuh (`dim::map::MapBox`). */
export interface Box {
	id: string;
	x: number;
	y: number;
	w: number;
	h: number;
	region: boolean;
	depth: number;
	card: boolean;
	member: string | null;
	divider: boolean;
}

/** Pilihan pengguna di peta (`dim::map::MapView`). Simpan apa adanya dan kirim balik ke `DimMap`. */
export interface MapView {
	expanded: string[];
	flow: string | null;
	pinned: number | null;
}

/** `dim::map::view::ViewBox`. */
export interface ViewBox {
	rect: Box;
	kind: { type: 'place'; opens: boolean } | { type: 'region' | 'card' | 'member' };
	text: string;
	kindLabel: string;
	description: string | null;
	detail: string | null;
	visibility: string | null;
	visibilityName: string | null;
	memberTitle: string | null;
	isStatic: boolean;
	isAbstract: boolean;
	label: string;
}

export interface ViewEdge {
	path: string | null;
	structural: boolean;
	inFlow: boolean;
	hot: boolean;
}

export interface ViewRoute {
	from: string;
	to: string;
	meta: string;
}

export interface ViewFlow {
	id: string;
	name: string;
	steps: string;
	selected: boolean;
}

export interface ViewStep {
	n: number;
	route: number;
	from: string;
	to: string;
	meta: string;
}

export interface ViewFlowDetail {
	title: string;
	description: string | null;
	steps: ViewStep[];
	hidden: string | null;
}

export interface Badge {
	route: number;
	at: { x: number; y: number };
	width: number;
	text: string;
}

/** Semua yang digambar untuk satu `MapView` (`dim::map::MapViewModel`). */
export interface MapViewModel {
	width: number;
	height: number;
	boxes: ViewBox[];
	edges: ViewEdge[];
	badges: Badge[];
	routes: ViewRoute[];
	empty: string | null;
	flows: ViewFlow[];
	flow: ViewFlowDetail | null;
	to: string;
}

/** Satu model yang sudah di-layout. Panggil `free()` kalau tidak dipakai lagi. */
export interface DimMap {
	view(state: MapView, language: MapLanguage): MapViewModel;
	/** Buka/tutup elemen sesuai zoom. `changed` false kalau isinya tetap. */
	atZoom(state: MapView, scale: number): { changed: boolean; state: MapView };
	selectFlow(state: MapView, id: string): MapView;
	pin(state: MapView, route: number): MapView;
	/** Bawa keadaan dari model lain ke model ini. */
	carry(state: MapView): MapView;
	/** Elemen yang menampilkan `id`: dirinya, atau leluhurnya yang tertutup. */
	visible(state: MapView, id: string): string;
	box(id: string): Box | undefined;
	openingScale(id: string): number;
	free(): void;
}

let initialization: Promise<void> | undefined;
let ready = false;

/** Muat modul WebAssembly yang sama di browser (URL) atau Node/Bun (isi file). */
export function initDim(): Promise<void> {
	initialization ??= load().then(() => {
		ready = true;
	}).catch((error) => {
		initialization = undefined;
		throw error;
	});
	return initialization;
}

async function load() {
	if (typeof process !== 'undefined' && process.versions?.node) {
		const fsModule = 'node:fs/promises';
		const fs: typeof import('node:fs/promises') = await import(/* @vite-ignore */ fsModule);
		await init({ module_or_path: await fs.readFile(wasmFileUrl()) });
	} else {
		await init();
	}
}

// Vite's module runner (astro dev) on Bun can't run `import.meta.resolve`: Bun's `module.register` is a stub,
// so Vite's resolve hook never takes effect. In that case `import.meta.url` still points at this source file.
function wasmFileUrl(): URL {
	try {
		return new URL(import.meta.resolve('@dim/sdk/wasm'));
	} catch {
		return new URL('../wasm/dim_web_bg.wasm', import.meta.url);
	}
}

function requireDim() {
	if (!ready) throw new Error('Call and await initDim() before using DIM.');
}

export function compileProject(entry: string, files: Readonly<Record<string, string>>): CompiledProject {
	requireDim();
	return JSON.parse(compile(entry, JSON.stringify(files)));
}

export function formatFile(name: string, text: string): FormattedFile {
	requireDim();
	return JSON.parse(format(name, text));
}

/** Keadaan awal: belum ada yang terbuka, `flow` disorot kalau diberikan. */
export function emptyView(flow: string | null = null): MapView {
	return { expanded: [], flow, pinned: null };
}

export function createMap(model: DimModel): DimMap {
	requireDim();
	const map = new WebMap(JSON.stringify(model));
	const s = (state: MapView) => JSON.stringify(state);
	return {
		view: (state, language) => JSON.parse(map.view(s(state), language)),
		atZoom: (state, scale) => JSON.parse(map.atZoom(s(state), scale)),
		selectFlow: (state, id) => JSON.parse(map.selectFlow(s(state), id)),
		pin: (state, route) => JSON.parse(map.pin(s(state), route)),
		carry: (state) => JSON.parse(map.carry(s(state))),
		visible: (state, id) => map.visible(s(state), id),
		box: (id) => JSON.parse(map.boxOf(id)) ?? undefined,
		openingScale: (id) => map.openingScale(id),
		free: () => map.free(),
	};
}
