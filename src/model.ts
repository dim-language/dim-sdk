// Model DIM 0.6 (SPEC §16), sama dengan `dim::model` di Rust dan `model.schema.json`. Field yang tidak berlaku
// tidak ditulis sama sekali (tidak ada `null`); daftar kosong dan `false` juga tidak ditulis.

type Meta = Record<string, unknown>;

/** Lokasi di sumber (§16.7). Baris dan kolom mulai dari 1, dihitung per karakter. */
export interface DimSpan {
	file: string;
	line: number;
	col: number;
	endLine: number;
	endCol: number;
}

// ---------------------------------------------------------------------------
// Konfigurasi (§5)
// ---------------------------------------------------------------------------

export type DimIcon =
	| 'user' | 'users' | 'browser' | 'mobile' | 'desktop' | 'server' | 'api' | 'database' | 'queue' | 'storage'
	| 'cache' | 'cloud' | 'lock' | 'key' | 'mail' | 'payment' | 'cart' | 'search' | 'chart' | 'file' | 'folder'
	| 'gear' | 'bell' | 'globe';

export type DimBackground =
	| 'neutral' | 'accent' | 'info' | 'success' | 'warning' | 'danger'
	| 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'teal';

export interface DimTech { id: string; name: string; version?: string; url?: string; description?: string }
export interface DimTag { id: string; name: string; description?: string }
export interface DimScope { id: string; value: string }
export interface DimRoot { id: string; repo: string; branch: string }

export interface DimStyle {
	selector: { kind: string } | { role: string } | { tag: string };
	icon?: DimIcon;
	background?: DimBackground;
}

export interface DimConfig {
	techs: DimTech[];
	tags: DimTag[];
	scopes: DimScope[];
	roots: DimRoot[];
	styles: DimStyle[];
}

// ---------------------------------------------------------------------------
// Tipe (§8)
// ---------------------------------------------------------------------------

export type DimPrimitive =
	| 'string' | 'int' | 'float' | 'decimal' | 'bool' | 'bytes' | 'date' | 'datetime' | 'duration' | 'uuid' | 'url';

/** Ekspresi tipe: objek dengan tepat satu key. `ref` adalah path penuh elemen tipe. */
export type DimType =
	| { primitive: DimPrimitive }
	| { ref: string }
	| { list: DimType }
	| { optional: DimType }
	| { map: { key: DimType; value: DimType } };

// ---------------------------------------------------------------------------
// Elemen (§16.2)
// ---------------------------------------------------------------------------

export interface DimSource { root: string; path: string; line?: number }

export interface DimBase {
	/** Path penuh, mis. `"shop.api.orders"`. */
	id: string;
	parent?: string;
	name: string;
	description?: string;
	tags?: string[];
	source?: DimSource;
	meta?: Meta;
}

export type DimParadigm = 'procedural' | 'functional' | 'oop';
export type DimContainerRole = 'app' | 'service' | 'database' | 'queue' | 'storage' | 'cache';
export interface DimAuth { scheme: 'none' | 'bearer' | 'cookie' | 'basic' | 'apiKey'; scopes?: string[] }
export interface DimRate { key: 'ip' | 'user' | 'session' | 'apiKey'; limit: number; per: string; perMs: number }

export interface DimPerson extends DimBase { kind: 'person' }
export interface DimSystem extends DimBase { kind: 'system'; external?: boolean }

export interface DimContainer extends DimBase {
	kind: 'container';
	role: DimContainerRole;
	paradigms?: DimParadigm[];
	techs?: string[];
	external?: boolean;
	prefix?: string;
	auth?: DimAuth;
	rates?: DimRate[];
}

export interface DimComponent extends DimBase {
	kind: 'component';
	paradigms?: DimParadigm[];
	techs?: string[];
	prefix?: string;
	auth?: DimAuth;
	rates?: DimRate[];
}

export interface DimParam { id: string; type: DimType; description?: string }
export interface DimNamedParam { name: string; type: DimType; description?: string }
export interface DimTyped { type: DimType; description?: string }

export interface DimHttp {
	protocol: 'http';
	method: 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options';
	path: string;
	/** `prefix` semua leluhur, lalu `path`. */
	fullPath: string;
	params?: DimParam[];
	queries?: DimParam[];
	headers?: DimNamedParam[];
	cookies?: DimNamedParam[];
	body?: DimType;
	returns: { status: number; type?: DimType; description?: string };
	throws?: (DimTyped & { status: number })[];
	sets?: { target: 'cookie' | 'header'; name: string; description?: string }[];
}

export interface DimGrpc {
	protocol: 'grpc';
	service: string;
	rpc: string;
	request: DimType;
	returns: DimType;
	stream?: 'client' | 'server' | 'bidi';
	throws?: (DimTyped & { code: string })[];
}

