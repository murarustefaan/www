import type { APIContext, InferGetStaticPropsType } from "astro";
import { html } from "satori-html";
import { getAllPosts } from "@/data/post";
import { siteConfig } from "@/site.config";
import { getFormattedDate } from "@/utils/date";
import { ogColors, pngResponse } from "@/utils/og";

const markup = (title: string, pubDate: string) =>
	html`<div tw="flex flex-col w-full h-full bg-[${ogColors.bg}] text-[${ogColors.text}]">
		<div tw="flex flex-col flex-1 w-full px-16 justify-center">
			<p tw="m-0 mb-[46px] text-2xl text-[${ogColors.muted}]">${pubDate}</p>
			<h1 tw="m-0 text-6xl font-normal leading-snug">${title}</h1>
		</div>
		<div tw="flex items-center justify-between w-full px-16 py-10 border-t-2 border-[${ogColors.mark}] text-2xl">
			<p tw="flex"><span tw="text-[${ogColors.mark}] mr-4">x</span>${siteConfig.author.toLowerCase()}</p>
			<p tw="text-[${ogColors.muted}]">stefanmuraru.com</p>
		</div>
	</div>`;

type Props = InferGetStaticPropsType<typeof getStaticPaths>;

export async function GET(context: APIContext) {
	const { publishDate, title } = context.props as Props;

	const postDate = getFormattedDate(publishDate, {
		month: "long",
		weekday: "long",
	});
	return pngResponse(markup(title, postDate));
}

export async function getStaticPaths() {
	const posts = await getAllPosts();
	return posts
		.filter(({ data }) => !data.ogImage)
		.map((post) => ({
			params: { slug: post.id },
			props: {
				publishDate: post.data.publishDate,
				title: post.data.title,
			},
		}));
}
