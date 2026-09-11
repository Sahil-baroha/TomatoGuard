# TomatoGuard AI — Presentation & Viva Q&A Guide

*Comprehensive answers to all 28 presentation questions, ready for project defense.*

---

## Q1. Project ka complete overview aur actual workflow kya hai?

**TomatoGuard AI** is a tomato crop health monitoring and decision support system. It is a full-stack web application that helps small and medium-scale farmers monitor their tomato crops through:

- **AI-Powered Disease Detection** — Upload a leaf photo and get instant disease identification via a deep learning model.
- **Soil Analysis** — Upload a soil test report (OCR-extracted) or fill a manual questionnaire to receive fertilizer and irrigation recommendations.
- **Real-Time Weather** — Fetch live weather data and 5-day forecasts based on the farm's GPS coordinates.
- **Smart Recommendations** — An intelligent engine that combines disease, soil, and weather data to generate a unified crop health status and actionable advice.
- **Government Schemes Portal** — Quick links to 7 active Indian government farming schemes.
- **Admin Panel** — A separate admin interface for platform monitoring and farmer management.

**End-to-End Workflow:**
1. Farmer registers (provides name, email, password, farm name, optional GPS location).
2. From the Dashboard, the farmer can scan a leaf, check soil, or fetch weather.
3. The Disease Scanner uploads the image to Cloudinary, runs it through the EfficientNet-B0 model, and returns the predicted disease, confidence, severity, and treatment.
4. Soil Analysis either OCR-reads an uploaded lab report or accepts manual questionnaire input, then runs a deterministic rule engine to generate fertilizer and irrigation advice.
5. Weather fetches live data from Open-Meteo API using the farmer's GPS coordinates.
6. The Recommendations page aggregates all three data sources and computes an overall health status (Good / At-Risk / Critical) with specific action items.
7. All data is persisted in a Neon PostgreSQL cloud database for historical tracking.

---

## Q2. Apna individual contribution kya hai? Exactly kya implement kiya?

*(Customize this per team member. Below is the template for the backend/integration developer.)*

**Backend Architecture & API Development:**
- Designed and implemented the entire FastAPI backend with a layered architecture (routers, schemas, services, models, core).
- Built all REST API endpoints: Auth, Disease, Soil, Weather, Dashboard, Recommendations, History, Admin.
- Implemented JWT-based authentication with strict farmer/admin token separation.
- Integrated the PyTorch EfficientNet-B0 model into a production API service.
- Built the OCR pipeline for soil report image processing.
- Integrated the Open-Meteo weather API with WMO code translation.
- Designed and deployed the PostgreSQL schema on Neon (cloud Postgres).
- Built the deterministic recommendation engine that combines disease + soil + weather data.

**Frontend Integration:**
- Wired all React pages to real backend APIs (Disease, Soil, Weather, Dashboard, Recommendations).
- Implemented the disease scan modal with Cloudinary image display.
- Built the Soil page with latest-first default view and new-analysis flow.
- Redesigned the Dashboard with health status hero card.

---

## Q3. Project mein konsa tech stack use kiya aur wahi kyu choose kiya?

| Layer | Technology | Why Chosen |
|-------|-----------|------------|
| **Frontend** | React 18 + Vite + TailwindCSS | React is the most popular UI library with a massive ecosystem. Vite provides instant hot-reload during development. TailwindCSS enables rapid, consistent UI design without writing custom CSS files. |
| **Backend** | Python FastAPI | FastAPI is the fastest Python web framework. It provides automatic API documentation (Swagger), built-in request validation via Pydantic, and native async support for handling concurrent requests efficiently. |
| **Database** | Neon PostgreSQL (Cloud) | PostgreSQL is the world's most advanced open-source relational database. Neon provides serverless Postgres with auto-scaling, branching, and zero-downtime — ideal for a cloud-deployed project. |
| **ML Framework** | PyTorch + EfficientNet-B0 | PyTorch is the industry standard for deep learning research and deployment. EfficientNet-B0 uses compound scaling to achieve high accuracy with a small model size (~20 MB), making it ideal for server-side inference. |
| **Image Storage** | Cloudinary | Cloud-based image CDN with automatic optimization, resizing, and secure URLs. The frontend never handles raw files directly — everything goes through the backend to Cloudinary. |
| **Weather API** | Open-Meteo | Completely free, no API key required, provides WMO-standard weather codes, and supports both current conditions and multi-day forecasts. |
| **Authentication** | JWT (JSON Web Tokens) + bcrypt | Industry-standard stateless authentication. bcrypt provides secure one-way password hashing. JWTs allow the frontend to authenticate without session cookies. |
| **Computer Vision** | OpenCV | Used for two purposes: (1) client-side leaf validation (green pixel density check), and (2) server-side severity estimation via pixel-level lesion analysis. |

