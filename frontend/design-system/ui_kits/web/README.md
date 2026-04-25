# AI-DLH Web UI Kit

A pixel-level recreation of the AI-DLH product's three main surfaces — Landing, Dashboard, and Module/Quiz — built as JSX components over the same Tailwind/shadcn token set the production app uses.

## Files

- `index.html` — runnable demo. Routes through Landing → Dashboard → Module → Quiz → Result. Uses `localStorage` to persist the current route across reloads.
- `atoms.jsx` — `Button`, `Card*`, `Badge`, `Input`, `Select`, `Spinner`, `LogoMark`. Lifted verbatim from `_source/components/atoms/`.
- `screens.jsx` — higher-level pieces: `LandingHeader`, `Hero`, `FeatureTile`, `FeaturesGrid`, `HowItWorks`, `AppHeader`, `StatTile`, `GenerateForm`, `ModuleRow`.
- `quiz.jsx` — `ModuleContent`, `Quiz`, `QuizOption`, `ProgressBar`, `QuizResult`.

## How it diverges from production

- Uses Tailwind's CDN build instead of the compiled shadcn setup — classnames are identical.
- Uses literal hex (`bg-[#2463eb]`) where the real app resolves HSL tokens via Tailwind config. Visually identical.
- No tRPC, no MetaMask, no blockchain — all network actions are timeout-based fakes.
