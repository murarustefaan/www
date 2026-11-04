import { type BufferGeometry, CanvasTexture, type Matrix4, type Texture, Vector3 } from "three";
import { clamp, smooth, V } from "./kit";

export interface Eye {
	x: number;
	y: number;
	w: number;
	h: number;
}

interface LidOptions {
	loose?: boolean;
	depth?: number;
}

export function modelPoints(geo: BufferGeometry, toModel: Matrix4): Float32Array {
	const P = geo.attributes.position;
	if (!P) return new Float32Array();
	const out = new Float32Array(P.count * 3);
	const v = new Vector3();
	for (let i = 0; i < P.count; i++) {
		v.fromBufferAttribute(P, i).applyMatrix4(toModel);
		out[i * 3] = v.x;
		out[i * 3 + 1] = v.y;
		out[i * 3 + 2] = v.z;
	}
	return out;
}

export function paintLids(
	map: Texture,
	geo: BufferGeometry,
	pts: Float32Array,
	eyes: Eye[],
	{ loose = false, depth = 0.05 }: LidOptions = {},
): CanvasTexture | null {
	const img = map.image as CanvasImageSource & { width: number; height: number };
	const W = img.width;
	const H = img.height;
	const T = geo.attributes.uv;
	const N = geo.attributes.normal;
	const I = geo.index?.array;
	const cv = document.createElement("canvas");
	cv.width = W;
	cv.height = H;
	const cx = cv.getContext("2d", { willReadFrequently: true });
	if (!T || !N || !I || !cx) return null;
	cx.drawImage(img, 0, 0);
	const px = cx.getImageData(0, 0, W, H);
	const d = px.data;
	const X = (i: number) => pts[i * 3] ?? 0;
	const Y = (i: number) => pts[i * 3 + 1] ?? 0;
	const Z = (i: number) => pts[i * 3 + 2] ?? 0;
	const count = pts.length / 3;
	map.updateMatrix();
	const uvAt = (i: number) => V(T.getX(i), T.getY(i), 1).applyMatrix3(map.matrix);
	const texel = (u: number, v: number) =>
		(clamp(Math.floor(v * H), 0, H - 1) * W + clamp(Math.floor(u * W), 0, W - 1)) * 4;
	const near = (e: Eye, i: number, sx: number, sy: number) =>
		Math.abs(X(i) - e.x) < sx * e.w && Math.abs(Y(i) - e.y) < sy * e.h && N.getZ(i) > 0.2;
	const front = eyes.map((e) => {
		let z = -1e9;
		for (let i = 0; i < count; i++) if (near(e, i, 1.6, 2)) z = Math.max(z, Z(i));
		return z;
	});
	const tones = eyes.map((e, n) => {
		const tone = [0, 0, 0];
		let m = 0;
		const f = front[n] ?? 0;
		for (let i = 0; i < count; i++) {
			const dy = (Y(i) - e.y) / e.h;
			if (
				Math.abs(X(i) - e.x) < e.w &&
				dy < -1.2 &&
				dy > -3.5 &&
				N.getZ(i) > 0.2 &&
				Z(i) > f - 0.08
			) {
				const q = uvAt(i);
				const k = texel(q.x, q.y);
				tone[0] = (tone[0] ?? 0) + (d[k] ?? 0);
				tone[1] = (tone[1] ?? 0) + (d[k + 1] ?? 0);
				tone[2] = (tone[2] ?? 0) + (d[k + 2] ?? 0);
				m++;
			}
		}
		return m ? tone.map((c) => c / m) : null;
	});
	eyes.forEach((e, n) => {
		const z = front[n] ?? 0;
		const lid = tones[n] ?? tones[1 - n];
		if (!lid) return;
		const lash = [(lid[0] ?? 0) * 0.28, (lid[1] ?? 0) * 0.2, (lid[2] ?? 0) * 0.18];
		for (let f = 0; f < I.length; f += 3) {
			const a = I[f] ?? 0;
			const b = I[f + 1] ?? 0;
			const c = I[f + 2] ?? 0;
			const tri = [a, b, c];
			if (loose) {
				const xs = tri.map(X);
				const ys = tri.map(Y);
				if (
					Math.max(...xs) < e.x - 1.6 * e.w ||
					Math.min(...xs) > e.x + 1.6 * e.w ||
					Math.max(...ys) < e.y - 2 * e.h ||
					Math.min(...ys) > e.y + 2 * e.h
				)
					continue;
				if (!tri.some((i) => N.getZ(i) > 0.2 && Z(i) > z - depth)) continue;
			} else if (!tri.every((i) => near(e, i, 1.6, 2) && Z(i) > z - depth)) continue;
			const ta = uvAt(a);
			const tb = uvAt(b);
			const tc = uvAt(c);
			const ax = ta.x * W;
			const ay = ta.y * H;
			const bx = tb.x * W;
			const by = tb.y * H;
			const cxp = tc.x * W;
			const cy = tc.y * H;
			const den = (by - cy) * (ax - cxp) + (cxp - bx) * (ay - cy);
			if (Math.abs(den) < 1e-9) continue;
			for (let y = Math.floor(Math.min(ay, by, cy)); y <= Math.ceil(Math.max(ay, by, cy)); y++) {
				for (
					let x = Math.floor(Math.min(ax, bx, cxp));
					x <= Math.ceil(Math.max(ax, bx, cxp));
					x++
				) {
					const l1 = ((by - cy) * (x + 0.5 - cxp) + (cxp - bx) * (y + 0.5 - cy)) / den;
					const l2 = ((cy - ay) * (x + 0.5 - cxp) + (ax - cxp) * (y + 0.5 - cy)) / den;
					const l3 = 1 - l1 - l2;
					if (l1 < -0.02 || l2 < -0.02 || l3 < -0.02 || x < 0 || y < 0 || x >= W || y >= H)
						continue;
					const u = (l1 * X(a) + l2 * X(b) + l3 * X(c) - e.x) / e.w;
					const v = (l1 * Y(a) + l2 * Y(b) + l3 * Y(c) - e.y) / e.h;
					const r2 = u * u + v * v;
					const fill = 1 - smooth(1.05, 1.35, r2);
					if (fill <= 0) continue;
					const arc = -0.18 - 0.42 * (1 - Math.min(1, u * u));
					const line =
						(1 - smooth(0.12, 0.26, Math.abs(v - arc))) * (1 - smooth(0.8, 1.1, Math.abs(u)));
					const k = (y * W + x) * 4;
					for (let ch = 0; ch < 3; ch++) {
						const shade = (lid[ch] ?? 0) * (0.96 + 0.04 * v);
						d[k + ch] =
							(d[k + ch] ?? 0) * (1 - fill) + (shade * (1 - line) + (lash[ch] ?? 0) * line) * fill;
					}
				}
			}
		}
	});
	cx.putImageData(px, 0, 0);
	const t = new CanvasTexture(cv);
	t.flipY = map.flipY;
	t.colorSpace = map.colorSpace;
	t.wrapS = map.wrapS;
	t.wrapT = map.wrapT;
	t.anisotropy = map.anisotropy;
	t.channel = map.channel;
	t.offset.copy(map.offset);
	t.repeat.copy(map.repeat);
	t.center.copy(map.center);
	t.rotation = map.rotation;
	return t;
}