---

## Q4. Frontend, backend, database aur ML model ek dusre se kaise connected hain?

The system follows a strict **three-tier architecture**:

```
Frontend (React)
    |
    | HTTP REST API calls (JSON + multipart/form-data)
    |
    v
Backend (FastAPI on port 8001)
    |
    |--- ML Model (PyTorch EfficientNet-B0, loaded in memory)
    |--- OCR Service (for soil reports)
    |--- Weather Client (calls Open-Meteo API)
    |--- Cloudinary Client (uploads images)
    |
    | SQLAlchemy ORM queries
    |
    v
Database (Neon PostgreSQL)
```

**Key rules:**
- The frontend NEVER talks to Cloudinary, Neon, or Open-Meteo directly.
- Every request goes: Frontend → FastAPI Backend → External Service/DB → Back to Frontend.
- The ML model weights file (`tomato_model_valid.pth`) is loaded once when the server starts and stays in GPU/CPU memory for fast inference.
- Farmer JWTs and Admin JWTs are strictly separated — a farmer token cannot access admin routes and vice versa.

---

## Q5. Code mein konse algorithms use kiye hain aur woh kaise work karte hain?

1. **Convolutional Neural Network (EfficientNet-B0):** Uses compound scaling (depth × width × resolution) to classify leaf images into 10 disease categories. The final classification layer uses Softmax to output probability distributions.

2. **Transfer Learning:** The model starts with ImageNet pre-trained weights (trained on 1.2 million images). Only the top classification head is retrained on our tomato dataset, dramatically reducing training time and improving accuracy on small datasets.

3. **BCrypt Password Hashing:** A one-way adaptive hash function that automatically adds a random salt. Even if the database is breached, passwords cannot be reverse-engineered.

4. **JWT (JSON Web Token) Authentication:** Stateless token-based auth. The server signs a token with a secret key containing the user's ID and role. The frontend sends this token with every request, and the server verifies the signature without needing a database lookup.

5. **OpenCV Severity Pipeline:** Converts the leaf image to HSV color space → applies Gaussian blur to remove noise → binary thresholding to isolate diseased spots → calculates the ratio of diseased pixels to total leaf pixels.

6. **Deterministic Rule Engine (Recommendations):** A hand-coded decision tree that evaluates:
   - Disease severity level (from the ML model)
   - Soil nutrient thresholds (N, P, K, pH ranges)
   - Weather conditions (temperature, humidity, rainfall)
   - Outputs: health_status (good/at-risk/critical) + specific treatment advice.

---

## Q6. ML model konsa use kiya aur wahi model kyu choose kiya?

**Model:** EfficientNet-B0 (from the EfficientNet family by Google Brain, 2019).

**Why EfficientNet-B0 specifically:**

| Factor | EfficientNet-B0 | Alternatives (ResNet-50, VGG-16) |
|--------|-----------------|----------------------------------|
| **Parameters** | ~5.3 million | ResNet-50: 25.6M, VGG-16: 138M |
| **Model Size** | ~20 MB | ResNet-50: 98 MB, VGG-16: 528 MB |
| **ImageNet Accuracy** | 77.1% (top-1) | ResNet-50: 76.1%, VGG-16: 71.5% |
| **Inference Speed** | ~40 ms | Comparable or slower |
| **Mobile Friendly** | Yes (compact) | No (too large for edge deployment) |

