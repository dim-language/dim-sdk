import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const runtime = new URL('../wasm/', import.meta.url);
const { version, sha256 } = JSON.parse(await readFile(new URL('manifest.json', runtime), 'utf8'));
const files = ['dim_web.js', 'dim_web.d.ts', 'dim_web_bg.wasm', 'dim_web_bg.wasm.d.ts', 'vocab.json', 'model.schema.json', 'THIRD_PARTY_NOTICES.txt'];
if (!version || Object.keys(sha256).length !== files.length) {
	throw new Error('Invalid DIM runtime manifest');
}
for (const name of files) {
	const contents = await readFile(new URL(name, runtime));
	const actual = createHash('sha256').update(contents).digest('hex');
	if (actual !== sha256[name]) throw new Error(`DIM runtime checksum mismatch: ${name}`);
}
