import { Resvg } from "@resvg/resvg-js";
import satori, { type SatoriOptions } from "satori";
import MartianMonoLight from "@/assets/martian-mono-87-250.ttf";
import MartianMono from "@/assets/martian-mono-87-400.ttf";

export const ogColors = {
	bg: "#eeede8",
	mark: "#ab1d2e",
	muted: "#5c5953",
	text: "#1c1b1a",
};

const ogOptions: SatoriOptions = {
	fonts: [
		{
			data: Buffer.from(MartianMonoLight),
			name: "Martian Mono",
			style: "normal",
			weight: 300,
		},
		{
			data: Buffer.from(MartianMono),
			name: "Martian Mono",
			style: "normal",
			weight: 400,
		},
	],
	height: 630,
	width: 1200,
};

export async function pngResponse(markup: Parameters<typeof satori>[0]) {
	const svg = await satori(markup, ogOptions);
	const png = new Uint8Array(new Resvg(svg).render().asPng());
	return new Response(png, {
		headers: {
			"Cache-Control": "public, max-age=31536000, immutable",
			"Content-Type": "image/png",
		},
	});
}