EfficientNet-B0 achieves better accuracy than larger models while using 5-26x fewer parameters. This is critical because:
- Faster inference = quicker results for the farmer.
- Smaller model = can be deployed on modest server hardware.
- Compound scaling = the model intelligently balances depth, width, and resolution rather than just making the network deeper.

---

## Q7. Dataset konsa use kiya, kitni classes/images hain aur preprocessing kya ki?

**Dataset:** PlantVillage Tomato Subset (publicly available research dataset).

**Statistics:**
- **Total Images:** 18,160+
- **Number of Classes:** 10 (9 diseases + 1 healthy)

**The 10 Classes:**
1. Bacterial Spot
2. Early Blight
3. Late Blight
4. Leaf Mold
5. Septoria Leaf Spot
6. Spider Mites (Two-spotted)
7. Target Spot
8. Yellow Leaf Curl Virus
9. Mosaic Virus
10. Healthy

**Preprocessing & Data Augmentation:**
- **Resizing:** All images resized to 224×224 pixels (EfficientNet-B0 input requirement).
- **Normalization:** Pixel values normalized using ImageNet mean [0.485, 0.456, 0.406] and std [0.229, 0.224, 0.225].
- **Random Horizontal/Vertical Flips:** Simulates different leaf orientations.
- **Random Rotations (±15°):** Accounts for imperfect camera angles.
- **Brightness/Contrast Variations (±20%):** Simulates different lighting conditions (indoor lab vs. outdoor field).

These augmentations force the model to learn structural lesion patterns rather than memorizing specific backgrounds or lighting conditions.

---

## Q8. Training/testing split kitna rakha?

| Split | Percentage | Approximate Images | Purpose |
|-------|-----------|-------------------|---------|
| **Training** | 80% | ~14,500 | Model learns disease patterns from these images. |
| **Validation** | 10% | ~1,800 | Used during training to monitor for overfitting. The model sees these but does NOT learn from them. |
| **Test (Unseen)** | 10% | ~1,800 | Completely held out. The model NEVER sees these during training. Final accuracy is measured here. |

The validation set acts as a "practice exam" during training, while the test set is the "final exam" that the model takes only once after training is complete.

---

## Q9. Model ko konse parameters pe train kiya?

| Hyperparameter | Value | Justification |
|---------------|-------|---------------|
| **Base Architecture** | EfficientNet-B0 | Compound scaling; compact ~5.3M parameters, ~20 MB |
| **Pre-trained Weights** | ImageNet | Transfer learning from 1.2M images; dramatically reduces training time |
| **Epochs** | 10 | Rapid convergence due to transfer learning; avoids over-training |
| **Batch Size** | 32 | Standard mini-batch that stabilizes gradient updates without exceeding GPU VRAM |
| **Optimizer** | Adam | Adaptive learning rate optimizer; combines momentum and RMSProp |
| **Learning Rate** | 10⁻³ → 10⁻⁵ | Initial rate (10⁻³) trains classification head; fine-tuning rate (10⁻⁵) adapts top convolutional layers smoothly |
| **Loss Function** | CrossEntropyLoss | Standard multiclass classification loss; penalizes incorrect probability distributions |
| **Hardware** | NVIDIA T4 / P100 GPU | Google Colab Pro; 16 GB VRAM for parallel tensor computation |
| **Training Time** | ~10-12 minutes | Fast convergence thanks to transfer learning + GPU acceleration |

---

## Q10. Testing mein accuracy, precision, recall aur F1-score kitna aaya?

| Metric | Value | What It Means |
|--------|-------|---------------|
| **Training Accuracy** | 95.35% | How well the model learned the training data |
| **Validation Accuracy** | 92.37% | Performance on data seen but not learned from (monitors overfitting) |
| **Test Accuracy (Unseen)** | 92.06% | Final score on completely unseen data — the true measure of performance |
| **Precision** | ~90% (macro-average); 92% on Healthy class | When the model says "Early Blight", it is correct ~90% of the time |
| **Recall** | ~90% (macro-average) | Out of all truly infected leaves, the model catches ~90% |
| **F1-Score** | ~90% (macro-average) | Harmonic mean of Precision and Recall — confirms balanced performance |
| **Inference Latency** | ~40 ms (model only); 1.2-2.0s end-to-end | Fast enough for real-time mobile/web use |

