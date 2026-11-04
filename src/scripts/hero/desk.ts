import {
	AmbientLight,
	CanvasTexture,
	DirectionalLight,
	InstancedMesh,
	MeshBasicMaterial,
	Plane,
	PlaneGeometry,
	Raycaster,
	SRGBColorSpace,
	TorusGeometry,
	Vector2,
	Vector3,
} from "three";
import {
	CAT_DOWN,
	CAT_UP,
	CAT_YAW,
	type Cat,
	type CatName,
	catAim,
	fadeCat,
	hideCat,
	placeCat,
	poseCat,
	type Spot,
	spotCorners,
} from "./cats";
import { rugBorder } from "./embroidery";
import { DOWN, RIGHT, type Rig, SIDES, type Side, UP } from "./figure";
import {
	add,
	base,
	clamp,
	ease,
	ell,
	joint,
	lathe,
	limb,
	merge,
	PAL,
	rbox,
	rnd,
	type Swatch,
	toon,
	V,
	xf,
} from "./kit";
import { boxPts, type Look, makeView, type Stage, type View } from "./view";

const COLS = 23;
const ROWS = 13;
const CODE: ReadonlyArray<readonly [number, string]> = [
	[0, "A4 t6 u1 t3 t7 u1 t5 u2"],
	[2, "t4 u2 A3 t5 u1 t3 u1"],
	[2, "A2 t3 u2 t3 u1"],
	[4, "A6 t3 u1 O9"],
	[2, "u1"],
	[0, ""],
	[2, "n16"],
	[2, "A3 u1 t4 u2 A5 t5 u1"],
	[4, "t6 u1 t3 u1 t4 u1"],
	[4, "A2 t3 u2 t3 u1"],
	[6, "A8"],
	[4, "u1"],
	[2, "u1"],
	[2, "A6 t3"],
	[0, "u1"],
	[0, ""],
	[0, "A4 t9 u1 t3 u2"],
	[2, "t3 u2 O12"],
	[2, "A2 t3 u2 t3 u1"],
	[4, "A6 t3 u1 O7"],
	[2, "u1"],
	[2, "A6 t4 u1 t3"],
	[0, "u1"],
	[0, ""],
];

type Cell = Swatch | null;

function expand([ind, toks]: readonly [number, string]): Cell[] {
	const out: Cell[] = new Array(ind).fill(null);
	toks
		.split(" ")
		.filter(Boolean)
		.forEach((tk, n) => {
			if (n) out.push(null);
			for (let i = 0; i < +tk.slice(1); i++) out.push(tk[0] as Swatch);
		});
	return out.slice(0, COLS);
}

const LINES = CODE.map(expand);
const CAT_ORDER: Record<CatName, number> = { white: 0, tux: 1 };

interface Hand {
	off: Vector3;
	go: Vector3;
	vel: Vector3;
	dip: number;
	dipV: number;
}

interface Home {
	wrist: Vector3;
	pole: Vector3;
	hand: Vector3;
	tip: Vector3;
}

