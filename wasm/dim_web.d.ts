/* tslint:disable */
/* eslint-disable */

/**
 * One compiled model with its full layout. The map's state ([`MapView`]) goes in and out as JSON, so the
 * page keeps it and can render the first frame on the server with the same calls.
 */
export class WebMap {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Open and close elements for `scale`: `{ changed, state }`.
     */
    atZoom(state: string, scale: number): string;
    boxOf(id: string): string;
    /**
     * Carry a state made for another model over to this one.
     */
    carry(state: string): string;
    constructor(model: string);
    openingScale(id: string): number;
    pin(state: string, route: number): string;
    selectFlow(state: string, id: string): string;
    /**
     * Everything drawn for `state`, with its text in `language` ("id" or "en").
     */
    view(state: string, language: string): string;
    /**
     * The element that shows `id` in `state`: itself, or its closed ancestor.
     */
    visible(state: string, id: string): string;
}

export function compileProject(entry: string, files: string): string;

export function formatFile(name: string, text: string): string;

/**
 * JSON Schema model 0.6 (SPEC §16), sama dengan `model.schema.json`.
 */
export function modelSchema(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_webmap_free: (a: number, b: number) => void;
    readonly compileProject: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly formatFile: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly modelSchema: () => [number, number];
    readonly webmap_atZoom: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly webmap_boxOf: (a: number, b: number, c: number) => [number, number, number, number];
    readonly webmap_carry: (a: number, b: number, c: number) => [number, number, number, number];
    readonly webmap_new: (a: number, b: number) => [number, number, number];
    readonly webmap_openingScale: (a: number, b: number, c: number) => number;
    readonly webmap_pin: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly webmap_selectFlow: (a: number, b: number, c: number, d: number, e: number) => [number, number, number, number];
    readonly webmap_view: (a: number, b: number, c: number, d: number, e: number) => [number, number, number, number];
    readonly webmap_visible: (a: number, b: number, c: number, d: number, e: number) => [number, number, number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
