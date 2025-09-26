## Copilot Task Checklist: yaml-guard UI Integration

- [x] Clarify Project Requirements
  - Web UI (React + TypeScript + Vite) for: upload/edit YAML, validate against policies, view/list policies.
- [x] Scaffold the Project
  - Added `ui/` directory with Vite-style React TS structure and supporting configs.
- [ ] Customize the Project
  - Pending: verify backend endpoint aliasing (/v1 vs /api) & update README root.
- [ ] Install Required Extensions
  - None mandated yet.
- [ ] Compile the Project
  - Run `npm install` then `npm run build` inside `ui/`.
- [ ] Create and Run Task
  - Optionally add VS Code task for `npm run dev` in `ui/`.
- [ ] Launch the Project
  - Start dev server (`npm run dev`).
- [ ] Ensure Documentation is Complete
  - Update root README with UI section after endpoint confirmation.

Notes:
1. Mock fallback included when backend unreachable.
2. Backend endpoints currently under `/v1/*`; UI base URL should be set to `http://localhost:8000/v1`.
