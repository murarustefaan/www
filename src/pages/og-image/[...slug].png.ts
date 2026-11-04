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
	html`<div tw="flex flex-col w-full h-full bg-[#eeede8] text-[#1c1b1a]">
		<div tw="flex flex-col flex-1 w-full px-16 justify-center">
			<p tw="m-0 mb-[46px] text-2xl text-[#5c5953]">${pubDate}</p>
			<h1 tw="m-0 text-6xl font-normal leading-snug">${title}</h1>
		</div>
		<div tw="flex items-center justify-between w-full px-16 py-10 border-t-2 border-[#ab1d2e] text-2xl">
			<p tw="flex"><span tw="text-[#ab1d2e] mr-4">x</span>${siteConfig.author.toLowerCase()}</p>
			<p tw="text-[#5c5953]">stefanmuraru.com</p>
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
