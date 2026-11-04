import fs from "node:fs";
import { rehypeHeadingIds, unified } from "@astrojs/markdown-remark";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwind from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import expressiveCode from "astro-expressive-code";
import mermaid from "astro-mermaid";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeExternalLinks from "rehype-external-links";
import rehypeUnwrapImages from "rehype-unwrap-images";
import remarkDirective from "remark-directive";
import { remarkAdmonitions } from "./src/plugins/remark-admonitions";
import { remarkGithubCard } from "./src/plugins/remark-github-card";
import { remarkReadingTime } from "./src/plugins/remark-reading-time";
import { expressiveCodeOptions, siteConfig } from "./src/site.config";

export default defineConfig({
	site: siteConfig.url,
	compressHTML: true,
	redirects: {
		"/about": "/resume",
		"/posts": "/blog",
		"/posts/[...slug]": "/blog/[...slug]",
	},
	integrations: [
		expressiveCode(expressiveCodeOptions),
		sitemap(),
		mdx(),
		mermaid({
			mermaidConfig: {
				layout: "dagre",
				look: "classic",
				flowchart: { wrappingWidth: 200 },
				theme: "base",
				themeVariables: {
					// Background
					primaryColor: "#161b22",
					primaryBorderColor: "#58a6ff",
					primaryTextColor: "#c9d1d9",
					// Lines & arrows
					lineColor: "#8b949e",
					// Edge labels
					edgeLabelBackground: "#0d1117",
					tertiaryTextColor: "#c9d1d9",
					// Secondary/tertiary nodes
					secondaryColor: "#161b22",
					secondaryBorderColor: "#58a6ff",
					secondaryTextColor: "#c9d1d9",
					tertiaryColor: "#161b22",
					tertiaryBorderColor: "#58a6ff",
					// General
					fontFamily: "Martian Mono Variable, monospace",
					fontSize: "13px",
					nodePadding: "8",
				},
			},
		}),
	],
	markdown: {
		processor: unified({
			rehypePlugins: [
				rehypeHeadingIds,
				[rehypeAutolinkHeadings, { behavior: "wrap", properties: { className: ["not-prose"] } }],
				[
					rehypeExternalLinks,
					{
						rel: ["noreferrer", "noopener"],
						target: "_blank",
					},
				],
				rehypeUnwrapImages,
			],
			remarkPlugins: [
				remarkReadingTime,
				remarkDirective,
				remarkGithubCard as any,
				remarkAdmonitions as any,
			],
			remarkRehype: {
				footnoteLabelProperties: {
					className: [""],
				},
			},
		}),
	},
	vite: {
		optimizeDeps: {
			exclude: ["@resvg/resvg-js"],
		},
		plugins: [tailwind() as any, rawFonts([".ttf", ".woff"])],
	},
});

function rawFonts(ext: string[]) {
	return {
		name: "vite-plugin-raw-fonts",
		// @ts-expect-error:next-line
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
