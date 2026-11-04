import { getRssString } from "@astrojs/rss";
import { describe, expect, it } from "vitest";
import { type FeedPost, rssFeed } from "./rss";

const site = "https://stefanmuraru.com/";

const posts: FeedPost[] = [
	{
		id: "k3s-vs-docker-swarm",
		data: {
			title: "I almost ditched k3s for Docker Swarm (and why I didn't)",
			description: "Why I stayed on k3s.",
			publishDate: new Date("2025-10-26"),
			tags: ["kubernetes", "homelab"],
		},
	},
	{
		id: "proxmox-expanding-storage",
		data: {
			title: "Proxmox cheatsheet: expanding storage",
			description: "Adding a disk to a VM.",
			publishDate: new Date("2023-11-29"),
			tags: [],
		},
	},
];

describe("rssFeed", () => {
	it("links each item to its /blog/ page and tags it", () => {
		expect(rssFeed(posts, site).items).toEqual([
			expect.objectContaining({
				link: "blog/k3s-vs-docker-swarm/",
				categories: ["kubernetes", "homelab"],
			}),
			expect.objectContaining({ link: "blog/proxmox-expanding-storage/", categories: [] }),
		]);
	});

	it("renders absolute /blog/ links and categories", async () => {
		const xml = await getRssString(rssFeed(posts, site));
		expect(xml).toContain("<link>https://stefanmuraru.com/blog/k3s-vs-docker-swarm/</link>");
		expect(xml).toContain(
			'<guid isPermaLink="true">https://stefanmuraru.com/blog/proxmox-expanding-storage/</guid>',
		);
		expect(xml).toContain("<category>kubernetes</category><category>homelab</category>");
		expect(xml).not.toContain("/posts/");
	});

	it("declares the feed language and its own URL", async () => {
		const xml = await getRssString(rssFeed(posts, site));
		expect(xml).toContain('xmlns:atom="http://www.w3.org/2005/Atom"');
		expect(xml).toContain("<language>en-gb</language>");
		expect(xml).toContain(
			'<atom:link href="https://stefanmuraru.com/rss.xml" rel="self" type="application/rss+xml"/>',
		);
	});
});
