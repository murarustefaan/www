import {
	BackSide,
	BufferGeometry,
	CanvasTexture,
	Color,
	DataTexture,
	Euler,
	Float32BufferAttribute,
	Group,
	LatheGeometry,
	type Material,
	Matrix4,
	Mesh,
	MeshToonMaterial,
	NearestFilter,
	type Object3D,
	Quaternion,
	RedFormat,
	ShaderMaterial,
	SphereGeometry,
	SRGBColorSpace,
	Vector2,
	Vector3,
} from "three";

export const PAL = {
	R: "#ab1d2e",
	K: "#1c1b1a",
	D: "#d1cfca",
	G: "#3a3836",
	w: "#8a6a4c",
	v: "#7c5e42",
	g: "#6f5546",
	y: "#2f3237",
	Y: "#45484e",
	M: "#26282d",
	X: "#1c1b1a",
	s: "#ebe6da",
	p: "#f4f0e6",
	l: "#f6d9a6",
	h: "#c9b48c",
	f: "#b9b2a7",
	A: "#e0566a",
	t: "#efe6d2",
	O: "#e2b445",
	n: "#77736b",
	u: "#a8a296",
	c: "#f3eee2",
} as const;

export type Swatch = keyof typeof PAL;
export type Triple = readonly [number, number, number];

export const SCALE = 25;
export const INK_SCALE = 0.5;

export const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const ease = (u: number) => u * u * (3 - 2 * u);
export const smooth = (a: number, b: number, x: number) => ease(clamp((x - a) / (b - a), 0, 1));
export const rnd = (n: number) => {
	const x = Math.sin(n * 12.9898) * 43758.5453;
	return x - Math.floor(x);
};
export const V = (x = 0, y = 0, z = 0) => new Vector3(x, y, z);
export const xf = (at: Triple = [0, 0, 0], rot: Triple = [0, 0, 0], s = 1) =>
	new Matrix4().compose(
		V(...at),
		new Quaternion().setFromEuler(new Euler(rot[0], rot[1], rot[2], "YXZ")),
		V(s, s, s),
	);

export const ramp = new DataTexture(new Uint8Array([0, 120, 255]), 3, 1, RedFormat);
ramp.minFilter = ramp.magFilter = NearestFilter;
ramp.needsUpdate = true;

const toons = new Map<Swatch, MeshToonMaterial>();
export function toon(c: Swatch): MeshToonMaterial {
	let m = toons.get(c);
	if (!m) {
		m = new MeshToonMaterial({ color: PAL[c], gradientMap: ramp });
		toons.set(c, m);
	}
	return m;
}

const inks = new Map<number, ShaderMaterial>();
export function ink(w: number): ShaderMaterial {
	let m = inks.get(w);
	if (!m) {
		m = new ShaderMaterial({
			uniforms: { w: { value: w }, tone: { value: new Color(PAL.K) } },
			vertexShader:
				"uniform float w; void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * w, 1.0); }",
			fragmentShader:
				"uniform vec3 tone; void main() { gl_FragColor = vec4(tone, 1.0);\n#include <colorspace_fragment>\n}",
			side: BackSide,
		});
		inks.set(w, m);
	}
	return m;
}

export function rbox(w: number, h: number, d: number, r: number): SphereGeometry {
	const g = new SphereGeometry(r, 20, 13, Math.PI / 20);
	const p = g.attributes.position;
	if (!p) return g;
	for (let i = 0; i < p.count; i++) {
		const x = p.getX(i);
		const y = p.getY(i);
		const z = p.getZ(i);
		p.setXYZ(
			i,
			x + Math.sign(x) * (w / 2 - r),
			y + Math.sign(y) * (h / 2 - r),
			z + Math.sign(z) * (d / 2 - r),
		);
	}
	return g;
}

export function limb(r0: number, r1: number, len: number, seg = 16): LatheGeometry {
	const pts: Vector2[] = [];
	for (let i = 0; i <= 6; i++) {
		const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2);
		pts.push(new Vector2(r1 * Math.cos(a), -len + r1 * Math.sin(a)));
	}
	for (let i = 0; i <= 6; i++) {
		const a = (i / 6) * (Math.PI / 2);
		pts.push(new Vector2(r0 * Math.cos(a), r0 * Math.sin(a)));
	}
	return new LatheGeometry(pts, seg);
}

