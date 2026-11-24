// HTML peta dari view model Rust (`dim::map::view`). Hanya markup: semua teks dan aturan (panah mana yang
// menyala, nomor langkah, keterangan relasi) sudah dihitung di Rust. Dipakai saat build (SSR) dan di browser.

import type { MapViewModel, ViewBox } from '../engine.js';
import { iconSvg } from './icons.js';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const pct = (v: number, total: number) => `${((v / total) * 100).toFixed(4)}%`;

const arrow = (id: string, cls: string) =>
	`<marker id="${id}" class="${cls}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z"/></marker>`;

/** Ujung panah untuk tombol relasi dan langkah: "A → B", dengan kata "ke"/"to" untuk pembaca layar. */
const ends = (from: string, to: string, word: string) =>
	`${esc(from)} <span aria-hidden="true">→</span><span class="sr-only">${esc(word)}</span> ${esc(to)}`;

function boxHtml(box: ViewBox, W: number, H: number, interactive: boolean): string {
	const b = box.rect;
	const style = `left:${pct(b.x, W)};top:${pct(b.y, H)};width:${pct(b.w, W)};height:${pct(b.h, H)}`;
	const id = esc(b.id);
	// Kotak yang bisa diperbesar memakai <button> supaya bisa difokus dan diaktifkan dengan keyboard.
	const zoomTo = `data-zoom-to="${id}" aria-label="${esc(box.label)}"`;
	const leaf = interactive ? `button type="button" ${zoomTo}` : 'div';
	const leafEnd = interactive ? 'button' : 'div';

	if (box.kind.type === 'member') {
		const cls = ['zm-member', b.field !== null ? 'zm-member--field' : '', b.divider ? 'zm-member--divider' : '', box.isStatic ? 'is-static' : '', box.isAbstract ? 'is-abstract' : '']
			.filter(Boolean)
			.join(' ');
		const visLabel = box.visibilityName ? `<span class="sr-only">${esc(box.visibilityName)}</span>` : '';
		return `<${leaf} class="${cls}" style="${style}" data-id="${id}" title="${esc(box.memberTitle ?? box.text)}"><span class="zm-vis" aria-hidden="true">${box.visibility ?? ''}</span>${visLabel}<span class="zm-sig">${esc(box.text)}</span></${leafEnd}>`;
	}

	const kind = `<span class="zm-kind">${esc(box.kindLabel)}</span>`;
	// Tampilan dari `style` di `dim.config` (§5.6): latar sebagai token, eksternal selalu putus-putus.
	const look = ` data-background="${box.background}"${box.external ? ' data-external' : ''}`;
	const icon = box.icon ? iconSvg(box.icon) : '';
	const name = `<span class="zm-name" title="${esc(box.text)}">${esc(box.text)}</span>`;
	const heading = (cls: string, content: string) => interactive
		? `<button type="button" class="${cls}" ${zoomTo}>${content}</button>`
		: `<div class="${cls}">${content}</div>`;

	if (box.kind.type === 'card') {
		const ctor = box.detail ? `<span class="zm-tech">${esc(box.detail)}</span>` : '';
		const abstract = box.isAbstract ? ' is-abstract' : '';
		return `<div class="zm-card${abstract}" style="${style}" data-id="${id}"${look} title="${esc(box.description ?? box.text)}">${heading('zm-card-head', `${icon}${name}${kind}${ctor}`)}</div>`;
	}
	if (box.kind.type === 'region') {
		return `<div class="zm-region" style="${style}" data-id="${id}"${look}>${heading('zm-region-head', `${icon}${name}${kind}`)}</div>`;
	}
	const tech = box.detail ? `<span class="zm-tech" title="${esc(box.detail)}">${esc(box.detail)}</span>` : '';
	return `<${leaf} class="zm-place" style="${style}" data-id="${id}"${look}>${icon}${name}${kind}${tech}</${leafEnd}>`;
}

export interface Rendered {
	/** SVG panah, kotak, dan nomor langkah. */
	stage: string;
	/** Daftar relasi. */
	routes: string;
	routeCount: number;
	/** Tombol alur. */
	flowButtons: string;
	/** Judul, deskripsi, dan langkah alur yang disorot; kosong kalau tidak ada. */
	flowDetails: string;
	width: number;
	height: number;
}

export interface RenderOptions {
	/** `false` untuk HTML awal dari server: kotak dan relasi belum bisa ditekan. */
	interactive?: boolean;
	/** Indeks panah yang detailnya terbuka di daftar relasi. */
	pinned?: number | null;
}

