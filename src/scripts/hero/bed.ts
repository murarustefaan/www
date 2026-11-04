import {
	AdditiveBlending,
	AmbientLight,
	BufferGeometry,
	CanvasTexture,
	CatmullRomCurve3,
	Color,
	DirectionalLight,
	DoubleSide,
	Float32BufferAttribute,
	Matrix4,
	MeshBasicMaterial,
	MeshToonMaterial,
	PlaneGeometry,
	PointLight,
	Quaternion,
	RepeatWrapping,
	Sprite,
	SpriteMaterial,
	SRGBColorSpace,
	TubeGeometry,
	type Vector3,
} from "three";
import {
	CAT_ORDER,
	type Cat,
	type CatName,
	hideCat,
	placeCat,
	poseCat,
	fadeCat,
	type Spot,
	spotCorners,
} from "./cats";
import { drawStitches, TOOTH } from "./embroidery";
import { DOWN, type Rig, SIDES, UP } from "./figure";
import {
	add,
	base,
	canvasTexture,
	clamp,
	ell,
	joint,
	lathe,
	merge,
	PAL,
	ramp,
	rbox,
	rnd,
	smooth,
	V,
	xf,
} from "./kit";
import { LABELS } from "./labels";
import { boxPts, makeView, type Stage, type View } from "./view";

const MATTRESS = 13;
const DROP = MATTRESS - 4.2;
const FLAP = 0.8;
const FOLD = 2.1;
const STITCH = 0.34;
const BAND_AT = 0.22;
const PX = 50;
const SKY = { dark: { color: "#f1ead6", alpha: 1 }, light: { color: PAL.K, alpha: 0.6 } };

function radial() {
	return canvasTexture(64, 64, (x) => {
		const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
		g.addColorStop(0, "rgba(255,255,255,1)");
		g.addColorStop(1, "rgba(255,255,255,0)");
		x.fillStyle = g;
		x.fillRect(0, 0, 64, 64);
	});
}

function glowTexture() {
	return canvasTexture(64, 64, (x) => {
		const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
		g.addColorStop(0, "rgba(255,196,120,0.55)");
		g.addColorStop(1, "rgba(255,196,120,0)");
		x.fillStyle = g;
		x.fillRect(0, 0, 64, 64);
	});
}

function crescent() {
	return canvasTexture(128, 128, (x) => {
		x.fillStyle = "#ffffff";
		x.beginPath();
		x.arc(64, 64, 44, 0, Math.PI * 2);
		x.fill();
		x.globalCompositeOperation = "destination-out";
		x.beginPath();
		x.arc(86, 50, 40, 0, Math.PI * 2);
		x.fill();
	});
}

function letter(ch: string) {
	const cv = document.createElement("canvas");
	cv.width = cv.height = 128;
	const t = new CanvasTexture(cv);
	t.colorSpace = SRGBColorSpace;
	const font = '300 104px "Martian Mono Variable", ui-monospace, monospace';
	const draw = () => {
		const x = cv.getContext("2d");
		if (!x) return;
		x.clearRect(0, 0, 128, 128);
		x.fillStyle = "#efe9dc";
		x.font = font;
		x.textAlign = "center";
		x.textBaseline = "middle";
		x.fillText(ch, 64, 60);
		t.needsUpdate = true;
	};
	draw();
	document.fonts?.load(font).then(draw, () => {});
	return t;
}

function duvetTexture() {
	const h = Math.round((FOLD + 0.5) * PX);
	const t = canvasTexture(TOOTH * STITCH * PX, h, (x) => {
		const cell = STITCH * PX;
		x.fillStyle = PAL.s;
		x.fillRect(0, 0, TOOTH * cell, FOLD * PX);
		x.fillStyle = PAL.R;
		x.fillRect(0, FOLD * PX, TOOTH * cell, h - FOLD * PX);
		drawStitches(x, cell, BAND_AT * PX);
	});
	t.wrapS = RepeatWrapping;
	t.anisotropy = 4;
	return { t, height: h / PX };
}

