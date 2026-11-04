import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const previewPort = 4329;
const debugPort = 9333;
const pageURL = `http://localhost:${previewPort}/resume/`;
const output = fileURLToPath(new URL("../public/resume.pdf", import.meta.url));
const pdfTitle = "Ștefan Muraru – Resume";
const chromePath = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const blockedURLs = ["*googletagmanager.com*", "*cloudflareinsights.com*", "*unpkg.com*", "*grafana.net*"];

async function waitForJSON(url) {
	for (let attempt = 0; attempt < 150; attempt++) {
		try {
			const response = await fetch(url);
			if (response.ok) return response;
		} catch {}
		await sleep(200);
	}
	throw new Error(`Timed out waiting for ${url}`);
}

function connect(webSocketURL) {
	const socket = new WebSocket(webSocketURL);
	const pending = new Map();
	const waiters = new Map();
	let nextId = 0;

	socket.addEventListener("message", ({ data }) => {
		const message = JSON.parse(data);
		if (message.id && pending.has(message.id)) {
			const { resolve, reject } = pending.get(message.id);
			pending.delete(message.id);
			if (message.error) reject(new Error(message.error.message));
			else resolve(message.result);
		} else if (message.method && waiters.has(message.method)) {
			waiters.get(message.method)();
			waiters.delete(message.method);
		}
	});

	return {
		ready: new Promise((resolve, reject) => {
			socket.addEventListener("open", resolve, { once: true });
			socket.addEventListener("error", reject, { once: true });
		}),
		send(method, params = {}) {
			return new Promise((resolve, reject) => {
				const id = ++nextId;
				pending.set(id, { resolve, reject });
				socket.send(JSON.stringify({ id, method, params }));
			});
		},
		once(method) {
			return new Promise((resolve) => waiters.set(method, resolve));
		},
		close() {
			socket.close();
		},
	};
}

const profile = await mkdtemp(join(tmpdir(), "resume-pdf-"));
const preview = spawn("astro", ["preview", "--port", String(previewPort), "--ignore-lock"], {
	detached: true,
	stdio: "ignore",
});
const chrome = spawn(
	chromePath,
	["--headless=new", `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, "--no-first-run", "about:blank"],
	{ detached: true, stdio: "ignore" },
);

try {
	await waitForJSON(pageURL);
	const targets = await (await waitForJSON(`http://127.0.0.1:${debugPort}/json/list`)).json();
	const target = targets.find(({ type }) => type === "page");
	const cdp = connect(target.webSocketDebuggerUrl);
	await cdp.ready;

	await cdp.send("Network.enable");
	await cdp.send("Network.setBlockedURLs", { urls: blockedURLs });
	await cdp.send("Page.enable");
	const loaded = cdp.once("Page.loadEventFired");
	await cdp.send("Page.navigate", { url: pageURL });
	await loaded;
	await cdp.send("Runtime.evaluate", { expression: "document.fonts.ready.then(() => true)", awaitPromise: true });
	await cdp.send("Runtime.evaluate", { expression: `document.title = ${JSON.stringify(pdfTitle)}` });

	const { data } = await cdp.send("Page.printToPDF", {
		displayHeaderFooter: false,
		preferCSSPageSize: true,
		printBackground: true,
	});
	await writeFile(output, Buffer.from(data, "base64"));
	cdp.close();
	console.log(`Wrote ${output}`);
} finally {
	const stop = (child) => {
		if (child.exitCode !== null) return undefined;
		const exited = new Promise((resolve) => child.once("exit", resolve));
		process.kill(-child.pid, "SIGTERM");
		return exited;
	};
	await Promise.all([stop(chrome), stop(preview)]);
	await rm(profile, { recursive: true, force: true, maxRetries: 5 });
}