export const ell = (rx: number, ry: number, rz: number, ws = 24, hs = 16) =>
	new SphereGeometry(1, ws, hs).scale(rx, ry, rz);

export const lathe = (pts: ReadonlyArray<readonly [number, number]>, seg: number) =>
	new LatheGeometry(
		pts.map(([x, y]) => new Vector2(x, y)),
		seg,
	);

export function merge(parts: ReadonlyArray<readonly [BufferGeometry, Matrix4]>): BufferGeometry {
	const pos: number[] = [];
	const nrm: number[] = [];
	const idx: number[] = [];
	let base = 0;
	for (const [g0, m] of parts) {
		const g = g0.clone().applyMatrix4(m);
		const p = g.attributes.position?.array ?? [];
		const n = g.attributes.normal?.array ?? [];
		for (let i = 0; i < p.length; i++) {
			pos.push(p[i] ?? 0);
			nrm.push(n[i] ?? 0);
		}
		const ix = g.index ? Array.from(g.index.array) : Array.from({ length: p.length / 3 }, (_, i) => i);
		for (const i of ix) idx.push(i + base);
		base += p.length / 3;
	}
	const out = new BufferGeometry();
	out.setAttribute("position", new Float32BufferAttribute(pos, 3));
	out.setAttribute("normal", new Float32BufferAttribute(nrm, 3));
	out.setIndex(idx);
	return out;
}

interface AddOptions {
	at?: Triple;
	rot?: Triple;
	line?: number;
	shadow?: boolean;
}

export function add(
	parent: Object3D,
	geo: BufferGeometry,
	mat: Swatch | Material,
	{ at = [0, 0, 0], rot = [0, 0, 0], line = 0.12, shadow = true }: AddOptions = {},
): Mesh {
	const m = new Mesh(geo, typeof mat === "string" ? toon(mat) : mat);
	m.position.set(...at);
	m.rotation.set(rot[0], rot[1], rot[2], "YXZ");
	m.castShadow = shadow;
	m.receiveShadow = true;
	if (line) {
		const o = new Mesh(geo, ink(line * INK_SCALE));
		o.userData.ink = true;
		m.add(o);
	}
	parent.add(m);
	return m;
}

export function joint(parent: Object3D, at: Triple = [0, 0, 0]): Group {
	const g = new Group();
	g.position.set(...at);
	g.rotation.order = "YXZ";
	parent.add(g);
	return g;
}

export interface Oval {
	x: number;
	z: number;
	rx: number;
	rz: number;
	rim: number;
}

export function base(parent: Object3D, b: Oval): Mesh {
	const pts = [new Vector2(0, -2 * b.rim)];
	for (let i = 0; i <= 8; i++) {
		const a = -Math.PI / 2 + (i / 8) * Math.PI;
		pts.push(new Vector2(1 + (b.rim / b.rx) * (Math.cos(a) - 1), b.rim * (Math.sin(a) - 1)));
	}
	pts.push(new Vector2(0, 0));
	const m = add(parent, new LatheGeometry(pts, 96).scale(b.rx, 1, b.rz), "D", {
		at: [b.x, 0, b.z],
		line: 0,
		shadow: false,
	});
	m.userData.fit = Array.from({ length: 48 }, (_, i) => {
		const a = (i / 48) * Math.PI * 2;
		return [V(Math.sin(a) * b.rx, 0, Math.cos(a) * b.rz), V(Math.sin(a) * b.rx, -2 * b.rim, Math.cos(a) * b.rz)];
	}).flat();
	return m;
}

export function canvasTexture(w: number, h: number, paint: (x: CanvasRenderingContext2D) => void) {
	const cv = document.createElement("canvas");
	cv.width = w;
	cv.height = h;
	const x = cv.getContext("2d");
	if (x) paint(x);
	const t = new CanvasTexture(cv);
	t.colorSpace = SRGBColorSpace;
	return t;
}
