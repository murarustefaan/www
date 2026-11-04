import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import Home from "@/pages/index.astro";
import Resume from "@/pages/resume.astro";
import { personId, resumeKnowsAbout } from "./person";

async function profilePageOf(page: Parameters<AstroContainer["renderToString"]>[0], path: string) {
	const container = await AstroContainer.create({ astroConfig: { site: "https://stefanmuraru.com" } });
	const html = await container.renderToString(page, { request: new Request(`https://stefanmuraru.com${path}`) });
	const schemas = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(
		([, json]) => JSON.parse(json ?? "{}"),
	);
	return schemas.find((schema) => schema["@type"] === "ProfilePage");
}

describe("person JSON-LD", () => {
	it("uses the same @id on the home page and the resume", async () => {
		const home = await profilePageOf(Home, "/");
		const resume = await profilePageOf(Resume, "/resume/");

		expect(home.mainEntity["@id"]).toBe(personId);
		expect(resume.mainEntity["@id"]).toBe(personId);
		expect(personId).toBe("https://stefanmuraru.com/#person");
	});

	it("lists the full knowsAbout on the resume only", async () => {
		const home = await profilePageOf(Home, "/");
		const resume = await profilePageOf(Resume, "/resume/");

		expect(resume.mainEntity.knowsAbout).toEqual(resumeKnowsAbout);
		expect(home.mainEntity.knowsAbout.length).toBeLessThan(resumeKnowsAbout.length);
		expect(resume.mainEntity.jobTitle).toBe("Team Lead");
	});
});
