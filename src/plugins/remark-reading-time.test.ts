import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import { describe, expect, it } from "vitest";
import { remarkReadingTime } from "./remark-reading-time";

async function frontmatter(markdown: string) {
	const processor = await createMarkdownProcessor({
		remarkPlugins: [remarkReadingTime],
		syntaxHighlight: false,
	});
	const { metadata } = await processor.render(markdown);
	return metadata.frontmatter;
}

describe("remarkReadingTime", () => {
	it("sets wordCount to the number of words", async () => {
		const words = Array.from({ length: 450 }, (_, i) => `word${i}`).join(" ");
		expect(await frontmatter(words)).toMatchObject({ wordCount: 450, readingTime: "3 min read" });
	});

	it("counts words on both sides of a block boundary", async () => {
		const markdown = "## Heading here\n\nFirst paragraph.\n\n- one item\n- two items\n\n> A quote.";
		expect(await frontmatter(markdown)).toMatchObject({ wordCount: 10 });
	});

	it("counts code blocks and table cells", async () => {
		const markdown =
			"Run this:\n\n```sh\nkubectl get pods\n```\n\n| Node | Role |\n| --- | --- |\n| pi | worker |";
		expect(await frontmatter(markdown)).toMatchObject({ wordCount: 9 });
	});
});
