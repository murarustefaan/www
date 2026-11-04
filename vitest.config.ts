import { getViteConfig } from "astro/config";
import type {} from "vitest/config";

export default getViteConfig({
	test: {
		include: ["src/**/*.test.ts"],
	},
});
