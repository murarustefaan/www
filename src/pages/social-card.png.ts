import { html } from "satori-html";
import sharp from "sharp";
import day from "@/assets/hero/day.avif?inline";
import { siteConfig } from "@/site.config";
import { ogColors, pngResponse } from "@/utils/og";

async function figure() {
	const avif = Buffer.from(day.slice(day.indexOf(",") + 1), "base64");
	const png = await sharp(avif).resize(800, 600).png().toBuffer();
	return `data:image/png;base64,${png.toString("base64")}`;
}

export async function GET() {
	const [firstName, lastName] = siteConfig.author.split(" ");
	const [role, place] = siteConfig.role.split(/ (?=in )/);
	const host = new URL(siteConfig.url).host;

	return pngResponse(html`<div tw="flex relative w-full h-full overflow-hidden bg-[${ogColors.bg}] text-[${ogColors.text}]">
		<div tw="absolute left-[72px] top-[150px] flex flex-col w-[520px]">
			<div tw="flex flex-col text-[68px] font-light leading-[1.05] tracking-[-0.02em]">
				<div>${firstName}</div>
				<div>${lastName}</div>
			</div>
			<div tw="flex flex-col mt-[22px] text-[24px] leading-[1.45] text-[${ogColors.mark}]">
				<div>${role}</div>
				<div>${place}</div>
			</div>
		</div>
		<div tw="absolute left-[72px] bottom-[56px] flex text-[20px] text-[${ogColors.muted}]">
			<span tw="mr-[12px] text-[${ogColors.mark}]">x</span>${host}
		</div>
		<img src="${await figure()}" width="800" height="600" tw="absolute right-[-48px] bottom-[-14px]" />
	</div>`);
}