---

## Q11. Accuracy aur precision calculate kaise ki?

**Accuracy Formula:**
$$\text{Accuracy} = \frac{\text{Total Correct Predictions}}{\text{Total Predictions}} \times 100$$

Example: If 1,800 test images are evaluated and 1,657 are correctly classified:
$$\text{Accuracy} = \frac{1657}{1800} \times 100 = 92.06\%$$

**Precision Formula (per class):**
$$\text{Precision}_c = \frac{\text{True Positives}_c}{\text{True Positives}_c + \text{False Positives}_c}$$

Example for "Early Blight": If the model predicted 200 images as Early Blight, and 180 of them actually were Early Blight:
$$\text{Precision}_{\text{EB}} = \frac{180}{200} = 90\%$$

**Macro-Average Precision** = average of precision across all 10 classes, giving equal weight to each disease regardless of how many images it has.

---

## Q12. Confusion matrix kya aaya aur usse kya samajh aa raha hai?

A confusion matrix is a 10×10 grid where:
- **Rows** = Actual true class
- **Columns** = Model's predicted class
- **Diagonal** = Correct predictions (True Positives)
- **Off-diagonal** = Misclassifications

**Key observations from our confusion matrix:**
1. **Healthy leaves** have the highest precision (92%) — the model rarely falsely flags a healthy leaf as diseased.
2. **Early Blight and Late Blight** show minor cross-confusion — visually similar brown lesion patterns cause occasional misclassification between these two.
3. **Yellow Leaf Curl Virus** has very high recall — the distinct curling symptom makes it easy for the model to identify.
4. **Spider Mites** occasionally gets confused with Septoria Leaf Spot — both show small spotted patterns on the leaf surface.

**What this tells us:** The model performs strongest on diseases with unique visual signatures (curling, mosaic patterns) and has minor difficulty with diseases that share similar lesion appearances (early vs. late blight).

---

## Q13. Overfitting/underfitting kaise check kiya?

**Overfitting Detection Method:**
We compared Training Accuracy vs. Validation Accuracy across all 10 epochs:

| Metric | Value |
|--------|-------|
| Training Accuracy | 95.35% |
| Validation Accuracy | 92.37% |
| Gap | 2.98% |

A gap of only ~3% proves there is **no significant overfitting**. If overfitting were occurring, we would see training accuracy at 99%+ while validation accuracy drops below 80%.

**Why Overfitting Was Prevented:**
1. **Data Augmentation** — Random flips, rotations, brightness changes prevent the model from memorizing specific images.
2. **Transfer Learning** — Starting from ImageNet weights means the model already understands general visual features, reducing the need to overfit on our small dataset.
3. **Only 10 Epochs** — Short training prevents the model from memorizing noise in the training data.
4. **Validation Monitoring** — We tracked validation loss every epoch and would have stopped early if it started increasing.

**Underfitting Check:** Both training and validation accuracy are above 92%, well above random guessing (10% for 10 classes), confirming the model has learned meaningful patterns.

---

## Q14. Wrong/invalid image upload hui toh system kaise handle karega?

The system has a **two-layer defense**:

**Layer 1: Client-Side Leaf Validation (Frontend — Disease.jsx)**
Before the image even reaches the server, the frontend runs a green-pixel density check using HTML Canvas:
- Resizes the image to 150×150 pixels.
- Scans every pixel: counts pixels where the Green channel dominates Red and Blue.
- If fewer than 10% of pixels are green → Rejects with: *"This image could not be read. Please try another image."*

**Layer 2: Server-Side Confidence Threshold (Backend — disease_model.py)**
Even if a non-leaf image passes the frontend check, the ML model's Softmax output layer spreads probability thinly across all 10 classes. The backend enforces a **70% confidence threshold**:
- If no class achieves >70% confidence → the system responds with a low-confidence warning.
- This prevents random objects (tractors, animals, hands) from receiving false disease labels.

---

## Q15. Location kaise le rahe hain? Konsi GPS/Geolocation API use ki hai?

**API Used:** Browser's built-in **Navigator Geolocation API** (`navigator.geolocation.getCurrentPosition()`).

