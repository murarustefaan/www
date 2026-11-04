# Project: stefanmuraru.com

Personal blog and portfolio built with Astro 5, Tailwind CSS 4, and TypeScript.

## Tech Stack

- **Framework:** Astro 5.x (static site generation)
- **Styling:** Tailwind CSS 4.2 with `@theme` directive + custom `@utility prose`
- **Language:** TypeScript
- **Package Manager:** pnpm
- **Linting:** Biome + Prettier
- **Content:** Markdown/MDX via Astro Content Collections

## Project Structure

```
src/
├── components/          # Astro UI components
│   ├── layout/          # Header, Footer
│   ├── home/            # Home page hero
│   └── blog/            # Blog-specific (TOC, Masthead)
├── content/             # Markdown/MDX content (posts, tags)
├── data/                # Data helpers (post.ts)
├── layouts/             # Page layouts (Base, BlogPost)
├── pages/               # Astro pages/routes
├── plugins/             # Remark plugins (admonitions, reading-time, github-card)
├── scripts/hero/        # three.js day/night scene, loaded lazily by home/Hero.astro
├── styles/              # Global CSS and component styles
│   ├── global.css       # Design tokens + prose utility
│   └── components/      # Component-specific CSS (admonition, github-card)
├── utils/               # Utility functions
└── assets/              # JetBrains Mono TTFs for OG images; hero/ holds the .glb models and AVIF stills (imported with ?url so they get hashed names)
public/                  # Static assets (favicon, social card, images)
```

## Figma MCP Integration Rules

These rules define how to translate Figma inputs into code for this project and must be followed for every Figma-driven change.

### Required Flow (do not skip)

1. Run `get_design_context` first to fetch the structured representation for the exact node(s)
2. If the response is too large or truncated, run `get_metadata` to get the high-level node map, then re-fetch only the required node(s) with `get_design_context`
3. Run `get_screenshot` for a visual reference of the node variant being implemented
4. Only after you have both `get_design_context` and `get_screenshot`, download any assets needed and start implementation
5. Translate the output (usually React + Tailwind) into Astro components with this project's conventions
6. Validate against Figma for 1:1 look and behavior before marking complete

### Design Tokens

All colors are defined via Tailwind 4's `@theme` in `src/styles/global.css`. Light values are the default; dark values override them under `@media (prefers-color-scheme: dark)`. The palette comes from Romanian embroidery: linen, black thread and crimson thread.

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-bg` | `#eeede8` | `#1d1c1b` | Page background (linen) |
| `--color-text` | `#1c1b1a` | `#ece8df` | Primary text and links (thread) |
| `--color-card` | `#e6e4dd` | `#262523` | Card/surface backgrounds |
| `--color-border` | `#cfccc4` | `#353330` | Borders and dividers |
| `--color-primary` | `#ab1d2e` | `#e8687a` | Crimson text: role line, link hover, current page |
| `--color-accent` | `#ab1d2e` | `#e8687a` | Hover states, highlights (same crimson as primary) |
| `--color-mark` | `#ab1d2e` | `#d4475a` | Non-text marks only: focus ring, wordmark x, selection |
| `--color-muted` | `#5c5953` | `#9d988e` | Secondary/muted text |
| `--color-secondary` | `#e2e0d8` | `#2c2b28` | Secondary backgrounds |
| `--color-destructive` | `#b42318` | `#f85149` | Error/destructive states |
| `--color-warn` | `#8a4b08` | `#ffa657` | Warning states |

- IMPORTANT: Never hardcode hex colors — always use Tailwind classes referencing these tokens (e.g., `text-primary`, `bg-card`, `border-border`)
- The palette follows `prefers-color-scheme`; there is no in-page theme switch
- Night crimson `#d4475a` fails text contrast (3.93:1); use it only through `--color-mark`

### Typography

- **Body font:** Hanken Grotesk (`font-sans`, self-hosted via `@fontsource-variable/hanken-grotesk`)
- **Heading/mono font:** Martian Mono (`font-mono`, self-hosted via `@fontsource-variable/martian-mono`, `wdth` and `wght` axes)
- JetBrains Mono TTFs in `src/assets/` are only for OG image generation
- Headings (h1–h3) use the mono font, defined in the base layer
- Type tokens in `@theme`: `text-name`, `text-section`, `text-lede`, `text-title`, `text-meta` (13px/1.45, for all mono text at 14px or below, weight 400)
- Links use the `link` utility: thread colour, 1px underline at 35% opacity, crimson on hover, 44px touch target
- Prose content uses the custom `@utility prose` defined in `global.css`

### Component Rules

- IMPORTANT: All UI components are `.astro` files — do NOT create React/Vue/Svelte components unless there's a specific need for client-side interactivity
- Components go in `src/components/`, organized by domain:
  - `src/components/layout/` — structural components (Header, Footer)
  - `src/components/home/` — home page components (Hero)
  - `src/components/blog/` — blog-specific components (TOC, Masthead)
  - `src/components/` — shared components (BaseHead, Paginator, SocialList, etc.)
- Layouts go in `src/layouts/` (Base.astro, BlogPost.astro)
- Pages go in `src/pages/`

### Styling Rules

- Use Tailwind utility classes for all styling
- Custom component styles go in `src/styles/components/` as separate CSS files, imported via `@import` in `global.css`'s `@layer components`
- The custom `prose` utility in `global.css` handles all markdown/blog content styling — extend it there, not inline
- Tailwind typography plugin is configured in `tailwind.config.ts` with project-specific overrides
- Responsive design uses Tailwind's default breakpoints

### Asset Handling

- Static assets (favicon, social images) go in `public/`
- Content images go alongside their markdown files in `src/content/post/<slug>/`
- Font files for OG image generation are in `src/assets/`
- IMPORTANT: If the Figma MCP server returns a localhost source for an image or SVG, use that source directly
- IMPORTANT: DO NOT import/add new icon packages — all assets should come from the Figma payload or `public/`
- IMPORTANT: DO NOT use or create placeholders if a localhost source is provided

### Implementation Notes

- Astro uses frontmatter (`---`) blocks for component logic/imports
- Props are typed via TypeScript interfaces in the frontmatter
- Path alias `@/` maps to `src/` (e.g., `import { siteConfig } from "@/site.config"`)
- Site configuration lives in `src/site.config.ts`
- Content schema is defined in `src/content.config.ts`

## Commands

- `pnpm dev` — Start dev server
- `pnpm build` — Build for production
- `pnpm lint` — Lint with Biome
- `pnpm format` — Format with Biome + Prettier
- `pnpm check` — Astro type checking
- `pnpm test` — Vitest unit tests (`src/**/*.test.ts`)
