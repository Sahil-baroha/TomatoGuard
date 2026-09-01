# TomatoGuard AI — Execution Playbook

This is not a spec document — the three spec PDFs (`TomatoGuard_Database_Specification.pdf`, `TomatoGuard_Backend_Specification.pdf`, `TomatoGuard_Frontend_Specification.pdf`) are the specs. This file is the **sequence of prompts you paste into your coding agent**, one phase at a time, so it builds against those specs instead of guessing.

Written for Antigravity, but the prompts themselves are tool-agnostic — they'd work in Claude Code or any other agentic IDE too.

## Before you start

1. In your repo (`https://github.com/Sahil-baroha/TomatoGuard.git`), create a `docs/` folder and put all three spec PDFs into it, plus this playbook, plus `AGENTS.md` at the repo root (not inside `docs/`) — that's the location Antigravity actually reads rules from.
2. You've confirmed Antigravity can already do CRUD against your Neon project — good, the Phase DB prompt below assumes that access is live. If it stops working partway through, don't let the agent guess around it; have it stop and tell you.
3. Get your Cloudinary credentials (cloud name, API key, API secret) from your Cloudinary dashboard before Phase 3 — you'll paste them as environment variables, never into code.
4. **Rule for every phase below: tell the agent to stop and show you its work at the checkpoint before you paste the next phase's prompt.** AGENTS.md already tells it this explicitly (Antigravity's auto-continue can otherwise chain phases together unattended), but repeating it in your own message at each handoff doesn't hurt.

---

## Phase 0 — Repo setup

```
Read AGENTS.md first if you haven't already — it governs everything below.

Read docs/TomatoGuard_Database_Specification.pdf, docs/TomatoGuard_Backend_Specification.pdf,
and docs/TomatoGuard_Frontend_Specification.pdf in full before doing anything else.

Task: set up the monorepo structure in this repo (TomatoGuard).
1. Clone https://github.com/shahida-ansari/agri-smart.git into a new frontend/ folder
   at the repo root (remove its .git subfolder so it becomes part of this repo, not a submodule).
2. Create backend/ with the folder structure described in the Backend spec's
   "Repo layout" section (app/core, app/models, app/schemas, app/api, app/services).
3. Create backend/requirements.txt exactly as listed in the Backend spec, Phase 0 —
   including the bcrypt==4.0.1 pin, this is not optional, newer bcrypt breaks passlib 1.7.4.
4. Create database/schema.sql — copy the full migration script from the Database spec,
   section 3, verbatim.
5. Do NOT run the migration yet. Do NOT write any application code yet. Stop here and
   show me the folder structure you created.
```

**Checkpoint:** confirm the folder structure matches the spec before continuing.

---

## Phase DB — Run the migration against the real Neon database

```
Use your Neon database access to run database/schema.sql directly against the real
project, then run a query against information_schema.table_constraints to confirm
every table now has a primary key. If your Neon access isn't working for any reason,
stop and tell me — don't fall back to guessing or skipping constraints.

Once the migration is confirmed applied, also run the seed data from the Database
spec section 4 (diseases table) and section 4B (first admin account) — for the
admin account, generate a real bcrypt hash yourself using passlib rather than
asking me for one, and tell me the email you used so I can log in.

Do not proceed to Phase 1 until you've shown me confirmation that the migration
and both seed inserts succeeded.
```

**Checkpoint:** ask the agent to paste back the actual query results proving the migration applied — don't just accept "done."

---

## Phase 1 — Auth + farm auto-creation

```
Read the Backend spec's Phase 1 section and the Database spec sections 2.1 and 2.2.

Build exactly what's specified: JWT signup/login/refresh/me, with signup creating
both a users row and a farms row in a single transaction (one farm per farmer, v1 rule).

Then read the Frontend spec's Phase 1 section and rewire frontend/src/pages/Signup.jsx
and Login.jsx to call these real endpoints, replacing any placeholder/localStorage auth
that exists in the cloned repo. Remove tesseract.js from frontend/package.json now too
(Backend spec, Phase 4 note) — even though we're not building soil yet, this dependency
should not linger.

Show me: the signup and login endpoints working via curl against the real database,
AND the frontend forms working in a browser, before I approve moving to the next phase.
```

**Checkpoint:** sign up a real test account yourself, confirm one `users` row and one `farms` row exist in Neon.

---

## Phase Admin — Admin module (can run in parallel with Phase 2+, but do it now while auth is fresh)

```
Read the Backend spec's "Admin Module" section and the Frontend spec's Section 9 in full.

Build the separate admin auth track exactly as specified — this is security-critical,
pay particular attention to the aud:'admin' vs aud:'farmer' JWT claim check, since a bug
here means a farmer could reach admin routes. Build both get_current_admin() and confirm
get_current_user() now also checks is_active per the callout box in that section.

Build all four admin frontend pages under frontend/src/pages/admin/, mounted at /admin/*,
with their own separate route guard and separate localStorage key as specified.

Test and show me: a farmer JWT gets 403 on any /admin/* backend route, and an admin JWT
gets 403 on any farmer-only route. Both directions, not just one.
```

