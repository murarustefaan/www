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
│   └── blog/            # Blog-specific (TOC, Masthead)
├── content/             # Markdown/MDX content (posts, tags)
├── data/                # Data helpers (post.ts)
├── layouts/             # Page layouts (Base, BlogPost)
├── pages/               # Astro pages/routes
├── plugins/             # Remark plugins (admonitions, reading-time, github-card)
├── styles/              # Global CSS and component styles
│   ├── global.css       # Design tokens + prose utility
│   └── components/      # Component-specific CSS (admonition, github-card)
├── utils/               # Utility functions
└── assets/              # Fonts (JetBrains Mono TTF for OG images)
public/                  # Static assets (favicon, images)
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

All colors are defined via Tailwind 4's `@theme` in `src/styles/global.css`:

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#0d1117` | Page background |
| `--color-text` | `#c9d1d9` | Primary text |
| `--color-card` | `#161b22` | Card/surface backgrounds |
| `--color-border` | `#30363d` | Borders and dividers |
| `--color-primary` | `#58a6ff` | Links, accents, interactive elements |
| `--color-accent` | `#00d4aa` | Hover states, highlights |
| `--color-muted` | `#8b949e` | Secondary/muted text |
| `--color-secondary` | `#21262d` | Secondary backgrounds |
| `--color-destructive` | `#f85149` | Error/destructive states |
| `--color-warn` | `#ffa657` | Warning states |

- IMPORTANT: Never hardcode hex colors — always use Tailwind classes referencing these tokens (e.g., `text-primary`, `bg-card`, `border-border`)
- This is a **dark-only** theme — no light mode variants exist

### Typography

- **Body font:** Inter (via Google Fonts)
- **Heading/code font:** JetBrains Mono (via Google Fonts + local TTF for OG images)
- Headings (h1–h3) use `font-family: "JetBrains Mono"` defined in base layer
- Prose content uses the custom `@utility prose` defined in `global.css`

### Component Rules

- IMPORTANT: All UI components are `.astro` files — do NOT create React/Vue/Svelte components unless there's a specific need for client-side interactivity
- Components go in `src/components/`, organized by domain:
  - `src/components/layout/` — structural components (Header, Footer)
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
