// `@dim/sdk` hanya membungkus SDK Rust: entry utama tidak boleh memakai DOM atau mengimpor komponen peta.
import { expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';

const src = new URL('../src/', import.meta.url);

test('the root entry stays a DOM-free wrapper', () => {
	const files = readdirSync(src).filter((name) => name.endsWith('.ts'));
	expect(files).toContain('index.ts');
	for (const name of files) {
		const code = readFileSync(new URL(name, src), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
		expect({ name, map: /from\s+['"]\.\/map\//.test(code) }).toEqual({ name, map: false });
		expect({ name, dom: /\b(document|window)\.|\bHTMLElement\b/.test(code) }).toEqual({ name, dom: false });
	}
});