**How it works:**
1. During signup, the frontend displays a "Use my location" button.
2. When clicked, the browser requests GPS permission from the operating system.
3. The browser returns the device's latitude and longitude coordinates.
4. These coordinates are sent to the backend and stored in the `farms` table.
5. The Weather feature uses these stored coordinates to call the Open-Meteo API for location-specific forecasts.

**No external GPS service is needed** — every modern smartphone and browser has built-in GPS/Wi-Fi-based geolocation capabilities.

---

## Q16. User location permission deny kare toh kya hoga?

The system handles this gracefully — **location is optional, not mandatory**:

1. If the user denies permission, the UI shows: *"Location access denied. You can still sign up — add your location later from your Profile page to enable weather data."*
2. The user can complete registration and use Disease Detection, Soil Analysis, and all other features without location.
3. Only the Weather feature requires coordinates. If a farmer tries to access Weather without GPS coordinates, the backend returns HTTP 400 with: *"Farm location not set. Please update your location in your Profile to use weather features."*
4. The farmer can add coordinates later from the Profile page at any time.

---

## Q17. Konsa database use kiya aur kyu?

**Database:** PostgreSQL (hosted on **Neon** — serverless cloud Postgres).

**Why PostgreSQL:**
| Factor | PostgreSQL | Alternatives (MySQL, MongoDB) |
|--------|-----------|-------------------------------|
| **Data Integrity** | Strong ACID compliance, foreign keys, constraints | MongoDB lacks strict schemas |
| **Complex Queries** | Excellent JOIN performance across related tables | MongoDB requires aggregation pipelines |
| **JSON Support** | Native JSONB type when needed | MySQL has limited JSON support |
| **Industry Standard** | Used by Instagram, Spotify, Apple | — |
| **Free & Open Source** | Yes | MySQL is Oracle-owned |

**Why Neon specifically:**
- **Serverless** — scales to zero when not in use (cost-effective).
- **Branching** — can create database branches for testing without affecting production.
- **No server management** — no need to install, configure, or maintain a PostgreSQL server.
- **Free tier** — sufficient for our project's scale.

---

## Q18. Kitne tables hain aur har table mein kya store ho raha hai?

**Active Tables in v1: 9**

| # | Table Name | What It Stores |
|---|-----------|----------------|
| 1 | **users** | Farmer accounts: email, hashed password, name, is_active flag, timestamps |
| 2 | **farms** | Farm details: farm_name, latitude, longitude. Linked to users (1:1) |
| 3 | **diseases** | Reference data: 10 disease names, severity levels, default treatment text |
| 4 | **disease_scans** | Scan history: Cloudinary image URL, predicted disease, confidence %, severity, recommendation, timestamp. Linked to users and diseases |
| 5 | **soil_reports** | Raw OCR data from uploaded soil report images. Linked to users |
| 6 | **soil_questionnaires** | Manual questionnaire responses (crop stage, irrigation type, etc.). Linked to users |
| 7 | **soil_analyses** | Finalized soil data: N, P, K, pH, moisture, organic matter, fertilizer recommendation, irrigation recommendation. Linked to users |
| 8 | **weather_records** | Cached weather snapshots: temperature, humidity, rainfall, wind speed, weather condition. Linked to users |
| 9 | **admins** | Admin accounts: separate table, separate auth, never mixed with farmers |

---

## Q19. Primary key, foreign key aur tables ke relationships kya hain?

**Primary Keys:** Every table has a `<table_name>_id` column as its primary key (auto-incrementing integer or UUID).

**Foreign Key Relationships:**

```
users (user_id) ──────────────┐
    │                         │
    ├── farms (user_id FK)    │  1 user : 1 farm
    │                         │
    ├── disease_scans ────────┤  1 user : many scans
    │       └── diseases (disease_id FK)  each scan links to 1 disease
    │                         │
    ├── soil_reports ─────────┤  1 user : many reports
    │                         │
    ├── soil_questionnaires ──┤  1 user : many questionnaires
    │                         │
    ├── soil_analyses ────────┤  1 user : many analyses
    │                         │
    └── weather_records ──────┘  1 user : many weather records
```