**Checkpoint:** this is the one phase worth personally re-testing even after the agent says it passed — auth isolation bugs are the kind that don't show up until it's too late.

---

## Phase 2 — Dashboard shell & PWA

```
Read the Backend and Frontend specs' Phase 2 sections.

Build GET /dashboard/summary and wire the Dashboard page to it. Then add the PWA setup:
vite-plugin-pwa, manifest, service worker registration, and the camera-first capture
attribute noted for the (not-yet-built) disease upload input.

Show me a Lighthouse PWA audit result before I approve moving on.
```

**Checkpoint:** install the app on your actual phone, confirm it works as a standalone app icon, not just that Lighthouse is green.

---

## Phase 3 — Disease detection (Cloudinary integration #1)

```
Read the Backend spec's Phase 3 section in full, including the Cloudinary integration
notes at the top of the document.

Set up app/core/cloudinary_client.py with a single upload_image(file_bytes, folder)
function. I'll provide CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET
as environment variables — do not ask me to paste them into any file, add them to
backend/.env.example as blank placeholders only.

Build POST /disease/analyze exactly as specified: validate the upload, upload to
Cloudinary, run the model, look up the disease_id from the diseases table, insert
the disease_scans row with both image_path (secure_url) and image_public_id, return
the result. Build GET /disease/history too.

Wire frontend/src/pages/Disease.jsx to these endpoints per the Frontend spec.

Before declaring this done: upload a real tomato leaf photo through the actual UI,
show me the resulting row in disease_scans, and show me that the image_path URL
actually opens the uploaded image in a browser.
```

**Checkpoint:** click the returned image URL yourself — confirm it's actually your photo, not a broken link.

---

## Phase 4 — Soil health (Cloudinary integration #2, OCR)

```
Read the Backend spec's Phase 4 section in full.

Build the three endpoints (POST /soil/report, POST /soil/report/confirm,
POST /soil/questionnaire) plus GET /soil/latest, exactly as specified — including
the rule-based fallback in soil_analysis.py, since we don't have a confirmed trained
soil model yet. Server-side OCR only (pytesseract) — do not add any client-side OCR
library to the frontend, this was deliberately removed earlier.

Wire frontend/src/pages/Soil.jsx per the Frontend spec, both tabs.

Show me both paths working end to end: a real soil report image producing editable
extracted fields, and the questionnaire path producing a fertility rating with no
nutrient data at all.
```

**Checkpoint:** deliberately test the questionnaire path with no soil report ever uploaded — confirm it doesn't crash on all-null nutrient fields.

---

## Phase 5 — Weather

```
Read the Backend and Frontend specs' Phase 5 sections. Build the OpenWeatherMap
integration exactly as specified, including the rule that only /weather/current
writes to weather_records, never /weather/forecast.

I'll provide OPENWEATHERMAP_API_KEY as an environment variable.

Show me real current weather and a forecast for a test farm with a saved location,
and confirm the clear error state for a farm with no location set.
```

**Checkpoint:** smallest phase, quickest to verify — confirm exactly one new row appears in `weather_records` per current-weather call, not per forecast call.

---

## Phase 6 — Recommendations

```
Read the Backend spec's Phase 6 section. Build GET /recommendations/latest exactly
as specified — computed on request from the latest disease/soil/weather rows, not
persisted to any table, since none exists for this in the real schema.

Wire frontend/src/pages/Recommendations.jsx per the Frontend spec.

Show me it working with all three data types present, AND show me it working with
only two of the three present (confirm it doesn't require all three), AND confirm
it returns 404 gracefully with zero data.
```

**Checkpoint:** this is the core deliverable — spend real time clicking through it yourself, not just accepting a screenshot.

---

## Phase 7 — History, Profile, polish

```
Read the Backend and Frontend specs' Phase 7 sections. Build /history, /profile
(GET + PATCH), and /auth/change-password exactly as specified.

Then do the final polish pass: confirm every page handles its empty/loading/error
states without crashing on a brand-new account, confirm 375px mobile layout holds
on every active page, remove any leftover console.log/debug statements from both
frontend and backend, and run a final Lighthouse audit.

Show me the Lighthouse results and a full click-through of every active page.
```

**Checkpoint:** this is your pre-submission pass — treat it as seriously as the earlier phases, not as an afterthought.

---

## Phase 8 — Government Schemes: scraper + GitHub Action (NEW)

Source confirmed: **myscheme.gov.in**, filtered to Maharashtra + agriculture categories. MahaDBT (the more "obvious" choice) was checked and rejected — its robots.txt explicitly disallows automated access.

