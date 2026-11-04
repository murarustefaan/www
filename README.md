# stefanmuraru.com

Personal website and blog of Ștefan Muraru, built with [Astro](https://astro.build).

## Stack

- **Framework** — [Astro 7](https://astro.build) (SSG, zero client JS where possible)
- **Styling** — [Tailwind CSS 4](https://tailwindcss.com)
- **Typography** — Martian Mono (headings, code) · Hanken Grotesk (body)
- **Content** — Markdown & [MDX](https://mdxjs.com) via Astro Content Collections
- **Code blocks** — [Expressive Code](https://expressive-code.com)
- **Deployment** — Docker (nginx) / any static host

## Pages

| Route | Description |
| :--- | :--- |
| `/` | Home: intro, 3D desk scene, recent posts |
| `/resume` | Career timeline with expandable details |
| `/blog` | Blog listing |
| `/blog/[slug]` | Individual post |

## Development

```bash
pnpm install
pnpm dev        # localhost:4321
pnpm build      # static output → ./dist/
pnpm preview    # preview the build
```

## Linting & Formatting

```bash
pnpm lint       # biome lint
pnpm format     # biome + prettier
pnpm check      # astro type checking
```

## Docker

```bash
docker build -t www .
docker run -p 8080:8080 www
```

## License

MIT