export function buildDesk(rig: Rig, stage: Stage): View {
	const { B } = rig;
	const view = makeView(1.66, 0.34, V(0, 16, 8));
	const st = { yaw: 0.3, pitch: 0.12, head: 0, breath: 0 };
	const scr = document.createElement("canvas");
	const sg = scr.getContext("2d");
	scr.width = 384;
	scr.height = 224;
	const screen = new CanvasTexture(scr);
	screen.colorSpace = SRGBColorSpace;
	screen.anisotropy = 4;
	const KS = 1.1;
	const KEYS = 48;
	const keys = new InstancedMesh(rbox(0.56 * KS, 0.32, 0.58 * KS, 0.12), toon("Y"), KEYS);
	const keyDip = new Float32Array(KEYS);
	const newHand = (): Hand => ({ off: V(), go: V(), vel: V(), dip: 0, dipV: 0 });
	const hands: Record<Side, Hand> = { Left: newHand(), Right: newHand() };
	const HIP = V();
	let HOME: Record<Side, Home> | null = null;

	function pose() {
		rig.rest();
		rig.root.quaternion.identity();
		rig.root.position.copy(HIP);
		const br = st.breath;
		rig.spin(B.Hips, RIGHT, 0.22);
		rig.spin(B.Spine02, RIGHT, -0.15);
		rig.spin(B.Spine01, RIGHT, 0.012 * br);
		rig.spin(B.Spine, RIGHT, 0.016 * br);
		const yaw = st.yaw + (1.1 - st.yaw) * st.head;
		const pitch = st.pitch + (-0.06 - st.pitch) * st.head;
		const chest = 0.34 * st.head + 0.18 * Math.max(0, st.yaw - 0.6) * (1 - st.head);
		rig.spin(B.Spine01, UP, chest * 0.4);
		rig.spin(B.Spine02, UP, chest * 0.6);
		for (const side of SIDES) {
			const s = side === "Left" ? 1 : -1;
			rig.aim(B[`${side}UpLeg`], V(s * 0.07, -0.06, 1));
			rig.aim(B[`${side}Leg`], V(s * 0.02, -1, 0.1));
			rig.aim(B[`${side}Foot`], rig.foot[side].foot);
			rig.aim(B[`${side}ToeBase`], rig.foot[side].toe);
		}
		rig.spin(B.neck, UP, (yaw - chest) * 0.35);
		rig.spin(B.Head, UP, (yaw - chest) * 0.65);
		const nod = V(Math.cos(yaw), 0, -Math.sin(yaw));
		rig.spin(B.neck, nod, pitch * 0.3);
		rig.spin(B.Head, nod, pitch * 0.7);
		for (const side of SIDES) {
			const s = side === "Left" ? 1 : -1;
			if (!HOME) {
				rig.aim(B[`${side}Arm`], V(s * 0.16, -0.86, 0.48));
				rig.aim(B[`${side}ForeArm`], V(-s * 0.3, 0.03, 0.95));
				rig.handTo(side, V(-s * 0.26, -0.12, 0.96), DOWN);
				continue;
			}
			const h = hands[side];
			const home = HOME[side];
			const T = home.wrist.clone().add(h.off).addScaledVector(UP, -0.16 * h.dip);
			const H = home.hand.clone().addScaledVector(UP, -0.1 * h.dip).normalize();
			rig.reach(side, T, home.pole);
			rig.handTo(side, H, DOWN);
		}
		rig.root.updateMatrixWorld(true);
	}

	pose();
	{
		const toe = rig.posOf(B.LeftToeBase);
		const hips = rig.posOf(B.Hips);
		HIP.set(-hips.x, rig.foot.Left.y - toe.y, -hips.z);
		pose();
	}
	const hipsAt = rig.posOf(B.Hips);
	const kneeAt = rig.posOf(B.LeftLeg);
	const handLen = rig.posOf(B.LeftHand).distanceTo(rig.posOf(B.LeftForeArm)) * 0.54;
	const finger = (side: Side) =>
		rig.posOf(B[`${side}Hand`]).addScaledVector(rig.dirOf(B[`${side}Hand`]), handLen);
	const fl = finger("Left");
	const fr = finger("Right");
	const homeOf = (side: Side): Home => {
		const S = rig.posOf(B[`${side}Arm`]);
		const E = rig.posOf(B[`${side}ForeArm`]);
		const W = rig.posOf(B[`${side}Hand`]);
		return {
			wrist: W,
			pole: E.clone().sub(S.clone().lerp(W, 0.5)).normalize(),
			hand: rig.dirOf(B[`${side}Hand`]),
			tip: finger(side),
		};
	};
	const home: Record<Side, Home> = { Left: homeOf("Left"), Right: homeOf("Right") };
	HOME = home;
	const KB = { x: (fl.x + fr.x) / 2, z: (fl.z + fr.z) / 2 + 0.4, top: Math.min(fl.y, fr.y) - 0.3 };
	const ROOM = {
		seat: Math.min(hipsAt.y, kneeAt.y) - 2.0,
		seatZ: hipsAt.z - 0.6,
		desk: KB.top - 0.85,
		deskFront: Math.min(KB.z - 3.2, kneeAt.z - 2.5),
	};
	const keyAt = (n: number): [number, number, number] => [
		KB.x + ((n % 12) - 5.5) * 0.7 * KS,
		KB.top - 0.16 - 0.16 * (keyDip[n] ?? 0),
		KB.z + (Math.floor(n / 12) - 1.5) * 0.72 * KS,
	];

	const TREE = { x: -15, z: -9, top: 12 };
	const spots: Record<CatName, Spot> = {
		white: { at: V(9, ROOM.desk, ROOM.deskFront + 16.6), rotY: -2.74, mirror: true },
		tux: { at: V(TREE.x, TREE.top, TREE.z), rotY: 1.06 },
	};
	{
		const scene = view.scene;
		const dk = joint(scene);
		const dz = ROOM.deskFront + 10;
		add(dk, rbox(26, 0.9, 20, 0.35), "w", { at: [-0.5, ROOM.desk - 0.45, dz] });
		add(
			dk,
			merge(
				(
					[
						[-12.4, dz - 9.1],
						[11.4, dz - 9.1],
						[-12.4, dz + 9.1],
						[11.4, dz + 9.1],
					] as const
				).map(([x, z]) => [
					rbox(1.1, ROOM.desk - 0.8, 1.1, 0.35),
					xf([x, (ROOM.desk - 0.8) / 2, z]),
				]),
			),
			"v",
		);
		const monitor = joint(scene, [0, ROOM.desk, ROOM.deskFront + 9.6]);
		monitor.rotation.y = -0.62;
		add(monitor, rbox(5.4, 0.4, 3.6, 0.18), "M", { at: [0, 0.2, 0.9] });
		add(monitor, rbox(1.2, 5.4, 0.7, 0.25), "M", { at: [0, 2.9, 1.25], rot: [-0.06, 0, 0] });
		add(monitor, rbox(15.5, 9.3, 0.8, 0.3), "M", { at: [0, 7.4, 0.35] });
		add(monitor, new PlaneGeometry(14.8, 8.5), new MeshBasicMaterial({ map: screen }), {
			at: [0, 7.45, -0.07],
			rot: [0, Math.PI, 0],
			line: 0,
			shadow: false,
		});
		add(dk, rbox(9 * KS, 0.5, 3.3 * KS, 0.22), "y", { at: [KB.x, KB.top - 0.6, KB.z], line: 0.06 });
		for (let n = 0; n < KEYS; n++) keys.setMatrixAt(n, xf(keyAt(n)));
		keys.receiveShadow = true;
		dk.add(keys);
		const mugAt = [KB.x + 9.5, ROOM.desk, KB.z + 0.6] as const;
		add(
			dk,
			lathe(
				[
					[0, 0],
					[0.85, 0],
					[0.95, 0.12],
					[0.95, 1.85],
					[0.82, 1.85],
					[0.82, 0.3],
					[0, 0.3],
				],
				24,
			),
			"R",
			{ at: mugAt, line: 0.07 },
		);
		add(dk, new TorusGeometry(0.52, 0.15, 8, 16), "R", {
			at: [mugAt[0] + 0.95, mugAt[1] + 0.95, mugAt[2]],
			line: 0.05,
		});
		add(
			dk,
			lathe(
				[
					[0.84, 0],
					[0, 0],
				],
				20,
			),
			"g",
			{ at: [mugAt[0], mugAt[1] + 1.55, mugAt[2]], line: 0 },
		);
		const chair = joint(scene, [0, 0, ROOM.seatZ]);
		const sy = ROOM.seat;
		const star = [0, 1, 2, 3, 4].map((k) => (k / 5) * Math.PI * 2 + 0.3);
		add(chair, rbox(11, 1.5, 9, 0.65), "R", { at: [0, sy - 0.75, 0] });
		add(chair, rbox(10, 7.6, 1.3, 0.6), "R", { at: [0, sy + 5.2, -5.0], rot: [-0.1, 0, 0] });
		add(chair, rbox(1.4, 5.4, 0.8, 0.35), "G", { at: [0, sy + 1.6, -4.6] });
		add(
			chair,
			merge([
				[limb(0.6, 0.6, sy - 4.4), xf([0, sy - 1.6, 0])],
				[rbox(1.9, 0.9, 1.9, 0.4), xf([0, 2.3, 0])],
				...star.map(
					(a) =>
						[
							rbox(0.9, 0.6, 5.0, 0.28),
							xf([Math.sin(a) * 2.5, 1.75, Math.cos(a) * 2.5], [0.14, a, 0]),
						] as const,
				),
			]),
			"G",
			{ line: 0.08 },
		);
		add(
			chair,
			merge(star.map((a) => [ell(0.6, 0.6, 0.6, 12, 8), xf([Math.sin(a) * 4.9, 0.6, Math.cos(a) * 4.9])])),
			"K",
			{ line: 0 },
		);
		const tree = joint(scene, [TREE.x, 0, TREE.z]);
		add(tree, rbox(14, 1.1, 14, 0.4), "f", { at: [0, 0.55, 0] });
		add(tree, limb(1.7, 1.7, TREE.top - 1.3 - 1.1), "h", { at: [0, TREE.top - 1.3, 0], line: 0.06 });
		add(tree, rbox(15, 1.3, 12.5, 0.55), "f", { at: [0, TREE.top - 0.65, 0] });
		const x0 = TREE.x - 9;
		const x1 = 18.5;
		const z0 = Math.min(ROOM.seatZ - 6, TREE.z - 9);
		const z1 = dz + 10;
		const rug = { x: (x0 + x1) / 2, z: (z0 + z1) / 2, rx: (x1 - x0) / 2, rz: (z1 - z0) / 2 + 5, rim: 0.35 };
		base(scene, rug);
		rugBorder(scene, rug, 1.2, 2.4);
		const aimAt = V(0, 16, 8);
		scene.add(new AmbientLight(0xfff8ef, 1.75));
		const sun = new DirectionalLight(0xfff1e0, 1.6);
		sun.position.set(0.55, 0.75, 0.37).normalize().multiplyScalar(80).add(aimAt);
		sun.target.position.copy(aimAt);
		scene.add(sun, sun.target);
		sun.castShadow = true;
		Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 20, far: 150 });
		sun.shadow.mapSize.set(1024, 1024);
		Object.assign(sun.shadow, { radius: 5, blurSamples: 12, bias: -0.0004, normalBias: 0.06, intensity: 0.7 });
	}

	const done = LINES.slice(0, 11);
	let lineNo = 11;
	let typed = 0;
	let typeClock = 0;
	let pauseFor = 0;
	let painted = "";
	const lineAt = (n: number) => LINES[n % LINES.length] ?? [];
	function paintScreen(t: number) {
		if (!sg) return;
		const rows = done.slice(-(ROWS - 1)).concat([lineAt(lineNo).slice(0, typed)]);
		const cursorOn = stage.reduce || t % 1 < 0.55;
		const key = `${lineNo}:${typed}:${cursorOn}`;
		if (key === painted) return;
		painted = key;
		const cw = 15.6;
		const rh = 16.4;
		const x0 = 12;
		const y0 = 6;
		sg.fillStyle = PAL.X;
		sg.fillRect(0, 0, scr.width, scr.height);
		rows.forEach((line, r) => {
			for (let c = 0; c < line.length; ) {
				const k = line[c];
				if (!k) {
					c++;
					continue;
				}
				let e = c;
				while (e < line.length && line[e] === k) e++;
				sg.fillStyle = PAL[k];
				sg.beginPath();
				sg.roundRect(x0 + c * cw + 1, y0 + r * rh + 4, (e - c) * cw - 2, rh - 8, 3);
				sg.fill();
				c = e;
			}
		});
		if (cursorOn) {
			sg.fillStyle = PAL.c;
			sg.fillRect(x0 + typed * cw + 1, y0 + (rows.length - 1) * rh + 2, cw * 0.55, rh - 4);
		}
		screen.needsUpdate = true;
	}
	function pressKey() {
		const side: Side = rnd(typed * 3.1 + lineNo) < 0.5 ? "Left" : "Right";
		const h = hands[side];
		const n =
			(side === "Left" ? 6 : 0) +
			Math.floor(rnd(typed * 7.7 + lineNo * 3) * 6) +
			12 * Math.floor(rnd(typed + lineNo * 5) * 4);
		keyDip[n] = 1;
		const [kx, , kz] = keyAt(n);
		const tip = home[side].tip;
		h.go.set((kx - tip.x) * 0.3, 0, (kz - tip.z) * 0.3);
		h.dipV += 60;
	}
	const pull = V();
	function settleKeys(dt: number) {
		let moved = false;
		for (let n = 0; n < KEYS; n++) {
			const d = keyDip[n] ?? 0;
			if (d > 0) {
				keyDip[n] = Math.max(0, d - dt * 9);
				keys.setMatrixAt(n, xf(keyAt(n)));
				moved = true;
			}
		}
		if (moved) keys.instanceMatrix.needsUpdate = true;
		const k = 4;
		const h0 = dt / k;
		for (const h of Object.values(hands)) {
			h.go.multiplyScalar(Math.exp(-dt * 2));
			for (let i = 0; i < k; i++) {
				h.vel.addScaledVector(pull.subVectors(h.go, h.off), 256 * h0).multiplyScalar(1 - 32 * h0);
				h.off.addScaledVector(h.vel, h0);
				h.dipV += (-484 * h.dip - 44 * h.dipV) * h0;
				h.dip += h.dipV * h0;
			}
		}
	}

	view.fitPts = boxPts(
		view.scene,
		rig,
		[
			[0.3, 0],
			[1.3, 0],
			[0.3, 1],
		] as const,
		([yaw, head]) => {
			Object.assign(st, { yaw, head });
			pose();
		},
	);
	for (const name of ["white", "tux"] as const) view.fitPts.push(...spotCorners(name, spots[name]));
	Object.assign(st, { yaw: 0.3, head: 0 });

	const cats: (Cat | undefined)[] = [];
	let greetAt: number | null = null;
	let thinkAt = 7;
	let blinkAt = 2.5;
	let blinkTo = 0;
	let handsAt = 6;
	const HEAD = rig.posOf(B.Head).add(V(0, 4, 1));
	const ray = new Raycaster();
	const ndc = new Vector2();
	const plane = new Plane();
	const toCam = new Vector3();
	const hit = new Vector3();

	const stillCats = () => {
		for (const c of cats) {
			if (!c) continue;
			[c.yaw, c.pitch] = catAim(c, rig.posOf(B.Head));
			c.yaw = clamp(c.yaw, -CAT_YAW, CAT_YAW);
			c.pitch = clamp(c.pitch, -CAT_UP, CAT_DOWN);
			c.material.map = c.open;
			poseCat(c, 0);
		}
	};

	return {
		...view,
		name: "day",
		label:
			"Ștefan typing at his desk; his white cat watches from the desk and his tuxedo cat from a cat tree.",
		pose,
		still() {
			Object.assign(st, { yaw: 0.75, pitch: 0.02, head: 0, breath: 0 });
			rig.eyes(false);
			pose();
			paintScreen(0);
			stillCats();
		},
		click() {
			if (greetAt === null) greetAt = performance.now() / 1000;
		},
		addCat(name, cat, fade) {
			placeCat(view.scene, cat, spots[name]);
			cats[CAT_ORDER[name]] = cat;
			if (fade) hideCat(cat);
			stillCats();
		},
		pointerDir(ptr) {
			const r = stage.canvas.getBoundingClientRect();
			ndc.set(((ptr[0] - r.left) / r.width) * 2 - 1, -((ptr[1] - r.top) / r.height) * 2 + 1);
			ray.setFromCamera(ndc, stage.camera);
			toCam.subVectors(stage.camera.position, HEAD).normalize();
			plane.setFromNormalAndCoplanarPoint(toCam, hit.copy(HEAD).addScaledVector(toCam, 32));
			if (!ray.ray.intersectPlane(plane, hit)) return null;
			hit.sub(HEAD);
			return [Math.atan2(hit.x, hit.z), -Math.atan2(hit.y, Math.hypot(hit.x, hit.z))];
		},
		step(t, dt, look: Look) {
			st.head = 0;
			if (greetAt !== null) {
				const u = (t - greetAt) / 2.6;
				const span = (a: number, b: number) => ease(clamp((u - a) / (b - a), 0, 1));
				if (u >= 1) greetAt = null;
				else st.head = span(0, 0.22) - span(0.72, 1);
			}
			if (t > blinkAt) {
				blinkTo = t + 0.13;
				blinkAt = t + (rnd(t) < 0.2 ? 0.32 : 2.8 + rnd(t * 3) * 3.4);
			}
			rig.eyes(t < blinkTo);
			const thinking = t > thinkAt && t < thinkAt + 1.8;
			if (t > thinkAt + 1.8) thinkAt = t + 6 + rnd(t) * 5;
			settleKeys(dt);
			if (!thinking && greetAt === null) {
				if (pauseFor > 0) pauseFor -= dt;
				else {
					typeClock += dt * 9;
					const line = lineAt(lineNo);
					while (typeClock >= 1) {
						typeClock -= 1;
						typed++;
						if (line[typed - 1]) pressKey();
						if (typed >= line.length) {
							done.push(line);
							if (done.length > 40) done.splice(0, 20);
							lineNo++;
							typed = 0;
							pauseFor = 0.3 + rnd(lineNo) * 0.5;
							typeClock = 0;
							break;
						}
					}
				}
			}
			paintScreen(t);
			const at = look ?? [0.3 + 0.1 * (typed / COLS - 0.5), thinking ? -0.08 : 0.1];
			const k = Math.min(1, dt * 6);
			st.yaw += (clamp(at[0], -0.3, 1.0) - st.yaw) * k;
			st.pitch += (clamp(at[1], -0.35, 0.3) - st.pitch) * k;
			st.breath = Math.sin((t * Math.PI * 2) / 4.2);

			if (t > handsAt + 1.6) handsAt = t + 7 + rnd(t * 5) * 6;
			const kc = Math.min(1, dt * 3);
			cats.forEach((c, i) => {
				if (!c) return;
				fadeCat(c, dt);
				const lookHands = t > handsAt + i * 0.4 && t < handsAt + 1.6;
				const [yaw, pitch] = catAim(c, lookHands ? rig.posOf(B.LeftHand) : rig.posOf(B.Head).add(V(0, 2, 0)));
				c.yaw += (clamp(yaw, -CAT_YAW, CAT_YAW) - c.yaw) * kc;
				c.pitch += (clamp(pitch, -CAT_UP, CAT_DOWN) - c.pitch) * kc;
				if (t > c.blinkAt) {
					c.blinkTo = t + 0.45;
					c.blinkAt = t + 4 + rnd(t * 7 + i) * 5;
				}
				c.material.map = t < c.blinkTo ? c.shut : c.open;
				poseCat(c, Math.sin(t * 2.4 + i * 1.7));
			});
		},
	};
}
