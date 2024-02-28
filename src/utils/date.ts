import { siteConfig } from "@/site-config";

const dateFormat = new Intl.DateTimeFormat(siteConfig.date.locale, siteConfig.date.options);

export function getFormattedDate(
	date: string | number | Date,
	options?: Intl.DateTimeFormatOptions,
) {
	if (typeof options !== "undefined") {
		return new Date(date).toLocaleDateString(siteConfig.date.locale, {
			...(siteConfig.date.options as Intl.DateTimeFormatOptions),
			...options,
		});
	}

	return dateFormat.format(new Date(date));
}

export function numberOfWorkingYears() {
	const start = new Date("04.1.2016");
	const end = new Date();

	const years = end.getFullYear() - start.getFullYear();
	const months = end.getMonth() - start.getMonth();
	const days = end.getDate() - start.getDate();

	return years + (months > 0 || (months === 0 && days >= 0) ? 1 : 0);
}
