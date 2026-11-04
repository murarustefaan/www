import type { CollectionEntry } from "astro:content";
import type { RSSOptions } from "@astrojs/rss";
import { siteConfig } from "@/site.config";

type Post = CollectionEntry<"post">;

export type FeedPost = Pick<Post, "id"> & {
	data: Pick<Post["data"], "title" | "description" | "publishDate" | "tags">;
};

export function rssFeed(posts: FeedPost[], site: string): RSSOptions {
	const self = new URL("rss.xml", site).href;
	return {
		title: siteConfig.title,
		description: siteConfig.description,
		site,
		xmlns: { atom: "http://www.w3.org/2005/Atom" },
		customData: `<language>${siteConfig.lang.toLowerCase()}</language><atom:link href="${self}" rel="self" type="application/rss+xml"/>`,
		items: posts.map((post) => ({
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.publishDate,
			link: `blog/${post.id}/`,
			categories: post.data.tags,
		})),
	};
}