**Key constraints:**
- `ON DELETE CASCADE` on user_id foreign keys — if a user is deleted, all their related data is removed.
- `disease_scans.disease_id` references `diseases.disease_id` — ensures every scan links to a valid known disease.
- `farms` has a UNIQUE constraint on `user_id` — enforces the "one farm per farmer" v1 rule.

---

## Q20. User/login data kaha aur kaise store ho raha hai? Authentication kaise work kar raha hai?

**Storage:**
- Emails are stored as plain text in the `users` table (needed for login lookup).
- Passwords are **NEVER stored in plain text**. They are hashed using **bcrypt** (version 4.0.1) with an automatic random salt before being saved to the `password_hash` column.

**Authentication Flow:**

```
1. SIGNUP:
   User sends {email, password} → Backend hashes password with bcrypt → Saves to DB → Returns JWT

2. LOGIN:
   User sends {email, password} → Backend fetches stored hash → bcrypt.verify(password, hash)
   → If match: Generate JWT with {user_id, audience: "farmer"} → Return to frontend
   → If no match: Return 401 Unauthorized

3. EVERY SUBSEQUENT REQUEST:
   Frontend sends JWT in "Authorization: Bearer <token>" header
   → Backend decodes JWT, verifies signature, extracts user_id
   → If valid: Process request
   → If expired/invalid: Return 401, frontend redirects to login
```

**JWT Structure:**
- `sub`: user_id (who is this?)
- `aud`: "farmer" or "admin" (prevents cross-role access)
- `exp`: expiration timestamp (tokens expire after a set duration)

---

## Q21. Frontend se backend/database tak data kaise ja raha hai? Konsi APIs use ki hain?

**Communication:** Standard **REST API** over HTTP using JSON.

**Complete API Endpoint List:**

| Method | Endpoint | Purpose |
|--------|---------|---------|
| POST | `/auth/signup` | Register new farmer |
| POST | `/auth/login` | Login, receive JWT |
| GET | `/auth/me` | Get current user profile |
| PATCH | `/auth/profile` | Update profile (name, farm, location) |
| PATCH | `/auth/change-password` | Change password |
| GET | `/dashboard/summary` | Dashboard overview data |
| POST | `/disease/analyze` | Upload leaf image, get ML prediction |
| GET | `/disease/history` | Past scan history |
| POST | `/soil/report` | Upload soil report for OCR |
| POST | `/soil/report/confirm` | Confirm OCR values, get analysis |
| POST | `/soil/questionnaire` | Submit manual soil questionnaire |
| GET | `/soil/latest` | Get most recent soil analysis |
| GET | `/weather/current` | Fetch current weather |
| GET | `/weather/forecast` | Fetch 5-day forecast |
| GET | `/recommendations/latest` | Get combined smart recommendations |
| GET | `/history` | Unified history across all domains |
| POST | `/admin/auth/login` | Admin login (separate) |
| GET | `/admin/farmers` | List all farmers (admin only) |
| PATCH | `/admin/farmers/{id}/status` | Activate/deactivate farmer |

**Data flow example (Disease Scan):**
```
React Frontend
  → POST /disease/analyze (multipart image + JWT header)
  → FastAPI Router (api/disease.py)
  → Cloudinary Upload (core/cloudinary_client.py)
  → PyTorch Inference (services/disease_model.py)
  → PostgreSQL INSERT (models/disease_scan.py via SQLAlchemy)
  → JSON Response (schemas/disease.py via Pydantic)
  → React displays result modal
```

---

## Q22. Project ko test kaise kiya aur konse parameters/test cases use kiye?

**Testing Strategy: Multi-Layer Manual + API Verification**

1. **Backend API Testing:**
   - Every endpoint tested via `curl` commands with real JWT tokens.
   - Verified correct HTTP status codes (200, 400, 401, 404).
   - Verified response JSON structure matches Pydantic schemas exactly.

2. **Authentication Testing:**
   - Farmer JWT rejected by admin routes (returns 403).
   - Admin JWT rejected by farmer routes (returns 403).
   - Expired tokens return 401.
   - Invalid tokens return 401.

