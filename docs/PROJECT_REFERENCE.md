# TomatoGuard AI — Project Reference

Condensed reference for routine phase work. Read this instead of the three spec PDFs for day-to-day coding — it has every table, column, and endpoint contract in compact form. Only go back to the PDFs (`docs/TomatoGuard_*_Specification.pdf`) if something here is ambiguous or you need the *reasoning* behind a decision, not just the fact.

This file is static reference — it does not track phase completion status or cleanup items. Those live in the handoff message at the start of each session.

---

## Stack

React + Vite (PWA) · FastAPI · PostgreSQL (Neon) · JWT (`aud`: `farmer` | `admin`) · Cloudinary (images) · pytesseract + Gemini API (server-side OCR pipeline — Gemini is permanent, not experimental; key = `GEMINI_KEY` env var) · Open-Meteo (weather, no API key or account required) · bcrypt==4.0.1 (pinned, do not change).

## Repo layout

```
frontend/   (agri-smart, extended)      backend/app/
database/schema.sql                       core/    config.py, db.py, security.py, cloudinary_client.py
docs/                                     models/  one file per table
                                           schemas/ one file per domain
                                           api/     one router per domain
                                           services/ disease_model.py, ocr.py, soil_analysis.py, weather_client.py
```

---

## Database schema (v1 active tables)

| Table | Key columns | Notes |
|---|---|---|
| **users** | user_id PK, name, email UNIQUE, password_hash, phone, address, village, district, state, admin_id (unused), is_active bool default true, created_at, updated_at | |
| **admin** | admin_id PK, name, email UNIQUE, password_hash, phone, created_at | No signup endpoint — DB-seeded only |
| **farms** | farm_id PK, user_id FK→users UNIQUE (v1: one farm/user), farm_name, location, area_acres, soil_type, latitude, longitude, created_at | Auto-created at signup |
| **diseases** | disease_id PK, disease_name UNIQUE, description, symptoms, causes, prevention, treatment, created_at, updated_at | Lookup table, admin-managed. Currently NULL content pending real copy |
| **disease_scans** | scan_id PK, user_id FK, farm_id FK, disease_id FK (nullable), image_path (Cloudinary secure_url), image_public_id, predicted_disease, confidence (0-100), severity, model_name default 'EfficientNetB0', model_version, recommendation, scan_date | |
| **soil_reports** | soil_report_id PK, user_id FK, farm_id FK, report_file_path (Cloudinary), report_file_public_id, report_date, uploaded_at | Upload path only |
| **soil_questionnaires** | questionnaire_id PK, user_id FK, farm_id FK, crop_stage, previous_crop, irrigation_type, fertilizer_used, soil_color, drainage_condition, additional_answers jsonb, submitted_at | Q&A path only |
| **soil_analyses** | analysis_id PK, user_id FK, farm_id FK, soil_report_id FK nullable, questionnaire_id FK nullable, ph/nitrogen/phosphorus/potassium/moisture/organic_matter (all nullable numeric), **predicted_soil_condition** (nullable — NOT "fertility_rating", that name does not exist in the DB), confidence nullable, model_name nullable, model_version nullable, fertilizer_recommendation, irrigation_recommendation, analysis_date | Exactly one of soil_report_id/questionnaire_id should be set, enforced in application code not DB |
| **weather_records** | weather_id PK, farm_id FK NOT NULL, temperature_c, humidity_percent, rainfall_mm, wind_speed_kmh, pressure_hpa, weather_condition, recorded_at | Only `/weather/current` writes here, never `/weather/forecast` |

**No `recommendations` table exists.** The combined DSS view is computed on-request from the three latest rows above — never persisted, never cached.

**Deferred/unused v1:** `daily_tasks`, `notifications`, `reports` (no endpoints). `government_schemes` is active only for the Phase 8 scraper work.

---

## Auth model

- Two completely separate JWT tracks: `aud: "farmer"` (from `/auth/*`) and `aud: "admin"` (from `/admin/login`). Never interchangeable — enforced by checking signature/expiry first (401 if invalid) then `aud` separately (403 if wrong role, distinct message).
- `users.is_active = false` → 403 on login, distinct message from wrong-password 401.
- Access token 30 min, refresh token 7 days, refresh rotates both.
- Frontend: farmer tokens in `localStorage.tomatoTokens`, admin tokens in `localStorage.tomatoAdminTokens` — never shared, no cross-session bleed.