export interface DimGraphql {
	protocol: 'graphql';
	operation: 'query' | 'mutation' | 'subscription';
	field: string;
	params?: DimParam[];
	returns: DimType;
	throws?: DimTyped[];
}

export interface DimEvent {
	protocol: 'event';
	event: string;
	/** Path penuh container ber-`role queue`. */
	queue: string;
	payload: DimType;
}

export type DimEndpoint = DimBase & {
	kind: 'endpoint';
	handler?: string;
	auth?: DimAuth;
	rates?: DimRate[];
} & (DimHttp | DimGrpc | DimGraphql | DimEvent);

export type DimVisibility = 'public' | 'private' | 'protected' | 'internal';
export interface DimField { id: string; type: DimType; description?: string }
export interface DimVariant { id: string; type?: DimType; description?: string }

interface Signature {
	params?: DimParam[];
	returns?: DimTyped;
	throws?: DimTyped[];
}

export type DimCodeForm =
	| { form: 'module' }
	| ({ form: 'function'; async?: boolean; pure?: boolean; effects?: boolean } & Signature)
	| { form: 'class'; visibility?: DimVisibility; abstract?: boolean; fields?: DimField[] }
	| { form: 'interface'; visibility?: DimVisibility }
	| ({ form: 'method'; async?: boolean; visibility?: DimVisibility; static?: boolean; abstract?: boolean } & Signature)
	| { form: 'constructor'; visibility?: DimVisibility; params?: DimParam[]; throws?: DimTyped[] }
	| { form: 'record'; fields?: DimField[] }
	| { form: 'enum'; variants: DimVariant[] }
	| { form: 'union'; variants: DimVariant[] }
	| { form: 'alias'; type: DimType };

export type DimCode = DimBase & { kind: 'code' } & DimCodeForm;

export type DimElement = DimPerson | DimSystem | DimContainer | DimComponent | DimEndpoint | DimCode;

// ---------------------------------------------------------------------------
// Relasi (§9)
// ---------------------------------------------------------------------------

export type DimOp =
	| 'use' | 'call' | 'read' | 'write' | 'publish' | 'subscribe' | 'inherits' | 'implements' | 'owns' | 'refers';

export interface DimData {
	dir: 'push' | 'pull';
	type: DimType;
	/** Diambil dari kontrak endpoint (§10.8). */
	derived?: boolean;
}

export interface DimRelation {
	id: string;
	from: string;
	to: string;
	op: DimOp;
	category: 'interaction' | 'structure';
	/** Hanya kalau ditulis; label turunan dihitung peta (§9.6). */
	label?: string;
	data?: DimData[];
	techs?: string[];
	description?: string;
	tags?: string[];
	meta?: Meta;
}

// ---------------------------------------------------------------------------
// Flow (§12)
// ---------------------------------------------------------------------------

export interface DimBranch {
	id: string;
	label: string;
	letter: string;
	steps: DimFlowItem[];
}

export type DimFlowItem =
	| { kind: 'step'; relation: string; number: string; note?: string }
	| { kind: 'opt'; number: string; branch: DimBranch }
	| { kind: 'alt' | 'par'; number: string; branches: DimBranch[] };

export interface DimFlow {
	id: string;
	name: string;
	description?: string;
	tags?: string[];
	meta?: Meta;
	steps: DimFlowItem[];
}

// ---------------------------------------------------------------------------
// Deployment (§13)
// ---------------------------------------------------------------------------

export type DimDeploymentElement =
	| { kind: 'node'; id: string; parent?: string; name: string; description?: string; techs?: string[]; tags?: string[]; meta?: Meta }
	| {
		kind: 'infra';
		id: string;
		parent: string;
		name: string;
		role: 'loadBalancer' | 'cdn' | 'dns' | 'firewall' | 'apiGateway';
		description?: string;
		techs?: string[];
		tags?: string[];
		meta?: Meta;
	}
	| { kind: 'deploy'; id: string; parent: string; container: string; replicas: number; description?: string; tags?: string[]; meta?: Meta };

export interface DimEnvironment {
	id: string;
	name: string;
	description?: string;
	tags?: string[];
	meta?: Meta;
	elements?: DimDeploymentElement[];
	relations?: DimRelation[];
	omitted?: string[];
}

// ---------------------------------------------------------------------------
// Dokumen
// ---------------------------------------------------------------------------

export interface DimSpans {
	elements: Record<string, DimSpan>;
	relations: Record<string, DimSpan>;
	flows: Record<string, DimSpan>;
	environments: Record<string, DimSpan>;
	config: Record<string, DimSpan>;
}

export interface DimModel {
	version: '0.6';
	config: DimConfig;
	elements: DimElement[];
	relations: DimRelation[];
	flows: DimFlow[];
	environments: DimEnvironment[];
	spans?: DimSpans;
}
