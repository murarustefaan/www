import { PerspectiveCamera, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { AZ_LIM, aimCam, DRAG_CORNERS, EDGE, EL_LIM, FILL, fitView, reach } from "./frame";

function box(w: number, h: number, d: number, at: Vector3): Vector3[] {
	const pts: Vector3[] = [];
	for (const x of [-w / 2, w / 2])
		for (const y of [0, h]) for (const z of [-d / 2, d / 2]) pts.push(new Vector3(x, y, z).add(at));
	return pts;
}

function framed(fitPts: Vector3[], aspect: number) {
	const camera = new PerspectiveCamera(24, aspect, 5, 900);
	const view = { AZ: 0.75, EL: 0.42, target: new Vector3(0, 14, 0), dist: 140, fitPts };
	fitView(camera, view);
	return { camera, view };
}

function centre(camera: PerspectiveCamera, pts: Vector3[]) {
	const q = new Vector3();
	let [x0, x1, y0, y1] = [1e9, -1e9, 1e9, -1e9];
	for (const p of pts) {
		q.copy(p).project(camera);
		[x0, x1, y0, y1] = [Math.min(x0, q.x), Math.max(x1, q.x), Math.min(y0, q.y), Math.max(y1, q.y)];
	}
	return [(x0 + x1) / 2, (y0 + y1) / 2];
}

const scenes = {
	desk: [...box(60, 2, 40, new Vector3()), ...box(18, 30, 12, new Vector3(-6, 0, -4))],
	bed: [...box(50, 1, 46, new Vector3(4, 0, 2)), ...box(32, 16, 40, new Vector3(0, 0, 0))],
};

describe("fitView", () => {
	for (const [name, pts] of Object.entries(scenes)) {
		for (const aspect of [4 / 3, 1, 16 / 9]) {
			it(`keeps the ${name} inside the frame at rest and at every drag limit (aspect ${aspect.toFixed(2)})`, () => {
				const { camera, view } = framed(pts, aspect);
				const rest = reach(camera, view, view.AZ, view.EL);
				const corners = DRAG_CORNERS.map(([a, e]) =>
					reach(camera, view, view.AZ + a * AZ_LIM, view.EL + e * EL_LIM),
				);
				expect(rest).toBeLessThanOrEqual(FILL + 1e-3);
				for (const m of corners) expect(m).toBeLessThanOrEqual(EDGE + 1e-3);
				const fills =
					Math.abs(rest - FILL) < 0.01 || corners.some((m) => Math.abs(m - EDGE) < 0.01);
				expect(fills).toBe(true);
			});
		}
		it(`centres the ${name} at rest`, () => {
			const { camera, view } = framed(pts, 4 / 3);
			aimCam(camera, view, view.AZ, view.EL);
			for (const c of centre(camera, pts)) expect(Math.abs(c)).toBeLessThan(0.02);
		});
	}
});
