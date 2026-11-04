import {
	BufferGeometry,
	Float32BufferAttribute,
	type Mesh,
	MeshToonMaterial,
	type Object3D,
	RepeatWrapping,
} from "three";
import { add, canvasTexture, type Oval, PAL, ramp } from "./kit";

export const TOOTH = 10;
export const ROWS = 5;

export function stitch(k: number, r: number): 0 | 1 | 2 {
	const t = k % TOOTH;
	if (t >= r && t <= TOOTH - 1 - r) return 1;
	const u = (k + TOOTH / 2) % TOOTH;
	const q = ROWS - 1 - r;
	return u >= q + 1 && u <= TOOTH - 2 - q ? 2 : 0;
}

const CELL = 16;

export function drawStitches(x: CanvasRenderingContext2D, cell: number, top: number) {
	x.lineWidth = cell * 0.42;
	x.lineCap = "round";
	for (let r = 0; r < ROWS; r++) {
		for (let k = 0; k < TOOTH; k++) {
			const v = stitch(k, r);
			if (!v) continue;
			const x0 = k * cell + cell * 0.18;
			const y0 = top + r * cell + cell * 0.18;
			const s = cell * 0.64;
			x.strokeStyle = v === 1 ? PAL.R : PAL.K;
			x.beginPath();
			x.moveTo(x0, y0);
			x.lineTo(x0 + s, y0 + s);
			x.moveTo(x0 + s, y0);
			x.lineTo(x0, y0 + s);
			x.stroke();
		}
	}
}

function teeth() {
	const t = canvasTexture(TOOTH * CELL, ROWS * CELL, (x) => drawStitches(x, CELL, 0));
	t.wrapS = RepeatWrapping;
	t.anisotropy = 4;
	return t;
}

export function rugBorder(parent: Object3D, b: Oval, inset: number, width: number): Mesh {
	const seg = 384;
	const rows = width / ROWS;
	const perimeter =
		Math.PI * (3 * (b.rx + b.rz) - Math.sqrt((3 * b.rx + b.rz) * (b.rx + 3 * b.rz)));
	const repeats = Math.round(perimeter / (rows * TOOTH));
	const pos: number[] = [];
	const nrm: number[] = [];
	const uv: number[] = [];
	const idx: number[] = [];
	for (let i = 0; i <= seg; i++) {
		const a = (i / seg) * Math.PI * 2;
		for (const [j, d] of [
			[0, inset + width],
			[1, inset],
		] as const) {
			pos.push(b.x + Math.sin(a) * (b.rx - d), 0.012, b.z + Math.cos(a) * (b.rz - d));
			nrm.push(0, 1, 0);
			uv.push((i / seg) * repeats, j);
		}
	}
	for (let i = 0; i < seg; i++) {
		const a = i * 2;
		idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
	}
	const g = new BufferGeometry();
	g.setAttribute("position", new Float32BufferAttribute(pos, 3));
	g.setAttribute("normal", new Float32BufferAttribute(nrm, 3));
	g.setAttribute("uv", new Float32BufferAttribute(uv, 2));
	g.setIndex(idx);
	const mat = new MeshToonMaterial({
		map: teeth(),
		gradientMap: ramp,
		transparent: true,
		alphaTest: 0.4,
		polygonOffset: true,
		polygonOffsetFactor: -2,
		polygonOffsetUnits: -2,
	});
	const m = add(parent, g, mat, { line: 0, shadow: false });
	m.userData.fit = [];
	return m;
}
