# yaml-guard UI

Web-based interface for the yaml-guard policy validation tool.

## Features
- Upload or paste YAML content
- Validate against backend policies
- Browse and view policy files
- Fallback mock mode if backend is unreachable

## Expected Backend Endpoints (Server currently exposes under /v1)
```
GET /v1/policies -> { policies: [{ group, file, rules }] }
GET /v1/policies/{group}/{file} -> { group, file, content }
POST /v1/validate { files:[{path,content}], rules? } -> { ok, findings: [...]}  
```

UI maps these to a simplified internal contract (see `src/api/client.ts`).

## Quick Start
```bash
cd ui
npm install
npm run dev
```
Open the shown local URL (likely http://localhost:5173) in your browser.

If the backend is not running, the UI will display mock data automatically after an initial failed probe.

## Environment
Copy `.env.example` to `.env.local` and adjust:
```
VITE_API_BASE_URL=http://localhost:8000/v1
```

## Scripts
- `npm run dev` – start dev server
- `npm run build` – type-check then build
- `npm run preview` – preview production build
- `npm run lint` – lint sources
- `npm run type-check` – TypeScript type check only
- `npm run format` – Prettier write

## Type Definitions
See `src/types.ts` for API contract shapes consumed by the UI.

## Accessibility & Theming
- Uses semantic elements, aria-labels where needed
- Dark mode via `prefers-color-scheme`

## Mock Mode
If `GET /v1/policies` network request fails, the UI switches to a built-in mock provider so users can explore the interface without a running backend.