---

## Endpoints (method · path · auth · key I/O)

### Farmer auth
- `POST /auth/signup` — none — in: name, email, password, phone/address/village/district/state (opt), farm_name, latitude/longitude (opt) — out: access_token, refresh_token — creates user+farm in ONE transaction
- `POST /auth/login` — none — in: email, password — out: tokens — 403 if is_active=false, 401 if wrong password
- `POST /auth/refresh` — none — in: refresh_token — out: new token pair (rotated)
- `GET /auth/me` — farmer — out: user + their one farm's fields combined (no second call needed)
- `PATCH /auth/profile` — farmer — in: any subset of profile/farm fields — out: updated object
- `POST /auth/change-password` — farmer — in: current_password, new_password — out: success message

### Admin
- `POST /admin/login` — none — same shape as farmer login, aud:"admin". No signup endpoint exists.
- `GET /admin/diseases` / `POST /admin/diseases` / `PATCH /admin/diseases/{id}` — admin — full CRUD on the diseases lookup table
- `GET /admin/farmers?search=&offset=&limit=` — admin — paginated list, real params
- `GET /admin/farmers/{user_id}` — admin — profile + farm + recent (limit 5) disease_scans/soil_analyses/weather_records
- `PATCH /admin/farmers/{user_id}/status` — admin — in: is_active bool

### Dashboard
- `GET /dashboard/summary` — farmer — out: latest_disease_scan / latest_soil_analysis / latest_weather, each object or null

### Disease (Phase 3)
- `POST /disease/analyze` — farmer — in: multipart image — uploads to Cloudinary, runs model, looks up disease_id, inserts row — out: scan_id, predicted_disease, confidence, description, immediate_action
- `GET /disease/history` — farmer — out: array, newest first

### Soil (Phase 4)
- `POST /soil/report` — farmer — in: multipart image — uploads to Cloudinary, OCRs, does NOT save analysis yet — out: soil_report_id, raw_ocr_text, parsed fields (editable)
- `POST /soil/report/confirm` — farmer — in: soil_report_id + confirmed fields — out: analysis_id, predicted_soil_condition (or rule-based equivalent), recommendations
- `POST /soil/questionnaire` — farmer — in: the 6 questionnaire fields — out: same shape, nutrient fields null
- `GET /soil/latest` — farmer

### Weather (Phase 5) — Open-Meteo (no API key or env var required)
- `GET /weather/current` — farmer — 400 if farm has no lat/lng (message directs to Profile) — calls Open-Meteo `/v1/forecast?current=...` — writes one row to `weather_records`, returns it
- `GET /weather/forecast` — farmer — 400 if no lat/lng — calls Open-Meteo `/v1/forecast?daily=...&forecast_days=5` — does NOT write to `weather_records` — returns list of 5 daily forecast objects
- WMO `weather_code` integers are mapped to human-readable strings in `backend/app/services/weather_client.py` (function `code_to_condition`). Full WMO table is in that file. Do not add a `WEATHER_API_KEY` or `OPENWEATHERMAP_API_KEY` env var — they do not exist and are not needed.

### Recommendations (Phase 6)
- `GET /recommendations/latest` — farmer — computed fresh from latest disease/soil/weather rows, no persistence — 404 if all three missing, partial result if some present

### History (Phase 7)
- `GET /history?type=&from=&to=` — farmer — merged/sorted across all 3 data tables (disease_scans, soil_analyses, weather_records). Out: array of objects with `id`, `normalized_date`, `type`, `quick_status`, and type-specific `details`.

---

## Hard rules (full versions in AGENTS.md)

Never fabricate data · never invent a column/endpoint not listed above · secrets are env-vars only, never printed/narrated · frontend never talks to Cloudinary or Neon directly · one farm per farmer in v1 · farmer/admin tokens never interchangeable · show real command/query output as proof, not descriptions of intended behavior.
