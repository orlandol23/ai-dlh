# Fonts

The AI-DLH codebase inherits the browser-default font stack — no custom font files ship with it.

For design work we standardize on two Google Fonts (imported via CDN in `colors_and_type.css`):

- **Inter** — all UI text
- **JetBrains Mono** — inline code and monospace blocks

If the brand later adopts a proprietary font, drop the `.woff2` files here and update `--font-sans` / `--font-mono` in `colors_and_type.css`.