3. **ML Model Testing:**
   - Tested with known sample images from each of the 10 classes.
   - Verified correct disease prediction and confidence >70%.
   - Tested with non-leaf images (random objects) — confirmed rejection.

4. **Edge Case Testing:**
   - Empty file upload → proper error message.
   - Missing GPS coordinates → Weather returns 400 with helpful message.
   - No scan/soil/weather data → Dashboard and Recommendations show proper empty states.
   - Database connection failure → graceful error handling.

5. **Frontend Testing:**
   - Manual screenshot-based testing across all pages.
   - Dark mode and light mode tested on every page.
   - Mobile responsive layout verified.

---

## Q23. Project host/deploy kaha kiya hai? Live demo kaise chalega?

**Current Deployment:**

| Component | Where Hosted |
|-----------|-------------|
| **Database** | Neon Cloud (serverless PostgreSQL) — always online |
| **Backend** | Local machine (FastAPI on port 8001) — can be deployed to Railway/Render/AWS |
| **Frontend** | Local machine (Vite dev server on port 5173) — can be deployed to Vercel/Netlify |
| **ML Model** | Loaded in backend memory from `docs/tomato_model_valid.pth` |
| **Image Storage** | Cloudinary CDN — always online |

**For Live Demo:**
1. Start backend: `cd backend && venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8001`
2. Start frontend: `cd frontend && npm run dev`
3. Open browser at `http://localhost:5173`
4. Login with test credentials and demonstrate each feature.

**For Production Deployment:**
- Backend → Railway or Render (free tier supports Python + FastAPI).
- Frontend → Vercel (free tier, automatic deploys from GitHub).
- Database → Already on Neon Cloud (no change needed).

---

## Q24. Existing systems se apna project different/unique kya hai?

| Feature | Existing Apps (Plantix, AgriApp) | TomatoGuard AI |
|---------|----------------------------------|----------------|
| **Crop Focus** | Generic (100+ crops) | Tomato-specific — deeper, more accurate |
| **Soil Integration** | None or separate app | Built-in soil OCR + analysis + recommendations |
| **Weather Integration** | None or separate app | Built-in with GPS-based local forecasts |
| **Combined Recommendations** | Siloed — disease, soil, weather are separate | Smart engine combines ALL three data sources |
| **Health Status** | Basic disease label | Deterministic health rating (Good/At-Risk/Critical) |
| **Data Transparency** | Black box | "Data Used" section shows exactly what fed the recommendation |
| **Cost** | Paid subscriptions | Fully free and open-source |
| **Government Schemes** | Not included | Direct links to 7 active Indian farming schemes |
| **Admin Panel** | Not available to project owners | Full admin dashboard for farmer management |

**Our unique differentiator:** No existing app provides a **unified decision support system** that combines ML disease detection + soil chemistry analysis + real-time weather into a single, actionable health recommendation with full data transparency.

---

## Q25. Current limitations aur future scope kya hai?

**Current Limitations (v1):**
1. Only supports tomato crops (single crop).
2. One farm per farmer (no multi-farm support).
3. Disease model trained on PlantVillage lab images — real-world field images with soil, shadows, and multiple leaves may reduce accuracy.
4. Soil OCR depends on report image quality — handwritten reports may fail.
5. Weather is location-dependent — requires GPS coordinates.
6. No push notifications for disease outbreaks.
7. Not yet deployed to a public cloud server.

**Future Scope (v2+):**
1. **Multi-crop support** — Extend to wheat, rice, cotton, etc.
2. **Multi-farm management** — Allow farmers to manage multiple fields.
3. **Real-time drone integration** — Scan entire fields via drone imagery.
4. **Pest prediction model** — Predict pest outbreaks based on weather patterns.
5. **Community forum** — Farmer-to-farmer knowledge sharing.
6. **WhatsApp/SMS integration** — Send alerts in local languages.
7. **Offline mode** — Cache ML model on device for areas with poor connectivity.
8. **Marketplace integration** — Connect farmers directly with input suppliers.
9. **Government scheme eligibility checker** — Auto-check which schemes a farmer qualifies for.
10. **Multi-language support** — Hindi, Marathi, Tamil, Telugu, etc.

---

