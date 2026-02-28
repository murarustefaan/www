import { Resvg } from "@resvg/resvg-js";
import type { APIContext, InferGetStaticPropsType } from "astro";
import satori, { type SatoriOptions } from "satori";
import { html } from "satori-html";
import JetBrainsMonoBold from "@/assets/jetbrains-mono-700.ttf";
import JetBrainsMono from "@/assets/jetbrains-mono-regular.ttf";
import { getAllPosts } from "@/data/post";
import { siteConfig } from "@/site.config";
import { getFormattedDate } from "@/utils/date";

const ogOptions: SatoriOptions = {
	fonts: [
		{
			data: Buffer.from(JetBrainsMono),
			name: "JetBrains Mono",
			style: "normal",
			weight: 400,
		},
		{
			data: Buffer.from(JetBrainsMonoBold),
			name: "JetBrains Mono",
			style: "normal",
			weight: 700,
		},
	],
	height: 630,
	width: 1200,
};

const markup = (title: string, pubDate: string) =>
	html`<div tw="flex flex-col w-full h-full bg-[#0d1117] text-[#c9d1d9]">
		<div tw="flex flex-col flex-1 w-full p-10 justify-center">
			<p tw="text-2xl mb-6 text-[#8b949e]">${pubDate}</p>
			<h1 tw="text-6xl font-bold leading-snug text-[#c9d1d9]">${title}</h1>
		</div>
		<div tw="flex items-center justify-between w-full p-10 border-t border-[#00d4aa] text-xl">
			<div tw="flex items-center">
				<p tw="text-[#00d4aa] font-semibold text-2xl">~/stefan</p>
				<p tw="ml-6 text-[#8b949e]">${siteConfig.title}</p>
			</div>
			<p tw="text-[#58a6ff]">by ${siteConfig.author}</p>
		</div>
	</div>`;

type Props = InferGetStaticPropsType<typeof getStaticPaths>;

export async function GET(context: APIContext) {
	const { pubDate, title } = context.props as Props;

	const postDate = getFormattedDate(pubDate, {
		month: "long",
		weekday: "long",
	});
	const svg = await satori(markup(title, postDate), ogOptions);
	const pngBuffer = new Resvg(svg).render().asPng();
	const png = new Uint8Array(pngBuffer);
	return new Response(png, {
		headers: {
			"Cache-Control": "public, max-age=31536000, immutable",
			"Content-Type": "image/png",
		},
	});
}

export async function getStaticPaths() {
	const posts = await getAllPosts();
	return posts
		.filter(({ data }) => !data.ogImage)
		.map((post) => ({
			params: { slug: post.id },
			props: {
				pubDate: post.data.updatedDate ?? post.data.publishDate,
				title: post.data.title,
			},
		}));
}
