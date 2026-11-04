import {
	type Bone,
	DoubleSide,
	Euler,
	type Group,
	LinearFilter,
	Matrix4,
	MeshLambertMaterial,
	type Object3D,
	Quaternion,
	type SkinnedMesh,
	type Texture,
	type Vector3,
} from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { FIGURE_LINE, findSkin, silhouette } from "./figure";
import { type Eye, modelPoints, paintLids } from "./lids";
import { SCALE, V } from "./kit";

export type CatName = "white" | "tux";

interface CatSpec {
	size: readonly [number, number, number];
	eyes: Eye[];
}

export const CATS: Record<CatName, CatSpec> = {
	white: {
		size: [0.47, 0.307, 0.27],
		eyes: [
			{ x: 0.0988, y: 0.1944, w: 0.0125, h: 0.0092 },
			{ x: 0.1571, y: 0.1961, w: 0.0122, h: 0.0092 },
		],
	},
	tux: {
		size: [0.53, 0.317, 0.387],
		eyes: [
			{ x: 0.1225, y: 0.2146, w: 0.0145, h: 0.0105 },
			{ x: 0.1885, y: 0.2146, w: 0.0145, h: 0.0105 },
		],
	},
};

export const CAT_YAW = 0.5;
export const CAT_UP = 0.25;
export const CAT_DOWN = 0.3;

export interface Cat {
	group: Object3D;
	head: Bone;
	body: Bone;
	skin: SkinnedMesh;
	material: MeshLambertMaterial;
	open: Texture;
	shut: Texture;
	spec: CatSpec;
	yaw: number;
	pitch: number;
	blinkAt: number;
	blinkTo: number;
	fade: number;
}

function bone(root: Object3D, name: string): Bone {
	const b = root.getObjectByName(name);
	if (!b || !(b as Bone).isBone) throw new Error(`cat has no ${name} bone`);
	return b as Bone;
}

function wrap(scene: Object3D, spec: CatSpec, open: Texture, shut: Texture): Cat {
	const skin = findSkin(scene);
	const material = new MeshLambertMaterial({ map: open, side: DoubleSide });
	skin.material = material;
	skin.castShadow = skin.receiveShadow = true;
	skin.frustumCulled = false;
	silhouette(skin, FIGURE_LINE, spec.size[1]);
	scene.scale.setScalar(SCALE);
	return {
		group: scene,
		head: bone(scene, "Head"),
		body: bone(scene, "Body"),
		skin,
		material,
		open,
		shut,
		spec,
		yaw: 0,
		pitch: 0,
		blinkAt: 2 + Math.random() * 4,
		blinkTo: 0,
		fade: 1,
	};
}

export function makeCats(scene: Group, name: CatName): [Cat, Cat] {
	const spec = CATS[name];
	const twin = clone(scene);
	const skin = findSkin(scene);
	const open = (skin.material as MeshLambertMaterial).map;
	if (!open) throw new Error("cat has no texture");
	const pts = modelPoints(skin.geometry, skin.matrix);
	const lo = V(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
	const hi = V(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
	for (let i = 0; i < pts.length; i += 3) {
		const p = V(pts[i], pts[i + 1], pts[i + 2]);
		lo.min(p);
		hi.max(p);
	}
	const [sx, sy] = spec.size;
	const kx = (hi.x - lo.x) / sx;
	const ky = (hi.y - lo.y) / sy;
	const gc = lo.clone().add(hi).multiplyScalar(0.5);
	const eyes = spec.eyes.map((e) => ({
		x: gc.x + e.x * kx,
		y: gc.y + (e.y - sy / 2) * ky,
		w: e.w * kx,
		h: e.h * ky,
	}));
	const shut = paintLids(open, skin.geometry, pts, eyes, { loose: true, depth: 0.03 * kx }) ?? open;
	for (const t of [open, shut]) {
		t.minFilter = LinearFilter;
		t.generateMipmaps = false;
		t.needsUpdate = true;
	}
	return [wrap(scene, spec, open, shut), wrap(twin, spec, open, shut)];
}

export interface Spot {
	at: Vector3;
	rotY: number;
	mirror?: boolean;
}

export function spotFrame({ at, rotY, mirror = false }: Spot): Matrix4 {
	return new Matrix4().compose(
		at,
		new Quaternion().setFromEuler(new Euler(0, rotY, 0)),
		V(mirror ? -SCALE : SCALE, SCALE, SCALE),
	);
}

export function spotCorners(name: CatName, spot: Spot): Vector3[] {
	const [sx, sy, sz] = CATS[name].size;
	const m = spotFrame(spot);
	const out: Vector3[] = [];
	for (const x of [-sx / 2, sx / 2])
		for (const y of [0, sy]) for (const z of [-sz / 2, sz / 2]) out.push(V(x, y, z).applyMatrix4(m));
	return out;
}

export function placeCat(parent: Object3D, cat: Cat, spot: Spot) {
	spotFrame(spot).decompose(cat.group.position, cat.group.quaternion, cat.group.scale);
	parent.add(cat.group);
	cat.group.updateMatrixWorld(true);
}

export function poseCat(cat: Cat, breath: number) {
	cat.head.rotation.set(cat.pitch, cat.yaw, 0, "YXZ");
	const b = 0.016 * breath;
	cat.body.scale.set(1 + 0.6 * b, 1 + b, 1 + 0.6 * b);
}

export function catAim(cat: Cat, target: Vector3): [number, number] {
	const d = target
		.clone()
		.sub(cat.head.getWorldPosition(V()))
		.applyQuaternion(cat.group.quaternion.clone().invert());
	return [Math.atan2(d.x, d.z) * Math.sign(cat.group.scale.x), -Math.atan2(d.y, Math.hypot(d.x, d.z))];
}

export function fadeCat(cat: Cat, dt: number) {
	if (cat.fade >= 1) return;
	cat.fade = Math.min(1, cat.fade + dt / 0.35);
	cat.material.opacity = cat.fade;
	if (cat.fade >= 1) {
		cat.material.transparent = false;
		cat.material.needsUpdate = true;
	}
}

export function hideCat(cat: Cat) {
	cat.fade = 0;
	cat.material.transparent = true;
	cat.material.opacity = 0;
	cat.material.needsUpdate = true;
}
