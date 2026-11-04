import {
	BackSide,
	type Bone,
	Box3,
	DoubleSide,
	Group,
	MeshBasicMaterial,
	MeshLambertMaterial,
	type Object3D,
	Quaternion,
	SkinnedMesh,
	type Texture,
	type Vector3,
} from "three";
import { modelPoints, paintLids } from "./lids";
import { PAL, SCALE, V } from "./kit";

const BONES = [
	"Hips",
	"Spine",
	"Spine01",
	"Spine02",
	"neck",
	"Head",
	"LeftArm",
	"LeftForeArm",
	"LeftHand",
	"RightArm",
	"RightForeArm",
	"RightHand",
	"LeftUpLeg",
	"LeftLeg",
	"LeftFoot",
	"LeftToeBase",
	"RightUpLeg",
	"RightLeg",
	"RightFoot",
	"RightToeBase",
] as const;

export type BoneName = (typeof BONES)[number];
export type Side = "Left" | "Right";
export const SIDES = ["Left", "Right"] as const;

export const HEIGHT = 1.76;
export const FIGURE_LINE = 0.0025;
const EYES = [
	{ x: -0.0368, y: 0.8065, w: 0.0185, h: 0.008 },
	{ x: 0.0381, y: 0.8091, w: 0.0175, h: 0.008 },
];

export const UP = V(0, 1, 0);
export const RIGHT = V(1, 0, 0);
export const DOWN = V(0, -1, 0);

export function findSkin(root: Object3D): SkinnedMesh {
	let skin: SkinnedMesh | null = null;
	root.traverse((o) => {
		if (!skin && o instanceof SkinnedMesh) skin = o;
	});
	if (!skin) throw new Error("model has no skinned mesh");
	return skin;
}

export function silhouette(skin: SkinnedMesh, metres: number, height: number): SkinnedMesh | null {
	if (!metres || !skin.parent) return null;
	skin.geometry.computeBoundingBox();
	const box = skin.geometry.boundingBox ?? new Box3();
	const width = (metres * (box.max.y - box.min.y)) / height;
	const mat = new MeshBasicMaterial({
		color: PAL.K,
		side: BackSide,
		polygonOffset: true,
		polygonOffsetFactor: 6,
		polygonOffsetUnits: 6,
	});
	mat.onBeforeCompile = (sh) => {
		sh.uniforms.lineWidth = { value: width };
		sh.vertexShader = `uniform float lineWidth;\n${sh.vertexShader.replace(
			"#include <begin_vertex>",
			"#include <begin_vertex>\ntransformed += normalize(normal) * lineWidth;",
		)}`;
	};
	const line = new SkinnedMesh(skin.geometry, mat);
	line.bind(skin.skeleton, skin.bindMatrix);
	line.frustumCulled = false;
	line.position.copy(skin.position);
	line.quaternion.copy(skin.quaternion);
	line.scale.copy(skin.scale);
	skin.parent.add(line);
	return line;
}

export class Rig {
	readonly root = new Group();
	readonly B: Record<BoneName, Bone>;
	readonly skin: SkinnedMesh;
	readonly material: MeshLambertMaterial;
	readonly open: Texture;
	readonly shut: Texture;
	readonly boneOf: string[];
	readonly foot: Record<Side, { foot: Vector3; toe: Vector3; y: number }>;
	readonly arm: Record<Side, { a: number; b: number }>;
	private readonly palm: Record<Side, Vector3>;
	private readonly restQ: Map<Bone, Quaternion>;
	private readonly q = new Quaternion();
	private readonly p = new Quaternion();
	private readonly r = new Quaternion();
	private readonly va = V();
	private readonly vb = V();
	private readonly vc = V();

