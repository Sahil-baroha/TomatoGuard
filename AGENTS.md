# AGENTS.md — TomatoGuard AI

You are building TomatoGuard AI, a tomato crop health monitoring and decision support system. Read this file completely before touching any code, and re-read it if a session restarts.

## Required reading, in order, before any phase

1. `docs/TomatoGuard_Database_Specification.pdf`
2. `docs/TomatoGuard_Backend_Specification.pdf`
3. `docs/TomatoGuard_Frontend_Specification.pdf`
4. `docs/TomatoGuard_Execution_Playbook.md` — this tells you which phase you're on and what "done" means for it.

These four documents are the source of truth. If anything in a prompt to you conflicts with them, the documents win — ask before overriding one, don't silently pick the prompt's version.

## Repository structure

This repo (`TomatoGuard`) is the monorepo. It is NOT the same repo as the frontend — the frontend originates from a teammate's separate repo (`agri-smart`) and gets cloned into `frontend/` here as its own subtree, not a submodule.

```
TomatoGuard/
├── frontend/        (cloned from agri-smart, then modified in place)
├── backend/
├── database/        schema.sql — the migration script
└── docs/            the four documents above
```

## Hard rules — never violate these regardless of what a prompt asks

- **Never fabricate data.** If a service isn't connected yet or a query returns nothing, show/return an explicit empty state. Never invent a plausible-looking number, label, or record.
- **Never invent an endpoint, table, or column** not listed in the Database or Backend spec. If something seems missing, stop and ask rather than guessing a name.
- **Never commit secrets.** Cloudinary keys, the JWT secret, database URLs, admin bot credentials — all environment variables, referenced by name in `.env.example` with blank values, never hardcoded or committed with real values.
- **Farmer JWTs and admin JWTs are never interchangeable.** Every farmer route must reject an admin token and vice versa (checked via the `aud` claim). Treat any bug here as critical, not minor.
- **The frontend never talks to Cloudinary or Neon directly.** Every image upload and every database read/write goes through the FastAPI backend.
- **One farm per farmer in v1.** Don't build multi-farm UI or logic even if it seems like a small addition — it's explicitly deferred.

## Phase discipline (this is the most important section)

Work one phase of the Execution Playbook at a time. At the end of each phase:

1. Run whatever verification the playbook's checkpoint for that phase asks for.
2. Report the actual output (query results, curl responses, screenshots) — not just "it works."
3. **Stop and wait for explicit confirmation before starting the next phase**, even if auto-continue is enabled. Phase boundaries in the playbook are deliberate checkpoints, not suggestions — do not chain multiple phases into one uninterrupted run.

If you hit a decision the playbook and specs don't cover, stop and ask rather than picking an assumption and continuing. A wrong assumption compounds across every later phase that depends on it — this has already happened once in this project (a schema/scope mismatch that took a full audit to untangle), and the whole point of this rules file is to not repeat that.

## Database access

You have direct CRUD access to the real Neon project for this application. Treat this as production, not a scratch database — no `DROP TABLE`, no destructive migration without showing the exact SQL first and getting confirmation, no seeding fake farmer accounts or test data into tables that a demo/evaluation might read from. Use a clearly-named test account (e.g. `test-farmer@...`) for your own verification, and mention it so it can be cleaned up before submission.

## Coding conventions

- Backend: FastAPI, SQLAlchemy, Pydantic schemas separate from ORM models, one router file per domain, one service file per external integration (Cloudinary, OCR, weather, model inference).
- Every backend response schema must match the Backend spec's field names exactly — don't rename for "clarity," downstream code and the frontend depend on exact matches.
- Frontend: preserve the existing pattern already in the cloned repo — every `*_API_URL` env var gated, explicit "service not connected" UI state when unset. Don't remove this pattern anywhere, including in new pages you add.
- Python: bcrypt pinned to `4.0.1` in requirements.txt (newer versions break passlib 1.7.4 — this already caused one bug, don't reintroduce it).

## When you're unsure whether something is in v1 scope

Check the "V1 active tables vs. deferred tables" table in the Database spec and the "v1 page/route decisions" table in the Frontend spec. If a feature isn't listed as active, don't build it, even if the database schema already has a table for it sitting there unused.
