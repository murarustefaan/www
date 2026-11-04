import rss from "@astrojs/rss";
import { getAllPosts } from "@/data/post";
import { rssFeed } from "@/utils/rss";

export const GET = async () => {
	const posts = await getAllPosts();
	return rss(rssFeed(posts, import.meta.env.SITE));
};
