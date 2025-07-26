import { defineConfig } from "astro/config";
import fs from "fs";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import rehypeUnwrapImages from "rehype-unwrap-images";
import rehypeExternalLinks from "rehype-external-links";
import robotsTxt from "astro-robots-txt";
import webmanifest from "astro-webmanifest";
import { remarkReadingTime } from "./src/utils/remark-reading-time.ts";
import icon from "astro-icon";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	site: "https://stefanmuraru.com/",
	build: {
		assets: "assets",
	},
	markdown: {
		remarkPlugins: [remarkReadingTime],
		rehypePlugins: [
			[rehypeExternalLinks, { target: "_blank", rel: ["nofollow, noopener, noreferrer"] }],
			rehypeUnwrapImages,
		],
		remarkRehype: { footnoteLabelProperties: { className: [""] } },
		shikiConfig: {
			theme: "dracula",
			wrap: true,
		},
	},
	integrations: [mdx({}), sitemap(), icon(), robotsTxt()],
	prefetch: true,
	vite: {
		plugins: [tailwindcss(), rawFonts([".ttf"])],
		optimizeDeps: {
			exclude: ["@resvg/resvg-js"],
		},
	},
});

function rawFonts(ext: Array<string>) {
	return {
		name: "vite-plugin-raw-fonts",
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore:next-line
		transform(_, id) {
			if (ext.some((e) => id.endsWith(e))) {
				const buffer = fs.readFileSync(id);
				return {
					code: `export default ${JSON.stringify(buffer)}`,
					map: null,
				};
			}
		},
	};
}
