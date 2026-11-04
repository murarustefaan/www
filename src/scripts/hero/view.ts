import {
	Box3,
	InstancedMesh,
	Mesh,
	type PerspectiveCamera,
	Scene,
	SkinnedMesh,
	Vector3,
} from "three";
import type { Cat, CatName } from "./cats";
import type { Rig } from "./figure";
import type { Scene as SceneName } from "@/utils/iasi-time";

export type Look = [number, number] | null;

export interface Stage {
	camera: PerspectiveCamera;
	canvas: HTMLCanvasElement;
	reduce: boolean;
}

export interface View {
	name: SceneName;
	label: string;
	scene: Scene;
	AZ: number;
	EL: number;
	target: Vector3;
	dist: number;
	fitPts: Vector3[];
	pose(): void;
	still(): void;
	step(t: number, dt: number, look: Look): void;
	click(): void;
	addCat(name: CatName, cat: Cat, fade: boolean): void;
	pointerDir?(ptr: [number, number]): Look;
	placeSky?(): void;
	setPalette?(dark: boolean): void;
}

export function makeView(AZ: number, EL: number, target: Vector3) {
	return { scene: new Scene(), AZ, EL, target, dist: 140, fitPts: [] as Vector3[] };
}

export function boxPts<T>(scene: Scene, rig: Rig, poses: T[], apply: (p: T) => void): Vector3[] {
	const box = new Box3();
	const pts: Vector3[] = [];
	const corners = () => {
		for (const x of [box.min.x, box.max.x])
			for (const y of [box.min.y, box.max.y])
				for (const z of [box.min.z, box.max.z]) pts.push(new Vector3(x, y, z));
	};
	scene.updateMatrixWorld(true);
	scene.traverse((m) => {
		if (
			!(m instanceof Mesh) ||
			m instanceof SkinnedMesh ||
			m instanceof InstancedMesh ||
			m.userData.ink ||
			m.userData.sky
		)
			return;
		const fit: Vector3[] | undefined = m.userData.fit;
		if (fit) {
			for (const p of fit) pts.push(p.clone().applyMatrix4(m.matrixWorld));
			return;
		}
		box.setFromObject(m);
		corners();
	});
	for (const p of poses) {
		apply(p);
		rig.skin.computeBoundingBox();
		if (rig.skin.boundingBox) {
			box.copy(rig.skin.boundingBox).applyMatrix4(rig.skin.matrixWorld);
			corners();
		}
	}
	return pts;
}