## Q26. Model kabhi wrong prediction de toh us case ko kaise handle karenge?

**Current Safeguards:**

1. **Confidence Threshold (70%):** If the model is unsure (Softmax confidence below 70%), the system flags the result as low-confidence rather than presenting it as definitive.

2. **Severity Pipeline Verification:** Even if the disease class is slightly wrong (e.g., Early Blight vs. Late Blight), the OpenCV severity pipeline independently measures the actual lesion area percentage. The treatment recommendation is also based on severity level, so even a misclassified disease gets approximately correct treatment advice.

3. **User Education:** The UI clearly states recommendations are AI-generated and advises consulting agricultural officers for critical cases.

**Future Improvements:**
- Add a "Report Incorrect" button for user feedback.
- Retrain the model periodically with corrected labels from farmer feedback.
- Implement an ensemble of multiple models (majority voting) for higher confidence.

---

## Q27. Users/data increase hone par system ko scalable kaise bana sakte hain?

| Component | Current | Scalable Solution |
|-----------|---------|-------------------|
| **Backend** | Single server process | Deploy behind a load balancer (Nginx) with multiple FastAPI workers (Gunicorn with Uvicorn workers). |
| **Database** | Neon Free Tier | Neon auto-scales compute. Add read replicas for heavy read workloads. Use connection pooling (PgBouncer). |
| **ML Inference** | CPU/Single GPU | Deploy model on a dedicated GPU server or use cloud ML services (AWS SageMaker, Google Cloud AI Platform). Batch inference for bulk processing. |
| **Image Storage** | Cloudinary Free Tier | Cloudinary scales automatically. Can add CDN caching. |
| **Frontend** | Single Vite build | Deploy to Vercel/Netlify CDN — automatically serves from edge locations globally. |
| **Caching** | None | Add Redis cache for frequently accessed data (dashboard summaries, weather forecasts). |

**The key advantage of our architecture:** Because we used a stateless REST API with JWT authentication, the backend can be horizontally scaled (multiple server instances) without any code changes.

---

## Q28. Implementation ke time kya challenges aaye aur unko kaise solve kiya?

| Challenge | Problem | Solution |
|-----------|---------|----------|
| **Class Label Mismatch** | The ML model's raw output labels (e.g., `Tomato___Bacterial_spot`) did not match the database's disease names. | Built an explicit mapping dictionary in `disease_model.py` that translates raw model strings to clean display names. Migrated the database `diseases` table to match. |
| **bcrypt Version Conflict** | bcrypt versions >4.0.1 broke passlib 1.7.4, causing login failures. | Pinned bcrypt to version 4.0.1 in `requirements.txt`. |
| **Lucide Icon Name Collision** | Importing `Image` from lucide-react shadowed the browser's native `Image()` constructor, breaking the leaf validation canvas code. | Renamed the import to `Image as ImageIcon` and used `new window.Image()` explicitly. |
| **Dark Mode Auth Pages** | The login/signup page had hardcoded light backgrounds. In dark mode, black text on dark backgrounds made inputs invisible. | Added `dark:bg-stone-950`, `dark:text-stone-100`, `dark:bg-stone-900` classes to the AuthShell component and the global `.input` CSS class. |
| **Weather Card Visibility** | Forecast cards used `bg-white/10` (10% opacity white) which was invisible on light backgrounds. | Changed to `bg-green-50 dark:bg-green-950/40` with a visible border. |
| **Model Weights File Identity** | Two different `.pth` files existed (`tomato_model_full.pth` vs. `tomato_model_valid.pth`). Unclear which was correct. | User explicitly confirmed `tomato_model_valid.pth` as the canonical weights file. |
| **Soil Page Default View** | The soil page always showed the upload form, even if the farmer already had analysis results. | Added a `useEffect` that calls `GET /soil/latest` on page load. Shows existing results first with a "New analysis" button. |
| **Dashboard Stale Design** | Dashboard showed empty placeholder cards with no real data. | Complete redesign with a health status hero banner, clickable data cards showing real latest values, and quick action buttons. |

---

*Document prepared for TomatoGuard AI project presentation and viva defense.*
*All metrics, architecture details, and code references are based on the actual implemented system.*
