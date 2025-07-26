import type { Config } from "tailwindcss";

export default {
	content: ["./src/**/*.{astro,html,js,jsx,md,svelte,ts,tsx,vue}"],
	plugins: [
		require("@tailwindcss/typography"),
	],
} satisfies Config;