export function buildBed(rig: Rig, stage: Stage): View {
	const { B } = rig;
	const view = makeView(1.3, 0.6, V(0, 14, 0));
	const NIGHT_CAM = V(Math.sin(1.3), 0, Math.cos(1.3));
	const CAM_DIR = V(
		Math.sin(1.66) * Math.cos(0.34),
		Math.sin(0.34),
		Math.cos(1.66) * Math.cos(0.34),
	);
	const TO_CAM = V(CAM_DIR.x, 0, CAM_DIR.z).normalize();
	const FQ = new Quaternion().setFromRotationMatrix(
		new Matrix4().makeBasis(V(0, -1, 0), V(0, 0, -1), V(1, 0, 0)),
	);
	const L = (x: number, y: number, z: number) => V(x, y, z).applyQuaternion(FQ);
	const zz = { breath: 0, stir: 0 };
	const BED_AT = V();
	let TOP: { wrist: Vector3; pole: Vector3; hand: Vector3 } | null = null;
	let CHEST = V();

	const duvetRise = (p: Vector3) =>
		0.28 * (zz.breath * 0.5 + 0.5) * Math.exp(-((p.x - CHEST.x) ** 2 + (p.z - CHEST.z) ** 2) / 90);

	function poseBed() {
		rig.rest();
		rig.root.quaternion.copy(FQ);
		rig.root.position.copy(BED_AT);
		const br = zz.breath;
		const LEFT = L(1, 0, 0);
		const FRONT = L(0, 0, 1);
		const SPINE = L(0, 1, 0);
		rig.spin(B.Hips, LEFT, 0.1);
		rig.spin(B.Spine02, LEFT, 0.1 + 0.02 * br);
		rig.spin(B.Spine01, LEFT, 0.08 + 0.025 * br);
		rig.spin(B.Spine, LEFT, 0.04);
		for (const side of SIDES) {
			const top = side === "Right";
			rig.aim(B[`${side}UpLeg`], L(top ? 0.16 : 0.05, -0.42, 0.9));
			rig.aim(B[`${side}Leg`], L(top ? 0.08 : 0.03, -0.9, -0.42));
		}
		rig.spin(B.neck, FRONT, -0.08 - 0.04 * zz.stir);
		rig.spin(B.Head, LEFT, 0.14 + 0.06 * zz.stir);
		rig.spin(B.Head, SPINE, 0.05 * zz.stir);
		rig.spin(B.Spine01, SPINE, 0.07 * zz.stir);
		rig.spin(B.Spine, SPINE, 0.05 * zz.stir);
		rig.aim(B.LeftArm, L(0.12, -0.42, 0.9));
		rig.aim(B.LeftForeArm, L(0.08, -0.08, 1));
		rig.handTo("Left", L(0.05, 0.1, 1), L(1, 0, 0));
		if (!TOP) {
			rig.aim(B.RightArm, L(0.3, -0.6, 0.75));
			rig.aim(B.RightForeArm, L(0.4, 0.1, 0.9));
			rig.handTo("Right", L(0.6, -0.2, 0.75), L(1, 0, 0));
		} else {
			const T = TOP.wrist.clone().addScaledVector(L(0, -1, 0), 1.4 * zz.stir);
			rig.reach("Right", T.addScaledVector(UP, duvetRise(T)), TOP.pole);
			rig.handTo("Right", TOP.hand, DOWN);
		}
		rig.root.updateMatrixWorld(true);
	}

	const isHead = (i: number) => /Head|neck|head/.test(rig.boneOf[i] ?? "");
	poseBed();
	{
		const p = rig.posedPoints();
		const hips = rig.posOf(B.Hips);
		let low = 1e9;
		for (let i = 0; i < p.length; i += 3) if (!isHead(i / 3)) low = Math.min(low, p[i + 1] ?? 0);
		BED_AT.set(-2 - hips.x, MATTRESS - 0.5 - low, 4 - hips.z);
		poseBed();
	}
	const ptsBed = rig.posedPoints();
	const headAt = rig.posOf(B.Head);
	const shoulderZ = Math.min(rig.posOf(B.LeftArm).z, rig.posOf(B.RightArm).z);
	let headLow = 1e9;
	let headX = 0;
	let headZ = 0;
	let nh = 0;
	for (let i = 0; i < ptsBed.length; i += 3) {
		if (!/Head|head/.test(rig.boneOf[i / 3] ?? "")) continue;
		headLow = Math.min(headLow, ptsBed[i + 1] ?? 0);
		headX += ptsBed[i] ?? 0;
		headZ += ptsBed[i + 2] ?? 0;
		nh++;
	}
	headX /= nh;
	headZ /= nh;
	const BED = { x0: -16, x1: 20, z0: headZ - 12.5, len: 50, z1: headZ - 12.5 + 50 };
	const HEM = shoulderZ + 1.6;
	const HF = {
		c: 0.5,
		x0: BED.x0,
		z0: HEM,
		nx: Math.ceil((BED.x1 - BED.x0) / 0.5) + 1,
		nz: Math.ceil((BED.z1 - HEM) / 0.5) + 1,
	};
	const hf = (() => {
		const h = new Float32Array(HF.nx * HF.nz).fill(MATTRESS);
		for (let i = 0; i < ptsBed.length; i += 3) {
			if (/Head|neck|head|RightArm|RightForeArm|RightHand/.test(rig.boneOf[i / 3] ?? "")) continue;
			const gx = Math.round(((ptsBed[i] ?? 0) - HF.x0) / HF.c);
			const gz = Math.round(((ptsBed[i + 2] ?? 0) - HF.z0) / HF.c);
			if (gx < 0 || gz < 0 || gx >= HF.nx || gz >= HF.nz) continue;
			const k = gz * HF.nx + gx;
			h[k] = Math.max(h[k] ?? 0, ptsBed[i + 1] ?? 0);
		}
		const pass = (src: Float32Array, r: number, op: "max" | "blur") => {
			const out = new Float32Array(src.length);
			for (let z = 0; z < HF.nz; z++)
				for (let x = 0; x < HF.nx; x++) {
					let m = op === "max" ? -1e9 : 0;
					let n = 0;
					for (let dz = -r; dz <= r; dz++)
						for (let dx = -r; dx <= r; dx++) {
							const xx = clamp(x + dx, 0, HF.nx - 1);
							const z2 = clamp(z + dz, 0, HF.nz - 1);
							const v = src[z2 * HF.nx + xx] ?? 0;
							if (op === "max") {
								if (dx * dx + dz * dz <= r * r) m = Math.max(m, v);
							} else {
								m += v;
								n++;
							}
						}
					out[z * HF.nx + x] = op === "max" ? m : m / n;
				}
			return out;
		};
		const soft = pass(pass(pass(pass(h, 4, "max"), 6, "blur"), 6, "blur"), 4, "blur");
		const close = pass(pass(h, 2, "max"), 2, "blur");
		for (let k = 0; k < soft.length; k++) soft[k] = Math.max(soft[k] ?? 0, (close[k] ?? 0) + 0.6);
		return soft;
	})();
	function clothTop(x: number, z: number) {
		const gx = clamp((x - HF.x0) / HF.c, 0, HF.nx - 1.001);
		const gz = clamp((z - HF.z0) / HF.c, 0, HF.nz - 1.001);
		const ix = Math.floor(gx);
		const iz = Math.floor(gz);
		const fx = gx - ix;
		const fz = gz - iz;
		const at = (a: number, b: number) => hf[b * HF.nx + a] ?? MATTRESS;
		const h =
			(at(ix, iz) * (1 - fx) + at(ix + 1, iz) * fx) * (1 - fz) +
			(at(ix, iz + 1) * (1 - fx) + at(ix + 1, iz + 1) * fx) * fz;
		return (
			Math.max(MATTRESS + 0.8, h + 1.1) + 0.14 * Math.sin(x * 0.42 + z * 0.13) * Math.sin(z * 0.31)
		);
	}
	CHEST = rig.posOf(B.Spine01);
	function drape(a: number, lo: number, hi: number): [number, number] {
		if (a >= lo && a <= hi) return [a, 0];
		const e = a < lo ? lo - a : a - hi;
		const sgn = a < lo ? -1 : 1;
		const edge = a < lo ? lo : hi;
		const arc = (FLAP * Math.PI) / 2;
		if (e < arc) return [edge + sgn * FLAP * Math.sin(e / FLAP), FLAP * (1 - Math.cos(e / FLAP))];
		return [edge + sgn * FLAP, FLAP + (e - arc)];
	}
	const duvet = duvetTexture();
	const cloth = (() => {
		const over = DROP + FLAP;
		const ax0 = BED.x0 - over;
		const ax1 = BED.x1 + over;
		const az1 = BED.z1 + over;
		const nx = 96;
		const nz = 84;
		const pos = new Float32Array((nx + 1) * (nz + 1) * 3);
		const uv = new Float32Array((nx + 1) * (nz + 1) * 2);
		const idx: number[] = [];
		for (let j = 0; j <= nz; j++)
			for (let i = 0; i <= nx; i++) {
				const a = ax0 + ((ax1 - ax0) * i) / nx;
				const b = HEM + ((az1 - HEM) * j) / nz;
				const [x, dx] = drape(a, BED.x0, BED.x1);
				const [z, dz] = drape(b, -1e9, BED.z1);
				const top = clothTop(clamp(x, BED.x0, BED.x1), clamp(z, HEM, BED.z1));
				const y = Math.max(top - Math.max(dx, dz) - 0.3 * Math.min(dx, dz), MATTRESS - DROP);
				const k = (nx + 1) * j + i;
				pos[k * 3] = x;
				pos[k * 3 + 1] = y;
				pos[k * 3 + 2] = z;
				uv[k * 2] = (a - ax0) / (TOOTH * STITCH);
				uv[k * 2 + 1] = 1 - (b - HEM) / duvet.height;
			}
		for (let j = 0; j < nz; j++)
			for (let i = 0; i < nx; i++) {
				const a = (nx + 1) * j + i;
				const b = a + 1;
				const c = a + nx + 1;
				const d = c + 1;
				idx.push(a, c, b, b, c, d);
			}
		const g = new BufferGeometry();
		g.setAttribute("position", new Float32BufferAttribute(pos, 3));
		g.setAttribute("uv", new Float32BufferAttribute(uv, 2));
		g.setIndex(idx);
		g.computeVertexNormals();
		return { g, base0: pos.slice(), nx };
	})();
	const q = V();
	function breatheCloth() {
		const p = cloth.g.attributes.position;
		if (!p) return;
		const a = p.array;
		for (let k = 0; k < a.length; k += 3) {
			q.set(cloth.base0[k] ?? 0, 0, cloth.base0[k + 2] ?? 0);
			a[k + 1] = (cloth.base0[k + 1] ?? 0) + duvetRise(q);
		}
		p.needsUpdate = true;
	}
	{
		const S = rig.posOf(B.RightArm);
		const wrist = rig
			.posOf(B.Spine01)
			.addScaledVector(L(0, 0, 1), 6.5)
			.addScaledVector(L(0, 1, 0), -1.5);
		wrist.y = clothTop(wrist.x, wrist.z) + 0.75;
		TOP = {
			wrist,
			pole: V(0, 1, 0)
				.addScaledVector(L(0, -1, 0), 0.4)
				.addScaledVector(TO_CAM, 0.3)
				.normalize(),
			hand: L(0.15, -0.35, 0.9).setY(-0.25).normalize(),
		};
		if (S.distanceTo(wrist) > (rig.arm.Right.a + rig.arm.Right.b) * 0.98) TOP.wrist.lerp(S, 0.1);
	}

	const onDuvet = (x: number, z: number) => V(x, clothTop(x, z) - 0.5, z);
	const spots: Record<CatName, Spot> = {
		tux: { at: onDuvet(11, 19), rotY: 1.29 },
		white: { at: onDuvet(13, 5), rotY: 1.0 },
	};
	const zs: Sprite[] = [];
	const sky: Sprite[] = [];
	let skyAlpha = 1;
	let phone: MeshBasicMaterial | null = null;
	let glow: Sprite | null = null;
	{
		const scene = view.scene;
		const duvetMat = new MeshToonMaterial({ color: 0xffffff, map: duvet.t, gradientMap: ramp });
		add(scene, cloth.g, duvetMat, { line: 0.1 }).receiveShadow = false;
		const hemPts: Vector3[] = [];
		const ca = cloth.g.attributes.position?.array ?? [];
		for (let i = 0; i <= cloth.nx; i += 2) {
			const k = i * 3;
			hemPts.push(V(ca[k] ?? 0, (ca[k + 1] ?? 0) + 0.3, (ca[k + 2] ?? 0) + 0.05));
		}
		add(scene, new TubeGeometry(new CatmullRomCurve3(hemPts), 120, 0.32, 8), "s", { line: 0.05 });
		const pillowTop = headLow + 0.35;
		const ph = pillowTop - MATTRESS + 1.4;
		add(scene, rbox(17, ph, 11.5, Math.min(ph / 2 - 0.05, 3.2)), "p", {
			at: [headX - 2, MATTRESS - 1.4 + ph / 2, headZ - 0.8],
			rot: [0, 0.06, 0],
			line: 0.08,
		});
		const cxB = (BED.x0 + BED.x1) / 2;
		const czB = (BED.z0 + BED.z1) / 2;
		const wB = BED.x1 - BED.x0;
		add(scene, rbox(wB, 5.5, BED.len, 1.1), "s", { at: [cxB, MATTRESS - 2.75, czB], line: 0.08 });
		add(scene, rbox(wB + 1.6, 2.6, BED.len + 1.2, 0.5), "w", {
			at: [cxB, MATTRESS - 6.6, czB + 0.3],
		});
		add(
			scene,
			merge(
				(
					[
						[BED.x0 + 1, BED.z0 + 1.4],
						[BED.x1 - 1, BED.z0 + 1.4],
						[BED.x0 + 1, BED.z1 - 0.6],
						[BED.x1 - 1, BED.z1 - 0.6],
					] as const
				).map(([x, z]) => [rbox(1.6, MATTRESS - 7.5, 1.6, 0.4), xf([x, (MATTRESS - 7.5) / 2, z])]),
			),
			"v",
		);
		add(scene, rbox(wB + 2, MATTRESS + 9, 1.8, 0.7), "w", {
			at: [cxB, (MATTRESS + 9) / 2, BED.z0 - 0.9],
		});
		const ns = joint(scene, [BED.x0 - 7.4, 0, BED.z0 + 5.5]);
		const nsH = MATTRESS + 1;
		add(ns, rbox(10, nsH, 9, 0.5), "v", { at: [0, nsH / 2, 0] });
		add(ns, rbox(9, 0.25, 0.25, 0.1), "g", { at: [0, nsH * 0.55, 4.5], line: 0 });
		add(ns, rbox(4.4, 0.9, 6, 0.2), "G", {
			at: [1.6, nsH + 0.45, 0.8],
			rot: [0, 0.2, 0],
			line: 0.05,
		});
		add(
			ns,
			lathe(
				[
					[0, 0],
					[1.6, 0],
					[1.4, 0.5],
					[0.35, 0.8],
					[0.3, 7],
					[0, 7],
				],
				20,
			),
			"G",
			{ at: [-2, nsH, -1.2], line: 0.06 },
		);
		add(
			ns,
			lathe(
				[
					[2.1, 0],
					[1.4, 3.6],
				],
				28,
			),
			new MeshBasicMaterial({ color: PAL.l, side: DoubleSide }),
			{ at: [-2, nsH + 5.4, -1.2], line: 0.06, shadow: false },
		);
		const bulb = new PointLight(0xffb066, 340, 70, 1.6);
		bulb.position.set(-2, nsH + 6.6, -1.2);
		ns.add(bulb);
		glow = new Sprite(
			new SpriteMaterial({
				map: glowTexture(),
				blending: AdditiveBlending,
				depthWrite: false,
				transparent: true,
			}),
		);
		glow.scale.setScalar(10);
		glow.position.copy(bulb.position);
		glow.userData.sky = true;
		ns.add(glow);
		add(ns, rbox(2.0, 0.25, 4.0, 0.2), "K", {
			at: [-1.2, nsH + 0.13, 2.6],
			rot: [0, 0.4, 0],
			line: 0.04,
		});
		phone = new MeshBasicMaterial({ color: 0x23262b });
		add(ns, new PlaneGeometry(1.7, 3.6), phone, {
			at: [-1.2, nsH + 0.27, 2.6],
			rot: [-Math.PI / 2, 0.4, 0],
			line: 0,
			shadow: false,
		});
		for (const [dx, r] of [
			[-1.6, 0.08],
			[1.6, -0.12],
		] as const) {
			const sl = joint(scene, [BED.x1 + 5 + dx, 0, czB + 4]);
			sl.rotation.y = r;
			add(sl, ell(1.25, 0.45, 3.4, 18, 10), "p", { at: [0, 0.45, 0], line: 0.05 });
			add(sl, ell(1.2, 0.65, 1.6, 18, 10).translate(0, 0, 1.5), "R", {
				at: [0, 0.55, 0],
				line: 0.05,
			});
		}
		base(scene, {
			x: (BED.x0 - 13 + BED.x1 + 6) / 2,
			z: czB - 1,
			rx: (BED.x1 + 6 - (BED.x0 - 13)) / 2 + 3,
			rz: BED.len / 2 + 7,
			rim: 0.35,
		});
		const aimAt = V(cxB, MATTRESS, czB);
		scene.add(new AmbientLight(0x7f8ccc, 0.95));
		const moon = new DirectionalLight(0xbfcbff, 0.75);
		moon.position.set(0.5, 0.8, 0.35).normalize().multiplyScalar(90).add(aimAt);
		moon.target.position.copy(aimAt);
		scene.add(moon, moon.target);
		moon.castShadow = true;
		Object.assign(moon.shadow.camera, {
			left: -45,
			right: 45,
			top: 45,
			bottom: -45,
			near: 20,
			far: 180,
		});
		moon.shadow.mapSize.set(1024, 1024);
		Object.assign(moon.shadow, {
			radius: 5,
			blurSamples: 12,
			bias: -0.0004,
			normalBias: 0.06,
			intensity: 0.75,
		});
		const z = letter("z");
		for (let i = 0; i < 3; i++) {
			const s = new Sprite(new SpriteMaterial({ map: z, transparent: true, depthWrite: false }));
			s.userData.sky = true;
			scene.add(s);
			zs.push(s);
		}
		const moonS = new Sprite(
			new SpriteMaterial({ map: crescent(), transparent: true, depthWrite: false }),
		);
		moonS.userData.sky = "moon";
		scene.add(moonS);
		sky.push(moonS);
		const dot = radial();
		for (let i = 0; i < 14; i++) {
			const s = new Sprite(new SpriteMaterial({ map: dot, transparent: true, depthWrite: false }));
			s.userData.sky = i;
			scene.add(s);
			sky.push(s);
		}
	}

	const cats: (Cat | undefined)[] = [];
	view.fitPts = boxPts(view.scene, rig, [0], () => poseBed());
	for (const name of ["tux", "white"] as const) view.fitPts.push(...spotCorners(name, spots[name]));
	const pose = () => {
		poseBed();
		breatheCloth();
	};
	const sleep = (c: Cat, i: number, breath: number) => {
		c.yaw = i ? -0.15 : 0.12;
		c.pitch = 0.42 - 0.12 * zz.stir;
		c.material.map = c.shut;
		poseCat(c, breath);
	};
	const twinkle = (t: number) => {
		for (const s of sky) {
			const m = s.material;
			m.opacity =
				s.userData.sky === "moon"
					? skyAlpha
					: (0.55 + 0.45 * Math.sin(t * 1.7 + s.userData.tw)) * skyAlpha;
		}
	};
	let poked = false;
	let stirAt = 9;
	let phoneAt = 14;

	return {
		...view,
		name: "night",
		label: LABELS.night,
		pose,
		still() {
			Object.assign(zz, { breath: 0, stir: 0 });
			rig.eyes(true);
			pose();
			zs.forEach((s, i) => {
				s.visible = i === 0;
				s.position
					.copy(headAt)
					.addScaledVector(NIGHT_CAM, 2.4)
					.add(V(0, 4.6, 0));
				s.scale.setScalar(2.2);
				s.material.opacity = 0.85;
			});
			twinkle(0);
			cats.forEach((c, i) => {
				if (c) sleep(c, i, 0);
			});
		},
		click() {
			poked = true;
		},
		addCat(name, cat, fade) {
			placeCat(view.scene, cat, spots[name]);
			const i = CAT_ORDER[name];
			cats[i] = cat;
			if (fade) hideCat(cat);
			sleep(cat, i, 0);
		},
		placeSky() {
			const { camera } = stage;
			for (const s of sky) {
				const moonish = s.userData.sky === "moon";
				const i = moonish ? 0 : Number(s.userData.sky);
				const nx = moonish ? -0.72 : -0.92 + 1.84 * rnd(i * 4.1 + 1);
				const ny = moonish ? 0.7 : 0.35 + 0.6 * rnd(i * 7.3 + 2);
				s.position
					.set(nx, ny, 0.5)
					.unproject(camera)
					.sub(camera.position)
					.normalize()
					.multiplyScalar(this.dist * 1.45)
					.add(camera.position);
				s.scale.setScalar(moonish ? 11 : 0.9 + 0.7 * rnd(i * 2.2));
				s.userData.tw = rnd(i * 9.1) * 6;
			}
		},
		setPalette(dark) {
			const tone = dark ? SKY.dark : SKY.light;
			skyAlpha = tone.alpha;
			for (const s of sky) s.material.color = new Color(tone.color);
			if (glow) glow.visible = dark;
			twinkle(0);
		},
		step(t, dt) {
			rig.eyes(true);
			if (poked && !(t > stirAt && t < stirAt + 2.2)) stirAt = t;
			poked = false;
			zz.stir = t > stirAt ? Math.sin(Math.PI * clamp((t - stirAt) / 2.2, 0, 1)) : 0;
			if (t > stirAt + 2.2) stirAt = t + 16 + rnd(t) * 12;
			zz.breath = Math.sin((t * Math.PI * 2) / 5.4) * (1 + 0.7 * zz.stir);
			zs.forEach((s, i) => {
				const age = (t + i * 1.45) % 4.35;
				const k = age / 4.35;
				s.visible = true;
				s.position
					.copy(headAt)
					.addScaledVector(NIGHT_CAM, 2 + age * 0.9)
					.add(V(0, 3.8 + age * 2.1, 0.8 * Math.sin(age * 1.3 + i) + age * 1.8));
				s.scale.setScalar(2.2 + k * 2.4);
				s.material.opacity = smooth(0, 0.12, k) * (1 - smooth(0.62, 1, k)) * 0.9;
			});
			twinkle(t);
			if (t > phoneAt + 4) phoneAt = t + 24 + rnd(t) * 16;
			const lit = t > phoneAt ? 1 - smooth(3, 4, t - phoneAt) : 0;
			phone?.color.setRGB(0.14 + 0.62 * lit, 0.15 + 0.66 * lit, 0.17 + 0.72 * lit);
			cats.forEach((c, i) => {
				if (!c) return;
				fadeCat(c, dt);
				sleep(c, i, Math.sin(t * 1.6 + i * 2));
			});
		},
	};
}
