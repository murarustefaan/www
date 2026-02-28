import type { Config } from "tailwindcss";

export default {
	plugins: [require("@tailwindcss/typography")],
	theme: {
		extend: {
			typography: () => ({
				DEFAULT: {
					css: {
						a: {
							color: "var(--color-primary)",
							textUnderlineOffset: "2px",
							"&:hover": {
								color: "var(--color-accent)",
								textDecorationThickness: "2px",
							},
						},
						blockquote: {
							borderLeftColor: "var(--color-primary)",
							backgroundColor: "var(--color-card)",
							padding: "1rem",
							borderRadius: "0 0.375rem 0.375rem 0",
						},
						code: {
							backgroundColor: "var(--color-card)",
							border: "1px solid var(--color-border)",
							borderRadius: "4px",
							padding: "0.125rem 0.25rem",
						},
						hr: {
							borderColor: "var(--color-border)",
						},
						strong: {
							fontWeight: "700",
							color: "var(--color-text)",
						},
						sup: {
							marginInlineStart: "calc(var(--spacing) * 0.5)",
							a: {
								"&:after": {
									content: "']'",
								},
								"&:before": {
									content: "'['",
								},
								"&:hover": {
									color: "var(--color-accent)",
								},
							},
						},
						"tbody tr": {
							borderBottomColor: "var(--color-border)",
						},
						tfoot: {
							borderTop: "1px solid var(--color-border)",
						},
						thead: {
							borderBottomWidth: "none",
						},
						"thead th": {
							borderBottom: "1px solid var(--color-border)",
							fontWeight: "700",
							color: "var(--color-text)",
						},
						'th[align="center"], td[align="center"]': {
							"text-align": "center",
						},
						'th[align="right"], td[align="right"]': {
							"text-align": "right",
						},
						'th[align="left"], td[align="left"]': {
							"text-align": "left",
						},
						"img": {
							borderRadius: "0.5rem",
							border: "1px solid var(--color-border)",
						},
						".expressive-code, .admonition, .github-card": {
							marginTop: "calc(var(--spacing)*4)",
							marginBottom: "calc(var(--spacing)*4)",
						},
					},
				},
				sm: {
					css: {
						code: {
							fontSize: "var(--text-sm)",
							fontWeight: "400",
						},
					},
				},
			}),
		},
	},
} satisfies Config;
