import { expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { compileProject, createMap, formatFile, initDim, modelSchema, type MapView } from '../src/index.ts';

const shop = new URL('./fixtures/shop/', import.meta.url);
// Fixture dari docs/examples/shop, dengan `class repo` diganti `rows` (`repo` keyword di SPEC §3.5).
const files = Object.fromEntries(readdirSync(shop).map((name) => [name, readFileSync(new URL(name, shop), 'utf8')]));

test('the compiled WASM builds the shop map view and its state changes', async () => {
	await initDim();
	const compiled = compileProject('main.dim', files);
	expect(compiled.diagnostics).toEqual([]);
	expect(compiled.files).toEqual(['main.dim', 'payment.dim', 'shop.dim', 'dim.config']);
	const model = compiled.model!;
	expect(model.version).toBe('0.6');
	expect(model.spans?.elements['shop.api']?.file).toBe('shop.dim');
	expect(model.elements.find((e) => e.id === 'shop.db')).toMatchObject({ kind: 'container', role: 'database' });

	const map = createMap(model);
	try {
		// Z2: sistem terbuka.
		const z2: MapView = { expanded: ['payment', 'shop'], flow: 'checkout', pinned: null };
		const view = map.view(z2, 'id');
		const db = view.routes.findIndex((r) => r.from === 'API' && r.to === 'Postgres');
		expect(view.routes[db].meta).toBe('write, read · kirim Order, RefundId · ambil Order · 3 relasi');
		expect(view.edges[db]).toMatchObject({ inFlow: true, hot: true });
		expect(view.edges[db].path).toMatch(/^M/);
		expect(view.flow?.title).toBe('Langkah Checkout');
		// Cabang `alt` tetap tampil walau tinggal satu `case`, dengan judulnya sebelum langkahnya.
		expect(view.flow?.steps.map((s) => s.number)).toEqual(['1', '2', '3', '4a', '4a.1']);
		expect(view.flow?.steps[3]).toMatchObject({ route: null, depth: 0, meta: 'pilihan · Pembayaran berhasil' });
		expect(view.flow?.hidden).toStartWith('5 langkah tidak tampil');
		expect(map.view(z2, 'en').flows[0].steps).toBe('9 steps');

		// Tampilan dari `style` di dim.config.
		const box = (id: string) => view.boxes.find((b) => b.rect.id === id)!;
		expect(box('shop.web')).toMatchObject({ icon: 'browser', background: 'blue', external: false });
		expect(box('shop.db')).toMatchObject({ icon: 'database', background: 'info' });
		expect(box('payment')).toMatchObject({ external: true, kindLabel: 'Sistem eksternal' });

		// Transisi keadaan berjalan di Rust; JSON-nya bolak-balik apa adanya.
		const pinned = map.pin(z2, db);
		expect(pinned).toEqual({ ...z2, pinned: db });
		expect(map.selectFlow(pinned, 'checkout')).toEqual({ ...z2, flow: null });
		const zoomed = map.atZoom(z2, 3);
		expect(zoomed.changed).toBe(true);
		expect(zoomed.state.expanded.length).toBeGreaterThan(2);
		expect(map.visible(z2, 'shop.api.orders')).toBe('shop.api');
		expect(map.box('shop')).toMatchObject({ id: 'shop', region: true });
		expect(map.box('shop.api.orders.order#total')).toMatchObject({ member: 'shop.api.orders.order', field: 'total' });
	} finally {
		map.free();
	}
});

test('WASM compiler and formatter report positioned errors', async () => {
	await initDim();
	const entry = 'main.dim';
	const missing = compileProject(entry, {});
	expect(missing.model).toBeNull();
	expect(missing.diagnostics).toMatchObject([{ code: 'E601', file: entry, line: 1, col: 1 }]);
	// Tanpa dim.config: E101.
	expect(compileProject(entry, { [entry]: 'dim "0.6";\n' }).diagnostics.map((d) => d.code)).toEqual(['E101']);
	const config = { 'dim.config': 'dim "0.6";\n' };
	expect(compileProject(entry, { ...config, [entry]: 'dim "0.6";\n' }).model?.elements).toEqual([]);

	const bad = compileProject(entry, { ...config, [entry]: 'dim "0.6";\nsystem a "Tokó 🛒";\nr: a -> nope { op use; }\n' });
	expect(bad.model).toBeNull();
	expect(bad.diagnostics).toMatchObject([{ code: 'E208', file: entry, line: 3, col: 9, endCol: 13 }]);

	const source = 'dim "0.6";\nsystem shop "Shop"{container api "API"{role service;}}';
	const formatted = formatFile(entry, source);
	expect(formatted.diagnostics).toEqual([]);
	expect(formatted.text).not.toBe(source);
	expect(formatFile(entry, formatted.text!)).toEqual(formatted);
	expect(formatFile(entry, 'system shop {')).toMatchObject({
		text: null,
		diagnostics: [{ code: 'E001', file: entry, severity: 'error' }],
	});
});

test('the model schema comes from Rust', async () => {
	await initDim();
	const schema = modelSchema() as { title?: string; required?: string[] };
	expect(schema.required).toContain('elements');
	expect(JSON.stringify(schema)).toContain('"protocol"');
});
