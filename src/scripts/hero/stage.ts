import { PCFShadowMap, PerspectiveCamera, Vector3, WebGLRenderer } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import type { Scene as SceneName } from "@/utils/iasi-time";
import { buildBed } from "./bed";
import { type CatName, makeCats } from "./cats";
import { buildDesk } from "./desk";
import { Rig } from "./figure";
import type { Look, View } from "./view";

export interface HeroOptions {
	canvas: HTMLCanvasElement;
	scene: SceneName;
	dark: boolean;
	models: Record<"me" | CatName, string>;
	still?: boolean;
	pixelRatio?: number;
}

export interface Hero {
	settled: Promise<void>;
	show(scene: SceneName): void;
	setPalette(dark: boolean): void;
	setPaused(paused: boolean): void;
	wake(): void;
	dispose(): void;
}

const AZ_LIM = 0.44;
const EL_LIM = 0.15;
const IDLE_AFTER = 15_000;
const FRAME = 32;

export async function createHero(opts: HeroOptions): Promise<Hero> {
	const { canvas } = opts;
	const still = opts.still ?? false;
	const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
	const catFiles = (["white", "tux"] as const).map((name) =>
		loader.loadAsync(opts.models[name]).then((g) => ({ name, g })),
	);
	const me = await loader.loadAsync(opts.models.me);

	const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = PCFShadowMap;
	const camera = new PerspectiveCamera(24, 1, 5, 900);
	const stage = { camera, canvas, reduce: still };
	const rig = new Rig(me.scene);
	const views: Record<SceneName, View> = { day: buildDesk(rig, stage), night: buildBed(rig, stage) };
	views.night.setPalette?.(opts.dark);

	const orbit = { az: 0, el: 0, vaz: 0, vel: 0 };
	let active = views[opts.scene];
	const aimCam = (view: View, az: number, el: number) => {
		camera.position
			.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el))
			.multiplyScalar(view.dist)
			.add(view.target);
		camera.lookAt(view.target);
		camera.updateMatrixWorld();
	};
	const frameView = (view: View) => {
		camera.updateProjectionMatrix();
		const q = new Vector3();
		const right = new Vector3();
		const up = new Vector3();
		for (let n = 0; n < 6; n++) {
			aimCam(view, view.AZ, view.EL);
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
			view.target.addScaledVector(right, ((x0 + x1) / 2) * halfW).addScaledVector(up, ((y0 + y1) / 2) * halfH);
			view.dist *= Math.max(x1 - x0, y1 - y0) / 2 / 0.93;
		}
		for (const [da, de] of [
			[1, 1],
			[1, -1],
			[-1, 1],
			[-1, -1],
		] as const) {
			aimCam(view, view.AZ + da * AZ_LIM, view.EL + de * EL_LIM);
			let m = 0;
			for (const p of view.fitPts) {
				q.copy(p).project(camera);
				m = Math.max(m, Math.abs(q.x), Math.abs(q.y));
			}
			if (m > 1.06) view.dist *= m / 1.06;
		}
		aimCam(view, view.AZ, view.EL);
		view.placeSky?.();
		aimCam(view, view.AZ + orbit.az, view.EL + orbit.el);
	};
	const coarse = window.matchMedia("(pointer: coarse)");
	const layout = () => {
		const w = canvas.clientWidth;
		const h = canvas.clientHeight;
		if (!w || !h) return false;
		renderer.setPixelRatio(opts.pixelRatio ?? Math.min(coarse.matches ? 1.5 : 2, window.devicePixelRatio || 1));
		renderer.setSize(w, h, false);
		camera.aspect = w / h;
		frameView(active);
		return true;
	};
	const draw = () => renderer.render(active.scene, camera);

	let paused = still;
	let idle = false;
	let visible = false;
	let frame = 0;
	let last = 0;
	let activeAt = performance.now();
	let ptr: [number, number] | null = null;
	let ptrAt = -1e9;
	let greeted = false;
	let drag: { id: number; x: number; y: number; az: number; el: number } | null = null;
	let dragged = false;
	const running = () => !paused && !idle && visible;

	const tick = (ms: number) => {
		frame = 0;
		if (!running()) return;
		frame = requestAnimationFrame(tick);
		if (ms - last < FRAME) return;
		const dt = Math.min(0.1, (ms - last) / 1000);
		const t = ms / 1000;
		last = ms;
		if (!drag && ms - activeAt > IDLE_AFTER) {
			idle = true;
			return;
		}
		const look: Look = active.pointerDir && ptr && ms - ptrAt < 2500 ? active.pointerDir(ptr) : null;
		active.step(t, dt, look);
		if (!drag) {
			for (const [x, v] of [
				["az", "vaz"],
				["el", "vel"],
			] as const) {
				orbit[v] += (-49 * orbit[x] - 7.7 * orbit[v]) * dt;
				orbit[x] += orbit[v] * dt;
				if (Math.abs(orbit[x]) < 1e-4 && Math.abs(orbit[v]) < 1e-3) orbit[x] = orbit[v] = 0;
			}
		}
		aimCam(active, active.AZ + orbit.az, active.EL + orbit.el);
		active.pose();
		draw();
	};
	const schedule = () => {
		if (running() && !frame) {
			last = performance.now();
			frame = requestAnimationFrame(tick);
		}
	};
	const greet = () => {
		if (!still && visible && active.name === "day" && !greeted) {
			greeted = true;
			window.setTimeout(() => views.day.click(), 700);
		}
	};
	const show = (name: SceneName) => {
		active = views[name];
		active.scene.add(rig.root);
		orbit.az = orbit.el = orbit.vaz = orbit.vel = 0;
		canvas.setAttribute("aria-label", active.label);
		if (layout()) {
			if (running()) active.pose();
			else active.still();
			draw();
		}
		greet();
	};

	const cleanups: Array<() => void> = [];
	const on = <K extends keyof HTMLElementEventMap>(
		el: HTMLElement | Window,
		type: K,
		fn: (e: HTMLElementEventMap[K]) => void,
		options?: AddEventListenerOptions,
	) => {
		el.addEventListener(type, fn as EventListener, options);
		cleanups.push(() => el.removeEventListener(type, fn as EventListener, options));
	};
	const resize = new ResizeObserver(() => {
		if (layout()) {
			if (!running()) active.still();
			draw();
		}
	});
	resize.observe(canvas);
	const seen = new IntersectionObserver((es) => {
		visible = es.some((e) => e.isIntersecting);
		greet();
		schedule();
	});
	seen.observe(canvas);
	cleanups.push(
		() => resize.disconnect(),
		() => seen.disconnect(),
	);

	const settled = Promise.allSettled(
		catFiles.map((p) =>
			p.then(({ name, g }) => {
				const [day, night] = makeCats(g.scene, name);
				views.day.addCat(name, day, running() && active === views.day);
				views.night.addCat(name, night, running() && active === views.night);
				if (!running()) {
					active.still();
					draw();
				}
			}),
		),
	).then((rs) => {
		for (const r of rs) if (r.status === "rejected") console.warn("hero: a cat did not load", r.reason);
	});

	if (!still) {
		const soft = (x: number, l: number) => l * Math.tanh(x / l);
		on(window, "pointermove", (e) => {
			ptr = [e.clientX, e.clientY];
			ptrAt = performance.now();
		}, { passive: true });
		on(canvas, "pointermove", () => {
			activeAt = performance.now();
		}, { passive: true });
		on(canvas, "click", () => {
			if (dragged) {
				dragged = false;
				return;
			}
			active.click();
			hero.wake();
		});
		on(canvas, "pointerdown", (e) => {
			if (e.button) return;
			drag = { id: e.pointerId, x: e.clientX, y: e.clientY, az: orbit.az, el: orbit.el };
			dragged = false;
			canvas.setPointerCapture(e.pointerId);
		});
		on(canvas, "pointermove", (e) => {
			if (!drag || e.pointerId !== drag.id) return;
			const dx = e.clientX - drag.x;
			const dy = e.clientY - drag.y;
			const w = canvas.clientWidth;
			if (!dragged && Math.hypot(dx, dy) < 6) return;
			dragged = true;
			canvas.classList.add("grabbing");
			orbit.az = soft(drag.az - (dx / w) * 2.4, AZ_LIM);
			orbit.el = soft(drag.el + (dy / w) * 2.4, EL_LIM);
			orbit.vaz = orbit.vel = 0;
			hero.wake();
		});
		const release = (e: PointerEvent) => {
			if (drag && e.pointerId === drag.id) {
				drag = null;
				canvas.classList.remove("grabbing");
			}
		};
		on(canvas, "pointerup", release);
		on(canvas, "pointercancel", release);
	}

	const hero: Hero = {
		settled,
		show,
		setPalette(dark) {
			views.night.setPalette?.(dark);
			if (!running()) draw();
		},
		setPaused(p) {
			if (still) return;
			paused = p;
			activeAt = performance.now();
			if (p && frame) {
				cancelAnimationFrame(frame);
				frame = 0;
			}
			schedule();
		},
		wake() {
			activeAt = performance.now();
			if (idle) {
				idle = false;
				schedule();
			}
		},
		dispose() {
			if (frame) cancelAnimationFrame(frame);
			frame = 0;
			paused = true;
			for (const c of cleanups) c();
			renderer.dispose();
			renderer.forceContextLoss();
		},
	};
	show(opts.scene);
	return hero;
}
