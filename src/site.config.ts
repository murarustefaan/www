import type { AstroExpressiveCodeOptions } from "astro-expressive-code";
import type { SiteConfig } from "@/types";

export const siteConfig: SiteConfig = {
	author: "Ștefan Muraru",
	title: "Ștefan Muraru",
	description:
		"Senior Software Engineer — Cloud Infrastructure. Technical writing on Kubernetes, platform engineering, and observability.",
	lang: "en-GB",
	ogLocale: "en_GB",
	role: "senior software engineer in Iași, Romania",
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

export const menuLinks: Array<{ title: string; path: string }> = [
	{
		title: "writing",
		path: "/blog",
	},
	{
		title: "resume",
		path: "/resume",
	},
];

export const expressiveCodeOptions: AstroExpressiveCodeOptions = {
	styleOverrides: {
		borderRadius: "8px",
		codeFontFamily:
			'"Martian Mono Variable", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
		codeFontSize: "0.875rem",
		codeLineHeight: "1.7142857rem",
		codePaddingInline: "1rem",
		frames: {
			frameBoxShadowCssValue: "none",
			tooltipSuccessBackground: "var(--color-primary)",
		},
		uiLineHeight: "inherit",
	},
	themes: ["github-light", "github-dark"],
	useThemedScrollbars: false,
};
