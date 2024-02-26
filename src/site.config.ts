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
};

// Used to generate links in both the Header & Footer.
export const menuLinks: Array<{ title: string; path: string; icon?: string }> = [
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
		title: "Blog",
		path: "/posts/",
		icon: "mdi:newspaper-variant-outline",
	},
];
