# BrainVerge

BrainVerge is a local-first personal growth tracker for skills, projects, studies, ideas, and long-term ambitions. It uses a plant-growth model to show what is thriving, what needs attention, and what has been archived.

## Stack

- Frontend: React, TypeScript, TailwindCSS, Vite
- Backend: Python local HTTP API, SQLite
- Storage: local SQLite database plus local uploaded files

## Run Locally

```bash
npm run install:all
npm run dev
```

Then open:

- Web app: http://127.0.0.1:5173
- API docs: http://127.0.0.1:8000/docs

The backend creates `backend/data/brainverge.db` and `backend/uploads/` automatically. The first run seeds a few sample growth items so the dashboard has meaningful data.
