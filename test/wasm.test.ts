import { expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { compileProject, createMap, formatFile, initDim, type MapView } from '../src/index.ts';

test('the compiled WASM builds the shop map view and its state changes', async () => {
	await initDim();
	const shop = new URL('./fixtures/shop/', import.meta.url);
	const files = Object.fromEntries(readdirSync(shop).filter((name) => name.endsWith('.dim'))
		.map((name) => [name, readFileSync(new URL(name, shop), 'utf8')]));
	const compiled = compileProject('main.dim', files);
	expect(compiled.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
	expect(compiled.files).toEqual(['main.dim', 'shop.dim', 'payment.dim']);
	expect(compiled.model?.version).toBe('0.5');
	const map = createMap(compiled.model!);
	try {
		// Elemen terbuka tingkat Z2: sistem saja.
		const z2: MapView = { expanded: ['payment', 'shop'], flow: 'checkout', pinned: null };
		const view = map.view(z2, 'id');
		const db = view.routes.findIndex((r) => r.from === 'API' && r.to === 'Postgres');
		expect(view.routes[db].meta).toBe('write, read · kirim Order · ambil Order · 2 relasi');
		expect(view.edges[db]).toMatchObject({ inFlow: true, hot: true });
		expect(view.edges[db].path).toMatch(/^M/);
		expect(view.flow?.title).toBe('Langkah Checkout');
		expect(view.flow?.steps).toHaveLength(4);
		expect(view.flow?.hidden).toStartWith('3 langkah tidak tampil');
		expect(map.view(z2, 'en').flows[0].steps).toBe('7 steps');

		// Transisi keadaan berjalan di Rust; JSON-nya bolak-balik apa adanya.
		const pinned = map.pin(z2, db);
		expect(pinned).toEqual({ ...z2, pinned: db });
		expect(map.selectFlow(pinned, 'checkout')).toEqual({ ...z2, flow: null });
		const zoomed = map.atZoom(z2, 3);
		expect(zoomed.changed).toBe(true);
		expect(zoomed.state.expanded.length).toBeGreaterThan(2);
		expect(map.visible(z2, 'shop.api.orders')).toBe('shop.api');
		expect(map.box('shop')).toMatchObject({ id: 'shop', region: true });
	} finally {
		map.free();
	}
});

test('WASM compiler and formatter report positioned errors', async () => {
	await initDim();
	const entry = 'main.dim';
	const missing = compileProject(entry, {});
	expect(missing.model).toBeNull();
	expect(missing.diagnostics).toMatchObject([{ code: 'E040', file: entry, line: 1, col: 1 }]);
	expect(compileProject(entry, { [entry]: '' }).model?.nodes).toEqual([]);

	const bad = compileProject(entry, { [entry]: 'system a "Tokó 🛒"; a -> nope;' });
	expect(bad.model).toBeNull();
	expect(bad.diagnostics).toMatchObject([{ code: 'E020', file: entry, line: 1, col: 25, endCol: 29 }]);

	const source = 'system shop{container api;}';
	const formatted = formatFile(entry, source);
	expect(formatted.diagnostics).toEqual([]);
	expect(formatted.text).not.toBe(source);
	expect(formatFile(entry, formatted.text!)).toEqual(formatted);
	expect(formatFile(entry, 'system shop {')).toMatchObject({
		text: null,
		diagnostics: [{ code: 'E001', file: entry, severity: 'error' }],
	});
});
