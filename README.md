# DIM TypeScript SDK

DIM (Diagram In Markup) describes software architecture as a text model you can explore from systems down to code. This SDK wraps the compiled DIM runtime in WebAssembly. The [documentation and examples](https://github.com/dim-language/docs) live in their own repository.

```sh
npm install @dim/sdk
```

The packaged SDK is also available from [GitHub Releases](https://github.com/dim-language/dim-sdk/releases/tag/v0.3.1).

The SDK has two entries:

- `@dim/sdk` wraps the Rust SDK compiled to WebAssembly. It only passes JSON across and uses no DOM, so it runs in browsers, Node, and Bun. All map rules and map text (Indonesian and English) come from Rust.
- `@dim/sdk/map` is the web map component. It turns the SDK's view model into HTML and handles the camera, side panel tabs, and floating controls.

```ts
import { compileProject, createMap, emptyView, initDim } from '@dim/sdk';

await initDim();
const { model, diagnostics } = compileProject('main.dim', {
  'dim.config': 'dim "0.6";\n',
  'main.dim': `dim "0.6";
person buyer "Buyer";
system shop "Shop";
buy: buyer -> shop { op use; }
`,
});
if (!model) throw new Error(JSON.stringify(diagnostics));

const map = createMap(model);
try {
  const state = map.atZoom(emptyView(), 0.5).state;
  const view = map.view(state, 'en');
  console.log(view.routes.map((route) => `${route.from} → ${route.to}: ${route.meta}`));
} finally {
  map.free();
}
```

The SDK reads and writes DIM 0.6. Every project needs a `dim.config` next to its main file; pass it with the other files. The model follows the language's JSON output format, and its JSON Schema is available as `modelSchema()` or `@dim/sdk/model.schema.json`.

`formatFile` formats one file. Pass a record of files to `compileProject` for models with imports.

For a page, render the map's HTML on the server or in the browser, then mount it:

```ts
import { renderMapHtml, mountAll } from '@dim/sdk/map';
import '@dim/sdk/map.css';

element.innerHTML = renderMapHtml(model, { uid: 'shop', language: 'en' });
await mountAll(element);
```

The map's colours and fonts are `--zm-*` CSS custom properties; set them to match your site. Icons and backgrounds come from the `style` rules in `dim.config`; the `--zm-tone-*` properties set the colour behind each background token.

## Develop the SDK

```sh
bun install --frozen-lockfile
bun run check
bun run test
bun run build
bun scripts/test-package.mjs
```

Use Bun 1.4.3 and Node.js 24. Build and test the SDK with its pinned WASM runtime and vocabulary. See the [SDK reference](https://github.com/dim-language/docs/blob/main/src/content/docs/en/referensi/cli.md) for usage.

## Release

Update the SDK version, build and test, and run `npm pack`. Attach the tarball and a `SHA256SUMS` file for it to a GitHub release tagged `v<version>`. For the first npm publication, a maintainer with access to `@dim` publishes that tarball. Configure npm Trusted Publishing for `publish.yml` for later releases. The workflow checks the GitHub release checksum before publishing.

## License

DIM's published materials are [source-available](LICENSE). Commercial SDK or runtime use requires a US$50 minimum annual donation when total annual revenue exceeds US$10,000. At US$10 million or more, it also requires a separate paid enterprise license from the DIM copyright holder. See the license for the full terms and donation eligibility. Contact [the DIM owner](https://github.com/a-man-called-q) for enterprise licensing.
