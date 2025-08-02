import type { AstroExpressiveCodeOptions } from "astro-expressive-code";
import type { SiteConfig } from "@/types";

export const siteConfig: SiteConfig = {
	// Used as both a meta property (src/components/BaseHead.astro L:31 + L:49) & the generated satori png (src/pages/og-image/[slug].png.ts)
	author: "Ştefan MURARU",
	// Meta property used to construct the meta title property, found in src/components/BaseHead.astro L:11
	title: "Ștefan MURARU",
	// Meta property used as the default description meta property
	description: "Thoughts, stories and ideas from the engineering world.",
	// HTML lang property, found in src/layouts/Base.astro L:18
	lang: "en-GB",
	// Meta property, found in src/components/BaseHead.astro L:42
	ogLocale: "en_GB",
	// Date.prototype.toLocaleDateString() parameters, found in src/utils/date.ts.
	date: {
		locale: "en-GB",
		options: {
			day: "numeric",
			month: "short",
			year: "numeric",
		},
	},
	webmentions: undefined,
	// ! Please remember to replace the following site property with your own domain, used in astro.config.ts
	url: "https://stefanmuraru.com/",
};

// Used to generate links in both the Header & Footer.
export const menuLinks: Array<{ title: string; path: string; icon?: string; target?: string }> = [
	{
		title: "Hello",
		path: "/",
		icon: "mdi:hand-wave-outline",
	},
	{
		title: "About me",
		path: "/about/",
		icon: "mdi:file-document-multiple-outline",
	},
	{
		title: "Resume",
		path: "/resume.pdf",
		icon: "mdi:file-document-check",
		target: "_blank",
	},
	{
		title: "Blog",
		path: "/posts/",
		icon: "mdi:newspaper-variant-outline",
	},
];

// https://expressive-code.com/reference/configuration/
export const expressiveCodeOptions: AstroExpressiveCodeOptions = {
	styleOverrides: {
		borderRadius: "4px",
		codeFontFamily:
			'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
		codeFontSize: "0.875rem",
		codeLineHeight: "1.7142857rem",
		codePaddingInline: "1rem",
		frames: {
			frameBoxShadowCssValue: "none",
		},
		uiLineHeight: "inherit",
	},
	themeCssSelector(theme, { styleVariants }) {
		// If one dark and one light theme are available
		// generate theme CSS selectors compatible with cactus-theme dark mode switch
		if (styleVariants.length >= 2) {
			const baseTheme = styleVariants[0]?.theme;
			const altTheme = styleVariants.find((v) => v.theme.type !== baseTheme?.type)?.theme;
			if (theme === baseTheme || theme === altTheme) return `[data-theme='${theme.type}']`;
		}
		// return default selector
		return `[data-theme="${theme.name}"]`;
	},
	// One dark, one light theme => https://expressive-code.com/guides/themes/#available-themes
	themes: ["dracula", "github-light"],
	useThemedScrollbars: false,
};
