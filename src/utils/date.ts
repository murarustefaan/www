import type { CollectionEntry } from "astro:content";
import { siteConfig } from "@/site.config";

export function getFormattedDate(
	date: Date | undefined,
	options?: Intl.DateTimeFormatOptions,
): string {
	if (date === undefined) {
		return "Invalid Date";
	}

	return new Intl.DateTimeFormat(siteConfig.date.locale, {
		...(siteConfig.date.options as Intl.DateTimeFormatOptions),
		...options,
	}).format(date);
}

export function collectionDateSort(
	a: CollectionEntry<"post" | "note">,
	b: CollectionEntry<"post" | "note">,
) {
	return b.data.publishDate.getTime() - a.data.publishDate.getTime();
}

export function numberOfWorkingYears() {
	const start = new Date("04.1.2016");
	const end = new Date();

	const years = end.getFullYear() - start.getFullYear();
	const months = end.getMonth() - start.getMonth();
	const days = end.getDate() - start.getDate();

	return years + (months > 0 || (months === 0 && days >= 0) ? 1 : 0);
}