	constructor(scene: Object3D) {
		this.root.scale.setScalar(SCALE);
		this.root.add(scene);
		const found = new Map<string, Bone>();
		scene.traverse((o) => {
			if ((o as Bone).isBone) found.set(o.name, o as Bone);
		});
		const B = {} as Record<BoneName, Bone>;
		for (const name of BONES) {
			const b = found.get(name);
			if (!b) throw new Error(`model has no ${name} bone`);
			B[name] = b;
		}
		this.B = B;
		this.restQ = new Map([...found.values()].map((b) => [b, b.quaternion.clone()]));
		this.skin = findSkin(scene);
		const map = (this.skin.material as MeshLambertMaterial).map;
		if (!map) throw new Error("model has no texture");
		this.open = map;
		this.shut =
			paintLids(map, this.skin.geometry, modelPoints(this.skin.geometry, this.skin.matrix), EYES) ??
			map;
		this.material = new MeshLambertMaterial({ map, side: DoubleSide });
		this.skin.material = this.material;
		this.skin.castShadow = this.skin.receiveShadow = true;
		this.skin.frustumCulled = false;
		silhouette(this.skin, FIGURE_LINE, HEIGHT);

		const si = this.skin.geometry.attributes.skinIndex;
		const sw = this.skin.geometry.attributes.skinWeight;
		const bones = this.skin.skeleton.bones;
		this.boneOf = [];
		if (si && sw) {
			for (let i = 0; i < si.count; i++) {
				let best = 0;
				for (let k = 1; k < 4; k++) if (sw.getComponent(i, k) > sw.getComponent(i, best)) best = k;
				this.boneOf.push(bones[si.getComponent(i, best)]?.name ?? "");
			}
		}

		this.root.updateMatrixWorld(true);
		const foot = {} as Record<Side, { foot: Vector3; toe: Vector3; y: number }>;
		const palm = {} as Record<Side, Vector3>;
		const arm = {} as Record<Side, { a: number; b: number }>;
		for (const side of SIDES) {
			const s = side === "Left" ? 1 : -1;
			foot[side] = {
				foot: this.dirOf(B[`${side}Foot`]),
				toe: this.dirOf(B[`${side}ToeBase`]),
				y: this.posOf(B[`${side}ToeBase`]).y,
			};
			const hand = B[`${side}Hand`];
			const pv = V()
				.crossVectors(this.dirOf(hand), V(0, 0, 1))
				.normalize();
			if (pv.dot(V(-s, -1, 0)) < 0) pv.negate();
			palm[side] = pv.applyQuaternion(hand.getWorldQuaternion(new Quaternion()).invert());
			const S = this.posOf(B[`${side}Arm`]);
			const E = this.posOf(B[`${side}ForeArm`]);
			const W = this.posOf(B[`${side}Hand`]);
			arm[side] = { a: S.distanceTo(E), b: E.distanceTo(W) };
		}
		this.foot = foot;
		this.palm = palm;
		this.arm = arm;
	}

	eyes(shut: boolean) {
		this.material.map = shut ? this.shut : this.open;
	}

	rest() {
		for (const [b, q] of this.restQ) b.quaternion.copy(q);
	}

	dirOf(bone: Bone, out = V()) {
		return out.copy(UP).applyQuaternion(bone.getWorldQuaternion(this.q));
	}

	posOf(bone: Bone, out = V()) {
		return bone.getWorldPosition(out);
	}

	turn(bone: Bone, q: Quaternion) {
		if (!bone.parent) return;
		bone.parent.getWorldQuaternion(this.p);
		bone.quaternion.premultiply(this.r.copy(this.p).invert().multiply(q).multiply(this.p));
	}

	aim(bone: Bone, dir: Vector3) {
		this.turn(
			bone,
			new Quaternion().setFromUnitVectors(this.dirOf(bone, this.va), this.vb.copy(dir).normalize()),
		);
	}

	spin(bone: Bone, axis: Vector3, angle: number) {
		this.turn(bone, new Quaternion().setFromAxisAngle(this.vc.copy(axis).normalize(), angle));
	}

	twistTo(a: Vector3, b: Vector3, axis: Vector3) {
		const pa = a.clone().projectOnPlane(axis).normalize();
		const pb = b.clone().projectOnPlane(axis).normalize();
		return Math.atan2(axis.dot(V().crossVectors(pa, pb)), pa.dot(pb));
	}

	palmOf(side: Side) {
		return this.palm[side]
			.clone()
			.applyQuaternion(this.B[`${side}Hand`].getWorldQuaternion(new Quaternion()));
	}

	handTo(side: Side, H: Vector3, palm: Vector3) {
		const fore = this.B[`${side}ForeArm`];
		const hand = this.B[`${side}Hand`];
		this.aim(hand, H);
		this.spin(
			fore,
			this.dirOf(fore),
			0.5 * this.twistTo(this.palmOf(side), palm, this.dirOf(hand)),
		);
		this.aim(hand, H);
		this.spin(hand, this.dirOf(hand), this.twistTo(this.palmOf(side), palm, this.dirOf(hand)));
	}

	reach(side: Side, T: Vector3, pole: Vector3) {
		const { a, b } = this.arm[side];
		const S = this.posOf(this.B[`${side}Arm`]);
		const n = V().subVectors(T, S);
		const d = Math.min(n.length(), (a + b) * 0.999);
		n.normalize();
		const x = (a * a - b * b + d * d) / (2 * d);
		const h = Math.sqrt(Math.max(0, a * a - x * x));
		const E = S.clone()
			.addScaledVector(n, x)
			.addScaledVector(pole.clone().projectOnPlane(n).normalize(), h);
		this.aim(this.B[`${side}Arm`], V().subVectors(E, S));
		this.aim(this.B[`${side}ForeArm`], V().subVectors(T, E));
	}

	posedPoints() {
		this.root.updateMatrixWorld(true);
		const n = this.skin.geometry.attributes.position?.count ?? 0;
		const out = new Float32Array(n * 3);
		const v = V();
		for (let i = 0; i < n; i++) {
			this.skin.getVertexPosition(i, v).applyMatrix4(this.skin.matrixWorld);
			out[i * 3] = v.x;
			out[i * 3 + 1] = v.y;
			out[i * 3 + 2] = v.z;
		}
		return out;
	}
}
