import { PCFShadowMap, PerspectiveCamera, WebGLRenderer } from "three";
import { type GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import type { Scene as SceneName } from "@/utils/iasi-time";
import { buildBed } from "./bed";
import { type Cat, type CatName, makeCats } from "./cats";
import { buildDesk } from "./desk";
import { AZ_LIM, aimCam, EL_LIM, fitView } from "./frame";
import { Rig } from "./figure";
import type { Look, Stage, View } from "./view";

export interface HeroOptions {
	canvas: HTMLCanvasElement;
	scene: SceneName;
	dark: boolean;
	models: Record<"me" | CatName, string>;
	signal?: AbortSignal;
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

const IDLE_AFTER = 15_000;
const FRAME = 32;
const BUILDERS: Record<SceneName, (rig: Rig, stage: Stage) => View> = {
	day: buildDesk,
	night: buildBed,
};

function breathe(): Promise<void> {
	const scheduler = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
	if (typeof scheduler?.yield === "function") return scheduler.yield();
	return new Promise((resolve) => setTimeout(resolve, 0));
}

function whenIdle(fn: () => void) {
	if (typeof window.requestIdleCallback === "function")
		window.requestIdleCallback(fn, { timeout: 3000 });
	else window.setTimeout(fn, 1500);
}

export async function createHero(opts: HeroOptions): Promise<Hero> {
	const { canvas, signal } = opts;
	const still = opts.still ?? false;
	const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
	let built: () => void = () => {};
	const ready = new Promise<void>((resolve) => {
		built = resolve;
	});
	let addCats: (name: CatName, g: GLTF) => void = () => {};
	const settled = Promise.allSettled(
		(["white", "tux"] as const).map(async (name) => {
			const g = await loader.loadAsync(opts.models[name]);
			await ready;
			await breathe();
			addCats(name, g);
		}),
	).then((rs) => {
		for (const r of rs)
			if (r.status === "rejected") console.warn("hero: a cat did not load", r.reason);
	});
	const me = await loader.loadAsync(opts.models.me);
	signal?.throwIfAborted();

	const renderer = new WebGLRenderer({
		canvas,
		antialias: true,
		alpha: true,
		powerPreference: "low-power",
	});
	let disposed = false;
	const cleanups: Array<() => void> = [];
	const release = () => {
		disposed = true;
		for (const c of cleanups.splice(0)) c();
		renderer.dispose();
		renderer.forceContextLoss();
	};

	try {
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = PCFShadowMap;
		const camera = new PerspectiveCamera(24, 1, 5, 900);
		const stage = { camera, canvas, reduce: still };
		const rig = new Rig(me.scene);
		let dark = opts.dark;
		const views: Partial<Record<SceneName, View>> = {};
		const waiting: Record<SceneName, Array<[CatName, Cat]>> = { day: [], night: [] };
		const viewOf = (name: SceneName): View => {
			const found = views[name];
			if (found) return found;
			const view = BUILDERS[name](rig, stage);
			view.setPalette?.(dark);
			for (const [cat, copy] of waiting[name].splice(0)) view.addCat(cat, copy, false);
			views[name] = view;
			return view;
		};

		await breathe();
		signal?.throwIfAborted();
		let active = viewOf(opts.scene);
		active.scene.add(rig.root);
		await breathe();
		signal?.throwIfAborted();
		await renderer.compileAsync(active.scene, camera);
		signal?.throwIfAborted();

		const orbit = { az: 0, el: 0, vaz: 0, vel: 0 };
		const frameView = (view: View) => {
			fitView(camera, view);
			view.placeSky?.();
			aimCam(camera, view, view.AZ + orbit.az, view.EL + orbit.el);
		};
		const coarse = window.matchMedia("(pointer: coarse)");
		const layout = () => {
			const w = canvas.clientWidth;
			const h = canvas.clientHeight;
			if (!w || !h) return false;
			renderer.setPixelRatio(
				opts.pixelRatio ?? (coarse.matches ? Math.min(1.5, window.devicePixelRatio || 1) : 2),
			);
			renderer.setSize(w, h, false);
			camera.aspect = w / h;
			frameView(active);
			return true;
		};

		let paused = still;
		let idle = false;
		let visible = false;
		let lost = false;
		let frame = 0;
		let last = 0;
		let activeAt = performance.now();
		let ptr: [number, number] | null = null;
		let ptrAt = -1e9;
		let greeted = false;
		let drag: { id: number; x: number; y: number; az: number; el: number } | null = null;
		let dragged = false;
		const running = () => !paused && !idle && visible && !lost;
		const draw = () => {
			if (!lost) renderer.render(active.scene, camera);
		};
		const settle = () => {
			if (running()) active.pose();
			else active.still();
		};

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
			const look: Look =
				active.pointerDir && ptr && ms - ptrAt < 2500 ? active.pointerDir(ptr) : null;
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
			aimCam(camera, active, active.AZ + orbit.az, active.EL + orbit.el);
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
				window.setTimeout(() => views.day?.click(), 700);
			}
		};
		const show = (name: SceneName) => {
			active = viewOf(name);
			active.scene.add(rig.root);
			orbit.az = orbit.el = orbit.vaz = orbit.vel = 0;
			canvas.setAttribute("aria-label", active.label);
			if (layout()) {
				settle();
				draw();
			}
			greet();
		};
		const prepare = async (name: SceneName) => {
			if (views[name] || disposed) return;
			const view = viewOf(name);
			active.pose();
			await renderer.compileAsync(view.scene, camera);
			if (disposed) return;
			await renderer.compileAsync(rig.root, camera, view.scene);
			if (disposed || lost || active === view) return;
			view.scene.add(rig.root);
			renderer.render(view.scene, camera);
			active.scene.add(rig.root);
			draw();
		};

		const on = <K extends keyof HTMLElementEventMap>(
			el: HTMLElement | Window,
			type: K,
			fn: (e: HTMLElementEventMap[K]) => void,
			options?: AddEventListenerOptions,
		) => {
			el.addEventListener(type, fn as EventListener, options);
			cleanups.push(() => el.removeEventListener(type, fn as EventListener, options));
		};
		const onContext = (
			type: "webglcontextlost" | "webglcontextrestored",
			fn: (e: Event) => void,
		) => {
			canvas.addEventListener(type, fn);
			cleanups.push(() => canvas.removeEventListener(type, fn));
		};
		onContext("webglcontextlost", (e) => {
			e.preventDefault();
			lost = true;
			if (frame) cancelAnimationFrame(frame);
			frame = 0;
		});
		onContext("webglcontextrestored", () => {
			lost = false;
			if (layout()) {
				settle();
				draw();
			}
			schedule();
		});
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

		addCats = (name, g) => {
			if (disposed) return;
			const copies = makeCats(g.scene, name);
			(["day", "night"] as const).forEach((scene, i) => {
				const copy = copies[i];
				if (!copy) return;
				const view = views[scene];
				if (view) view.addCat(name, copy, running() && active === view);
				else waiting[scene].push([name, copy]);
			});
			if (!running()) {
				active.still();
				draw();
			}
		};

		const hero: Hero = {
			settled,
			show,
			setPalette(next) {
				dark = next;
				for (const view of Object.values(views)) view.setPalette?.(next);
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
				release();
			},
		};

		if (!still) {
			const soft = (x: number, l: number) => l * Math.tanh(x / l);
			on(
				window,
				"pointermove",
				(e) => {
					ptr = [e.clientX, e.clientY];
					ptrAt = performance.now();
				},
				{ passive: true },
			);
			on(canvas, "pointermove", () => hero.wake(), { passive: true });
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
			const letGo = (e: PointerEvent) => {
				if (drag && e.pointerId === drag.id) {
					drag = null;
					canvas.classList.remove("grabbing");
				}
			};
			on(canvas, "pointerup", letGo);
			on(canvas, "pointercancel", letGo);
			whenIdle(() => {
				prepare(opts.scene === "day" ? "night" : "day").catch((error) =>
					console.warn("hero: could not prepare the other scene", error),
				);
			});
		}

		show(opts.scene);
		built();
		return hero;
	} catch (error) {
		release();
		throw error;
	}
}