```
We're reactivating the government_schemes table, which already exists in the
database but has never had constraints or endpoints built against it.

Step 1 — Database addendum (do this first, confirm before continuing):
Run this against the real Neon database using your database access:

  ALTER TABLE government_schemes ADD CONSTRAINT schemes_pkey PRIMARY KEY (scheme_id);
  ALTER TABLE government_schemes ADD CONSTRAINT schemes_admin_fk
    FOREIGN KEY (created_by) REFERENCES admin(admin_id);
  ALTER TABLE government_schemes ADD CONSTRAINT schemes_link_unique
    UNIQUE (official_link);
  CREATE INDEX idx_schemes_status ON government_schemes(status);

The UNIQUE constraint on official_link is what makes the scraper idempotent —
re-scraping the same scheme updates it instead of duplicating it.

Then seed one admin account to attribute scraped rows to (a real bcrypt hash,
not plaintext):

  INSERT INTO admin (name, email, password_hash)
  VALUES ('Scheme Scraper Bot', 'scraper-bot@tomatoguard.internal', '<bcrypt hash>');

Step 2 — Backend:
Build app/api/admin_schemes.py with:
- GET /schemes (PUBLIC, no auth required — scheme info is public content) —
  returns all rows where status='ACTIVE', ordered by start_date descending.
- POST /admin/schemes/sync (admin-authenticated, aud:'admin' required) — accepts
  an array of scheme objects, upserts each by official_link (INSERT ... ON CONFLICT
  (official_link) DO UPDATE), using the Scheme Scraper Bot's admin_id as created_by
  for rows it creates. Return a count of created vs updated rows.
- POST /admin/schemes and PATCH /admin/schemes/{scheme_id} (admin-authenticated) —
  for manual entry/editing by a human admin, same pattern as the diseases endpoints
  in the Backend spec.

Step 3 — Scraper script:
Create backend/scripts/scrape_schemes.py — a standalone Python script (not part of
the FastAPI app) targeting myscheme.gov.in, filtered to Maharashtra + agriculture-
related categories (https://www.myscheme.gov.in/search/state/Maharashtra).

IMPORTANT — check this before writing any HTML-parsing code: myscheme.gov.in is a
Next.js site that renders scheme data client-side via JavaScript, so the raw HTML
will NOT contain the scheme listings. First, inspect the site's network requests
(open it in a browser, check the Network tab, or use Playwright's request
interception) to find its underlying JSON API endpoint — Next.js government sites
like this one usually expose one (often under /api/ or as Next.js's own data-fetching
routes). Build the scraper against that JSON API if you find it — it will be far more
reliable than HTML parsing. Only fall back to full headless-browser scraping
(Playwright, not requests+BeautifulSoup) if no API is discoverable.

The script should:
1. Fetch scheme data for Maharashtra, filtered to agriculture/farmer-relevant
   categories.
2. Respect robots.txt — check it programmatically before scraping, abort with a
   clear error if disallowed. (Already confirmed not disallowed as of this writing,
   but check again at build time — it can change.)
3. Extract: scheme_name, description, eligibility, benefits, application_process,
   official_link, start_date/end_date if available.
4. Logs into POST /admin/login using ADMIN_BOT_EMAIL / ADMIN_BOT_PASSWORD
   (read from environment, never hardcoded) to get an admin access token.
5. POSTs the extracted list to POST /admin/schemes/sync with that token.
6. Prints a summary (schemes found, created, updated, any errors) and exits
   non-zero on failure so the GitHub Action can detect it.

Step 4 — GitHub Action:
Create .github/workflows/scrape-schemes.yml:
- Trigger: scheduled (weekly — government schemes don't change often enough to
  justify daily scraping, and daily raises more risk of the source site rate-limiting
  or blocking the scraper) AND a manual workflow_dispatch trigger for on-demand runs.
- If the scraper ended up needing Playwright (headless browser), make sure the
  workflow installs Playwright's browser binaries (playwright install --with-deps)
  before running — this is a common CI failure point people forget.
- Installs Python + backend/requirements.txt.
- Runs scrape_schemes.py with ADMIN_BOT_EMAIL, ADMIN_BOT_PASSWORD, and the backend's
  deployed URL as GitHub Actions secrets — never committed to the repo.
- Fails the workflow visibly (so you get a GitHub notification) if the script exits
  non-zero.

Step 5 — Frontend:
Re-add the /schemes route to App.jsx (it was previously unrouted, the page file
already exists per the earlier repo audit). Wire it to GET /schemes — public,
no auth check needed for this one page. Re-add its link to the bottom nav or a
relevant menu.

Show me: the migration applied, a manual run of the scraper against the real
source producing real rows in government_schemes, the /schemes page displaying
them, and the GitHub Action workflow file (you don't need to trigger it via
Actions yet, just confirm the yaml is valid).
```

**Checkpoint:** run the scraper manually once and read its actual output before ever letting the scheduled Action run unattended — confirm it's extracting real, correctly-formatted data, not garbage or partial matches. If it ended up using Playwright, also confirm `playwright` and its browser binaries are in `backend/requirements.txt`/the Dockerfile — this is easy to get working locally and then have silently fail in CI because the browser binary step was skipped.

---

## One thing this playbook deliberately does NOT cover

Deploying to Vercel/Render (the free hosting stack from earlier) isn't in these phases — do that as its own pass once Phase 7 is fully working locally, so you're not debugging deployment and feature bugs at the same time.