export function render(vm: MapViewModel, uid: string, options: RenderOptions = {}): Rendered {
	const interactive = options.interactive ?? true;
	const pinned = options.pinned ?? null;
	const { width: W, height: H } = vm;
	const boxes = vm.boxes.map((b) => boxHtml(b, W, H, interactive)).join('');

	const paths = vm.edges
		.map((e, i) => {
			if (!e.path) return '';
			const cls = ['zm-edge', e.hot ? 'is-route' : '', e.structural ? 'zm-edge--structure' : ''].filter(Boolean).join(' ');
			return `<path class="${cls}" data-route="${i}" marker-end="url(#${uid}-arrow${e.hot ? '-route' : ''})" fill="none" d="${e.path}"/>`;
		})
		.join('');

	const badges = vm.badges
		.map(({ at, width: w, text }) =>
			`<g class="zm-step"><rect x="${(at.x - w / 2).toFixed(1)}" y="${(at.y - 10).toFixed(1)}" width="${w}" height="20" rx="3"/><text x="${at.x.toFixed(1)}" y="${(at.y + 4.5).toFixed(1)}">${esc(text)}</text></g>`)
		.join('');

	const svgOpen = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true" focusable="false"`;
	const svg = `${svgOpen} class="zm-edges"><defs>${arrow(`${uid}-arrow`, 'zm-arrow')}${arrow(`${uid}-arrow-route`, 'zm-arrow zm-arrow--route')}</defs>${paths}</svg>`;
	// Nomor langkah di lapisan paling atas supaya tidak tertutup kotak atau baris kartu.
	const badgeLayer = badges ? `${svgOpen} class="zm-edges zm-badges">${badges}</svg>` : '';

	const routes = vm.routes.length
		? `<ol class="zm-route-list">${vm.routes
				.map((r, i) => {
					const meta = esc(r.meta);
					if (!interactive) {
						return `<li class="zm-route"><span class="zm-route-ends">${ends(r.from, r.to, vm.to)}</span><span class="zm-route-meta">${meta}</span></li>`;
					}
					const detailId = `${uid}-route-detail-${i}`;
					const open = pinned === i;
					return `<li><button type="button" class="zm-route" data-route="${i}" aria-expanded="${open}" aria-controls="${detailId}"><span class="zm-route-ends">${ends(r.from, r.to, vm.to)}</span></button><p id="${detailId}" class="zm-route-meta zm-route-detail"${open ? '' : ' hidden'}>${meta}</p></li>`;
				})
				.join('')}</ol>`
		: `<p class="zm-empty">${esc(vm.empty ?? '')}</p>`;

	const flowButtons = vm.flows.length
		? `<div class="zm-flow-list">${vm.flows
				.map((f) => `<button type="button" class="zm-flow" data-flow="${esc(f.id)}" aria-pressed="${f.selected}">${esc(f.name)}<span class="zm-route-meta">${esc(f.steps)}</span></button>`)
				.join('')}</div>`
		: '';

	let flowDetails = '';
	if (vm.flow) {
		const items = vm.flow.steps
			.map((s) => {
				const depth = s.depth ? ` style="--zm-depth:${s.depth}"` : '';
				const no = `<span class="zm-step-no" aria-hidden="true">${esc(s.number)}</span>`;
				// Judul cabang (`alt`, `opt`, `par`) sebelum langkah-langkah di dalamnya.
				if (s.route === null) {
					return `<li class="zm-branch"${depth}>${no}<span class="zm-step-text zm-branch-title">${esc(s.meta)}</span></li>`;
				}
				const subline = s.meta ? `<span class="zm-route-meta">${esc(s.meta)}</span>` : '';
				return `<li${depth}>${no}<span class="zm-step-text"><span class="zm-route-ends">${ends(s.from, s.to, vm.to)}</span>${subline}</span></li>`;
			})
			.join('');
		const title = `<p class="zm-routes-title">${esc(vm.flow.title)}</p>`;
		const desc = vm.flow.description ? `<p class="zm-flow-note">${esc(vm.flow.description)}</p>` : '';
		const steps = items ? `<ol class="zm-flow-steps">${items}</ol>` : '';
		const note = vm.flow.hidden ? `<p class="zm-flow-note">${esc(vm.flow.hidden)}</p>` : '';
		flowDetails = `${title}${desc}${steps}${note}`;
	}

	return { stage: `${svg}${boxes}${badgeLayer}`, routes, routeCount: vm.routes.length, flowButtons, flowDetails, width: W, height: H };
}
