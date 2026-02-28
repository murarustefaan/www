import type { AstroExpressiveCodeOptions } from "astro-expressive-code";
import type { SiteConfig } from "@/types";

export const siteConfig: SiteConfig = {
	author: "Ștefan Muraru",
	title: "Ștefan Muraru",
	description:
		"Senior Software Engineer — DevOps & Cloud-Native. Technical writing on infrastructure, Kubernetes, and cloud engineering.",
	lang: "en-GB",
	ogLocale: "en_GB",
	date: {
		locale: "en-GB",
		options: {
			day: "numeric",
			month: "short",
			year: "numeric",
		},
	},
	url: "https://stefanmuraru.com/",
};

export const menuLinks: Array<{ title: string; path: string; style?: "button" }> = [
	{
		title: "home",
		path: "/",
	},
	{
		title: "blog",
		path: "/blog",
	},
	{
		title: "[resume]",
		path: "/resume",
		style: "button",
	},
];

export const expressiveCodeOptions: AstroExpressiveCodeOptions = {
	styleOverrides: {
		borderRadius: "4px",
		codeFontFamily:
			'"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
		codeFontSize: "0.875rem",
		codeLineHeight: "1.7142857rem",
		codePaddingInline: "1rem",
		frames: {
			frameBoxShadowCssValue: "none",
		},
		uiLineHeight: "inherit",
	},
	themes: ["github-dark"],
	useThemedScrollbars: false,
};
