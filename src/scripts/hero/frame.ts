import { type PerspectiveCamera, Vector3 } from "three";
import type { View } from "./view";

export const AZ_LIM = 0.44;
export const EL_LIM = 0.15;
export const FILL = 0.93;
export const EDGE = 1.06;

type Aimed = Pick<View, "target" | "dist">;
type Framed = Aimed & Pick<View, "AZ" | "EL" | "fitPts">;

export function aimCam(camera: PerspectiveCamera, view: Aimed, az: number, el: number) {
	camera.position
		.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el))
		.multiplyScalar(view.dist)
		.add(view.target);
	camera.lookAt(view.target);
	camera.updateMatrixWorld();
}

export function reach(camera: PerspectiveCamera, view: Framed, az: number, el: number): number {
	aimCam(camera, view, az, el);
	const q = new Vector3();
	let m = 0;
	for (const p of view.fitPts) {
		q.copy(p).project(camera);
		m = Math.max(m, Math.abs(q.x), Math.abs(q.y));
	}
	return m;
}

export const DRAG_CORNERS = [
	[1, 1],
	[1, -1],
	[-1, 1],
	[-1, -1],
] as const;

export function fitView(camera: PerspectiveCamera, view: Framed) {
	camera.updateProjectionMatrix();
	const q = new Vector3();
	const right = new Vector3();
	const up = new Vector3();
	for (let n = 0; n < 6; n++) {
		aimCam(camera, view, view.AZ, view.EL);
		let x0 = Number.POSITIVE_INFINITY;
		let x1 = Number.NEGATIVE_INFINITY;
		let y0 = Number.POSITIVE_INFINITY;
		let y1 = Number.NEGATIVE_INFINITY;
		for (const p of view.fitPts) {
			q.copy(p).project(camera);
			x0 = Math.min(x0, q.x);
			x1 = Math.max(x1, q.x);
			y0 = Math.min(y0, q.y);
			y1 = Math.max(y1, q.y);
		}
		const halfH = view.dist * Math.tan((camera.fov * Math.PI) / 360);
		const halfW = halfH * camera.aspect;
		right.setFromMatrixColumn(camera.matrixWorld, 0);
		up.setFromMatrixColumn(camera.matrixWorld, 1);
		view.target
			.addScaledVector(right, ((x0 + x1) / 2) * halfW)
			.addScaledVector(up, ((y0 + y1) / 2) * halfH);
		view.dist *= Math.max(x1 - x0, y1 - y0) / 2 / FILL;
	}
	for (const [da, de] of DRAG_CORNERS) {
		const m = reach(camera, view, view.AZ + da * AZ_LIM, view.EL + de * EL_LIM);
		if (m > EDGE) view.dist *= m / EDGE;
	}
	aimCam(camera, view, view.AZ, view.EL);
}
