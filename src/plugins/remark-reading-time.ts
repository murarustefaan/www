import type { Nodes, Root } from "mdast";
import { toString as mdastToString } from "mdast-util-to-string";
import getReadingTime from "reading-time";
import type { Transformer } from "unified";

const blocks = new Set(["paragraph", "heading", "code", "html", "tableCell", "leafDirective"]);

function blockText(node: Nodes): string[] {
	if (blocks.has(node.type)) return [mdastToString(node)];
	return "children" in node ? node.children.flatMap(blockText) : [];
}

export function remarkReadingTime(): Transformer<Root> {
	return (tree, { data }) => {
		const { text, words } = getReadingTime(blockText(tree).join("\n"));
		data.astro ??= {};
		data.astro.frontmatter ??= {};
		data.astro.frontmatter.readingTime = text;
		data.astro.frontmatter.wordCount = words;
	};
}
