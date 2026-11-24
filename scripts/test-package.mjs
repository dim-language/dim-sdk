import { execFileSync, spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const sdk = fileURLToPath(new URL('../', import.meta.url));
const temp = await mkdtemp(join(tmpdir(), 'dim-package-'));
const consumer = join(temp, 'consumer');
const packageName = '@dim/sdk';
const run = (command, args, cwd) => execFileSync(command, args, { cwd, encoding: 'utf8' });

const files = {
	'dim.config': 'dim "0.6";\n',
	'main.dim': 'dim "0.6";\nimport "shop.dim";\nperson buyer "Buyer";\nbuy: buyer -> shop "Buys" { op use; }\nflow shopping "Shopping" { step buy; }\n',
	'shop.dim': 'dim "0.6";\nsystem shop "Shop" { container app "App" { role app; } }\n',
};
const smoke = (entry, mapEntry) => `
import { initDim, compileProject, formatFile, createMap, emptyView } from "${entry}";
import { createZoomMap } from "${mapEntry}";

await Promise.all([initDim(), initDim()]);
const files = ${JSON.stringify(files)};
const { model, diagnostics } = compileProject('main.dim', files);
if (model?.version !== '0.6') throw new Error(JSON.stringify(diagnostics));
if (formatFile('shop.dim', files['shop.dim']).text === null) throw new Error('Could not format fixture');
const map = createMap(model);
try {
	const state = map.atZoom(emptyView('shopping'), map.openingScale('shop') * 2).state;
	const view = map.view(state, 'en');
	if (view.flow?.steps[0]?.number !== '1') throw new Error('Flow view failed');
} finally {
	map.free();
}
if (typeof document !== 'undefined') {
	const root = document.createElement('div');
	const stage = document.createElement('div');
	const routes = document.createElement('div');
	root.append(stage, routes);
	document.body.append(root);
	const map = createZoomMap({ root, stage, routes }, { uid: 'test', flow: 'shopping', camera: { scale: 0, focus() {} } });
	map.setModel(model);
	map.setZoom(4);
	if (!stage.querySelector('[data-zoom-to="shop.app"]')) throw new Error('Zoom did not reveal the app');
	if (!stage.querySelector('.zm-edge.is-route')) throw new Error('Flow arrow was not highlighted');
	document.body.dataset.result = 'passed';
}
`;

try {
	const archive = basename(run(process.execPath, ['pm', 'pack', '--quiet', '--destination', temp], sdk).trim());
	await mkdir(consumer);
	await writeFile(join(consumer, 'package.json'), '{"name":"dim-sdk-consumer","private":true,"type":"module"}\n');
	run(process.execPath, ['add', '--offline', '--cache-dir', join(temp, 'cache'), join(temp, archive)], consumer);
	const installed = join(consumer, 'node_modules', packageName);
	for (const path of ['LICENSE', 'dist/index.d.ts', 'dist/map/index.d.ts', 'dist/map.css', 'wasm/THIRD_PARTY_NOTICES.txt']) {
		if (!(await readFile(join(installed, path))).length) throw new Error(`Missing package file ${path}`);
	}
	const tsc = createRequire(join(sdk, 'package.json')).resolve('typescript/bin/tsc');
	await writeFile(join(consumer, 'types.mts'), "import { compileProject, type CompiledProject } from '@dim/sdk';\n" +
		"import { renderMapHtml } from '@dim/sdk/map';\n" +
		"const project: CompiledProject = compileProject('main.dim', {});\n" +
		"if (project.model) renderMapHtml(project.model, { uid: 'm', language: 'en' });\n");
	run('node', [tsc, '--ignoreConfig', '--module', 'nodenext', '--strict', '--noEmit', join(consumer, 'types.mts')], consumer);
	await writeFile(join(consumer, 'smoke.mjs'), smoke(packageName, `${packageName}/map`));
	run('node', ['smoke.mjs'], consumer);
	run(process.execPath, ['smoke.mjs'], consumer);
	console.log('Packed SDK passed TypeScript, Node, and Bun smoke tests');

	const chrome = process.env.CHROME || Bun.which('google-chrome') || Bun.which('chromium');
	if (chrome) {
		const prefix = '/sdk/';
		const server = Bun.serve({
			hostname: '127.0.0.1',
			port: 0,
			fetch(request) {
				const { pathname } = new URL(request.url);
				if (pathname === '/') {
					return new Response('<!doctype html><body><script type="module" src="/smoke.mjs"></script>', {
						headers: { 'Content-Type': 'text/html' },
					});
				}
				if (pathname === '/smoke.mjs') {
					return new Response(smoke('/sdk/dist/index.js', '/sdk/dist/map/index.js'), { headers: { 'Content-Type': 'text/javascript' } });
				}
				if (/^\/sdk\/(dist|dist\/map|wasm)\/[\w.-]+$/.test(pathname) && pathname.startsWith(prefix)) {
					return new Response(Bun.file(join(installed, pathname.slice(prefix.length))));
				}
				return new Response(null, { status: 404 });
			},
		});
		try {
			const dom = await new Promise((resolve, reject) => {
				const browser = spawn(chrome, ['--headless', '--disable-gpu', '--no-sandbox', '--dump-dom', '--virtual-time-budget=5000',
					`--user-data-dir=${join(temp, 'chrome')}`, server.url.href], { timeout: 20000 });
				let html = '';
				let stderr = '';
				browser.stdout.on('data', (chunk) => { html += chunk; });
				browser.stderr.on('data', (chunk) => { stderr += chunk; });
				browser.on('error', reject);
				browser.on('close', (code) => code === 0 ? resolve(html) : reject(new Error(`Browser exited ${code}\n${stderr}`)));
			});
			if (!dom.includes('data-result="passed"')) throw new Error('The packed SDK did not render in the browser');
			console.log('Packed SDK passed the browser WASM, zoom, and flow smoke test');
		} finally {
			server.stop(true);
		}
	}
} finally {
	await rm(temp, { recursive: true, force: true });
}
