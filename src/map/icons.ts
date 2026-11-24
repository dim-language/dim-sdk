// Ikon dari set tertutup SPEC §5.7, digambar sebagai garis 24×24 (stroke `currentColor`). Bentuknya sengaja
// sederhana dan semantik, tanpa logo merek; situs bisa menggantinya lewat `[data-icon]` di CSS.

import type { DimIcon } from '../model.js';

const paths: Record<DimIcon, string> = {
	user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
	users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 20a7 7 0 0 1 14 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 13.5a7 7 0 0 1 4 6.5',
	browser: 'M3 5h18v14H3zM3 9h18M6 7h.01M9 7h.01',
	mobile: 'M7 2h10v20H7zM11 18h2',
	desktop: 'M3 4h18v12H3zM8 20h8M12 16v4',
	server: 'M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01',
	api: 'M8 6l-5 6 5 6M16 6l5 6-5 6M13 5l-2 14',
	database: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
	queue: 'M3 7h4v10H3zM10 7h4v10h-4zM17 7h4v10h-4z',
	storage: 'M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7M12 11v10',
	cache: 'M13 2L4 14h7l-1 8 9-12h-7z',
	cloud: 'M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8z',
	lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
	key: 'M8 15a4 4 0 1 1 3.5-6M11 11l10 0M18 11v3M21 11v3',
	mail: 'M3 5h18v14H3zM3 5l9 8 9-8',
	payment: 'M2 6h20v12H2zM2 10h20M6 15h4',
	cart: 'M3 4h2l3 11h11l2-8H6M9 20h.01M18 20h.01',
	search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM16 16l5 5',
	chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
	file: 'M6 2h8l5 5v15H6zM14 2v5h5',
	folder: 'M3 6h6l2 2h10v11H3z',
	gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',
	bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4',
	globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
};

/** SVG ikon untuk kotak peta; teks alternatifnya sudah ada di nama dan jenis kotak. */
export function iconSvg(icon: DimIcon): string {
	return `<svg class="zm-icon" data-icon="${icon}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${paths[icon]}"/></svg>`;
}
